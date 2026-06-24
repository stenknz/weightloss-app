# Weight Loss Web App

Self-hosted, multi-user weight loss tracker for household use on an ASUSTOR
AS5404T NAS (or any Docker-capable machine). Runs via Portainer as a Docker
Compose stack.

## Architecture

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| Frontend + API | **Next.js 14** (App Router, standalone output) | Single container, no separate API server to manage |
| Database | **PostgreSQL 16** (linuxserver.io image) | Real RDBMS with no write-contention concerns for even a busy household; the linuxserver image handles NAS permissions natively with PUID/PGID |
| Backups | **Alpine sidecar container** with cron + pg_dump + tar | Out-of-process backup doesn't affect app performance; retention policy configurable |
| Charts | **Recharts** | Lightweight React-native charting for weight/macro trends |
| Auth | **Session-based with argon2id** | Secure password hashing via @node-rs/argon2 (prebuilt binaries); server-side sessions stored in PostgreSQL; CSRF double-submit cookie pattern |

### What about SQLite?

SQLite is simpler but has a critical problem for this app: **write contention**.
When multiple household members log weigh-ins, food, water, steps, etc., 
concurrent writes from different sessions would cause `SQLITE_BUSY` errors.
PostgreSQL handles this correctly with row-level locking and connection pooling.
For a single-NAS household deployment, the linuxserver/postgresql image is 
well-proven and the extra container is negligible overhead.

### Storage design

All persistent data uses **bind mounts** to NAS host paths. No Docker named
volumes are used. This means you can back up the data folder directly with
rsync, and if the container is rebuilt, nothing is lost.

## Required NAS folder structure

Create these folders on your NAS **before** deploying the stack (adjust the
base path if your volume is different):

```sh
mkdir -p /volume1/Docker/weightloss-app/{app,data,db,uploads,backups,logs,env}
mkdir -p /volume1/Docker/weightloss-app/logs/{app,postgres,backup}
```

| Path | Purpose | Bind-mounted to |
|------|---------|----------------|
| `/volume1/Docker/weightloss-app/app` | Source code (clone this repo here) | Build context only (NOT mounted at runtime) |
| `/volume1/Docker/weightloss-app/data` | Next.js runtime cache | `app` container `/app/data` |
| `/volume1/Docker/weightloss-app/db` | PostgreSQL data files | `db` container `/config` |
| `/volume1/Docker/weightloss-app/uploads` | Progress photos (per-user subdirectories) | `app` container `/app/uploads` |
| `/volume1/Docker/weightloss-app/backups` | Automatic daily backups + manual exports | `backup` container `/backups` |
| `/volume1/Docker/weightloss-app/logs/app` | Application logs | `app` container `/app/logs` |
| `/volume1/Docker/weightloss-app/logs/postgres` | PostgreSQL logs | `db` container `/config/logs` |
| `/volume1/Docker/weightloss-app/logs/backup` | Backup script logs | `backup` container `/logs` |
| `/volume1/Docker/weightloss-app/env` | `.env` file location | `app` container `/app/.env.production` (read-only) |

### File ownership

Ensure the folders are owned by your NAS user. The default ASUSTOR admin user
typically has UID 1000 / GID 1000. Set these in `.env`:

```
PUID=1000
PGID=1000
```

## Quick start

### 1. Clone the source

Place all files from this repository into:
```
/volume1/Docker/weightloss-app/app/
```

### 2. Configure environment

```sh
cp /volume1/Docker/weightloss-app/app/.env.example /volume1/Docker/weightloss-app/env/.env
nano /volume1/Docker/weightloss-app/env/.env   # or use your preferred editor
```

**Must change:**
- `POSTGRES_PASSWORD` — use a random string (e.g., `openssl rand -hex 32`)
- `SESSION_SECRET` — use a random string (e.g., `openssl rand -hex 64`)
- `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` — for the initial admin account

### 3. Deploy via Portainer

1. Open Portainer → **Stacks** → **Add stack**
2. Name it: `weightloss-app`
3. Paste the contents of `docker-compose.yml`
4. Set **Build method** to **"Repository"** (if you cloned via git) or
   **"Upload"** (if you transferred files manually)
5. If using the build context method, ensure the docker-compose.yml `build: ./app`
   path is relative to the stack directory, or change it to an absolute path
6. Click **Deploy the stack**

The first build may take 3–5 minutes while Docker installs npm dependencies
and compiles the Next.js app.

On subsequent updates, only the app image needs rebuilding; the database
container reuses the existing data folder.

### 4. Alternative: command-line deployment

If you have SSH access to the NAS:

```sh
cd /volume1/Docker/weightloss-app
docker compose up -d
```

### 5. Initial admin account

On first startup, if no users exist in the database, the app creates an admin
account from the `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` env vars.

**Change the admin password immediately after first login** via **Settings**.

### 6. Access the app

Open your browser at:

```
http://<NAS-IP-ADDRESS>:3886
```

If using a reverse proxy later, set `PUBLIC_URL` in `.env`.

## Updating

```sh
# 1. Stop the app container (db and backup stay running)
cd /volume1/Docker/weightloss-app
docker compose stop app

# 2. Update the source code
cd /volume1/Docker/weightloss-app/app
git pull    # or upload new files

# 3. Rebuild and restart
cd /volume1/Docker/weightloss-app
docker compose build --no-cache app
docker compose up -d app
```

## Backup and restore

### Automatic backups

The backup sidecar runs daily at 03:00 (configurable via `BACKUP_CRON` in `.env`).
It creates:

- `/volume1/Docker/weightloss-app/backups/db/YYYY-MM-DD_HHMMSS.sql.gz` — full
  PostgreSQL dump
- `/volume1/Docker/weightloss-app/backups/uploads/YYYY-MM-DD_HHMMSS.tar.gz` —
  archive of the uploads folder
- `/volume1/Docker/weightloss-app/backups/manifest-YYYY-MM-DD_HHMMSS.txt` —
  backup manifest

Retention: `BACKUP_KEEP_DAYS` (default 14). Older files are pruned automatically.

### Manual backup

Trigger the backup script manually:

```sh
docker compose exec backup /scripts/backup.sh
```

Or use the Export feature in the web UI to download JSON/CSV.

### Restore from backup

```sh
# 1. Stop all services
cd /volume1/Docker/weightloss-app
docker compose down

# 2. Find the backup you want to restore
ls /volume1/Docker/weightloss-app/backups/db/

# 3. Restore the database
gunzip -c /volume1/Docker/weightloss-app/backups/db/2024-05-15_030000.sql.gz \
  | docker compose run --rm db psql -U weightloss

# 4. Restore uploads (if needed)
tar -xzf /volume1/Docker/weightloss-app/backups/uploads/2024-05-15_030000.tar.gz \
  -C /volume1/Docker/weightloss-app/

# 5. Restart
docker compose up -d
```

## Permissions troubleshooting

**Problem**: `db` container fails to start with permission errors.

**Solution**: The linuxserver/postgresql image runs as the user specified by
`PUID`/`PGID`. Ensure the bind-mounted `/volume1/Docker/weightloss-app/db`
folder is owned by that user. On ASUSTOR:

```sh
chown -R 1000:1000 /volume1/Docker/weightloss-app/db
```

**Problem**: Photos upload fails with disk write error.

**Solution**: Same fix for `/volume1/Docker/weightloss-app/uploads`. The app
container also runs as `PUID:PGID`.

## Security notes

- Passwords are hashed with **argon2id** (memory-hard, GPU-resistant)
- Sessions are stored in PostgreSQL and expire after 30 days (configurable)
- CSRF protection uses the **double-submit cookie pattern** (cookie value must
  match `x-csrf-token` header on all mutating requests)
- Login is rate-limited to 10 attempts per email per hour (configurable)
- Photo uploads are validated by MIME type and size; storage is capped per user
- No third-party analytics, tracking, or external SaaS dependencies
- All data stays on your NAS behind your network

## Features overview

| Feature | Description |
|---------|-------------|
| Dashboard | Current weight, weekly trend, adherence %, quick log for today |
| Weigh-ins | Daily logging with up-sert (edit same-day entry), chart with target line |
| Measurements | Waist, chest, hips, thighs, arms — per day with up-sert |
| Progress photos | Upload + per-user folder storage, date-grouped gallery |
| Food log | Per-meal entries with free-text + macros, progress bars per target |
| Exercise | Activity, duration, calories burned |
| Water | Quick-add with preset amounts, daily progress bar |
| Steps | Daily step count |
| Notes | Journal per day with expand/collapse |
| Goals | Target weight, date, calorie deficit, macro targets |
| Progress | Weight chart + measurements table |
| Profile | Personal info, activity level |
| Export | Full data download in JSON or CSV |
| Admin | User management, invite codes, audit log, app settings |
| Backups | Automatic daily with rotation, manual restore instructions |

## Tech stack summary

- **Frontend**: Next.js 14 (App Router), React 18, Tailwind CSS 3, Recharts, Lucide icons
- **Backend**: Next.js API routes (Node.js), argon2id passwords, Zod validation
- **Database**: PostgreSQL 16 (linuxserver/postgresql image with NAS-friendly PUID/PGID)
- **Backup**: Alpine + cron + pg_dump + tar
- **Deployment**: Docker Compose (single Portainer stack, 3 containers)

## File: docker-compose.yml

The docker-compose file is at the project root. It defines three services:
- `db` — PostgreSQL
- `app` — Next.js (frontend + API)
- `backup` — automatic backup sidecar

Every bind mount is explicitly documented in the compose file.

## File: env mapping

`.env.example` documents every supported environment variable. The `.env` file
lives at `/volume1/Docker/weightloss-app/env/.env` and is bind-mounted into the
app container at `/app/.env.production`.

## License

MIT
