#!/bin/bash
# Double-click this file in Finder to build Zen DS and run every check.
# (macOS opens it in Terminal. Nothing is installed or deleted.)
cd "$(dirname "$0")" || exit 1
echo "▶ Zen DS — build + checks in $(pwd)"
echo
status=0
run() { echo "── $*"; if "$@"; then echo "   ✓ ok"; else echo "   ✗ failed"; status=1; fi; echo; }
[ -d node_modules ] || run npm install
run npm run build
run npm run tokens:check
run npm run styles:check
run npm run icons:check
if [ $status -eq 0 ]; then echo "✅ All good — the production build is in ./dist"; else echo "❌ Something failed — scroll up for the ✗ line."; fi
echo
read -n 1 -s -r -p "Press any key to close…"
