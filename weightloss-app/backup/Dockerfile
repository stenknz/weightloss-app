# =============================================================================
# Image for the backup sidecar
# Runs on a cron schedule (configurable via BACKUP_CRON env), dumps PostgreSQL
# with pg_dump, tars the uploads folder, and rotates old backups.
# =============================================================================
FROM alpine:3.20

RUN apk add --no-cache \
      bash \
      coreutils \
      dcron \
      postgresql16-client \
      tar \
      gzip \
      tini \
    && mkdir -p /backups /logs /scripts \
    && addgroup -g 1000 -S backup \
    && adduser -S -u 1000 -G backup backup \
    && chown -R backup:backup /backups /logs /scripts

COPY backup.sh        /scripts/backup.sh
COPY entrypoint.sh    /scripts/entrypoint.sh
RUN chmod +x /scripts/backup.sh /scripts/entrypoint.sh

# Default to the user-supplied PUID/PGID (1000:1000) so reads of the bind
# mounts succeed. docker-compose overrides this with the env values.
USER 1000:1000

# Run the entrypoint in the foreground so cron stays alive.
ENTRYPOINT ["/sbin/tini", "--", "/scripts/entrypoint.sh"]
