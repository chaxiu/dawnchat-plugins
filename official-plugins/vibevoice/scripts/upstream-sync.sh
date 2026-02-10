#!/usr/bin/env bash
set -euo pipefail

export https_proxy=${https_proxy:-http://127.0.0.1:7890}
export http_proxy=${http_proxy:-http://127.0.0.1:7890}
export all_proxy=${all_proxy:-socks5://127.0.0.1:7890}

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SUBMODULE_DIR="${ROOT_DIR}/src/vibevoice"

cd "${SUBMODULE_DIR}"
git fetch upstream || true
git fetch origin || true
git checkout main
git merge --no-edit upstream/main || true
git submodule update --init --recursive

git push origin main || true

echo "VibeVoice upstream sync done."
