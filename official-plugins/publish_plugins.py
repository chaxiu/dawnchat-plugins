import argparse
import hashlib
import hmac
import json
import os
import shutil
import subprocess
import sys
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable, Tuple
from zipfile import ZipFile, ZIP_DEFLATED


def read_json(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def iter_plugin_dirs(base_dir: Path) -> Iterable[Path]:
    for item in base_dir.iterdir():
        if not item.is_dir():
            continue
        if (item / "manifest.json").exists():
            yield item


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def latest_mtime(path: Path) -> float:
    if not path.exists():
        return 0.0
    latest = 0.0
    for file_path in path.rglob("*"):
        if file_path.is_file():
            latest = max(latest, file_path.stat().st_mtime)
    return latest


def should_exclude(path: Path) -> bool:
    exclude_dirs = {
        ".git",
        ".venv",
        ".mypy_cache",
        ".pytest_cache",
        "__pycache__",
        "node_modules",
    }
    exclude_files = {".DS_Store"}
    exclude_suffixes = {".pyc"}
    if any(part in exclude_dirs for part in path.parts):
        return True
    if path.name in exclude_files:
        return True
    if path.suffix in exclude_suffixes:
        return True
    if "web-src" in path.parts and "dist" in path.parts:
        return True
    return False


def should_build_web_assets(web_src_dir: Path, web_dir: Path, force: bool) -> bool:
    if not web_src_dir.exists():
        return False
    if force:
        return True
    if not web_dir.exists() or not any(web_dir.iterdir()):
        return True
    return latest_mtime(web_src_dir) > latest_mtime(web_dir)


def build_package(plugin_dir: Path, output_dir: Path, ext: str) -> Tuple[Path, int, str]:
    manifest = read_json(plugin_dir / "manifest.json")
    web_src_dir = plugin_dir / "web-src"
    web_dir = plugin_dir / "web"
    ui_type = (manifest.get("ui") or {}).get("type")
    force_build = str(os.getenv("DAWNCHAT_PLUGIN_BUILD_FORCE", "")).strip() != ""
    if (ui_type == "web" or web_src_dir.exists()) and should_build_web_assets(web_src_dir, web_dir, force_build):
        pnpm_path = shutil.which("pnpm")
        if not pnpm_path:
            raise RuntimeError(f"pnpm not found for building web assets: {plugin_dir.name}")
        if not (web_src_dir / "node_modules").exists() or force_build:
            subprocess.run(
                [pnpm_path, "install", "--silent", "--ignore-workspace", "--no-frozen-lockfile"],
                cwd=str(web_src_dir),
                check=True,
            )
        subprocess.run([pnpm_path, "exec", "vite", "build"], cwd=str(web_src_dir), check=True)
        if not web_dir.exists() or not any(web_dir.iterdir()):
            raise RuntimeError(f"web build output missing: {plugin_dir.name}")
    plugin_id = manifest.get("id")
    version = manifest.get("version")
    if not plugin_id or not version:
        raise ValueError(f"Invalid manifest in {plugin_dir}")
    output_dir.mkdir(parents=True, exist_ok=True)
    package_name = f"{plugin_id}-{version}{ext}"
    package_path = output_dir / package_name
    with ZipFile(package_path, "w", ZIP_DEFLATED) as zf:
        for file_path in plugin_dir.rglob("*"):
            if file_path.is_dir():
                continue
            if should_exclude(file_path):
                continue
            rel = file_path.relative_to(plugin_dir)
            arcname = (Path(plugin_dir.name) / rel).as_posix()
            zf.write(file_path, arcname)
    size = package_path.stat().st_size
    digest = sha256_file(package_path)
    return package_path, size, digest


def sign(key: bytes, msg: str) -> bytes:
    return hmac.new(key, msg.encode("utf-8"), hashlib.sha256).digest()


def get_signature_key(key: str, date_stamp: str, region: str, service: str) -> bytes:
    k_date = sign(("AWS4" + key).encode("utf-8"), date_stamp)
    k_region = sign(k_date, region)
    k_service = sign(k_region, service)
    k_signing = sign(k_service, "aws4_request")
    return k_signing


def r2_put_object(
    endpoint: str,
    bucket: str,
    key: str,
    body: bytes,
    content_type: str,
    access_key: str,
    secret_key: str,
    region: str,
) -> str:
    parsed = urllib.parse.urlparse(endpoint)
    host = parsed.netloc
    scheme = parsed.scheme or "https"
    method = "PUT"
    now = datetime.now(timezone.utc)
    amz_date = now.strftime("%Y%m%dT%H%M%SZ")
    date_stamp = now.strftime("%Y%m%d")
    canonical_uri = f"/{bucket}/{key}"
    payload_hash = hashlib.sha256(body).hexdigest()
    canonical_headers = (
        f"content-type:{content_type}\n"
        f"host:{host}\n"
        f"x-amz-content-sha256:{payload_hash}\n"
        f"x-amz-date:{amz_date}\n"
    )
    signed_headers = "content-type;host;x-amz-content-sha256;x-amz-date"
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
    algorithm = "AWS4-HMAC-SHA256"
    credential_scope = f"{date_stamp}/{region}/s3/aws4_request"
    string_to_sign = "\n".join(
        [
            algorithm,
            amz_date,
            credential_scope,
            hashlib.sha256(canonical_request.encode("utf-8")).hexdigest(),
        ]
    )
    signing_key = get_signature_key(secret_key, date_stamp, region, "s3")
    signature = hmac.new(signing_key, string_to_sign.encode("utf-8"), hashlib.sha256).hexdigest()
    authorization = (
        f"{algorithm} Credential={access_key}/{credential_scope}, "
        f"SignedHeaders={signed_headers}, Signature={signature}"
    )
    url = f"{scheme}://{host}{canonical_uri}"
    req = urllib.request.Request(
        url,
        data=body,
        method="PUT",
        headers={
            "Content-Type": content_type,
            "Host": host,
            "x-amz-content-sha256": payload_hash,
            "x-amz-date": amz_date,
            "Authorization": authorization,
        },
    )
    with urllib.request.urlopen(req) as resp:
        if resp.status not in (200, 201, 204):
            raise RuntimeError(f"Upload failed: {resp.status}")
    return url


def supabase_request(method: str, url: str, key: str, payload: dict | list | None) -> dict | list | None:
    headers = {
        "Content-Type": "application/json",
        "apikey": key,
        "Authorization": f"Bearer {key}",
    }
    data = None
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, method=method, headers=headers)
    with urllib.request.urlopen(req) as resp:
        if resp.status == 204:
            return None
        body = resp.read()
        if not body:
            return None
        return json.loads(body.decode("utf-8"))


def supabase_upsert(
    base_url: str,
    key: str,
    table: str,
    on_conflict: str,
    payload: dict,
) -> dict | list | None:
    url = f"{base_url}/rest/v1/{table}?on_conflict={urllib.parse.quote(on_conflict)}"
    headers = {
        "Content-Type": "application/json",
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Prefer": "resolution=merge-duplicates,return=representation",
    }
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, method="POST", headers=headers)
    with urllib.request.urlopen(req) as resp:
        body = resp.read()
        if not body:
            return None
        return json.loads(body.decode("utf-8"))


def supabase_patch(
    base_url: str,
    key: str,
    table: str,
    query: str,
    payload: dict,
) -> None:
    url = f"{base_url}/rest/v1/{table}?{query}"
    headers = {
        "Content-Type": "application/json",
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Prefer": "return=representation",
    }
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, method="PATCH", headers=headers)
    with urllib.request.urlopen(req) as resp:
        if resp.status not in (200, 204):
            raise RuntimeError(f"Patch failed: {resp.status}")


def publish_plugin(
    plugin_dir: Path,
    output_dir: Path,
    ext: str,
    visibility: str,
    stage: str | None,
    owner_id: str | None,
    cdn_base_url: str,
    r2_endpoint: str,
    r2_bucket: str,
    r2_region: str,
    r2_access_key: str,
    r2_secret_key: str,
    supabase_url: str,
    supabase_key: str,
) -> None:
    manifest = read_json(plugin_dir / "manifest.json")
    plugin_id = manifest.get("id")
    version = manifest.get("version")
    name = manifest.get("name")
    if not plugin_id or not version or not name:
        raise ValueError(f"Invalid manifest in {plugin_dir}")
    package_path, size, digest = build_package(plugin_dir, output_dir, ext)
    key = f"plugins/{plugin_id}/{version}/{package_path.name}"
    content_type = "application/octet-stream"
    upload_url = r2_put_object(
        r2_endpoint,
        r2_bucket,
        key,
        package_path.read_bytes(),
        content_type,
        r2_access_key,
        r2_secret_key,
        r2_region,
    )
    cdn_url = f"{cdn_base_url.rstrip('/')}/{key}"
    now = datetime.now(timezone.utc).isoformat()
    stage_value = stage if visibility == "public" else None
    plugin_payload = {
        "id": plugin_id,
        "name": name,
        "description": manifest.get("description", ""),
        "author": manifest.get("author", ""),
        "icon": manifest.get("icon", "📦"),
        "tags": manifest.get("tags", []),
        "visibility": visibility,
        "stage": stage_value,
        "owner_id": owner_id,
        "is_official": True,
        "latest_version": version,
        "updated_at": now,
    }
    version_payload = {
        "plugin_id": plugin_id,
        "version": version,
        "package_url": cdn_url,
        "package_sha256": digest,
        "package_size": size,
        "manifest_json": manifest,
        "visibility": visibility,
        "stage": stage_value,
        "is_latest": True,
        "published_at": now,
    }
    supabase_upsert(supabase_url, supabase_key, "plugins", "id", plugin_payload)
    query = f"plugin_id=eq.{urllib.parse.quote(plugin_id)}&version=neq.{urllib.parse.quote(version)}"
    supabase_patch(supabase_url, supabase_key, "plugin_versions", query, {"is_latest": False})
    supabase_upsert(supabase_url, supabase_key, "plugin_versions", "plugin_id,version", version_payload)
    if upload_url:
        print(f"published {plugin_id}@{version} -> {cdn_url}")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--plugin-id", dest="plugin_id")
    parser.add_argument("--visibility", default="public", choices=["public", "private"])
    parser.add_argument("--stage", default="release", choices=["alpha", "beta", "release"])
    parser.add_argument("--owner-id")
    parser.add_argument("--output-dir")
    args = parser.parse_args()

    base_dir = Path(__file__).resolve().parent
    output_dir = Path(args.output_dir) if args.output_dir else base_dir / ".dist"

    ext = os.getenv("DAWNCHAT_PLUGIN_PACKAGE_EXT", ".dawnplugin")
    cdn_base_url = os.getenv("CLOUDFLARE_CDN_BASE_URL")
    r2_endpoint = os.getenv("CLOUDFLARE_R2_ENDPOINT")
    r2_bucket = os.getenv("CLOUDFLARE_R2_BUCKET")
    r2_region = os.getenv("CLOUDFLARE_R2_REGION", "auto")
    r2_access_key = os.getenv("CLOUDFLARE_R2_ACCESS_KEY_ID")
    r2_secret_key = os.getenv("CLOUDFLARE_R2_SECRET_ACCESS_KEY")
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

    required = {
        "CLOUDFLARE_CDN_BASE_URL": cdn_base_url,
        "CLOUDFLARE_R2_ENDPOINT": r2_endpoint,
        "CLOUDFLARE_R2_BUCKET": r2_bucket,
        "CLOUDFLARE_R2_ACCESS_KEY_ID": r2_access_key,
        "CLOUDFLARE_R2_SECRET_ACCESS_KEY": r2_secret_key,
        "SUPABASE_URL": supabase_url,
        "SUPABASE_SERVICE_ROLE_KEY": supabase_key,
    }
    missing = [k for k, v in required.items() if not v]
    if missing:
        print(f"Missing environment variables: {', '.join(missing)}")
        return 1

    if args.visibility == "private" and not args.owner_id:
        print("owner-id is required for private visibility")
        return 1

    stage = args.stage if args.visibility == "public" else None

    plugin_dirs = list(iter_plugin_dirs(base_dir))
    if args.plugin_id:
        plugin_dirs = [p for p in plugin_dirs if (read_json(p / "manifest.json").get("id") == args.plugin_id)]
    if not plugin_dirs:
        print("No plugins found to publish")
        return 1

    for plugin_dir in plugin_dirs:
        publish_plugin(
            plugin_dir=plugin_dir,
            output_dir=output_dir,
            ext=ext,
            visibility=args.visibility,
            stage=stage,
            owner_id=args.owner_id,
            cdn_base_url=cdn_base_url,
            r2_endpoint=r2_endpoint,
            r2_bucket=r2_bucket,
            r2_region=r2_region,
            r2_access_key=r2_access_key,
            r2_secret_key=r2_secret_key,
            supabase_url=supabase_url,
            supabase_key=supabase_key,
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
