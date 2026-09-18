#!/bin/bash
# Backup database wisuda tiap 30 menit
BACKUP_DIR="/home/towi/Projects/personal/scan-wisuda/server/data/backups"
mkdir -p "$BACKUP_DIR"

SRC="/home/towi/Projects/personal/scan-wisuda/server/data/wisuda.db"

# Copy DB + WAL + SHM (biar konsisten)
cp "$SRC" "$BACKUP_DIR/wisuda-$(date +%Y%m%d-%H%M).db" 2>/dev/null
cp "${SRC}-wal" "$BACKUP_DIR/wisuda-$(date +%Y%m%d-%H%M)-wal" 2>/dev/null
cp "${SRC}-shm" "$BACKUP_DIR/wisuda-$(date +%Y%m%d-%H%M)-shm" 2>/dev/null

# Hapus backup > 48 jam (biar tidak menumpuk)
find "$BACKUP_DIR" -name "wisuda-*" -mtime +2 -delete

# Log
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup selesai: $(ls -1 $BACKUP_DIR | wc -l) file" >> "$BACKUP_DIR/backup.log"
