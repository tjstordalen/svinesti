#!/bin/bash
# Deploys main to publish. The cache-version GitHub Action runs automatically
# after push, replacing version placeholders with the current commit hash.
set -e
git push origin main:publish --force
echo "Deployed main to publish."
