#!/bin/bash
# Deploys main to publish. The cache-version GitHub Action runs automatically
# after push, replacing version placeholders with the current commit hash.
set -e

# Refuse to run with uncommitted changes
if ! git diff --quiet || ! git diff --cached --quiet; then
    echo "Error: Uncommitted changes. Commit or stash them first."
    exit 1
fi

ORIGINAL_BRANCH=$(git branch --show-current)

if [ -z "$ORIGINAL_BRANCH" ]; then
    echo "Error: Detached HEAD. Check out a branch first."
    exit 1
fi

cleanup() {
    git merge --abort 2>/dev/null || true
    git checkout "$ORIGINAL_BRANCH" 2>/dev/null || true
}
trap cleanup EXIT

git checkout publish
git fetch origin
git reset --hard origin/publish
git merge main
git push

echo "Deployed main to publish."
