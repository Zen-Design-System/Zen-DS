#!/usr/bin/env bash
# Restores the registry storage volume from a backup: ./restore.sh [storage-<stamp>.tar.gz | latest]
# Stops the registry, replaces the volume's contents, starts it again. Run as root from deploy/.
set -euo pipefail
cd "$(dirname "$0")"
ENV_FILE=${ZEN_BACKUP_ENV:-/etc/zen-registry/backup.env}
VOLUME=${ZEN_STORAGE_VOLUME:-zen-registry_storage}
NETWORK=${ZEN_BACKUP_NETWORK:-bridge}
set -a
# shellcheck source=/dev/null
. "$ENV_FILE"
set +a

work=$(mktemp -d); trap 'rm -rf "$work"' EXIT
chmod 700 "$work"
( umask 077; cat > "$work/rclone.env" <<VARS
RCLONE_CONFIG_DEST_TYPE=s3
RCLONE_CONFIG_DEST_PROVIDER=${S3_PROVIDER:-Cloudflare}
RCLONE_CONFIG_DEST_ENDPOINT=$S3_ENDPOINT
RCLONE_CONFIG_DEST_ACCESS_KEY_ID=$S3_ACCESS_KEY_ID
RCLONE_CONFIG_DEST_SECRET_ACCESS_KEY=$S3_SECRET_ACCESS_KEY
RCLONE_CONFIG_DEST_NO_CHECK_BUCKET=true
VARS
)
mkdir "$work/in"
rclone() { docker run --rm --network "$NETWORK" --env-file "$work/rclone.env" -v "$work/in":/in rclone/rclone:1.75.1 "$@"; }

name=${1:-latest}
if [ "$name" = latest ]; then
  name=$(rclone lsf "dest:$S3_BUCKET/registry" --include 'storage-*.tar.gz' | sort | tail -n 1)
  [ -n "$name" ] || { echo "no backups in $S3_BUCKET/registry" >&2; exit 1; }
fi
echo "restoring $name"
rclone copyto "dest:$S3_BUCKET/registry/$name" "/in/$name"

docker compose stop registry
docker run --rm -v "$VOLUME":/data -v "$work/in":/in:ro alpine:3.24.2 sh -c \
  "find /data -mindepth 1 -delete && tar -C /data -xzf '/in/$name' && chown -R 10001:65533 /data"
docker compose start registry
echo "restored $name"
