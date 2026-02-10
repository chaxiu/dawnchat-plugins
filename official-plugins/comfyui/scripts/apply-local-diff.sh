#!/usr/bin/env bash
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: apply-local-diff.sh <commit_id> [branch_name]"
  exit 1
fi

export https_proxy=${https_proxy:-http://127.0.0.1:7890}
export http_proxy=${http_proxy:-http://127.0.0.1:7890}
export all_proxy=${all_proxy:-socks5://127.0.0.1:7890}

COMMIT_ID="$1"
BRANCH_NAME="${2:-local-sync-$(date +%Y%m%d%H%M%S)}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SUBMODULE_DIR="${ROOT_DIR}/src/comfyui"
LOCAL_DIR="${ROOT_DIR}/src/local_overrides/comfyui"

cd "${SUBMODULE_DIR}"

# Ensure origin points to fork (https for push convenience)
if git remote get-url origin | grep -q '^git@github.com:'; then
  git remote set-url origin https://github.com/chaxiu/ComfyUI.git
  git remote set-url --push origin https://github.com/chaxiu/ComfyUI.git
fi

git fetch origin || true
git checkout "${COMMIT_ID}"
git checkout -B "${BRANCH_NAME}"

# Overlay local changes excluding git metadata and nested custom_nodes submodule
RSYNC_EXCLUDES=(--exclude ".git" --exclude ".gitmodules" --exclude "custom_nodes/comfyui-inpaint-nodes")
if [ -d "${LOCAL_DIR}" ]; then
  rsync -a --delete "${RSYNC_EXCLUDES[@]}" "${LOCAL_DIR}/" .
fi

if git status --porcelain | grep -q .; then
  git add .
  git commit -m "Apply local overrides at ${COMMIT_ID}"
  git push origin "${BRANCH_NAME}" || true
  echo "Pushed branch ${BRANCH_NAME} to fork."
else
  echo "No changes to commit after overlay."
fi
