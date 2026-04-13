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
from zipfile import ZipInfo


@dataclass(frozen=True)
class WebBuildPlan:
    """Install + optional assistant-sdk pre-build, then template `bun run build`."""

    install_cmd: list[str]
    build_cmd: list[str]
    install_cwd: Path
    build_cwd: Path
    manager_label: str
    pre_build_cmd: list[str] | None = None
    pre_build_cwd: Path | None = None


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
REPRODUCIBLE_ZIP_DATETIME = (1980, 1, 1, 0, 0, 0)
DEFAULT_FILE_MODE = 0o644


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
    package_variant: str = "default"


@dataclass
class ConflictRecord:
    plugin_id: str
    version: str
    package_name: str
    package_key: str
    reason: str
    expected_sha256: str
    actual_sha256: str
    expected_size: int
    actual_size: int


@dataclass
class SharedRulesResult:
    version: str
    package_name: str
    package_path: Path
    sha256: str
    size: int
    manifest: dict[str, Any]
    min_host_version: str
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


def _validate_iwp_runtime_lock(shared_rules_root: Path) -> None:
    lock_path = shared_rules_root / "iwp-runtime.lock.json"
    runtime_dir = shared_rules_root / "iwp-runtime"
    if not lock_path.exists():
        return
    payload = _read_json(lock_path)
    files = payload.get("files")
    if not isinstance(files, list) or not files:
        raise RuntimeError("iwp-runtime.lock.json has empty files list")
    if not runtime_dir.exists() or not runtime_dir.is_dir():
        raise RuntimeError("iwp-runtime directory is missing while lock file exists")
    for item in files:
        if not isinstance(item, dict):
            raise RuntimeError("iwp-runtime.lock.json contains invalid file entries")
        rel = str(item.get("target") or "").strip()
        expected = str(item.get("sha256") or "").strip().lower()
        if not rel or not expected:
            raise RuntimeError(f"invalid lock entry in iwp-runtime.lock.json: {item}")
        file_path = runtime_dir / rel
        if not file_path.exists() or not file_path.is_file():
            raise RuntimeError(f"missing iwp runtime file declared in lock: {file_path}")
        actual = _sha256_file(file_path).lower()
        if actual != expected:
            raise RuntimeError(
                f"iwp runtime checksum mismatch: {rel}, expected={expected}, actual={actual}"
            )


def _iter_plugin_dirs(plugins_root: Path) -> list[Path]:
    result: list[Path] = []
    for item in sorted(plugins_root.iterdir()):
        if not item.is_dir():
            continue
        if (item / "manifest.json").exists():
            result.append(item)
    return result


def _should_exclude(path: Path, *, include_node_modules: bool = False) -> bool:
    if path.name in EXCLUDE_FILES:
        return True
    if path.suffix in EXCLUDE_SUFFIXES:
        return True
    for part in path.parts:
        if include_node_modules and part == "node_modules":
            continue
        if part in EXCLUDE_DIRS:
            return True
    return False


def _is_dangling_symlink(path: Path) -> bool:
    """Return True when path is a symlink whose target does not exist."""
    return path.is_symlink() and not path.exists()


def _package_json_uses_assistant_workspace_deps(package_json: dict[str, Any]) -> bool:
    """True when package.json pins @dawnchat assistant SDK packages via workspace:*."""
    for section_name in ("dependencies", "devDependencies", "optionalDependencies"):
        section = package_json.get(section_name)
        if not isinstance(section, dict):
            continue
        for dep_name, spec in section.items():
            if not isinstance(dep_name, str) or not isinstance(spec, str):
                continue
            if spec.strip() != "workspace:*":
                continue
            if dep_name.startswith("@dawnchat/assistant") or dep_name == "@dawnchat/host-orchestration-sdk":
                return True
    return False


def _find_assistant_workspace_root(web_src: Path) -> Path | None:
    """Locate dawnchat-plugins/assistant-workspace by walking parents from web-src."""
    for base in web_src.parents:
        candidate = base / "assistant-workspace"
        pkg_path = candidate / "package.json"
        if not pkg_path.is_file():
            continue
        try:
            data = _read_json(pkg_path)
        except (OSError, json.JSONDecodeError):
            continue
        if data.get("name") != "@dawnchat/assistant-workspace":
            continue
        workspaces = data.get("workspaces")
        if not isinstance(workspaces, list) or not workspaces:
            continue
        return candidate.resolve()
    return None


def _resolve_web_build_plan(web_src: Path) -> WebBuildPlan:
    pnpm_lock = web_src / "pnpm-lock.yaml"
    bun_lock = web_src / "bun.lock"
    bun_lockb = web_src / "bun.lockb"
    npm_lock = web_src / "package-lock.json"
    yarn_lock = web_src / "yarn.lock"

    pnpm = shutil.which("pnpm")
    bun = shutil.which("bun")
    npm = shutil.which("npm")
    yarn = shutil.which("yarn")

    package_json: dict[str, Any] | None = None
    pkg_path = web_src / "package.json"
    if pkg_path.is_file():
        package_json = _read_json(pkg_path)

    use_assistant_ws = bool(package_json and _package_json_uses_assistant_workspace_deps(package_json))
    assistant_ws_root = _find_assistant_workspace_root(web_src) if use_assistant_ws else None
    if use_assistant_ws and assistant_ws_root is None:
        raise RuntimeError(
            f"{web_src} uses workspace:* @dawnchat assistant SDK dependencies but "
            "assistant-workspace/ was not found (expected a parent directory to contain "
            "assistant-workspace/package.json named @dawnchat/assistant-workspace)."
        )

    def bun_plan(default_label: str) -> WebBuildPlan:
        assert bun is not None
        install_cwd = assistant_ws_root if use_assistant_ws else web_src
        mgr = "bun(assistant-workspace)" if use_assistant_ws else default_label
        pre_cmd = [bun, "run", "build:sdk"] if use_assistant_ws else None
        pre_cwd = assistant_ws_root if use_assistant_ws else None
        return WebBuildPlan(
            install_cmd=[bun, "install"],
            build_cmd=[bun, "run", "build"],
            install_cwd=install_cwd,
            build_cwd=web_src,
            manager_label=mgr,
            pre_build_cmd=pre_cmd,
            pre_build_cwd=pre_cwd,
        )

    if bun_lock.exists() or bun_lockb.exists():
        if not bun:
            raise RuntimeError(f"bun.lock exists but bun not found for {web_src}")
        return bun_plan("bun(lockfile)")
    if pnpm_lock.exists():
        if use_assistant_ws:
            raise RuntimeError(
                f"{web_src}: @dawnchat assistant SDK workspace:* dependencies require Bun and "
                "dawnchat-plugins/assistant-workspace; remove pnpm-lock.yaml or migrate the template."
            )
        if not pnpm:
            raise RuntimeError(f"pnpm-lock.yaml exists but pnpm not found for {web_src}")
        return WebBuildPlan(
            install_cmd=[pnpm, "install", "--ignore-workspace", "--no-frozen-lockfile"],
            build_cmd=[pnpm, "run", "build"],
            install_cwd=web_src,
            build_cwd=web_src,
            manager_label="pnpm(lockfile)",
        )
    if npm_lock.exists():
        if not npm:
            raise RuntimeError(f"package-lock.json exists but npm not found for {web_src}")
        return WebBuildPlan(
            install_cmd=[npm, "install"],
            build_cmd=[npm, "run", "build"],
            install_cwd=web_src,
            build_cwd=web_src,
            manager_label="npm(lockfile)",
        )
    if yarn_lock.exists():
        if not yarn:
            raise RuntimeError(f"yarn.lock exists but yarn not found for {web_src}")
        return WebBuildPlan(
            install_cmd=[yarn, "install"],
            build_cmd=[yarn, "build"],
            install_cwd=web_src,
            build_cwd=web_src,
            manager_label="yarn(lockfile)",
        )

    if pnpm:
        return WebBuildPlan(
            install_cmd=[pnpm, "install", "--ignore-workspace", "--no-frozen-lockfile"],
            build_cmd=[pnpm, "run", "build"],
            install_cwd=web_src,
            build_cwd=web_src,
            manager_label="pnpm(fallback)",
        )
    if bun:
        return bun_plan("bun(fallback)")
    if npm:
        return WebBuildPlan(
            install_cmd=[npm, "install"],
            build_cmd=[npm, "run", "build"],
            install_cwd=web_src,
            build_cwd=web_src,
            manager_label="npm(fallback)",
        )

    raise RuntimeError(f"No package manager found for {web_src}")


def _build_web_assets(plugin_dir: Path) -> None:
    manifest = _read_json(plugin_dir / "manifest.json")
    ui = manifest.get("ui") or {}
    ui_type = str(ui.get("type") or "").strip().lower()
    web_src = plugin_dir / "web-src"
    if ui_type != "web" and not web_src.exists():
        return
    if not web_src.exists():
        return

    plan = _resolve_web_build_plan(web_src)
    print(f"[web-build] {plugin_dir.name}: manager={plan.manager_label}")
    print(
        f"[web-build] {plugin_dir.name}: install(cwd={plan.install_cwd})={' '.join(plan.install_cmd)}"
    )
    if plan.pre_build_cmd:
        print(
            f"[web-build] {plugin_dir.name}: pre-build(cwd={plan.pre_build_cwd})="
            f"{' '.join(plan.pre_build_cmd)}"
        )
    print(f"[web-build] {plugin_dir.name}: build(cwd={plan.build_cwd})={' '.join(plan.build_cmd)}")

    subprocess.run(
        plan.install_cmd,
        cwd=plan.install_cwd,
        check=True,
    )
    if plan.pre_build_cmd:
        subprocess.run(
            plan.pre_build_cmd,
            cwd=plan.pre_build_cwd,
            check=True,
        )
    subprocess.run(plan.build_cmd, cwd=plan.build_cwd, check=True)


def _iter_packable_files(
    plugin_dir: Path,
    *,
    include_web_src: bool,
    include_node_modules: bool = False,
) -> list[tuple[Path, str]]:
    entries: list[tuple[Path, str]] = []
    for file_path in plugin_dir.rglob("*"):
        if file_path.is_dir():
            continue
        if _is_dangling_symlink(file_path):
            print(f"skip dangling symlink: {file_path}")
            continue
        rel = file_path.relative_to(plugin_dir)
        if _should_exclude(rel, include_node_modules=include_node_modules):
            continue
        if not include_web_src and rel.parts and rel.parts[0] == "web-src":
            continue
        arcname = (Path(plugin_dir.name) / rel).as_posix()
        entries.append((file_path, arcname))
    # Stable ordering makes archive layout deterministic across OS/filesystems.
    entries.sort(key=lambda item: item[1])
    return entries


def _build_zip_info(file_path: Path, arcname: str) -> ZipInfo:
    info = ZipInfo(filename=arcname, date_time=REPRODUCIBLE_ZIP_DATETIME)
    info.compress_type = ZIP_DEFLATED
    mode = file_path.stat().st_mode & 0o777
    if mode == 0:
        mode = DEFAULT_FILE_MODE
    info.create_system = 3  # UNIX
    info.external_attr = (mode & 0xFFFF) << 16
    return info


def _package_plugin(
    plugin_dir: Path,
    output_dir: Path,
    ext: str,
    *,
    include_web_src: bool,
    build_web_assets: bool,
    package_variant: str = "default",
) -> PackageResult:
    if build_web_assets:
        _build_web_assets(plugin_dir)
    manifest_path = plugin_dir / "manifest.json"
    manifest = _read_json(manifest_path)
    plugin_id = str(manifest["id"])
    version = str(manifest["version"])
    suffix = f"-{package_variant}" if package_variant != "default" else ""
    package_name = f"{plugin_id}-{version}{suffix}{ext}"
    package_path = output_dir / package_name

    with ZipFile(package_path, "w", compression=ZIP_DEFLATED, compresslevel=9) as zf:
        for file_path, arcname in _iter_packable_files(
            plugin_dir,
            include_web_src=include_web_src,
            include_node_modules=(package_variant == "node_modules"),
        ):
            try:
                info = _build_zip_info(file_path, arcname)
                zf.writestr(info, file_path.read_bytes(), compress_type=ZIP_DEFLATED)
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
        package_variant=package_variant,
    )


def _build_catalog(
    packages: list[PackageResult],
    *,
    release_tag: str,
    shared_rules: SharedRulesResult | None = None,
) -> dict[str, Any]:
    generated_at = datetime.now(timezone.utc).isoformat()
    plugins: list[dict[str, Any]] = []
    grouped: dict[tuple[str, str], list[PackageResult]] = {}
    for result in packages:
        grouped.setdefault((result.plugin_id, result.version), []).append(result)

    variant_priority = {"dist": 0, "default": 1, "node_modules": 2}
    for (_plugin_id, _version), group in grouped.items():
        group.sort(key=lambda item: variant_priority.get(item.package_variant, 9))
        primary = group[0]
        manifest = primary.manifest
        package_url = primary.package_url
        package_sha256 = primary.published_sha256 or primary.sha256
        package_size = primary.published_size or primary.size
        package_file_name = primary.published_file_name or primary.package_name

        distribution_catalog: dict[str, Any] = {}
        for item in group:
            item_url = item.package_url
            item_sha256 = item.published_sha256 or item.sha256
            item_size = item.published_size or item.size
            item_file_name = item.published_file_name or item.package_name
            variant = item.package_variant
            if variant == "dist":
                distribution_catalog["dist_url"] = item_url
                distribution_catalog["dist_sha256"] = item_sha256
                distribution_catalog["dist_size"] = item_size
                distribution_catalog["dist_file_name"] = item_file_name
            elif variant == "node_modules":
                distribution_catalog["node_modules_url"] = item_url
                distribution_catalog["node_modules_sha256"] = item_sha256
                distribution_catalog["node_modules_size"] = item_size
                distribution_catalog["node_modules_file_name"] = item_file_name

        plugin_entry = {
            "id": primary.plugin_id,
            "name": manifest.get("name", primary.plugin_id),
            "version": primary.version,
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
        if distribution_catalog:
            plugin_entry["distribution"] = {
                "default_variant": primary.package_variant,
                "catalog": distribution_catalog,
            }
        plugins.append(plugin_entry)

    payload: dict[str, Any] = {
        "schema_version": "1.0.0",
        "release_tag": release_tag,
        "generated_at": generated_at,
        "plugins": sorted(plugins, key=lambda item: str(item.get("id", ""))),
    }
    if shared_rules is not None:
        payload["shared_opencode_rules"] = {
            "version": shared_rules.version,
            "published_at": generated_at,
            "min_host_version": shared_rules.min_host_version,
            "package": {
                "url": shared_rules.package_url,
                "sha256": shared_rules.published_sha256 or shared_rules.sha256,
                "size": shared_rules.published_size or shared_rules.size,
                "file_name": shared_rules.published_file_name or shared_rules.package_name,
            },
            "manifest": shared_rules.manifest,
        }
    return payload


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
    parser.add_argument(
        "--include-web-src",
        action=argparse.BooleanOptionalAction,
        default=True,
        help="Include web-src source files in plugin package (default: true)",
    )
    parser.add_argument(
        "--build-web-assets",
        action=argparse.BooleanOptionalAction,
        default=True,
        help="Build web assets before packaging (default: true)",
    )
    parser.add_argument(
        "--check-r2-only",
        action="store_true",
        help="Only check immutable conflicts against R2 metadata; do not upload packages/catalog",
    )
    parser.add_argument(
        "--conflicts-json",
        default="",
        help="Optional file path to write detected immutable conflicts as JSON",
    )
    parser.add_argument(
        "--verify-reproducible",
        action=argparse.BooleanOptionalAction,
        default=False,
        help="Package each plugin twice (without rebuilding web assets) and fail if checksums differ",
    )
    parser.add_argument(
        "--shared-rules-root",
        default=".opencode",
        help="Directory containing shared OpenCode rules and manifest.json",
    )
    return parser.parse_args()


def _resolve_manifest_package_variants(manifest: dict[str, Any]) -> list[str]:
    distribution = manifest.get("distribution") if isinstance(manifest, dict) else None
    if not isinstance(distribution, dict):
        return ["default"]
    raw = distribution.get("packages")
    if not isinstance(raw, list):
        return ["default"]
    variants: list[str] = []
    for item in raw:
        normalized = str(item or "").strip().lower()
        if normalized in {"dist", "node_modules"} and normalized not in variants:
            variants.append(normalized)
    if not variants:
        return ["default"]
    return variants


def _build_package_key(result: PackageResult) -> str:
    return f"packages/{result.plugin_id}/{result.version}/{result.package_name}"


def _build_shared_rules_key(result: SharedRulesResult) -> str:
    return f"opencode-rules/{result.version}/{result.package_name}"


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


def _build_shared_rules_meta(result: SharedRulesResult, package_key: str) -> dict[str, Any]:
    return {
        "plugin_id": "__shared_opencode_rules__",
        "version": result.version,
        "file_name": result.package_name,
        "sha256": result.sha256,
        "size": result.size,
        "package_key": package_key,
        "min_host_version": result.min_host_version,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }


def _build_conflict_record(
    *,
    result: PackageResult,
    package_key: str,
    reason: str,
    expected_sha256: str,
    actual_sha256: str,
    expected_size: int,
    actual_size: int,
) -> ConflictRecord:
    return ConflictRecord(
        plugin_id=result.plugin_id,
        version=result.version,
        package_name=result.package_name,
        package_key=package_key,
        reason=reason,
        expected_sha256=expected_sha256.lower(),
        actual_sha256=actual_sha256.lower(),
        expected_size=expected_size,
        actual_size=actual_size,
    )


def _write_conflicts_json(conflicts: list[ConflictRecord], path: Path) -> None:
    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "conflicts": [
            {
                "plugin_id": item.plugin_id,
                "version": item.version,
                "package_name": item.package_name,
                "package_key": item.package_key,
                "reason": item.reason,
                "expected_sha256": item.expected_sha256,
                "actual_sha256": item.actual_sha256,
                "expected_size": item.expected_size,
                "actual_size": item.actual_size,
            }
            for item in conflicts
        ],
    }
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + os.linesep, encoding="utf-8")


def _verify_reproducible_packages(
    plugin_dirs: list[Path],
    output_dir: Path,
    ext: str,
    *,
    include_web_src: bool,
) -> None:
    verification_dir = output_dir / "_repro_check"
    if verification_dir.exists():
        shutil.rmtree(verification_dir)
    verification_dir.mkdir(parents=True, exist_ok=True)
    for plugin_dir in plugin_dirs:
        manifest = _read_json(plugin_dir / "manifest.json")
        variants = _resolve_manifest_package_variants(manifest)
        for variant in variants:
            first = _package_plugin(
                plugin_dir,
                output_dir,
                ext,
                include_web_src=include_web_src,
                build_web_assets=False,
                package_variant=variant,
            )
            second = _package_plugin(
                plugin_dir,
                verification_dir,
                ext,
                include_web_src=include_web_src,
                build_web_assets=False,
                package_variant=variant,
            )
            if first.sha256.lower() != second.sha256.lower() or first.size != second.size:
                raise RuntimeError(
                    "Non-reproducible package detected for "
                    f"{first.plugin_id}@{first.version}({variant}): "
                    f"first_sha={first.sha256}, second_sha={second.sha256}"
                )
    print(f"reproducibility check passed for {len(plugin_dirs)} plugin(s)")


def _iter_shared_rules_files(shared_rules_root: Path) -> list[tuple[Path, str]]:
    entries: list[tuple[Path, str]] = []
    for file_path in shared_rules_root.rglob("*"):
        if file_path.is_dir():
            continue
        if _is_dangling_symlink(file_path):
            print(f"skip dangling symlink in shared rules: {file_path}")
            continue
        rel = file_path.relative_to(shared_rules_root)
        if _should_exclude(rel):
            continue
        entries.append((file_path, rel.as_posix()))
    entries.sort(key=lambda item: item[1])
    return entries


def _package_shared_rules(shared_rules_root: Path, output_dir: Path) -> SharedRulesResult | None:
    if not shared_rules_root.exists() or not shared_rules_root.is_dir():
        print(f"shared rules root not found, skip: {shared_rules_root}")
        return None
    manifest_path = shared_rules_root / "manifest.json"
    if not manifest_path.exists():
        print(f"shared rules manifest missing, skip: {manifest_path}")
        return None
    manifest = _read_json(manifest_path)
    _validate_iwp_runtime_lock(shared_rules_root)
    version = str(manifest.get("version") or "").strip()
    if not version:
        raise RuntimeError("shared rules manifest version is required")
    package_name = str(manifest.get("package_name") or "").strip() or f"opencode-rules-{version}.zip"
    package_path = output_dir / package_name
    with ZipFile(package_path, "w", compression=ZIP_DEFLATED, compresslevel=9) as zf:
        for file_path, arcname in _iter_shared_rules_files(shared_rules_root):
            info = _build_zip_info(file_path, arcname)
            zf.writestr(info, file_path.read_bytes(), compress_type=ZIP_DEFLATED)
    size = package_path.stat().st_size
    sha256 = _sha256_file(package_path)
    min_host_version = str(manifest.get("min_host_version") or "1.0.0")
    return SharedRulesResult(
        version=version,
        package_name=package_name,
        package_path=package_path,
        sha256=sha256,
        size=size,
        manifest=manifest,
        min_host_version=min_host_version,
    )


def _sync_packages_to_r2(
    packages: list[PackageResult],
    config: R2SyncConfig,
    *,
    check_only: bool = False,
) -> list[ConflictRecord]:
    client = R2Client(config)
    conflicts: list[ConflictRecord] = []
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
                conflicts.append(
                    _build_conflict_record(
                        result=result,
                        package_key=package_key,
                        reason="meta_mismatch",
                        expected_sha256=existing_sha,
                        actual_sha256=result.sha256,
                        expected_size=existing_size,
                        actual_size=result.size,
                    )
                )
                continue
            print(f"skip upload (meta matched): {result.plugin_id}@{result.version}")
            result.package_key = package_key
            result.package_url = f"{config.public_base_url}/{package_key}"
            result.published_sha256 = existing_sha
            result.published_size = existing_size
            result.published_file_name = existing_file_name
            continue

        if client.object_exists(package_key):
            conflicts.append(
                _build_conflict_record(
                    result=result,
                    package_key=package_key,
                    reason="package_exists_without_meta",
                    expected_sha256="",
                    actual_sha256=result.sha256,
                    expected_size=0,
                    actual_size=result.size,
                )
            )
            continue

        if check_only:
            continue

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
    return conflicts


def _sync_shared_rules_to_r2(
    shared_rules: SharedRulesResult,
    config: R2SyncConfig,
    *,
    check_only: bool = False,
) -> list[ConflictRecord]:
    client = R2Client(config)
    conflicts: list[ConflictRecord] = []
    package_key = _build_shared_rules_key(shared_rules)
    meta_key = f"{package_key}.meta.json"
    existing_meta = client.get_json(meta_key)
    if existing_meta is not None:
        existing_sha = str(existing_meta.get("sha256") or "").lower()
        existing_size = int(existing_meta.get("size") or 0)
        existing_file_name = str(existing_meta.get("file_name") or "")
        existing_version = str(existing_meta.get("version") or "")
        if (
            existing_sha != shared_rules.sha256.lower()
            or existing_size != shared_rules.size
            or existing_file_name != shared_rules.package_name
            or existing_version != shared_rules.version
        ):
            conflicts.append(
                ConflictRecord(
                    plugin_id="__shared_opencode_rules__",
                    version=shared_rules.version,
                    package_name=shared_rules.package_name,
                    package_key=package_key,
                    reason="shared_rules_meta_mismatch",
                    expected_sha256=existing_sha,
                    actual_sha256=shared_rules.sha256,
                    expected_size=existing_size,
                    actual_size=shared_rules.size,
                )
            )
            return conflicts
        print(f"skip upload shared rules (meta matched): {shared_rules.version}")
        shared_rules.package_key = package_key
        shared_rules.package_url = f"{config.public_base_url}/{package_key}"
        shared_rules.published_sha256 = existing_sha
        shared_rules.published_size = existing_size
        shared_rules.published_file_name = existing_file_name
        return conflicts

    if client.object_exists(package_key):
        conflicts.append(
            ConflictRecord(
                plugin_id="__shared_opencode_rules__",
                version=shared_rules.version,
                package_name=shared_rules.package_name,
                package_key=package_key,
                reason="shared_rules_exists_without_meta",
                expected_sha256="",
                actual_sha256=shared_rules.sha256,
                expected_size=0,
                actual_size=shared_rules.size,
            )
        )
        return conflicts

    if check_only:
        return conflicts

    package_bytes = shared_rules.package_path.read_bytes()
    client.put_object(package_key, package_bytes, "application/octet-stream")
    meta_payload = _build_shared_rules_meta(shared_rules, package_key)
    client.put_object(
        meta_key,
        (json.dumps(meta_payload, ensure_ascii=False, indent=2) + os.linesep).encode("utf-8"),
        "application/json",
    )
    print(f"uploaded shared rules package+meta: {shared_rules.version}")
    shared_rules.package_key = package_key
    shared_rules.package_url = f"{config.public_base_url}/{package_key}"
    shared_rules.published_sha256 = shared_rules.sha256
    shared_rules.published_size = shared_rules.size
    shared_rules.published_file_name = shared_rules.package_name
    return conflicts


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
        manifest = _read_json(plugin_dir / "manifest.json")
        variants = _resolve_manifest_package_variants(manifest)
        built_assets = False
        for variant in variants:
            result = _package_plugin(
                plugin_dir,
                output_dir,
                args.ext,
                include_web_src=bool(args.include_web_src),
                build_web_assets=bool(args.build_web_assets) and not built_assets,
                package_variant=variant,
            )
            packages.append(result)
            built_assets = True
            print(
                f"packaged {result.plugin_id}@{result.version} "
                f"(variant={result.package_variant}) -> {result.package_name}"
            )

    shared_rules_root = (repo_root / args.shared_rules_root).resolve()
    shared_rules = _package_shared_rules(shared_rules_root, output_dir)
    if shared_rules is not None:
        print(f"packaged shared rules {shared_rules.version} -> {shared_rules.package_name}")

    if bool(args.verify_reproducible):
        _verify_reproducible_packages(
            plugin_dirs,
            output_dir,
            args.ext,
            include_web_src=bool(args.include_web_src),
        )

    r2_config = R2SyncConfig.from_env()
    conflicts_json_path = Path(args.conflicts_json).resolve() if args.conflicts_json else None
    if r2_config:
        conflicts = _sync_packages_to_r2(
            packages,
            r2_config,
            check_only=bool(args.check_r2_only),
        )
        if shared_rules is not None:
            conflicts.extend(
                _sync_shared_rules_to_r2(
                    shared_rules,
                    r2_config,
                    check_only=bool(args.check_r2_only),
                )
            )
        if conflicts_json_path is not None:
            _write_conflicts_json(conflicts, conflicts_json_path)
            print(f"wrote conflicts report: {conflicts_json_path}")
        if conflicts:
            conflict_ids = sorted({item.plugin_id for item in conflicts})
            print("")
            print("immutable conflicts detected:")
            print(f"total_conflicts={len(conflicts)}, plugins={len(conflict_ids)}")
            print(f"conflicted_plugin_ids={','.join(conflict_ids)}")
            for conflict in conflicts:
                print(
                    f"- {conflict.plugin_id}@{conflict.version}: {conflict.reason} "
                    f"(expected_sha256={conflict.expected_sha256 or 'N/A'}, actual_sha256={conflict.actual_sha256})"
                )
            return 3
        if args.check_r2_only:
            print("no immutable conflicts detected")
            return 0
    else:
        if args.check_r2_only:
            raise RuntimeError("--check-r2-only requires R2 credentials")
        if not args.base_url:
            raise RuntimeError("--base-url is required when R2 sync is disabled")
        base_url = args.base_url.rstrip("/")
        for result in packages:
            result.package_url = f"{base_url}/{args.release_tag}/{result.package_name}"
            result.published_sha256 = result.sha256
            result.published_size = result.size
            result.published_file_name = result.package_name
        if shared_rules is not None:
            shared_rules.package_url = f"{base_url}/{args.release_tag}/{shared_rules.package_name}"
            shared_rules.published_sha256 = shared_rules.sha256
            shared_rules.published_size = shared_rules.size
            shared_rules.published_file_name = shared_rules.package_name

    catalog = _build_catalog(
        packages,
        release_tag=args.release_tag,
        shared_rules=shared_rules,
    )
    catalog_path = output_dir / "plugins.json"
    catalog_path.write_text(
        json.dumps(catalog, ensure_ascii=False, indent=2) + os.linesep,
        encoding="utf-8",
    )
    print(f"generated catalog: {catalog_path}")
    if r2_config and not args.check_r2_only:
        _upload_catalog_to_r2(catalog_path, r2_config)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
