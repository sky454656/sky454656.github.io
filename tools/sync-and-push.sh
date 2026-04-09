#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOCK_DIR="${TMPDIR:-/tmp}/sky454656-github-io-sync.lock"

log() {
  printf '[%s] %s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$*"
}

cleanup() {
  rmdir "$LOCK_DIR" 2>/dev/null || true
}

if ! mkdir "$LOCK_DIR" 2>/dev/null; then
  log "another sync job is already running"
  exit 0
fi

trap cleanup EXIT

cd "$ROOT_DIR"

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
fi

if [[ -z "${NOTION_TOKEN:-}" ]]; then
  log "NOTION_TOKEN is not set"
  exit 1
fi

if [[ -z "${NOTION_DATABASE_ID:-}" ]]; then
  log "NOTION_DATABASE_ID is not set"
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  log "node is not installed"
  exit 1
fi

CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"

log "syncing posts from notion"
node scripts/sync-notion-posts.js

if git diff --quiet && git diff --cached --quiet && [[ -z "$(git ls-files --others --exclude-standard)" ]]; then
  log "no changes to commit"
  exit 0
fi

git add _posts assets/img/posts

if git diff --cached --quiet; then
  log "no staged changes after git add"
  exit 0
fi

COMMIT_MESSAGE="chore: sync notion posts $(date -u '+%Y-%m-%d %H:%M:%S UTC')"

log "creating commit"
git commit -m "$COMMIT_MESSAGE"

log "pushing ${CURRENT_BRANCH} to origin"
git push origin "$CURRENT_BRANCH"

log "sync completed"
