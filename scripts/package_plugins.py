#!/usr/bin/env python3
"""
Build DawnChat plugin packages and generate plugins.json catalog.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
import shutil
import subprocess
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
    base_url: str,
) -> dict[str, Any]:
    generated_at = datetime.now(timezone.utc).isoformat()
    plugins: list[dict[str, Any]] = []
    for result in packages:
        manifest = result.manifest
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
                    "url": f"{base_url}/{release_tag}/{result.package_name}",
                    "sha256": result.sha256,
                    "size": result.size,
                    "file_name": result.package_name,
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
        required=True,
        help="Base URL of release download endpoint (without trailing slash)",
    )
    return parser.parse_args()


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

    catalog = _build_catalog(
        packages,
        release_tag=args.release_tag,
        base_url=args.base_url.rstrip("/"),
    )
    catalog_path = output_dir / "plugins.json"
    catalog_path.write_text(
        json.dumps(catalog, ensure_ascii=False, indent=2) + os.linesep,
        encoding="utf-8",
    )
    print(f"generated catalog: {catalog_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
