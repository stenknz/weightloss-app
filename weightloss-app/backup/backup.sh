#!/usr/bin/env bash
# =============================================================================
# Daily backup script. Runs inside the backup container.
# Output:
#   /backups/db/YYYY-MM-DD_HHMMSS.sql.gz
#   /backups/uploads/YYYY-MM-DD_HHMMSS.tar.gz
#   /backups/manifest-YYYY-MM-DD_HHMMSS.txt
# Retention:
#   deletes files in /backups older than BACKUP_KEEP_DAYS days
# =============================================================================
set -euo pipefail

BACKUP_KEEP_DAYS="${BACKUP_KEEP_DAYS:-14}"
POSTGRES_HOST="${POSTGRES_HOST:-db}"
POSTGRES_USER="${POSTGRES_USER:-weightloss}"
POSTGRES_DB="${POSTGRES_DB:-weightloss}"
TS="$(date +%Y-%m-%d_%H%M%S)"
LOG="/logs/backup.log"

mkdir -p /backups/db /backups/uploads /logs

log() { echo "[$(date -Iseconds)] $*" | tee -a "$LOG"; }

log "Backup starting (keep=${BACKUP_KEEP_DAYS}d)"

# ---- PostgreSQL dump ----
DUMP_FILE="/backups/db/${TS}.sql.gz"
if pg_dump -h "$POSTGRES_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
     --no-owner --no-privileges --clean --if-exists \
   | gzip -9 > "$DUMP_FILE"; then
  log "Wrote $DUMP_FILE ($(du -h "$DUMP_FILE" | cut -f1))"
else
  log "ERROR: pg_dump failed"
  rm -f "$DUMP_FILE"
  exit 1
fi

# ---- Uploads archive ----
UPLOAD_FILE="/backups/uploads/${TS}.tar.gz"
if tar -C / -czf "$UPLOAD_FILE" uploads 2>/dev/null; then
  log "Wrote $UPLOAD_FILE ($(du -h "$UPLOAD_FILE" | cut -f1))"
else
  log "WARNING: uploads archive failed (folder may be empty)"
  rm -f "$UPLOAD_FILE"
fi

# ---- Manifest ----
MANIFEST="/backups/manifest-${TS}.txt"
{
  echo "Backup timestamp: $TS"
  echo "Database:         $POSTGRES_DB @ $POSTGRES_HOST"
  echo "DB dump:          $DUMP_FILE"
  echo "DB dump size:     $(du -h "$DUMP_FILE" 2>/dev/null | cut -f1)"
  if [ -f "$UPLOAD_FILE" ]; then
    echo "Uploads archive:  $UPLOAD_FILE"
    echo "Uploads size:     $(du -h "$UPLOAD_FILE" | cut -f1)"
  fi
  echo "Retain (days):    $BACKUP_KEEP_DAYS"
} > "$MANIFEST"

log "Wrote $MANIFEST"

# ---- Rotation ----
log "Pruning backups older than $BACKUP_KEEP_DAYS days"
find /backups -type f -mtime +"$BACKUP_KEEP_DAYS" -print -delete >> "$LOG" 2>&1 || true

log "Backup complete"
