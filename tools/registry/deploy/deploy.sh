#!/usr/bin/env bash
# Deploys from this machine: ./deploy.sh root@<vps>
# Copies tools/registry to /opt/zen-registry, the secrets (first time only) to /etc/zen-registry, runs setup.sh.
set -euo pipefail
HOST=${1:?usage: deploy.sh root@<vps>}
HERE=$(cd "$(dirname "$0")" && pwd)
DIR=$HOME/.config/zen-registry

rsync -az --delete \
  --exclude node_modules --exclude .bin --exclude .test-tmp --exclude storage --exclude test \
  --exclude deploy/.env \
  "$HERE/../" "$HOST:/opt/zen-registry/"
ssh "$HOST" 'install -d -m 700 /etc/zen-registry'
for f in registry.env backup.env; do
  if ssh "$HOST" "test -f /etc/zen-registry/$f"; then
    echo "/etc/zen-registry/$f exists on $HOST, kept"
  else
    [ -f "$DIR/$f" ] || { echo "missing $DIR/$f" >&2; exit 1; }
    scp -q "$DIR/$f" "$HOST:/etc/zen-registry/$f"
  fi
done
ssh "$HOST" 'chmod 600 /etc/zen-registry/*.env && bash /opt/zen-registry/deploy/setup.sh'
