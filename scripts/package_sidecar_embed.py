#!/usr/bin/env python3
"""
Pack trees required by DawnChat main repo build.sh sidecar embed.

Produces a .tar.zst archive (and .sha256) suitable for extracting into
<repo>/dawnchat-plugins/ — same layout as a partial checkout with built
frontend dist/ trees and SDK sources.

Run after scripts/package_plugins.py in publish-plugins CI so web builds
and assistant-sdk build:sdk are already applied.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
import sys
from pathlib import Path


# Must match build.sh prepare_builtin_desktop_template template_ids.
BUILTIN_TEMPLATE_IDS = [
    "desktop-starter",
    "desktop-hello-world",
    "desktop-ai-assistant",
    "web-starter-vue",
    "web-ai-assistant",
    "mobile-starter-ionic",
    "mobile-ai-assistant",
]

TAR_EXCLUDES = [
    "node_modules",
    "__pycache__",
    "*.pyc",
    ".pytest_cache",
    "pnpm-lock.yaml",
    ".dawnchat-preview",
    ".git",
]


def _web_src_dir(template_id: str) -> Path:
    if template_id == "desktop-starter":
        return Path("official-plugins") / template_id / "_ir" / "frontend" / "web-src"
    return Path("official-plugins") / template_id / "web-src"


def _dist_dir(template_id: str) -> Path:
    return _web_src_dir(template_id) / "dist"


def _validate_builtin_dists(repo_root: Path) -> None:
    missing: list[str] = []
    for tid in BUILTIN_TEMPLATE_IDS:
        base = repo_root / _web_src_dir(tid)
        pkg = base / "package.json"
        if not pkg.is_file():
            missing.append(f"{tid}: no {pkg.relative_to(repo_root)}")
            continue
        dist = repo_root / _dist_dir(tid)
        if not (dist / "index.html").is_file():
            missing.append(f"{tid}: expected {dist.relative_to(repo_root)}/index.html")
    if missing:
        raise SystemExit(
            "sidecar-embed validation failed (run package_plugins.py first):\n"
            + "\n".join(missing)
        )


def _assistant_sdk_dist_dirs(repo_root: Path) -> None:
    """Ensure assistant-sdk packages used by build.sh have dist/."""
    need = [
        "assistant-sdk/assistant-app-sdk",
        "assistant-sdk/assistant-chat-ui",
        "assistant-sdk/assistant-core",
        "assistant-sdk/host-orchestration-sdk",
    ]
    missing = []
    for rel in need:
        dist = repo_root / rel / "dist"
        if not dist.is_dir():
            missing.append(rel)
    if missing:
        raise SystemExit(
            "assistant-sdk dist missing (run assistant-workspace build:sdk first):\n"
            + "\n".join(missing)
        )


def _capacitor_sdk_dist(repo_root: Path) -> None:
    cap = repo_root / "capacitor-plugins-sdk" / "capacitor-dawn-tts"
    if not (cap / "package.json").is_file():
        raise SystemExit(f"missing {cap}")
    # May be dist or minimal TS payload per package_plugins / build.sh.
    pkg = __import__("json").loads((cap / "package.json").read_text(encoding="utf-8"))
    if (cap / "dist").is_dir():
        return
    # Minimal file copy packages: at least one entry target must exist.
    main = pkg.get("main")
    if isinstance(main, str) and main.startswith("./"):
        p = cap / main[2:]
        if not p.is_file():
            raise SystemExit(f"capacitor-dawn-tts missing entry: {p.relative_to(repo_root)}")


def _write_sha256(artifact: Path) -> tuple[str, Path]:
    digest = hashlib.sha256()
    with artifact.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            digest.update(chunk)
    hexd = digest.hexdigest()
    out = artifact.parent / f"{artifact.name}.sha256"
    out.write_text(f"{hexd}  {artifact.name}\n", encoding="utf-8")
    return hexd, out


def main() -> int:
    parser = argparse.ArgumentParser(description="Pack dawnchat-plugins sidecar embed bundle.")
    parser.add_argument("--repo-root", type=Path, default=Path("."))
    parser.add_argument("--release-tag", required=True, help="e.g. plugins-v2026.02.13")
    parser.add_argument("--output-dir", type=Path, required=True)
    args = parser.parse_args()
    repo_root = args.repo_root.resolve()
    out_dir = args.output_dir.resolve()
    out_dir.mkdir(parents=True, exist_ok=True)

    safe_tag = args.release_tag.strip().replace("/", "-")
    asset_name = f"dawnchat-sidecar-embed-{safe_tag}.tar.zst"
    out_path = out_dir / asset_name

    _validate_builtin_dists(repo_root)
    _assistant_sdk_dist_dirs(repo_root)
    _capacitor_sdk_dist(repo_root)

    # assistant-workspace: required by DawnChat main CI (bun verify / build:assistant-sdk-for-host),
    # excluded from runtime sidecar copy but needed when replacing git clone.
    paths: list[str] = ["sdk", "assistant-sdk", "capacitor-plugins-sdk", "assistant-workspace"]
    opencode = repo_root / ".opencode"
    if opencode.is_dir():
        paths.append(".opencode")
    for tid in BUILTIN_TEMPLATE_IDS:
        rel = f"official-plugins/{tid}"
        if not (repo_root / rel).is_dir():
            raise SystemExit(f"missing {rel}")
        paths.append(rel)

    cmd = ["tar", "-C", str(repo_root), "-caf", str(out_path)]
    for pat in TAR_EXCLUDES:
        cmd.append(f"--exclude={pat}")
    cmd.extend(paths)

    print(f"[sidecar-embed] {' '.join(cmd)}")
    subprocess.run(cmd, check=True)

    hexd, sha_path = _write_sha256(out_path)
    print(f"[sidecar-embed] wrote {out_path}")
    print(f"[sidecar-embed] wrote {sha_path}")

    manifest = {
        "release_tag": args.release_tag,
        "asset_name": asset_name,
        "sha256": hexd,
        "size": out_path.stat().st_size,
    }
    manifest_path = out_dir / f"dawnchat-sidecar-embed-{safe_tag}.manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(f"[sidecar-embed] wrote {manifest_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
