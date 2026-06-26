# Weight Loss Web App

Self-hosted, multi-user weight loss tracker for household use. Deployed via
GitHub Actions CI/CD and Portainer on any Docker-capable machine (NAS, VPS,
etc.).

## Architecture

| Component       | Technology                                                   |
|----------------|--------------------------------------------------------------|
| Frontend + API | Next.js 14 (App Router, standalone output)                   |
| Database       | PostgreSQL 16 (external - not part of this stack)            |
| Charts         | Recharts                                                     |
| Auth           | Session-based with bcryptjs, CSRF double-submit cookie       |

## CI/CD Pipeline

Pushing to `main` triggers a GitHub Actions workflow that:

1. Checks out the repository
2. Builds the Docker image from `app/Dockerfile`
3. Tags it as `latest` and with the short Git commit SHA
4. Pushes both tags to Docker Hub

### Configure GitHub Secrets

Before the pipeline works, add these secrets in your GitHub repository at
**Settings → Secrets and variables → Actions**:

| Secret              | Value                                      |
|---------------------|--------------------------------------------|
| `DOCKERHUB_USERNAME` | Your Docker Hub username                   |
| `DOCKERHUB_TOKEN`    | A Docker Hub access token (not your password) |

To create a Docker Hub access token:
1. Log in to [hub.docker.com](https://hub.docker.com)
2. Go to **Account Settings → Security → New Access Token**
3. Give it a name (e.g., `weightloss-ci`) and select **Read & Write**
4. Copy the token and paste it into the GitHub secret

### Push to Docker Hub (Manual)

If you want to build and push manually instead of using GitHub Actions:

```sh
export DOCKERHUB_USERNAME=your-username
docker build -t $DOCKERHUB_USERNAME/weightloss-app:latest ./app
docker push $DOCKERHUB_USERNAME/weightloss-app:latest
```

## Deploy via Portainer

### Prerequisites

- A PostgreSQL 16 instance accessible from the container
- Portainer running on your Docker host

### Stack Configuration

1. In Portainer, go to **Stacks → Add stack**
2. Name it `weightloss-app`
3. Paste the contents of `docker-compose.yml` (from this repository)
4. Under **Environment variables**, add all the values from `.env.example`
   (or create a `.env` file on the host and reference it in Portainer)
5. Click **Deploy the stack**

The stack pulls the image from Docker Hub, so no local build is needed.

### Required Environment Variables

| Variable            | Description                              |
|---------------------|------------------------------------------|
| `DOCKERHUB_USERNAME` | Docker Hub username for the image        |
| `POSTGRES_HOST`      | PostgreSQL hostname or IP                |
| `POSTGRES_PORT`      | PostgreSQL port (default 5432)           |
| `POSTGRES_DB`        | Database name                            |
| `POSTGRES_USER`      | Database user                            |
| `POSTGRES_PASSWORD`  | Database password                        |
| `SESSION_SECRET`     | Long random string for session encryption |

### Ports

Port `7673` is exposed on the host and maps to the app's internal port `7673`.

Access the app at: `http://<your-nas-ip>:7673`

### Persistent Storage

The container is stateless by design. For photo upload persistence, add a
bind mount in Portainer under the stack's **Volumes** section:

| Container path | Purpose             |
|---------------|----------------------|
| `/app/uploads` | Uploaded photos      |
| `/app/logs`    | Application logs     |
| `/app/data`    | Runtime cache        |

After adding a volume, update the corresponding environment variables:
- `UPLOADS_DIR=/app/uploads`
- `LOG_DIR=/app/logs`
- `DATA_DIR=/app/data`

## Updating

When a new version is pushed to `main`, GitHub Actions automatically builds and
pushes a new `latest` image. To deploy it:

1. In Portainer, go to **Stacks → weightloss-app**
2. Click **Update the stack**
3. Under **Image**, set the pull policy to **Always**
4. Click **Update**

The stack will pull the latest image and restart the container.

To update manually via CLI:

```sh
docker compose pull
docker compose up -d
```

## First Run

On first startup, if no users exist in the database, the app creates an admin
account from the `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` environment
variables. **Change the admin password immediately after first login**.

## Security

- Passwords hashed with bcryptjs
- Server-side sessions in PostgreSQL with configurable TTL
- CSRF double-submit cookie pattern
- Rate-limited login (10 attempts/hour per email, configurable)
- Photo uploads validated by MIME type and size
- No third-party analytics, tracking, or external SaaS

## License

MIT
