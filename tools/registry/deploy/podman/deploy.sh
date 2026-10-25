#!/usr/bin/env bash
# Deploys to a host that runs Podman and a system Caddy: ./podman/deploy.sh root@<vps> [ssh options…]
# Copies tools/registry to /opt/zen-registry, registry.env and backup.env (first time only) to /etc/zen-registry,
# builds the image, installs the Quadlet unit, adds the npm.dizai.studio block to /etc/caddy/Caddyfile once and,
# once backup.env is there, the nightly backup to R2.
set -euo pipefail
HOST=${1:?usage: podman/deploy.sh root@<vps> [ssh options]}; shift
SSH=(ssh "$@" "$HOST")
HERE=$(cd "$(dirname "$0")/.." && pwd)
DIR=$HOME/.config/zen-registry

rsync -az --delete -e "ssh $*" \
  --exclude node_modules --exclude .bin --exclude .test-tmp --exclude storage --exclude test \
  --exclude deploy/.env \
  "$HERE/../" "$HOST:/opt/zen-registry/"
"${SSH[@]}" 'install -d -m 700 /etc/zen-registry'
if "${SSH[@]}" 'test -f /etc/zen-registry/registry.env'; then
  echo "/etc/zen-registry/registry.env exists on $HOST, kept"
else
  [ -f "$DIR/registry.env" ] || { echo "missing $DIR/registry.env (run deploy/make-env.sh)" >&2; exit 1; }
  scp -q "$@" "$DIR/registry.env" "$HOST:/etc/zen-registry/registry.env"
fi
# Optional until the R2 bucket exists: without it the registry runs with no backups (warned below).
if "${SSH[@]}" 'test -f /etc/zen-registry/backup.env'; then
  echo "/etc/zen-registry/backup.env exists on $HOST, kept"
elif [ -f "$DIR/backup.env" ]; then
  scp -q "$@" "$DIR/backup.env" "$HOST:/etc/zen-registry/backup.env"
fi
"${SSH[@]}" bash -s <<'REMOTE'
set -euo pipefail
chmod 600 /etc/zen-registry/*.env
command -v podman >/dev/null || { apt-get update -q && DEBIAN_FRONTEND=noninteractive apt-get install -y -q podman; }
cd /opt/zen-registry
podman build --format docker -t localhost/zen-registry:local -f deploy/Dockerfile .
install -m 644 deploy/podman/zen-registry.container /etc/containers/systemd/zen-registry.container
systemctl daemon-reload
systemctl restart zen-registry.service
if ! grep -q '^npm.dizai.studio {' /etc/caddy/Caddyfile; then
  cp /etc/caddy/Caddyfile /etc/caddy/Caddyfile.bak-zen-registry
  cat deploy/podman/Caddyfile.snippet >> /etc/caddy/Caddyfile
  caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile || { cp /etc/caddy/Caddyfile.bak-zen-registry /etc/caddy/Caddyfile; exit 1; }
  systemctl reload caddy
fi
# Nightly backup at 03:17 UTC (deploy/backup.sh finds the Quadlet unit and backs up its volume).
if [ -f /etc/zen-registry/backup.env ]; then
  [ -d /etc/cron.d ] || { apt-get update -q && DEBIAN_FRONTEND=noninteractive apt-get install -y -q cron; }
  echo "17 3 * * * root /opt/zen-registry/deploy/backup.sh >> /var/log/zen-registry-backup.log 2>&1" > /etc/cron.d/zen-registry-backup
  echo "nightly backup: /etc/cron.d/zen-registry-backup"
else
  rm -f /etc/cron.d/zen-registry-backup
  echo "WARNING: no /etc/zen-registry/backup.env, so no backups (see deploy/backup.env.example)" >&2
fi
for _ in $(seq 1 30); do curl -fsS http://127.0.0.1:4873/-/ping >/dev/null 2>&1 && break; sleep 2; done
curl -fsS http://127.0.0.1:4873/-/ping && echo " registry up"
systemctl --no-pager status zen-registry.service | head -5
REMOTE
