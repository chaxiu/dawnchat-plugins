#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
import shutil
from urllib.request import urlopen
import zipfile


LOCK_SCHEMA_VERSION = "1.0.0"
DEFAULT_RUNTIME_VERSION = "0.1.0-local"
DEFAULT_SOURCE_MODE = "local"
DEFAULT_RUNTIME_REPO = "InstructWare/instructware.org"
DEFAULT_TOOLS_REPO = "InstructWare/iwp-tools"


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as f:
        while True:
            chunk = f.read(1024 * 1024)
            if not chunk:
                break
            digest.update(chunk)
    return digest.hexdigest()


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def ensure_parent(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)


def source_mappings() -> list[dict[str, str]]:
    return [
        {
            "id": "manifesto",
            "source_root": "instructware.org",
            "source_rel": "whitepaper/manifesto.md",
            "target": "whitepaper/manifesto.md",
        },
        {
            "id": "protocol",
            "source_root": "instructware.org",
            "source_rel": "protocol/IWP-v1.md",
            "target": "protocol/IWP-v1.md",
        },
        {
            "id": "schema",
            "source_root": "instructware.org",
            "source_rel": "tools/schema/iwp-schema.v1.json",
            "target": "schema/iwp-schema.v1.json",
        },
        {
            "id": "agent-runtime",
            "source_root": "instructware.org",
            "source_rel": "agent/v2/agent.md",
            "target": "agent/v2/agent.md",
        },
        {
            "id": "agent-skill-README",
            "source_root": "instructware.org",
            "source_rel": "agent/v2/skills/README.md",
            "target": "agent/v2/skills/README.md",
        },
        {
            "id": "agent-skill-01",
            "source_root": "instructware.org",
            "source_rel": "agent/v2/skills/01-intent-authoring.md",
            "target": "agent/v2/skills/01-intent-authoring.md",
        },
        {
            "id": "agent-skill-02",
            "source_root": "instructware.org",
            "source_rel": "agent/v2/skills/02-ir-implementation.md",
            "target": "agent/v2/skills/02-ir-implementation.md",
        },
        {
            "id": "agent-skill-03",
            "source_root": "instructware.org",
            "source_rel": "agent/v2/skills/03-link-alignment.md",
            "target": "agent/v2/skills/03-link-alignment.md",
        },
        {
            "id": "agent-skill-04",
            "source_root": "instructware.org",
            "source_rel": "agent/v2/skills/04-reverse-review.md",
            "target": "agent/v2/skills/04-reverse-review.md",
        },
    ]


def write_runtime_readme(runtime_dir: Path, runtime_version: str, source_mode: str) -> None:
    content = "\n".join(
        [
            "# IWP Runtime Pack",
            "",
            "This directory is synchronized by `scripts/sync_iwp_runtime.py`.",
            "",
            f"- Runtime pack version: `{runtime_version}`",
            f"- Source mode: `{source_mode}`",
            "- Source of truth: local instructware.org or release runtime pack",
            "- Lock file: `../iwp-runtime.lock.json`",
            "",
            "Do not edit synced files manually.",
            "",
        ]
    )
    readme_path = runtime_dir / "README.md"
    ensure_parent(readme_path)
    readme_path.write_text(content, encoding="utf-8")


def write_lock(
    *,
    lock_file: Path,
    runtime_dir: Path,
    runtime_version: str,
    source_mode: str,
    sources: dict[str, object],
    lock_items: list[dict[str, str]],
) -> None:
    payload = {
        "schema_version": LOCK_SCHEMA_VERSION,
        "runtime_pack_version": runtime_version,
        "source_mode": source_mode,
        "generated_at": utc_now(),
        "sources": sources,
        "runtime_dir": runtime_dir.name,
        "files": lock_items,
    }
    ensure_parent(lock_file)
    lock_file.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def sync_runtime_local(
    *,
    runtime_dir: Path,
    lock_file: Path,
    instructware_root: Path,
    runtime_version: str,
) -> None:
    if runtime_dir.exists():
        shutil.rmtree(runtime_dir)
    runtime_dir.mkdir(parents=True, exist_ok=True)
    files = source_mappings()
    lock_items: list[dict[str, str]] = []
    for item in files:
        source_root = str(item["source_root"])
        if source_root == "instructware.org":
            source_path = (instructware_root / str(item["source_rel"])).resolve()
        else:
            raise RuntimeError(f"unsupported source root: {source_root}")
        if not source_path.exists() or not source_path.is_file():
            raise FileNotFoundError(f"missing source file: {source_path}")
        target_rel = Path(item["target"])
        target_path = runtime_dir / target_rel
        ensure_parent(target_path)
        shutil.copy2(source_path, target_path)
        lock_items.append(
            {
                "id": item["id"],
                "target": target_rel.as_posix(),
                "source": f"{source_root}/{item['source_rel']}",
                "sha256": sha256_file(target_path),
            }
        )
    write_runtime_readme(runtime_dir, runtime_version, source_mode="local")
    readme_rel = "README.md"
    lock_items.append(
        {
            "id": "runtime-readme",
            "target": readme_rel,
            "source": "generated",
            "sha256": sha256_file(runtime_dir / readme_rel),
        }
    )
    write_lock(
        lock_file=lock_file,
        runtime_dir=runtime_dir,
        runtime_version=runtime_version,
        source_mode="local",
        sources={
            "runtime_pack": {
                "repo": f"https://github.com/{DEFAULT_RUNTIME_REPO}",
                "path": "../instructware.org",
            }
        },
        lock_items=lock_items,
    )


def http_get_bytes(url: str) -> bytes:
    with urlopen(url) as resp:
        return resp.read()


def release_asset_url(repo: str, tag: str, file_name: str) -> str:
    return f"https://github.com/{repo}/releases/download/{tag}/{file_name}"


def safe_extract_zip(zip_path: Path, target_dir: Path) -> None:
    with zipfile.ZipFile(zip_path, "r") as zf:
        for member in zf.infolist():
            member_path = target_dir / member.filename
            if not str(member_path.resolve()).startswith(str(target_dir.resolve())):
                raise RuntimeError(f"unsafe zip entry: {member.filename}")
            zf.extract(member, target_dir)


def sync_runtime_release(
    *,
    runtime_dir: Path,
    lock_file: Path,
    runtime_version: str,
    runtime_repo: str,
    runtime_tag: str,
    runtime_manifest_url: str,
    runtime_pack_url: str,
    tools_repo: str,
    tools_tag: str,
    tools_manifest_url: str,
) -> None:
    manifest_bytes = http_get_bytes(runtime_manifest_url)
    runtime_manifest = json.loads(manifest_bytes.decode("utf-8"))
    pack = runtime_manifest.get("pack")
    files = runtime_manifest.get("files")
    if not isinstance(pack, dict) or not isinstance(files, list) or not files:
        raise RuntimeError("invalid runtime release manifest format")
    pack_name = str(pack.get("file_name") or "").strip()
    pack_sha = str(pack.get("sha256") or "").strip().lower()
    if not pack_name or not pack_sha:
        raise RuntimeError("runtime release manifest missing pack file_name or sha256")
    if runtime_dir.exists():
        shutil.rmtree(runtime_dir)
    runtime_dir.mkdir(parents=True, exist_ok=True)
    temp_zip = runtime_dir.parent / ".iwp-runtime-pack.tmp.zip"
    temp_zip.write_bytes(http_get_bytes(runtime_pack_url))
    actual_pack_sha = sha256_file(temp_zip).lower()
    if actual_pack_sha != pack_sha:
        raise RuntimeError(
            f"runtime pack checksum mismatch: expected={pack_sha} actual={actual_pack_sha}"
        )
    safe_extract_zip(temp_zip, runtime_dir)
    temp_zip.unlink(missing_ok=True)
    write_runtime_readme(runtime_dir, runtime_version, source_mode="release")
    lock_items: list[dict[str, str]] = []
    for item in files:
        if not isinstance(item, dict):
            raise RuntimeError("invalid runtime release manifest files entry")
        rel = str(item.get("path") or "").strip()
        expected = str(item.get("sha256") or "").strip().lower()
        if not rel or not expected:
            raise RuntimeError(f"runtime release manifest files entry missing path/sha256: {item}")
        target_file = runtime_dir / rel
        if not target_file.exists() or not target_file.is_file():
            raise FileNotFoundError(f"runtime file missing after extraction: {target_file}")
        actual = sha256_file(target_file).lower()
        if actual != expected:
            raise RuntimeError(
                f"runtime file checksum mismatch: {rel} expected={expected} actual={actual}"
            )
        rel_id = rel.replace("/", "__")
        lock_items.append(
            {
                "id": f"runtime::{rel_id}",
                "target": rel,
                "source": f"{runtime_repo}@{runtime_tag}:{rel}",
                "sha256": actual,
            }
        )
    readme_rel = "README.md"
    lock_items.append(
        {
            "id": "runtime-readme",
            "target": readme_rel,
            "source": "generated",
            "sha256": sha256_file(runtime_dir / readme_rel),
        }
    )
    tools_manifest = json.loads(http_get_bytes(tools_manifest_url).decode("utf-8"))
    tools_assets = tools_manifest.get("assets")
    if not isinstance(tools_assets, list) or not tools_assets:
        raise RuntimeError("invalid tools release manifest format")
    write_lock(
        lock_file=lock_file,
        runtime_dir=runtime_dir,
        runtime_version=runtime_version,
        source_mode="release",
        sources={
            "runtime_pack": {
                "repo": f"https://github.com/{runtime_repo}",
                "release_tag": runtime_tag,
                "manifest_url": runtime_manifest_url,
                "pack_url": runtime_pack_url,
                "pack_sha256": pack_sha,
                "manifest_sha256": hashlib.sha256(manifest_bytes).hexdigest(),
            },
            "iwp_tools_release": {
                "repo": f"https://github.com/{tools_repo}",
                "release_tag": tools_tag,
                "manifest_url": tools_manifest_url,
                "asset_count": len(tools_assets),
            },
        },
        lock_items=lock_items,
    )


def verify_lock(runtime_dir: Path, lock_file: Path) -> None:
    if not lock_file.exists():
        raise FileNotFoundError(f"lock file missing: {lock_file}")
    payload = json.loads(lock_file.read_text(encoding="utf-8"))
    files = payload.get("files")
    if not isinstance(files, list) or not files:
        raise RuntimeError("lock file has empty files list")
    for item in files:
        if not isinstance(item, dict):
            raise RuntimeError("lock file has invalid files entry")
        rel = str(item.get("target") or "").strip()
        expected = str(item.get("sha256") or "").strip().lower()
        if not rel or not expected:
            raise RuntimeError(f"lock entry missing target/sha256: {item}")
        file_path = runtime_dir / rel
        if not file_path.exists() or not file_path.is_file():
            raise FileNotFoundError(f"missing runtime file: {file_path}")
        actual = sha256_file(file_path).lower()
        if actual != expected:
            raise RuntimeError(f"checksum mismatch: {rel} expected={expected} actual={actual}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Sync and verify IWP runtime pack for shared OpenCode rules.")
    parser.add_argument(
        "--dawnchat-plugins-root",
        default=str(Path(__file__).resolve().parents[1]),
        help="Path to dawnchat-plugins repository root.",
    )
    parser.add_argument(
        "--instructware-root",
        default="",
        help="Path to instructware.org repository root. Defaults to <workspace>/instructware.org.",
    )
    parser.add_argument(
        "--runtime-version",
        default=DEFAULT_RUNTIME_VERSION,
        help="Runtime pack version written to lock file.",
    )
    parser.add_argument(
        "--source",
        choices=["local", "release"],
        default=DEFAULT_SOURCE_MODE,
        help="Sync source mode.",
    )
    parser.add_argument(
        "--runtime-release-tag",
        default="",
        help="Release tag for instructware.org runtime pack in release mode.",
    )
    parser.add_argument(
        "--runtime-repo",
        default=DEFAULT_RUNTIME_REPO,
        help="Runtime pack repository in owner/repo form.",
    )
    parser.add_argument(
        "--runtime-manifest-url",
        default="",
        help="Optional explicit URL for runtime pack manifest JSON.",
    )
    parser.add_argument(
        "--runtime-pack-url",
        default="",
        help="Optional explicit URL for runtime pack zip.",
    )
    parser.add_argument(
        "--tools-release-tag",
        default="",
        help="Release tag for iwp-tools manifest in release mode.",
    )
    parser.add_argument(
        "--tools-repo",
        default=DEFAULT_TOOLS_REPO,
        help="Tools repository in owner/repo form.",
    )
    parser.add_argument(
        "--tools-manifest-url",
        default="",
        help="Optional explicit URL for iwp-tools release-manifest.json.",
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="Verify lock file and runtime files without syncing.",
    )
    return parser.parse_args()


def resolve_paths(args: argparse.Namespace) -> tuple[Path, Path, Path]:
    plugins_root = Path(args.dawnchat_plugins_root).expanduser().resolve()
    if args.instructware_root:
        instructware_root = Path(args.instructware_root).expanduser().resolve()
    else:
        instructware_root = plugins_root.parent / "instructware.org"
    opencode_dir = plugins_root / ".opencode"
    runtime_dir = opencode_dir / "iwp-runtime"
    lock_file = opencode_dir / "iwp-runtime.lock.json"
    return instructware_root, runtime_dir, lock_file


def main() -> int:
    args = parse_args()
    instructware_root, runtime_dir, lock_file = resolve_paths(args)
    if args.check:
        verify_lock(runtime_dir, lock_file)
        print(f"iwp runtime lock verified: {lock_file}")
        return 0
    source_mode = str(args.source).strip().lower()
    if source_mode == "local":
        sync_runtime_local(
            runtime_dir=runtime_dir,
            lock_file=lock_file,
            instructware_root=instructware_root,
            runtime_version=str(args.runtime_version),
        )
    elif source_mode == "release":
        runtime_tag = str(args.runtime_release_tag or "").strip()
        tools_tag = str(args.tools_release_tag or "").strip()
        if not runtime_tag or not tools_tag:
            raise SystemExit("--runtime-release-tag and --tools-release-tag are required in release mode")
        runtime_manifest_url = str(args.runtime_manifest_url or "").strip()
        if not runtime_manifest_url:
            runtime_manifest_url = release_asset_url(
                str(args.runtime_repo),
                runtime_tag,
                f"iwp-runtime-pack-{runtime_tag}.manifest.json",
            )
        runtime_pack_url = str(args.runtime_pack_url or "").strip()
        if not runtime_pack_url:
            runtime_pack_url = release_asset_url(
                str(args.runtime_repo),
                runtime_tag,
                f"iwp-runtime-pack-{runtime_tag}.zip",
            )
        tools_manifest_url = str(args.tools_manifest_url or "").strip()
        if not tools_manifest_url:
            tools_manifest_url = release_asset_url(
                str(args.tools_repo),
                tools_tag,
                "release-manifest.json",
            )
        sync_runtime_release(
            runtime_dir=runtime_dir,
            lock_file=lock_file,
            runtime_version=str(args.runtime_version),
            runtime_repo=str(args.runtime_repo),
            runtime_tag=runtime_tag,
            runtime_manifest_url=runtime_manifest_url,
            runtime_pack_url=runtime_pack_url,
            tools_repo=str(args.tools_repo),
            tools_tag=tools_tag,
            tools_manifest_url=tools_manifest_url,
        )
    else:
        raise SystemExit(f"unsupported source mode: {source_mode}")
    print(f"iwp runtime synced: {runtime_dir}")
    print(f"lock file updated: {lock_file}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
