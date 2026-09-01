# Clenzey Backend — AWS Production Deployment Guide

Complete step-by-step guide to deploy the Clenzey backend at **`https://api.clenzey.com`**.

This guide is tailored to the current codebase:

| Component | Technology |
|-----------|------------|
| Runtime | Node.js 24, Express 5, TypeScript |
| Database | PostgreSQL 16 + **PostGIS 3** (geospatial queries) |
| ORM / migrations | Drizzle ORM (`migrations/` folder) |
| Cache / rate limiting | Redis 7 (required in production) |
| Real-time | Socket.IO (WebSocket + long polling) |
| Container | Multi-stage Docker (`Dockerfile`) |
| Health checks | `GET /api/v1/health/live`, `GET /api/v1/health/ready` |
| Integrations | Firebase (phone auth + push), MSG91 (SMS), Razorpay (payments), Google Maps |

**Recommended AWS region:** `ap-south-1` (Mumbai) — lowest latency for India, aligns with MSG91/Razorpay, and matches the example task definition in this repo.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Cost Estimate (Startup)](#2-cost-estimate-startup)
3. [Prerequisites](#3-prerequisites)
4. [Phase 1 — AWS Foundation](#4-phase-1--aws-foundation)
5. [Phase 2 — Networking (VPC)](#5-phase-2--networking-vpc)
6. [Phase 3 — Database (RDS PostgreSQL + PostGIS)](#6-phase-3--database-rds-postgresql--postgis)
7. [Phase 4 — Cache (ElastiCache Redis)](#7-phase-4--cache-elasticache-redis)
8. [Phase 5 — Container Registry (ECR)](#8-phase-5--container-registry-ecr)
9. [Phase 6 — Secrets Manager](#9-phase-6--secrets-manager)
10. [Phase 7 — IAM Roles](#10-phase-7--iam-roles)
11. [Phase 8 — ECS Fargate Service](#11-phase-8--ecs-fargate-service)
12. [Phase 9 — Load Balancer & TLS (ALB + ACM)](#12-phase-9--load-balancer--tls-alb--acm)
13. [Phase 10 — DNS (Route 53)](#13-phase-10--dns-route-53)
14. [Phase 11 — Database Migrations & Seed Data](#14-phase-11--database-migrations--seed-data)
15. [Phase 12 — External Service Configuration](#15-phase-12--external-service-configuration)
16. [Phase 13 — CI/CD (GitHub Actions)](#16-phase-13--cicd-github-actions)
17. [Phase 14 — Monitoring & Alerts](#17-phase-14--monitoring--alerts)
18. [Phase 15 — File Uploads (S3 + CloudFront)](#18-phase-15--file-uploads-s3--cloudfront)
19. [Mobile Apps, Web App & CORS](#19-mobile-apps-web-app--cors)
20. [Scaling & High Availability](#20-scaling--high-availability)
21. [Security Checklist](#21-security-checklist)
22. [Post-Deployment Verification](#22-post-deployment-verification)
23. [Troubleshooting](#23-troubleshooting)
24. [Future Enhancements](#24-future-enhancements)

---

## 1. Architecture Overview

```
                         ┌─────────────────────────────────────────────┐
                         │              AWS Route 53                   │
                         │         api.clenzey.com → ALB               │
                         └────────────────────┬────────────────────────┘
                                              │ HTTPS (443)
                         ┌────────────────────▼────────────────────────┐
                         │     Application Load Balancer (ALB)         │
                         │  • TLS termination (ACM certificate)          │
                         │  • Health check: /api/v1/health/ready       │
                         │  • Sticky sessions (Socket.IO)                │
                         │  • Idle timeout ≥ 60s                       │
                         └────────────────────┬────────────────────────┘
                                              │ HTTP :3001
              ┌───────────────────────────────┼───────────────────────────────┐
              │              VPC (10.0.0.0/16)  │                               │
              │  Public subnets                 │                               │
              │  ┌─────────────┐  ┌─────────────┐                               │
              │  │ NAT Gateway │  │ NAT Gateway │  (optional: 1 NAT to save $)  │
              │  └──────┬──────┘  └──────┬──────┘                               │
              │         │                │                                       │
              │  Private subnets         │                                       │
              │  ┌──────▼────────────────▼──────┐                               │
              │  │   ECS Fargate (2 tasks)       │                               │
              │  │   clenzey-backend container   │                               │
              │  │   • Express API               │                               │
              │  │   • Socket.IO                 │                               │
              │  └──────┬───────────────┬────────┘                               │
              │         │               │                                        │
              │  ┌──────▼──────┐ ┌──────▼──────────┐                            │
              │  │ RDS Postgres│ │ ElastiCache     │                            │
              │  │ 16 + PostGIS│ │ Redis 7         │                            │
              │  └─────────────┘ └─────────────────┘                            │
              └─────────────────────────────────────────────────────────────────┘

External clients:
  • React Native consumer app  ──► https://api.clenzey.com/api/v1/...
  • React Native partner app   ──► https://api.clenzey.com/api/v1/...
  • clenzey.com (Amplify)      ──► landing page only (no backend calls today)
  • Future consumer web app    ──► https://app.clenzey.com (planned)
  • Razorpay webhooks          ──► POST /api/v1/payments/webhooks/razorpay
```

### Why these services (startup-friendly)

| Service | Why | Alternatives to avoid early |
|---------|-----|----------------------------|
| **ECS Fargate** | No EC2 patching; pay per task; scales cleanly; Docker-native | EKS (overkill), EC2 + PM2 (ops burden) |
| **RDS PostgreSQL** | Managed backups, Multi-AZ option, PostGIS support | Self-hosted Postgres on EC2 |
| **ElastiCache Redis** | Required for distributed rate limiting & OTP cooldown across 2+ tasks | In-memory (breaks with multiple tasks) |
| **ALB** | Native TLS, health checks, WebSocket/Socket.IO support | API Gateway (poor fit for Socket.IO) |
| **Secrets Manager** | Secure injection into ECS tasks; rotation support | Plain env vars in task definition |
| **Route 53** | Already in use for clenzey.com | — |
| **CloudWatch** | Built-in ECS logs; no extra vendor cost at launch | Datadog/Sentry (add later if needed) |

---

## 2. Cost Estimate (Startup)

Approximate monthly cost in `ap-south-1` for **1k–10k users** (single environment):

| Resource | Spec | ~Monthly (USD) |
|----------|------|----------------|
| ECS Fargate (API) | 2 × (0.5 vCPU, 1 GB) | $30–40 |
| ECS Fargate (worker) | 1 × (0.5 vCPU, 1 GB) | $15–20 |
| RDS PostgreSQL | `db.t4g.small`, Single-AZ, 20 GB gp3 | $25–35 |
| ElastiCache Redis | `cache.t4g.micro` | $12–15 |
| ALB | 1 load balancer + LCU usage | $20–25 |
| NAT Gateway | 1 gateway (cost saver) | $32 + data transfer |
| Secrets Manager | ~15 secrets | $6 |
| CloudWatch Logs | 5 GB/month | $2–5 |
| ECR | < 10 GB images | $1 |
| Route 53 | Hosted zone (already exists) + queries | $1 |
| ACM certificate | — | **Free** |
| **Total** | | **~$130–170/month** |

**Cost-saving tips for launch:**

- Start with **1 Fargate task** during private beta (~$15 savings); scale to 2 before public launch.
- Use **1 NAT Gateway** instead of 2 (accept slight AZ dependency for outbound traffic).
- RDS **Single-AZ** initially; enable Multi-AZ before high-traffic launch.
- Use **Savings Plans** or **Reserved Instances** after 2–3 months of stable usage.
- Enable **RDS automated backups** (7-day retention is sufficient at launch).

---

## 3. Prerequisites

Before starting, ensure you have:

- [ ] AWS account with billing enabled
- [ ] AWS CLI v2 installed and configured (`aws configure`)
- [ ] Docker installed locally
- [ ] Domain `clenzey.com` hosted in Route 53 (already done)
- [ ] GitHub repository access for CI/CD
- [ ] Production credentials ready:
  - MSG91 auth key (transactional/marketing SMS)
  - Firebase service account (project ID, client email, private key)
  - Google Maps API key (restrict by IP/API later)
  - Razorpay live keys & webhook secret
- [ ] A strong `JWT_SECRET` (minimum **32 characters** — enforced by the app in `NODE_ENV=prod`)

---

## 4. Phase 1 — AWS Foundation

### 4.1 Choose region

All resources below use **`ap-south-1`**. Keep everything in one region to avoid cross-region latency and data transfer costs.

### 4.2 Set environment variables (local shell)

Use these throughout the guide:

```bash
export AWS_REGION=ap-south-1
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
export PROJECT=clenzey
export ENV=prod
```

### 4.3 Enable required services

Most services are enabled by default. Verify you can access:

- ECS, ECR, RDS, ElastiCache, ALB (EC2), ACM, Secrets Manager, CloudWatch, Route 53

---

## 5. Phase 2 — Networking (VPC)

Create an isolated network for the backend. You can use the **VPC wizard** or Terraform/CDK later; below is the manual approach.

### 5.1 Create VPC

| Setting | Value |
|---------|-------|
| Name | `clenzey-prod-vpc` |
| IPv4 CIDR | `10.0.0.0/16` |
| Tenancy | Default |

### 5.2 Subnets (2 Availability Zones minimum)

| Subnet | CIDR | AZ | Type |
|--------|------|-----|------|
| `clenzey-prod-public-1a` | `10.0.1.0/24` | ap-south-1a | Public |
| `clenzey-prod-public-1b` | `10.0.2.0/24` | ap-south-1b | Public |
| `clenzey-prod-private-1a` | `10.0.10.0/24` | ap-south-1a | Private |
| `clenzey-prod-private-1b` | `10.0.11.0/24` | ap-south-1b | Private |

### 5.3 Internet Gateway & NAT

1. Create and attach an **Internet Gateway** to the VPC.
2. Create **1 NAT Gateway** in a public subnet (with an Elastic IP) — cost-effective for startup.
3. Route tables:
   - **Public RT:** `0.0.0.0/0` → Internet Gateway
   - **Private RT:** `0.0.0.0/0` → NAT Gateway

### 5.4 VPC Endpoints (optional, saves NAT data transfer)

Consider adding interface endpoints for:

- `com.amazonaws.ap-south-1.ecr.api`
- `com.amazonaws.ap-south-1.ecr.dkr`
- `com.amazonaws.ap-south-1.logs`
- `com.amazonaws.ap-south-1.secretsmanager`

These let ECS pull images and write logs without routing through NAT.

---

## 6. Phase 3 — Database (RDS PostgreSQL + PostGIS)

The app uses PostGIS for geospatial features (service zones, partner locations). RDS PostgreSQL 16 supports PostGIS via parameter group / extension.

### 6.1 Create DB subnet group

- Name: `clenzey-prod-db-subnet`
- Subnets: both **private** subnets

### 6.2 Create security group — `clenzey-prod-rds-sg`

| Direction | Source | Port | Purpose |
|-----------|--------|------|---------|
| Inbound | `clenzey-prod-ecs-sg` (create in Phase 8) | 5432 | ECS → RDS |
| Outbound | All | All | Default |

### 6.3 Create RDS instance

| Setting | Recommended value |
|---------|-------------------|
| Engine | PostgreSQL 16 |
| Template | Production (or Dev/Test for staging) |
| Instance class | `db.t4g.small` (launch) → `db.t4g.medium` (growth) |
| Storage | 20 GB gp3, autoscaling enabled |
| Multi-AZ | **No** at launch, **Yes** before high traffic |
| DB identifier | `clenzey-prod` |
| Master username | `clenzey_admin` |
| Master password | Generate strong password (store in Secrets Manager) |
| Initial database | `clenzey` |
| VPC | `clenzey-prod-vpc` |
| Subnet group | `clenzey-prod-db-subnet` |
| Public access | **No** |
| Security group | `clenzey-prod-rds-sg` |
| Backup retention | 7 days |
| Encryption | Enabled (default KMS key) |
| Deletion protection | **Enabled** |

### 6.4 Enable PostGIS extension

After RDS is available, connect from a bastion or one-off ECS task and run:

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

This matches `init-postgis.sql` used in local Docker.

### 6.5 Build DATABASE_URL

Format:

```
postgresql://clenzey_admin:YOUR_PASSWORD@clenzey-prod.xxxxx.ap-south-1.rds.amazonaws.com:5432/clenzey
```

Store this in Secrets Manager (Phase 9).

---

## 7. Phase 4 — Cache (ElastiCache Redis)

Redis is **required in production** — the app uses it for:

- API rate limiting (shared across ECS tasks)
- OTP cooldown / attempt tracking

### 7.1 Create cache subnet group

- Name: `clenzey-prod-redis-subnet`
- Subnets: both private subnets

### 7.2 Create security group — `clenzey-prod-redis-sg`

| Direction | Source | Port |
|-----------|--------|------|
| Inbound | `clenzey-prod-ecs-sg` | 6379 |

### 7.3 Create Redis cluster

| Setting | Value |
|---------|-------|
| Engine | Redis 7.x |
| Node type | `cache.t4g.micro` (launch) |
| Replicas | 0 (single node at launch) |
| Cluster mode | Disabled |
| Name | `clenzey-prod-redis` |
| Subnet group | `clenzey-prod-redis-subnet` |
| Security group | `clenzey-prod-redis-sg` |
| Encryption in transit | Enabled (recommended) |
| Encryption at rest | Enabled |

### 7.4 Build REDIS_URL

After creation, note the primary endpoint:

```
redis://clenzey-prod-redis.xxxxx.cache.amazonaws.com:6379
```

If encryption in transit is enabled, use `rediss://` (note the double **s**).

---

## 8. Phase 5 — Container Registry (ECR)

### 8.1 Create repository

```bash
aws ecr create-repository \
  --repository-name clenzey-backend \
  --region $AWS_REGION \
  --image-scanning-configuration scanOnPush=true \
  --encryption-configuration encryptionType=AES256
```

### 8.2 Build and push image

From the repo root:

```bash
# Authenticate Docker to ECR
aws ecr get-login-password --region $AWS_REGION | \
  docker login --username AWS --password-stdin \
  $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com

# Build production image
docker build -t clenzey-backend:latest .

# Tag and push
docker tag clenzey-backend:latest \
  $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/clenzey-backend:latest

docker push \
  $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/clenzey-backend:latest
```

**Image contents (from `Dockerfile`):**

- Compiled TypeScript (`dist/`)
- Production dependencies
- Migration SQL files (`migrations/`)
- `drizzle-kit` for running migrations inside the container

---

## 9. Phase 6 — Secrets Manager

Store all sensitive configuration in Secrets Manager. The app validates these at startup when `NODE_ENV=prod` (see `src/configs/environmentConfig.ts`).

### 9.1 Create secrets

Create one secret per value (simplest ECS integration) under prefix `clenzey/prod/`:

| Secret name | Example value | Required in prod |
|-------------|---------------|------------------|
| `clenzey/prod/database-url` | `postgresql://...` | Yes |
| `clenzey/prod/jwt-secret` | 32+ char random string | Yes |
| `clenzey/prod/redis-url` | `redis://...` or `rediss://...` | Yes |
| `clenzey/prod/msg91-auth-key` | MSG91 key | Yes |
| `clenzey/prod/msg91-sms-flow-id` | SMS flow ID | Yes |
| `clenzey/prod/razorpay-key-id` | `rzp_live_...` | Yes |
| `clenzey/prod/razorpay-key-secret` | Live secret | Yes |
| `clenzey/prod/razorpay-webhook-secret` | Webhook secret | Yes |
| `clenzey/prod/firebase-project-id` | Firebase project | Yes |
| `clenzey/prod/firebase-client-email` | Service account email | Yes |
| `clenzey/prod/firebase-private-key` | PEM key (see note below) | Yes |
| `clenzey/prod/google-maps-api-key` | API key | Yes |
| `clenzey/prod/cors-origins` | Comma-separated origins | Recommended |
| `clenzey/prod/socket-cors-origins` | Comma-separated origins | Recommended |
| `clenzey/prod/upload-url-origins` | S3/CloudFront origins | **Yes** |
| `clenzey/prod/object-storage-bucket` | Upload bucket name | **Yes** |
| `clenzey/prod/object-storage-public-base-url` | CDN or public bucket URL | **Yes** |
| `clenzey/prod/internal-api-key` | 32+ char key for attendance/payroll APIs | **Yes** |

**Firebase private key note:** Store the full PEM including newlines. In Secrets Manager, paste the key as-is. ECS injects it as an environment variable; the app expects `\n` literals if the key was escaped — test after first deploy.

**Generate JWT secret:**

```bash
openssl rand -base64 48
```

### 9.2 CORS values for launch

For mobile-only launch (React Native apps):

```
# clenzey/prod/cors-origins
https://clenzey.com,https://www.clenzey.com

# clenzey/prod/socket-cors-origins
https://clenzey.com,https://www.clenzey.com
```

> **Note:** React Native HTTP clients typically send **no `Origin` header**, so API CORS is permissive for mobile (`!origin` passes). These values matter when you add the consumer web app and admin panel.

---

## 10. Phase 7 — IAM Roles

### 10.1 ECS Task Execution Role

AWS provides `ecsTaskExecutionRole` (or create one) with policies:

- `AmazonECSTaskExecutionRolePolicy` (pull ECR, write CloudWatch logs)
- Inline policy for Secrets Manager read:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": "arn:aws:secretsmanager:ap-south-1:ACCOUNT_ID:secret:clenzey/prod/*"
    }
  ]
}
```

### 10.2 ECS Task Role — `clenzeyBackendTaskRole`

For future S3 presigned URL generation (Phase 15):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject"
      ],
      "Resource": "arn:aws:s3:::clenzey-prod-uploads/*"
    }
  ]
}
```

---

## 11. Phase 8 — ECS Fargate Service

### 11.1 Create CloudWatch log group

```bash
aws logs create-log-group \
  --log-group-name /ecs/clenzey-backend \
  --region $AWS_REGION
```

### 11.2 Create security group — `clenzey-prod-ecs-sg`

| Direction | Source | Port | Purpose |
|-----------|--------|------|---------|
| Inbound | `clenzey-prod-alb-sg` | 3001 | ALB → ECS |
| Outbound | All | All | RDS, Redis, external APIs |

Also update RDS and Redis security groups to allow inbound from this SG.

### 11.3 Task definition

Use [`deploy/ecs-task-definition.example.json`](./ecs-task-definition.example.json) as the template.

Replace placeholders:

- `ACCOUNT_ID` → your AWS account ID
- Image URI → your ECR image URI
- Secret ARNs → full ARNs from Secrets Manager (include the random suffix AWS appends)

Register the task definition:

```bash
aws ecs register-task-definition \
  --cli-input-json file://deploy/ecs-task-definition.json
```

**Key task settings (already in example):**

| Setting | Value | Why |
|---------|-------|-----|
| CPU / Memory | 512 / 1024 | Matches README recommendation |
| `PORT` | 3001 | Matches Docker EXPOSE and compose |
| `NODE_ENV` | `prod` | Enables production validation |
| `TRUST_PROXY` | `1` | One ALB hop — required for rate limiting by IP |
| `ENABLE_SWAGGER` | `false` | Swagger disabled in prod by default |
| Health check | `/api/v1/health/ready` | Checks DB + Redis |

### 11.4 Create ECS cluster

```bash
aws ecs create-cluster --cluster-name clenzey-prod
```

### 11.5 Create ECS service

| Setting | Value |
|---------|-------|
| Cluster | `clenzey-prod` |
| Service name | `clenzey-backend` |
| Launch type | Fargate |
| Task definition | `clenzey-backend` (latest) |
| Desired count | **2** (1 for private beta) |
| Platform version | LATEST |
| Subnets | Private subnets |
| Security group | `clenzey-prod-ecs-sg` |
| Public IP | **Disabled** |
| Load balancer | Attach to ALB target group (Phase 12) |

### 11.6 Deployment configuration

| Setting | Value |
|---------|-------|
| Min healthy percent | 100 |
| Max percent | 200 |
| Circuit breaker | Enabled with rollback |
| Health check grace period | 60 seconds |

### 11.7 Background worker service (required)

Booking dispatch, scheduled assignment, revalidation scans, and payroll crons run in a **separate worker process** — not inside the API container. Without this service, partners will not receive auto-assigned bookings.

Use [`deploy/ecs-worker-task-definition.example.json`](./ecs-worker-task-definition.example.json) as the template.

```bash
aws logs create-log-group \
  --log-group-name /ecs/clenzey-backend-worker \
  --region $AWS_REGION

aws ecs register-task-definition \
  --cli-input-json file://deploy/ecs-worker-task-definition.json
```

| Setting | Value |
|---------|-------|
| Service name | `clenzey-backend-worker` |
| Task definition | `clenzey-backend-worker` (latest) |
| Launch type | Fargate |
| Desired count | **1** (scale to 2 if dispatch queue depth grows) |
| Command override | `node dist/src/workers/index.js` (already in example JSON) |
| Load balancer | **None** — worker has no HTTP port |
| Subnets | Same private subnets as API |
| Security group | Same `clenzey-prod-ecs-sg` (outbound only to RDS, Redis, external APIs) |

Deploy the worker **after** Redis and the API are healthy. Rolling deploy both API and worker on each release (see [Phase 13 — CI/CD](#16-phase-13--cicd-github-actions)).

---

## 12. Phase 9 — Load Balancer & TLS (ALB + ACM)

### 12.1 Request ACM certificate

Request a certificate in **`ap-south-1`** (must be same region as ALB):

| Setting | Value |
|---------|-------|
| Domain | `api.clenzey.com` |
| Validation | DNS validation |
| Key algorithm | RSA 2048 |

ACM provides a CNAME record — add it in Route 53 (can auto-create from ACM console). Wait until status is **Issued**.

> For a future admin panel at `admin.clenzey.com`, request a wildcard `*.clenzey.com` or add SANs now to avoid reissuing.

### 12.2 Create security group — `clenzey-prod-alb-sg`

| Direction | Source | Port |
|-----------|--------|------|
| Inbound | `0.0.0.0/0` | 443 (HTTPS) |
| Inbound | `0.0.0.0/0` | 80 (optional redirect to 443) |
| Outbound | `clenzey-prod-ecs-sg` | 3001 |

### 12.3 Create Application Load Balancer

| Setting | Value |
|---------|-------|
| Name | `clenzey-prod-alb` |
| Scheme | Internet-facing |
| IP address type | IPv4 |
| Subnets | Both **public** subnets |
| Security group | `clenzey-prod-alb-sg` |

### 12.4 Target group

| Setting | Value |
|---------|-------|
| Name | `clenzey-prod-backend-tg` |
| Target type | IP |
| Protocol | HTTP |
| Port | 3001 |
| VPC | `clenzey-prod-vpc` |
| Health check path | `/api/v1/health/ready` |
| Health check interval | 30 seconds |
| Healthy threshold | 2 |
| Unhealthy threshold | 3 |
| Success codes | 200 |
| **Stickiness** | **Enabled** (LB cookie, 1 day) |

> **Stickiness is critical:** The app uses Socket.IO without a Redis adapter. With 2+ ECS tasks, WebSocket connections must stick to the same task. Enable ALB target group stickiness until you add `@socket.io/redis-adapter`.

### 12.5 ALB idle timeout

Set ALB idle timeout to **≥ 60 seconds** (default 60 is fine). The HTTP server sets `headersTimeout: 65000` and `requestTimeout: 60000` in `index.ts`.

### 12.6 Listeners

**HTTPS (443):**

- Protocol: HTTPS
- Certificate: `api.clenzey.com` (ACM)
- Default action: Forward to `clenzey-prod-backend-tg`

**HTTP (80) — optional redirect:**

- Redirect to HTTPS (301)

### 12.7 Attach ECS service to target group

When creating/updating the ECS service, register it with the target group on container port **3001**.

---

## 13. Phase 10 — DNS (Route 53)

Since `clenzey.com` is already in Route 53:

### 13.1 Create A record for API

| Setting | Value |
|---------|-------|
| Record name | `api` |
| Record type | **A** |
| Alias | Yes |
| Route traffic to | Application Load Balancer → `clenzey-prod-alb` |
| Evaluate target health | Yes |

Result: `https://api.clenzey.com` → ALB → ECS tasks.

### 13.2 Verify DNS propagation

```bash
dig api.clenzey.com
curl -I https://api.clenzey.com/api/v1/health/live
```

---

## 14. Phase 11 — Database Migrations & Seed Data

Migrations live in `migrations/` and are run with Drizzle Kit.

### 14.1 Run migrations (recommended: one-off ECS task)

**Option A — ECS run-task (production-safe):**

1. Register a task definition identical to production but with command override:

```json
"command": [
  "npx", "drizzle-kit", "migrate",
  "--config", "drizzle-migrate.config.ts"
]
```

2. Run as a one-off Fargate task in the private subnet with the same security group and secrets.

```bash
aws ecs run-task \
  --cluster clenzey-prod \
  --task-definition clenzey-backend-migrate \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx,subnet-yyy],securityGroups=[sg-ecs],assignPublicIp=DISABLED}"
```

3. Check CloudWatch logs for migration output.

**Option B — Local with VPN/bastion:**

If you temporarily allow your IP to RDS (not recommended for prod), run:

```bash
DATABASE_URL="postgresql://..." npx drizzle-kit migrate --config drizzle-migrate.config.ts
```

**Option C — Exec into running container:**

```bash
aws ecs execute-command --cluster clenzey-prod \
  --task TASK_ID \
  --container clenzey-backend \
  --interactive \
  --command "npx drizzle-kit migrate --config drizzle-migrate.config.ts"
```

Requires ECS Exec enabled on the service.

### 14.2 Seed service catalog (one-time)

Seed production service definitions:

```bash
# Via one-off task or exec
node dist/scripts/seed-services.js
```

### 14.3 Create admin user

```bash
node dist/scripts/add-admin.js --phone +91XXXXXXXXXX --role SUPER_ADMIN
```

Or use `pnpm admin:add:prod` if running locally against prod DB through a secure tunnel.

> **Do not** run the full dev seed (`scripts/seed.ts`) in production — it creates sample/test data.

---

## 15. Phase 12 — External Service Configuration

### 15.1 Razorpay webhook

Register webhook URL in Razorpay Dashboard:

```
https://api.clenzey.com/api/v1/payments/webhooks/razorpay
```

Events to subscribe:

- `payment.captured`
- `refund.processed`

Set the webhook secret to match `RAZORPAY_WEBHOOK_SECRET` in Secrets Manager.

The endpoint validates the `x-razorpay-signature` header against the raw request body.

### 15.2 MSG91

Configure `MSG91_SMS_FLOW_ID` for transactional and marketing SMS flows. Ensure MSG91 account is on a production plan with sufficient credits.

### 15.3 Firebase (phone auth + push)

Enable **Phone Authentication** in the Firebase Console for the same project used by FCM (`FIREBASE_PROJECT_ID`). Mobile apps verify OTP client-side via the Firebase SDK, then exchange the Firebase ID token at `POST /api/v1/consumers/auth/firebase` or `POST /api/v1/partners/auth/firebase`.

Upload the service account credentials used in Secrets Manager. Mobile apps register device tokens via `/api/v1/device-tokens`.

### 15.4 Google Maps API

- Restrict the API key in Google Cloud Console
- Enable: Geocoding, Places, Distance Matrix (as needed by your app)
- Consider restricting by API usage / IP

### 15.5 Mobile app configuration

Point both React Native apps to:

```
API_BASE_URL=https://api.clenzey.com/api/v1
SOCKET_URL=https://api.clenzey.com
```

Mobile apps authenticate via **Bearer token** in the `Authorization` header. Socket.IO connects with `auth: { token: "<access_token>" }`.

---

## 16. Phase 13 — CI/CD (GitHub Actions)

Current CI (`.github/workflows/ci.yml`) runs lint, type-check, test, and build. Extend it with a deploy workflow.

### 16.1 GitHub secrets

Add to the repository:

| Secret | Value |
|--------|-------|
| `AWS_ACCESS_KEY_ID` | IAM user or OIDC role access key |
| `AWS_SECRET_ACCESS_KEY` | Corresponding secret |
| `AWS_REGION` | `ap-south-1` |
| `ECR_REPOSITORY` | `clenzey-backend` |
| `ECS_CLUSTER` | `clenzey-prod` |
| `ECS_SERVICE` | `clenzey-backend` |
| `ECS_WORKER_SERVICE` | `clenzey-backend-worker` |
| `ECS_SUBNETS` | Comma-separated private subnet IDs (for migrate run-task) |
| `ECS_SECURITY_GROUPS` | ECS security group ID (for migrate run-task) |

**Better:** Use **OIDC federation** (GitHub → AWS) instead of long-lived access keys.

### 16.2 Example deploy workflow

Create `.github/workflows/deploy-prod.yml` (included in this repo):

Manual trigger via **Actions → Deploy Production → Run workflow**. Requires a GitHub `production` environment with the secrets above.

The workflow:

1. Builds and pushes the Docker image to ECR
2. Runs a one-off migration ECS task (when `ECS_SUBNETS` / `ECS_SECURITY_GROUPS` are configured)
3. Rolling deploys **both** `clenzey-backend` and `clenzey-backend-worker` services
4. Waits for both services to stabilize

```yaml
# See .github/workflows/deploy-prod.yml for the full workflow.
name: Deploy Production

on:
  workflow_dispatch:
    inputs:
      image_tag:
        description: "Docker image tag (defaults to commit SHA)"
        required: false
        type: string
```

### 16.3 Migration in CI/CD

Run migrations **before** ECS deployment in the pipeline:

1. Build & push image
2. Run one-off ECS migrate task (wait for success)
3. Update ECS API **and worker** services (rolling deploy)

Never run migrations concurrently from multiple tasks.

---

## 17. Phase 14 — Monitoring & Alerts

### 17.1 CloudWatch Logs

ECS tasks ship logs to `/ecs/clenzey-backend`. Logs are JSON-structured via Winston.

Useful queries (CloudWatch Logs Insights):

```
fields @timestamp, @message
| filter @message like /error/i
| sort @timestamp desc
| limit 50
```

### 17.2 CloudWatch Alarms

Create alarms for:

| Alarm | Metric | Threshold |
|-------|--------|-----------|
| ECS CPU high | `CPUUtilization` | > 80% for 5 min |
| ECS memory high | `MemoryUtilization` | > 80% for 5 min |
| Unhealthy hosts | ALB `UnHealthyHostCount` | ≥ 1 for 2 min |
| 5xx rate | ALB `HTTPCode_Target_5XX_Count` | > 10 in 5 min |
| RDS storage | `FreeStorageSpace` | < 5 GB |
| RDS connections | `DatabaseConnections` | > 80% of max |

Send notifications to an SNS topic → email/Slack.

### 17.3 AWS X-Ray (optional)

Add later if you need distributed tracing. Not required at launch.

### 17.4 External monitoring (post-launch)

Consider Sentry or Datadog when you need:

- Error grouping & stack traces beyond CloudWatch
- APM / latency breakdown
- Uptime monitoring from outside AWS

---

## 18. Phase 15 — File Uploads (S3 + CloudFront)

The backend stores **URLs** for booking photos and KYC documents — it does not upload files itself. Clients upload directly to object storage, then send the URL to the API.

The app validates upload URLs against `ALLOWED_UPLOAD_URL_ORIGINS` (see `src/validations/uploadUrlValidator.ts`).

### 18.1 Create S3 bucket

| Setting | Value |
|---------|-------|
| Name | `clenzey-prod-uploads` |
| Region | `ap-south-1` |
| Block public access | **On** (use presigned URLs or CloudFront OAC) |
| Encryption | SSE-S3 or SSE-KMS |
| Versioning | Enabled (recommended) |

### 18.2 CORS on bucket (for client direct upload)

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["PUT", "POST", "GET"],
    "AllowedOrigins": [
      "https://clenzey.com",
      "https://www.clenzey.com"
    ],
    "ExposeHeaders": ["ETag"]
  }
]
```

Add mobile app origins or use presigned URLs from the backend (no browser CORS needed).

### 18.3 CloudFront distribution (recommended)

- Origin: S3 bucket via Origin Access Control (OAC)
- Domain: `cdn.clenzey.com` (optional custom domain)
- HTTPS only

Update secret `clenzey/prod/upload-url-origins`:

```
https://clenzey-prod-uploads.s3.ap-south-1.amazonaws.com,https://cdn.clenzey.com
```

### 18.4 Lifecycle rules

Move objects to S3 Infrequent Access after 90 days; Glacier after 1 year for KYC documents (check compliance requirements).

---

## 19. Mobile Apps, Web App & CORS

### 19.1 React Native apps (launch)

| Concern | Behavior |
|---------|----------|
| REST API CORS | Native apps typically send no `Origin` — allowed by default |
| Auth | Short-lived JWT in `Authorization: Bearer <token>` header |
| Refresh tokens | HttpOnly cookies (`rft_consumer`, `rft_partner`) — ensure your RN HTTP client stores/sends cookies if using refresh flow |
| Socket.IO | Connect to `https://api.clenzey.com` with token in `auth.token` |
| Push notifications | Firebase device tokens registered via API |

### 19.2 Future consumer web app

When you deploy a web app (likely Amplify, similar to the landing page):

1. Choose a subdomain, e.g. `app.clenzey.com`
2. Add to Secrets Manager:
   ```
   CORS_ORIGINS=https://app.clenzey.com,https://clenzey.com
   SOCKET_CORS_ORIGINS=https://app.clenzey.com
   ```
3. Update S3/CloudFront CORS allowlist
4. Redeploy ECS tasks (or restart) to pick up new secrets

### 19.3 Admin panel (future)

If hosted at `admin.clenzey.com`:

- Add to CORS and Socket CORS origins
- Admin auth uses `rft_admin` cookie with `SameSite=strict` — admin panel **must** be on a clenzey.com subdomain for cookies to work correctly

### 19.4 Landing page (clenzey.com on Amplify)

No backend configuration needed unless the landing page starts calling the API.

---

## 20. Scaling & High Availability

### 20.1 Launch (0–10k users)

| Component | Configuration |
|-----------|---------------|
| ECS tasks | 2 × (0.5 vCPU, 1 GB) |
| RDS | `db.t4g.small`, Single-AZ |
| Redis | `cache.t4g.micro`, 1 node |
| ALB | 1, stickiness enabled |

### 20.2 Growth (10k–50k users)

| Component | Action |
|-----------|--------|
| ECS | Scale to 3–4 tasks; add auto-scaling on CPU > 60% |
| RDS | Upgrade to `db.t4g.medium`; enable Multi-AZ |
| Redis | Upgrade to `cache.t4g.small`; add replica |
| Socket.IO | Add `@socket.io/redis-adapter` to remove ALB stickiness dependency |

### 20.3 ECS auto-scaling

Create scaling policy:

- Target tracking: CPU utilization 60%
- Min tasks: 2
- Max tasks: 6 (adjust based on load tests)

Also consider scaling on `ALBRequestCountPerTarget`.

---

## 21. Security Checklist

- [ ] RDS is in private subnets with no public access
- [ ] ECS tasks have no public IP
- [ ] Security groups follow least privilege (only required ports)
- [ ] All secrets in Secrets Manager (nothing in task definition plaintext except non-sensitive config)
- [ ] `JWT_SECRET` ≥ 32 characters
- [ ] `ENABLE_SWAGGER=false` in production
- [ ] `TRUST_PROXY=1` set (one ALB hop)
- [ ] ACM TLS 1.2+ on ALB
- [ ] RDS encryption at rest enabled
- [ ] Redis encryption in transit enabled
- [ ] RDS deletion protection enabled
- [ ] IAM roles follow least privilege
- [ ] ECR image scanning enabled
- [ ] CloudWatch alarms configured
- [ ] Razorpay webhook signature validation active
- [ ] `ALLOWED_UPLOAD_URL_ORIGINS` configured with at least one CDN origin
- [ ] `OBJECT_STORAGE_BUCKET` and `OBJECT_STORAGE_PUBLIC_BASE_URL` configured
- [ ] `INTERNAL_API_KEY` configured (32+ characters)
- [ ] `clenzey-backend-worker` ECS service running (dispatch + payroll crons)
- [ ] Google Maps & Firebase keys restricted in respective consoles
- [ ] Enable AWS GuardDuty (free trial, low cost) for threat detection

### Optional: AWS WAF on ALB

Add WAF for:

- Rate-based rules (DDoS mitigation)
- AWS Managed Rules (common exploits)
- Geo-blocking if you only serve India

Cost: ~$5–10/month + rules. Worth adding before public marketing launch.

---

## 22. Post-Deployment Verification

Run through this checklist after first deploy:

### 22.1 Health endpoints

```bash
# Liveness
curl https://api.clenzey.com/api/v1/health/live

# Readiness (DB + Redis)
curl https://api.clenzey.com/api/v1/health/ready
```

Expected readiness response:

```json
{
  "data": {
    "status": "ready",
    "checks": { "database": "ok", "redis": "ok" },
    "timestamp": "..."
  }
}
```

### 22.2 TLS

```bash
curl -vI https://api.clenzey.com 2>&1 | grep "SSL certificate"
```

Verify certificate is issued for `api.clenzey.com`.

### 22.3 Firebase phone auth

Test consumer/partner sign-in from a test device: complete phone OTP in the mobile app (Firebase SDK), then verify `POST /auth/firebase` returns Clenzey JWT tokens against the production API URL.

### 22.4 Socket.IO

Connect from a test client with a valid access token; verify `booking:status_changed` events propagate.

### 22.5 Razorpay

Create a test payment (use Razorpay test mode first in staging); verify webhook delivery in Razorpay dashboard logs.

### 22.6 ECS rolling deploy

Push a no-op change; verify zero-downtime rolling update and circuit breaker rollback works.

---

## 23. Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Tasks fail to start | Missing/invalid secrets | Check CloudWatch logs for Zod validation errors from `environmentConfig.ts` |
| Health check failing | RDS/Redis unreachable | Verify security groups; check `DATABASE_URL` and `REDIS_URL` |
| 502 from ALB | Tasks not registered / crashing | Check target group health; inspect ECS task logs |
| Socket.IO disconnects | Missing ALB stickiness | Enable target group stickiness |
| Socket.IO works on 1 task only | No Redis adapter + no stickiness | Enable stickiness or add Redis adapter |
| CORS errors from web | Origin not in `CORS_ORIGINS` | Update Secrets Manager secret; redeploy tasks |
| Razorpay webhook 400 | Signature mismatch | Ensure raw body is preserved; verify webhook secret |
| Firebase push fails | Malformed private key | Check `\n` handling in Secrets Manager |
| Migrations fail on PostGIS | Extension not enabled | Run `CREATE EXTENSION postgis;` on RDS |
| High NAT costs | All traffic through NAT | Add VPC endpoints for ECR, Logs, Secrets Manager |

### Useful commands

```bash
# ECS service events
aws ecs describe-services --cluster clenzey-prod --services clenzey-backend

# Task logs
aws logs tail /ecs/clenzey-backend --follow

# Force new deployment
aws ecs update-service --cluster clenzey-prod --service clenzey-backend --force-new-deployment
```

---

## 24. Future Enhancements

| Enhancement | When | Service |
|-------------|------|---------|
| Staging environment | Before major releases | Duplicate stack with `ENV=staging` |
| Multi-AZ RDS | Before marketing push | RDS setting |
| Socket.IO Redis adapter | When scaling beyond 2 tasks | ElastiCache (already provisioned) |
| Custom admin domain | Admin panel launch | `admin.clenzey.com` + ACM SAN |
| Consumer web app | When ready | Amplify Hosting at `app.clenzey.com` |
| WAF | Public launch | AWS WAF on ALB |
| Infrastructure as Code | Team grows | Terraform or AWS CDK |
| Blue/green deploys | Zero-downtime requirements | ECS CodeDeploy |
| Database read replicas | Read-heavy analytics | RDS read replica |
| Sentry / Datadog | Error tracking needs | Third-party SaaS |

---

## Quick Reference

| Item | Value |
|------|-------|
| Production API URL | `https://api.clenzey.com/api/v1` |
| Health (ALB check) | `GET /api/v1/health/ready` |
| Razorpay webhook | `POST /api/v1/payments/webhooks/razorpay` |
| Container port | 3001 |
| AWS region | ap-south-1 |
| ECS cluster | clenzey-prod |
| ECS service | clenzey-backend |
| ECR repo | clenzey-backend |
| Task definition template | `deploy/ecs-task-definition.example.json` |
| Migration command | `npx drizzle-kit migrate --config drizzle-migrate.config.ts` |

---

*Last updated: June 2025 — aligned with Clenzey backend v1.0.0 (Node 24, Express 5, PostgreSQL 16 + PostGIS, Redis 7, Socket.IO 4).*
