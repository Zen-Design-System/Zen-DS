#!/usr/bin/env bash
# Nightly backup: tars the registry storage volume (packages + Verdaccio's token secret) and uploads it to
# R2/S3, then deletes copies older than BACKUP_KEEP_DAYS. Run by cron as root (setup.sh installs it).
set -euo pipefail
ENV_FILE=${ZEN_BACKUP_ENV:-/etc/zen-registry/backup.env}
VOLUME=${ZEN_STORAGE_VOLUME:-zen-registry_storage}
NETWORK=${ZEN_BACKUP_NETWORK:-bridge}
set -a
# shellcheck source=/dev/null
. "$ENV_FILE"
set +a

stamp=$(date -u +%Y%m%dT%H%M%SZ)
work=$(mktemp -d); trap 'rm -rf "$work"' EXIT
chmod 700 "$work"
# rclone reads the destination from the environment; a 600 file keeps the keys off the command line.
( umask 077; cat > "$work/rclone.env" <<VARS
RCLONE_CONFIG_DEST_TYPE=s3
RCLONE_CONFIG_DEST_PROVIDER=${S3_PROVIDER:-Cloudflare}
RCLONE_CONFIG_DEST_ENDPOINT=$S3_ENDPOINT
RCLONE_CONFIG_DEST_ACCESS_KEY_ID=$S3_ACCESS_KEY_ID
RCLONE_CONFIG_DEST_SECRET_ACCESS_KEY=$S3_SECRET_ACCESS_KEY
RCLONE_CONFIG_DEST_NO_CHECK_BUCKET=true
VARS
)
mkdir "$work/out"
rclone() { docker run --rm --network "$NETWORK" --env-file "$work/rclone.env" -v "$work/out":/out rclone/rclone:1.75.1 "$@"; }

docker run --rm -v "$VOLUME":/data:ro -v "$work/out":/out alpine:3.24.2 \
  tar -C /data -czf "/out/storage-$stamp.tar.gz" .
rclone copyto "/out/storage-$stamp.tar.gz" "dest:$S3_BUCKET/registry/storage-$stamp.tar.gz"
rclone delete "dest:$S3_BUCKET/registry" --min-age "${BACKUP_KEEP_DAYS:-30}d"
echo "$(date -u +%FT%TZ) backup ok: registry/storage-$stamp.tar.gz"
