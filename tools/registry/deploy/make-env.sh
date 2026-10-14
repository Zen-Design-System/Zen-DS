#!/usr/bin/env bash
# Builds the server's secrets file on this machine, without printing a secret:
#   ~/.config/zen-registry/registry.env  ← license-store.env + VERDACCIO_PUBLIC_URL + ZEN_PUBLISHER_KEY_HASH
#   ~/.config/zen-registry/publisher.key  the CI publisher key (created once; goes to the GitHub secret later)
set -euo pipefail
DIR=$HOME/.config/zen-registry
DOMAIN=${1:-npm.dizai.studio}
umask 077
[ -f "$DIR/license-store.env" ] || { echo "missing $DIR/license-store.env" >&2; exit 1; }
[ -f "$DIR/publisher.key" ] || node -e 'process.stdout.write(require("crypto").randomBytes(32).toString("base64url"))' > "$DIR/publisher.key"
hash=$(node -e 'const fs=require("fs");process.stdout.write(require("crypto").createHash("sha256").update(fs.readFileSync(process.argv[1],"utf8")).digest("hex"))' "$DIR/publisher.key")
{
  echo "VERDACCIO_PUBLIC_URL=https://$DOMAIN/"
  cat "$DIR/license-store.env"
  echo "ZEN_PUBLISHER_KEY_HASH=$hash"
} > "$DIR/registry.env"
echo "wrote $DIR/registry.env and $DIR/publisher.key (mode 600)"
