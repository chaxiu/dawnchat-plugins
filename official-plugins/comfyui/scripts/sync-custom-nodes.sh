#!/usr/bin/env bash
set -euo pipefail

export https_proxy=${https_proxy:-http://127.0.0.1:7890}
export http_proxy=${http_proxy:-http://127.0.0.1:7890}
export all_proxy=${all_proxy:-socks5://127.0.0.1:7890}

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SUBMODULE_DIR="${ROOT_DIR}/src/comfyui"
CUSTOM_NODE_DIR="${SUBMODULE_DIR}/custom_nodes/comfyui-inpaint-nodes"

if [ ! -d "${CUSTOM_NODE_DIR}/.git" ]; then
  cd "${SUBMODULE_DIR}"
  git submodule add -f -b main https://github.com/chaxiu/comfyui-inpaint-nodes.git custom_nodes/comfyui-inpaint-nodes || true
fi

cd "${CUSTOM_NODE_DIR}"
git fetch origin || true
git checkout main
git pull --ff-only || true

echo "Custom nodes synchronized."
