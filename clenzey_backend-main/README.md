# Clenzey Backend

Tech-enabled home services platform API — Express 5, PostgreSQL + PostGIS, Drizzle ORM, Socket.IO.

## Requirements

- Node.js 24 (see `.nvmrc`)
- pnpm 10
- PostgreSQL 16 with PostGIS 3

## Local development

```bash
pnpm install
cp .env.example .env.dev
# Set DATABASE_URL in .env.dev

pnpm db:dev:migrate
pnpm dev
```

API base URL: `http://localhost:3000/api/v1`

Swagger (dev): `http://localhost:3000/api/v1/docs`

## Docker (local)

Stack: PostgreSQL (host port **5433**), Redis (host port **6379**), backend (**3001**).

```bash
make up      # starts db, redis, and backend
make migrate # runs drizzle-kit migrate inside the backend container
make seed
```

Backend runs on port **3001** in Docker (`PORT=3001` is set in compose).  
`REDIS_URL=redis://redis:6379` is injected automatically for the backend service.

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Hot reload dev server |
| `pnpm build` | Compile TypeScript |
| `pnpm start` | Run production build |
| `pnpm test:run` | Run tests |
| `pnpm lint` | ESLint |
| `pnpm type-check` | TypeScript check |
| `pnpm db:dev:migrate` | Run migrations (dev) |
| `pnpm seed` | Seed database |

## Health checks

| Endpoint | Purpose |
|----------|---------|
| `GET /api/v1/health/live` | Liveness — process is running |
| `GET /api/v1/health/ready` | Readiness — DB + Redis (when configured) |

Configure ALB target group health checks to use `/api/v1/health/ready`.

## Environment variables

See [`.env.example`](.env.example) for the full list.

**Production requirements** (`NODE_ENV=prod`):

- `JWT_SECRET` — minimum 32 characters
- `DATABASE_URL`, `REDIS_URL`
- `CORS_ORIGINS`, `SOCKET_CORS_ORIGINS` (required for web clients; mobile apps work without them)
- `MSG91_*`, `FIREBASE_*`, `GOOGLE_MAPS_API_KEY`, `RAZORPAY_*`
- `OBJECT_STORAGE_BUCKET`, `OBJECT_STORAGE_ENDPOINT`, `OBJECT_STORAGE_PUBLIC_BASE_URL`, `ALLOWED_UPLOAD_URL_ORIGINS`
- `INTERNAL_API_KEY` — minimum 32 characters (attendance/payroll integrations)
- `LOG_LEVEL=info` (default in prod)
- `ENABLE_SWAGGER=false` (default in prod)

Store secrets in AWS Secrets Manager and inject via ECS task definition.

## Background worker (required in production)

Booking dispatch, scheduled assignment, and payroll crons run in a **separate worker process** (`node dist/src/workers/index.js`), not in the API server.

- Local Docker: `worker` service in `docker-compose.yml` (see `make logs-worker`)
- QA VPS: `worker` service in `docker-compose.qa.yml`
- AWS: deploy a second ECS service using [`deploy/ecs-worker-task-definition.example.json`](deploy/ecs-worker-task-definition.example.json)

Without the worker, instant/scheduled dispatch and payroll jobs will not run.

## Production deployment (AWS)

Recommended architecture for 1k–10k users:

- **ECS Fargate** — 2 tasks (0.5 vCPU / 1 GB each) behind an ALB
- **RDS PostgreSQL 16** — enable PostGIS extension
- **ElastiCache Redis 7** — shared rate limiting across tasks
- **ACM** — TLS certificate on ALB
- **CloudWatch Logs** — JSON structured logs from ECS

### Deploy flow

1. Build and push Docker image to ECR
2. Run database migrations (one-off ECS task — see [`deploy/PRODUCTION_DEPLOYMENT.md`](deploy/PRODUCTION_DEPLOYMENT.md))
3. Rolling deploy ECS API service **and** worker service with updated task definitions
4. Verify `/api/v1/health/ready` via ALB

### ALB configuration

- TLS termination on HTTPS listener
- Target group health check: `/api/v1/health/ready`, interval 30s
- Idle timeout ≥ 60s (required for Socket.IO long-lived connections)
- `TRUST_PROXY=1` on the backend (one ALB hop)

### Security groups

| From | To | Port |
|------|-----|------|
| ALB | ECS tasks | 3001 |
| ECS tasks | RDS | 5432 |
| ECS tasks | ElastiCache | 6379 |

### Scaling

Start with 2 Fargate tasks. Scale on CPU utilization or ALB request count. ElastiCache is required when running multiple instances (rate limits and OTP cooldown are Redis-backed).

### Reference task definitions

- API: [`deploy/ecs-task-definition.example.json`](deploy/ecs-task-definition.example.json)
- Worker: [`deploy/ecs-worker-task-definition.example.json`](deploy/ecs-worker-task-definition.example.json)

## CI / CD

GitHub Actions runs on push/PR to `main`: lint → type-check → test → build.

Production deploys use the manual [`deploy-prod`](.github/workflows/deploy-prod.yml) workflow (requires GitHub `production` environment secrets).

## Migrations

SQL migrations live in [`migrations/`](migrations/). Generate new migrations with:

```bash
pnpm db:dev:generate
pnpm db:dev:migrate
```

Commit migration files to git — they are required for reproducible production deploys.

## Security notes

- Refresh tokens are HttpOnly cookies with `SameSite=strict`
- Rate limiting on auth endpoints (login, Firebase auth, admin login); disabled in local dev by default (`ENABLE_RATE_LIMIT=false`)
- Partner operational routes require `approvalStatus=APPROVED`
- Photo listing enforces booking ownership (IDOR protection)
- Swagger UI disabled in production by default

## Follow-up (post-launch)

- External error monitoring (Sentry/Datadog) if needed beyond CloudWatch
- Redis Socket.IO adapter when scaling API tasks beyond sticky-session ALB setup
- Masked calling (Exotel) — currently returns 503 until provider integration is complete
