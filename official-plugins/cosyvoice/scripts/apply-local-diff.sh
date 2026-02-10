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
SUBMODULE_DIR="${ROOT_DIR}/src/cosyvoice"
LOCAL_DIR="${ROOT_DIR}/src/local_overrides/cosyvoice"
TARGET_SUBDIR="cosyvoice"

cd "${SUBMODULE_DIR}"

if git remote get-url origin | grep -q '^git@github.com:'; then
  git remote set-url origin https://github.com/chaxiu/CosyVoice.git
  git remote set-url --push origin https://github.com/chaxiu/CosyVoice.git
fi

git fetch origin || true
git checkout "${COMMIT_ID}"
git checkout -B "${BRANCH_NAME}"

RSYNC_EXCLUDES=(--exclude ".git" --exclude ".gitmodules")
if [ -d "${LOCAL_DIR}" ]; then
  rsync -a --delete "${RSYNC_EXCLUDES[@]}" "${LOCAL_DIR}/" "./${TARGET_SUBDIR}/"
fi

if git status --porcelain | grep -q .; then
  git add .
  git commit -m "Apply local overrides at ${COMMIT_ID}"
  git push origin "${BRANCH_NAME}" || true
  echo "Pushed branch ${BRANCH_NAME} to fork."
else
  echo "No changes to commit after overlay."
fi
