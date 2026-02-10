#!/usr/bin/env bash
set -euo pipefail

export https_proxy=${https_proxy:-http://127.0.0.1:7890}
export http_proxy=${http_proxy:-http://127.0.0.1:7890}
export all_proxy=${all_proxy:-socks5://127.0.0.1:7890}

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SUBMODULE_DIR="${ROOT_DIR}/src/comfyui"

cd "${SUBMODULE_DIR}"
git fetch upstream || true
git fetch origin || true
git checkout master
git merge --no-edit upstream/master || true
git submodule update --init --recursive

git push origin master || true

echo "ComfyUI upstream sync done."
