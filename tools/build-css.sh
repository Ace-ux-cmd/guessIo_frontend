#!/usr/bin/env bash
# Regenerates src/styles/ui.css (plain CSS). Dev-time only.
set -e
cd "$(dirname "$0")"
npx --yes tailwindcss@3 -c tailwind.config.cjs -i tailwind-input.css -o ../src/styles/ui.css --minify
