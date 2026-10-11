#!/bin/bash
# backup-db.sh — Backup database SQLite (aman walau server sedang berjalan).
# Disimpan di server/data/backups/, file lebih dari 7 hari dihapus otomatis.
# Dijalankan cron tiap 30 menit (lihat DEPLOY.md), bisa juga manual kapan saja.
set -e

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
# Pindah ke folder aplikasi agar aman dijalankan dari folder mana pun (mis. /home/ubuntu)
cd "$APP_DIR"
DB="$APP_DIR/server/data/wisuda.db"
DEST="$APP_DIR/server/data/backups"

mkdir -p "$DEST"
FILE="$DEST/wisuda-$(date +%F-%H%M).db"
sqlite3 "$DB" ".backup '$FILE'"
find "$DEST" -name 'wisuda-*.db' -mtime +7 -delete
echo "Backup: $FILE"
