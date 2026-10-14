#!/usr/bin/env bash
# Server setup for Ubuntu 24.04, as root, from /opt/zen-registry/deploy. Safe to re-run (it also redeploys).
# Needs /etc/zen-registry/registry.env and /etc/zen-registry/backup.env (deploy.sh copies them).
set -euo pipefail
cd "$(dirname "$0")"

for f in /etc/zen-registry/registry.env /etc/zen-registry/backup.env; do
  [ -f "$f" ] || { echo "missing $f (see ${f##*/}.example)" >&2; exit 1; }
  chmod 600 "$f"
done
chmod 700 /etc/zen-registry
[ -f .env ] || cp .env.example .env

# Packages and automatic security updates.
export DEBIAN_FRONTEND=noninteractive
apt-get update -q
apt-get install -y -q ca-certificates curl ufw unattended-upgrades
dpkg-reconfigure -f noninteractive unattended-upgrades

# Docker Engine + Compose from Docker's apt repository.
if ! command -v docker >/dev/null; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -q
  apt-get install -y -q docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi

# Firewall: SSH, HTTP (certificate challenge + redirect) and HTTPS only.
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 443/udp
ufw --force enable

docker compose up -d --build

# Nightly backup at 03:17 UTC.
chmod +x backup.sh restore.sh
echo "17 3 * * * root $(pwd)/backup.sh >> /var/log/zen-registry-backup.log 2>&1" > /etc/cron.d/zen-registry-backup

for _ in $(seq 1 45); do
  docker compose ps registry --format '{{.Health}}' | grep -q healthy && break
  sleep 2
done
docker compose ps
