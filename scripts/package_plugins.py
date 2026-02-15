#!/usr/bin/env python3
"""
Build DawnChat plugin packages and generate plugins.json catalog.
"""

from __future__ import annotations

import argparse
import hashlib
import hmac
import json
import os
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
import shutil
import subprocess
import urllib.error
import urllib.parse
import urllib.request
from typing import Any
from zipfile import ZIP_DEFLATED, ZipFile


EXCLUDE_DIRS = {
    ".git",
    ".venv",
    "__pycache__",
    ".pytest_cache",
    ".mypy_cache",
    ".ruff_cache",
    "node_modules",
    ".idea",
    ".vscode",
    "tests",
    "test",
    "tmp",
    "temp",
}
EXCLUDE_SUFFIXES = {".pyc", ".pyo", ".log", ".tmp", ".swp"}
EXCLUDE_FILES = {".DS_Store", "Thumbs.db"}


@dataclass
class PackageResult:
    plugin_id: str
    version: str
    package_name: str
    package_path: Path
    sha256: str
    size: int
    manifest: dict[str, Any]
    package_key: str = ""
    package_url: str = ""
    published_sha256: str = ""
    published_size: int = 0
    published_file_name: str = ""


@dataclass
class R2SyncConfig:
    endpoint: str
    bucket: str
    region: str
    access_key_id: str
    secret_access_key: str
    public_base_url: str

    @classmethod
    def from_env(cls) -> "R2SyncConfig | None":
        access_key_id = os.getenv("R2_ACCESS_KEY_ID") or os.getenv("CLOUDFLARE_R2_ACCESS_KEY_ID")
        secret_access_key = os.getenv("R2_SECRET_ACCESS_KEY") or os.getenv("CLOUDFLARE_R2_SECRET_ACCESS_KEY")
        account_id = os.getenv("R2_ACCOUNT_ID")
        bucket = os.getenv("R2_BUCKET", "dawnchat-plugins")
        region = os.getenv("R2_REGION", "auto")
        endpoint = os.getenv("R2_ENDPOINT")
        public_base_url = os.getenv("R2_PUBLIC_BASE_URL", "https://plugins.dawnchat.com")
        if not access_key_id or not secret_access_key:
            return None
        if not endpoint:
            if not account_id:
                raise RuntimeError("R2_ACCOUNT_ID is required when R2_ENDPOINT is not set")
            endpoint = f"https://{account_id}.r2.cloudflarestorage.com"
        return cls(
            endpoint=endpoint.rstrip("/"),
            bucket=bucket,
            region=region,
            access_key_id=access_key_id,
            secret_access_key=secret_access_key,
            public_base_url=public_base_url.rstrip("/"),
        )


def _sigv4_sign(key: bytes, msg: str) -> bytes:
    return hmac.new(key, msg.encode("utf-8"), hashlib.sha256).digest()


def _sigv4_signature_key(secret_access_key: str, date_stamp: str, region: str, service: str) -> bytes:
    k_date = _sigv4_sign(("AWS4" + secret_access_key).encode("utf-8"), date_stamp)
    k_region = _sigv4_sign(k_date, region)
    k_service = _sigv4_sign(k_region, service)
    return _sigv4_sign(k_service, "aws4_request")


class R2Client:
    def __init__(self, config: R2SyncConfig) -> None:
        self._config = config
        parsed = urllib.parse.urlparse(config.endpoint)
        self._scheme = parsed.scheme or "https"
        self._host = parsed.netloc

    def _request(
        self,
        *,
        method: str,
        key: str,
        body: bytes | None = None,
        content_type: str | None = None,
    ) -> tuple[int, bytes]:
        payload = body or b""
        payload_hash = hashlib.sha256(payload).hexdigest()
        now = datetime.now(timezone.utc)
        amz_date = now.strftime("%Y%m%dT%H%M%SZ")
        date_stamp = now.strftime("%Y%m%d")
        encoded_key = urllib.parse.quote(key, safe="/-_.~")
        canonical_uri = f"/{self._config.bucket}/{encoded_key}"

        canonical_headers_list: list[tuple[str, str]] = [
            ("host", self._host),
            ("x-amz-content-sha256", payload_hash),
            ("x-amz-date", amz_date),
        ]
        if content_type:
            canonical_headers_list.append(("content-type", content_type))
        canonical_headers_list.sort(key=lambda item: item[0])
        canonical_headers = "".join(f"{name}:{value}\n" for name, value in canonical_headers_list)
        signed_headers = ";".join(name for name, _ in canonical_headers_list)

        canonical_request = "\n".join(
            [
                method,
                canonical_uri,
                "",
                canonical_headers,
                signed_headers,
                payload_hash,
            ]
        )
        credential_scope = f"{date_stamp}/{self._config.region}/s3/aws4_request"
        string_to_sign = "\n".join(
            [
                "AWS4-HMAC-SHA256",
                amz_date,
                credential_scope,
                hashlib.sha256(canonical_request.encode("utf-8")).hexdigest(),
            ]
        )
        signing_key = _sigv4_signature_key(
            self._config.secret_access_key,
            date_stamp,
            self._config.region,
            "s3",
        )
        signature = hmac.new(signing_key, string_to_sign.encode("utf-8"), hashlib.sha256).hexdigest()
        authorization = (
            f"AWS4-HMAC-SHA256 Credential={self._config.access_key_id}/{credential_scope}, "
            f"SignedHeaders={signed_headers}, Signature={signature}"
        )

        headers = {
            "Host": self._host,
            "x-amz-content-sha256": payload_hash,
            "x-amz-date": amz_date,
            "Authorization": authorization,
        }
        if content_type:
            headers["Content-Type"] = content_type
        url = f"{self._scheme}://{self._host}{canonical_uri}"
        request = urllib.request.Request(url, data=(payload if body is not None else None), method=method, headers=headers)
        try:
            with urllib.request.urlopen(request) as response:
                return response.status, response.read()
        except urllib.error.HTTPError as error:
            return error.code, error.read()

    def object_exists(self, key: str) -> bool:
        status, _ = self._request(method="HEAD", key=key)
        if status == 404:
            return False
        if status in (200, 204):
            return True
        raise RuntimeError(f"HEAD {key} failed: status={status}")

    def get_json(self, key: str) -> dict[str, Any] | None:
        status, body = self._request(method="GET", key=key)
        if status == 404:
            return None
        if status != 200:
            raise RuntimeError(f"GET {key} failed: status={status}")
        payload = json.loads(body.decode("utf-8"))
        if not isinstance(payload, dict):
            raise RuntimeError(f"Invalid JSON object in {key}")
        return payload

    def put_object(self, key: str, body: bytes, content_type: str) -> None:
        status, _ = self._request(method="PUT", key=key, body=body, content_type=content_type)
        if status not in (200, 201, 204):
            raise RuntimeError(f"PUT {key} failed: status={status}")


def _sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as f:
        while True:
            chunk = f.read(1024 * 1024)
            if not chunk:
                break
            digest.update(chunk)
    return digest.hexdigest()


def _read_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def _iter_plugin_dirs(plugins_root: Path) -> list[Path]:
    result: list[Path] = []
    for item in sorted(plugins_root.iterdir()):
        if not item.is_dir():
            continue
        if (item / "manifest.json").exists():
            result.append(item)
    return result


def _should_exclude(path: Path) -> bool:
    if path.name in EXCLUDE_FILES:
        return True
    if path.suffix in EXCLUDE_SUFFIXES:
        return True
    for part in path.parts:
        if part in EXCLUDE_DIRS:
            return True
    return False


def _is_dangling_symlink(path: Path) -> bool:
    """Return True when path is a symlink whose target does not exist."""
    return path.is_symlink() and not path.exists()


def _build_web_assets(plugin_dir: Path) -> None:
    manifest = _read_json(plugin_dir / "manifest.json")
    ui = manifest.get("ui") or {}
    ui_type = str(ui.get("type") or "").strip().lower()
    web_src = plugin_dir / "web-src"
    if ui_type != "web" and not web_src.exists():
        return
    if not web_src.exists():
        return

    pnpm = shutil.which("pnpm")
    if not pnpm:
        raise RuntimeError(f"pnpm not found, cannot build web-src for {plugin_dir.name}")

    subprocess.run(
        [pnpm, "install", "--ignore-workspace", "--no-frozen-lockfile"],
        cwd=web_src,
        check=True,
    )
    subprocess.run([pnpm, "exec", "vite", "build"], cwd=web_src, check=True)


def _package_plugin(plugin_dir: Path, output_dir: Path, ext: str) -> PackageResult:
    _build_web_assets(plugin_dir)
    manifest_path = plugin_dir / "manifest.json"
    manifest = _read_json(manifest_path)
    plugin_id = str(manifest["id"])
    version = str(manifest["version"])
    package_name = f"{plugin_id}-{version}{ext}"
    package_path = output_dir / package_name

    with ZipFile(package_path, "w", ZIP_DEFLATED, compresslevel=9) as zf:
        for file_path in plugin_dir.rglob("*"):
            if file_path.is_dir():
                continue
            if _is_dangling_symlink(file_path):
                print(f"skip dangling symlink: {file_path}")
                continue
            rel = file_path.relative_to(plugin_dir)
            if _should_exclude(rel):
                continue
            # Never ship source frontend; keep built web assets only.
            if rel.parts and rel.parts[0] == "web-src":
                continue
            arcname = (Path(plugin_dir.name) / rel).as_posix()
            try:
                zf.write(file_path, arcname)
            except FileNotFoundError:
                # Guard against files disappearing during walk (or dangling links).
                print(f"skip missing path while packaging: {file_path}")

    size = package_path.stat().st_size
    sha256 = _sha256_file(package_path)
    return PackageResult(
        plugin_id=plugin_id,
        version=version,
        package_name=package_name,
        package_path=package_path,
        sha256=sha256,
        size=size,
        manifest=manifest,
    )


def _build_catalog(
    packages: list[PackageResult],
    *,
    release_tag: str,
) -> dict[str, Any]:
    generated_at = datetime.now(timezone.utc).isoformat()
    plugins: list[dict[str, Any]] = []
    for result in packages:
        manifest = result.manifest
        package_url = result.package_url
        package_sha256 = result.published_sha256 or result.sha256
        package_size = result.published_size or result.size
        package_file_name = result.published_file_name or result.package_name
        plugins.append(
            {
                "id": result.plugin_id,
                "name": manifest.get("name", result.plugin_id),
                "version": result.version,
                "description": manifest.get("description", ""),
                "author": manifest.get("author", ""),
                "icon": manifest.get("icon", "📦"),
                "tags": manifest.get("tags", []),
                "min_host_version": manifest.get("min_host_version", "1.0.0"),
                "published_at": generated_at,
                "channel": "release",
                "package": {
                    "url": package_url,
                    "sha256": package_sha256,
                    "size": package_size,
                    "file_name": package_file_name,
                },
                "manifest": manifest,
            }
        )

    return {
        "schema_version": "1.0.0",
        "release_tag": release_tag,
        "generated_at": generated_at,
        "plugins": sorted(plugins, key=lambda item: str(item.get("id", ""))),
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Package official plugins for release.")
    parser.add_argument(
        "--plugins-root",
        default="official-plugins",
        help="Directory containing plugin folders",
    )
    parser.add_argument(
        "--output-dir",
        default=".dist/plugins",
        help="Directory to store generated packages and plugins.json",
    )
    parser.add_argument(
        "--ext",
        default=".dawnchat",
        help="Package extension",
    )
    parser.add_argument(
        "--release-tag",
        required=True,
        help="Release tag used in package URL",
    )
    parser.add_argument(
        "--base-url",
        default="",
        help="Base URL of release download endpoint (without trailing slash)",
    )
    return parser.parse_args()


def _build_package_key(result: PackageResult) -> str:
    return f"packages/{result.plugin_id}/{result.version}/{result.package_name}"


def _build_package_meta(result: PackageResult, package_key: str) -> dict[str, Any]:
    return {
        "plugin_id": result.plugin_id,
        "version": result.version,
        "file_name": result.package_name,
        "sha256": result.sha256,
        "size": result.size,
        "package_key": package_key,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }


def _sync_packages_to_r2(packages: list[PackageResult], config: R2SyncConfig) -> None:
    client = R2Client(config)
    for result in packages:
        package_key = _build_package_key(result)
        meta_key = f"{package_key}.meta.json"
        existing_meta = client.get_json(meta_key)
        if existing_meta is not None:
            existing_sha = str(existing_meta.get("sha256") or "").lower()
            existing_size = int(existing_meta.get("size") or 0)
            existing_file_name = str(existing_meta.get("file_name") or "")
            existing_plugin_id = str(existing_meta.get("plugin_id") or "")
            existing_version = str(existing_meta.get("version") or "")
            if (
                existing_sha != result.sha256.lower()
                or existing_size != result.size
                or existing_file_name != result.package_name
                or existing_plugin_id != result.plugin_id
                or existing_version != result.version
            ):
                raise RuntimeError(
                    f"R2 meta mismatch for immutable version {result.plugin_id}@{result.version}. "
                    "Please bump plugin version before publishing."
                )
            print(f"skip upload (meta matched): {result.plugin_id}@{result.version}")
            result.package_key = package_key
            result.package_url = f"{config.public_base_url}/{package_key}"
            result.published_sha256 = existing_sha
            result.published_size = existing_size
            result.published_file_name = existing_file_name
            continue

        if client.object_exists(package_key):
            raise RuntimeError(
                f"Package exists without meta on R2 for {result.plugin_id}@{result.version}: {package_key}. "
                "Refusing to publish ambiguous metadata."
            )

        package_bytes = result.package_path.read_bytes()
        client.put_object(package_key, package_bytes, "application/octet-stream")
        meta_payload = _build_package_meta(result, package_key)
        client.put_object(
            meta_key,
            (json.dumps(meta_payload, ensure_ascii=False, indent=2) + os.linesep).encode("utf-8"),
            "application/json",
        )
        print(f"uploaded package+meta: {result.plugin_id}@{result.version}")
        result.package_key = package_key
        result.package_url = f"{config.public_base_url}/{package_key}"
        result.published_sha256 = result.sha256
        result.published_size = result.size
        result.published_file_name = result.package_name


def _upload_catalog_to_r2(catalog_path: Path, config: R2SyncConfig) -> None:
    client = R2Client(config)
    client.put_object("plugins.json", catalog_path.read_bytes(), "application/json")
    print("uploaded catalog to R2: plugins.json")


def main() -> int:
    args = parse_args()
    repo_root = Path(__file__).resolve().parents[1]
    plugins_root = (repo_root / args.plugins_root).resolve()
    output_dir = (repo_root / args.output_dir).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    if not plugins_root.exists():
        raise FileNotFoundError(f"plugins root not found: {plugins_root}")

    plugin_dirs = _iter_plugin_dirs(plugins_root)
    if not plugin_dirs:
        raise RuntimeError(f"no plugin manifests under {plugins_root}")

    packages: list[PackageResult] = []
    for plugin_dir in plugin_dirs:
        result = _package_plugin(plugin_dir, output_dir, args.ext)
        packages.append(result)
        print(f"packaged {result.plugin_id}@{result.version} -> {result.package_name}")

    r2_config = R2SyncConfig.from_env()
    if r2_config:
        _sync_packages_to_r2(packages, r2_config)
    else:
        if not args.base_url:
            raise RuntimeError("--base-url is required when R2 sync is disabled")
        base_url = args.base_url.rstrip("/")
        for result in packages:
            result.package_url = f"{base_url}/{args.release_tag}/{result.package_name}"
            result.published_sha256 = result.sha256
            result.published_size = result.size
            result.published_file_name = result.package_name

    catalog = _build_catalog(
        packages,
        release_tag=args.release_tag,
    )
    catalog_path = output_dir / "plugins.json"
    catalog_path.write_text(
        json.dumps(catalog, ensure_ascii=False, indent=2) + os.linesep,
        encoding="utf-8",
    )
    print(f"generated catalog: {catalog_path}")
    if r2_config:
        _upload_catalog_to_r2(catalog_path, r2_config)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
