#!/bin/bash
# Deploys local main to publish. The cache-version GitHub Action runs
# automatically after push, replacing version placeholders with the
# current commit hash.
set -e

# Warn if local main has unpushed commits
git fetch origin main --quiet
LOCAL=$(git rev-parse main)
REMOTE=$(git rev-parse origin/main)
if [ "$LOCAL" != "$REMOTE" ]; then
    echo ""
    echo "!!! WARNING !!!"
    echo "Local main has commits that have NOT been pushed to origin."
    echo "These commits will be deployed but will be LOST if you reset to origin/main."
    echo "Consider running 'git push' first."
    echo ""
    read -p "Deploy unpushed commits anyway? [y/N] " answer
    [ "$answer" = "y" ] || exit 0
fi

git push origin main:publish --force
echo "Deployed main to publish."
