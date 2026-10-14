#!/usr/bin/env bash
# Deploys to a host that runs Podman and a system Caddy: ./podman/deploy.sh root@<vps> [ssh options…]
# Copies tools/registry to /opt/zen-registry, registry.env (first time only) to /etc/zen-registry, builds the
# image, installs the Quadlet unit and adds the npm.dizai.studio block to /etc/caddy/Caddyfile once.
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
for _ in $(seq 1 30); do curl -fsS http://127.0.0.1:4873/-/ping >/dev/null 2>&1 && break; sleep 2; done
curl -fsS http://127.0.0.1:4873/-/ping && echo " registry up"
systemctl --no-pager status zen-registry.service | head -5
REMOTE
