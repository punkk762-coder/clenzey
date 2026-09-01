# Clenzey Backend — QA / Staging VPS Deployment

Deploy the full backend stack on a **single inexpensive VPS** for development and QA testing until the August production launch on AWS.

**Target URL:** `https://dev-api.clenzey.com` (or any subdomain you choose)  
**Estimated cost:** ~€4.5–6/month  
**Stack:** Docker Compose — PostgreSQL + PostGIS, Redis, backend, Caddy (HTTPS)

---

## Table of Contents

1. [Overview](#1-overview)
2. [What You Get](#2-what-you-get)
3. [Prerequisites](#3-prerequisites)
   - [3.1 Prerequisites checklist](#31-prerequisites-checklist)
   - [3.2 Generate an SSH key pair](#32-generate-an-ssh-key-pair)
   - [3.3 Git repository access](#33-git-repository-access)
   - [3.4 AWS Route 53 access & hosted zone](#34-aws-route-53-access--hosted-zone)
   - [3.5 Choose your QA subdomain](#35-choose-your-qa-subdomain)
   - [3.6 VPS provider account](#36-vps-provider-account)
   - [3.7 Generate application secrets](#37-generate-application-secrets)
   - [3.8 Optional — third-party sandbox accounts](#38-optional--third-party-sandbox-accounts)
   - [3.9 Optional — QA tester access plan](#39-optional--qa-tester-access-plan)
4. [Step 1 — Provision a VPS](#4-step-1--provision-a-vps)
5. [Step 2 — Initial Server Setup](#5-step-2--initial-server-setup)
6. [Step 3 — Install Docker](#6-step-3--install-docker)
7. [Step 4 — Configure DNS (Route 53)](#7-step-4--configure-dns-route-53)
8. [Step 5 — Deploy the Application](#8-step-5--deploy-the-application)
9. [Step 6 — Run Migrations & Seed Data](#9-step-6--run-migrations--seed-data)
10. [Step 7 — Verify Deployment](#10-step-7--verify-deployment)
11. [Step 8 — Connect Mobile Apps](#11-step-8--connect-mobile-apps)
12. [Day-2 Operations](#12-day-2-operations)
13. [Optional Integrations (Sandbox)](#13-optional-integrations-sandbox)
14. [Security Notes](#14-security-notes)
15. [Troubleshooting](#15-troubleshooting)
16. [Migrating to AWS Production (August)](#16-migrating-to-aws-production-august)

---

## 1. Overview

```
  Mobile apps / testers
         │
         │  HTTPS
         ▼
  dev-api.clenzey.com  (Route 53 A record)
         │
         ▼
  ┌──────────────────────────────────────┐
  │           VPS (single server)         │
  │                                       │
  │  Caddy :443  ──►  backend :3001       │
  │                     ├── PostgreSQL    │
  │                     └── Redis         │
  └──────────────────────────────────────┘
```

This uses [`docker-compose.qa.yml`](../docker-compose.qa.yml) at the repo root. Unlike local `docker-compose.yml`:

- **PostgreSQL and Redis are not exposed** to the internet (internal Docker network only)
- **Caddy** terminates TLS and reverse-proxies to the backend
- **`NODE_ENV=dev`** — Redis and third-party keys are optional; Swagger is enabled

Production deployment (ECS, RDS, ElastiCache, ALB) is documented separately in [`PRODUCTION_DEPLOYMENT.md`](./PRODUCTION_DEPLOYMENT.md).

---

## 2. What You Get

| Item | Value |
|------|-------|
| API base URL | `https://dev-api.clenzey.com/api/v1` |
| Swagger UI | `https://dev-api.clenzey.com/api/v1/docs` |
| Health (liveness) | `GET /api/v1/health/live` |
| Health (readiness) | `GET /api/v1/health/ready` |
| Socket.IO | `https://dev-api.clenzey.com` |
| Razorpay webhook (if configured) | `POST /api/v1/payments/webhooks/razorpay` |

---

## 3. Prerequisites

Complete everything in this section **before** provisioning the VPS (Step 1). Most items take 15–30 minutes total if you already have AWS and GitHub access.

### 3.1 Prerequisites checklist

Use this as a go/no-go list. Every **Required** item must be done before deployment.

| # | Requirement | Required | Where to complete |
|---|-------------|----------|-------------------|
| 1 | SSH key pair on your local machine | **Yes** | [§3.2](#32-generate-an-ssh-key-pair) |
| 2 | Git clone access to `clenzey_backend` | **Yes** | [§3.3](#33-git-repository-access) |
| 3 | AWS account with Route 53 access | **Yes** | [§3.4](#34-aws-route-53-access--hosted-zone) |
| 4 | `clenzey.com` hosted zone in Route 53 | **Yes** | [§3.4](#34-aws-route-53-access--hosted-zone) |
| 5 | QA subdomain chosen (e.g. `dev-api.clenzey.com`) | **Yes** | [§3.5](#35-choose-your-qa-subdomain) |
| 6 | VPS provider account + payment method | **Yes** | [§3.6](#36-vps-provider-account) |
| 7 | `POSTGRES_PASSWORD` and `JWT_SECRET` generated | **Yes** | [§3.7](#37-generate-application-secrets) |
| 8 | MSG91 sandbox credentials | Optional | [§3.8](#38-optional--third-party-sandbox-accounts) |
| 9 | Razorpay **test mode** keys | Optional | [§3.8](#38-optional--third-party-sandbox-accounts) |
| 10 | Firebase dev project | Optional | [§3.8](#38-optional--third-party-sandbox-accounts) |
| 11 | Google Maps API key | Optional | [§3.8](#38-optional--third-party-sandbox-accounts) |

**Local machine:** macOS, Linux, or Windows with WSL2. You need a terminal and a web browser — no Node.js or Docker required on your laptop for the VPS deploy itself.

---

### 3.2 Generate an SSH key pair

The VPS provider uses your **public** key so you can log in securely without a password.

#### Step 1 — Check for an existing key

On your **local machine**:

```bash
ls -la ~/.ssh/id_ed25519.pub 2>/dev/null || ls -la ~/.ssh/id_rsa.pub 2>/dev/null
```

If a `.pub` file exists and you already use it for other servers, skip to Step 3.

#### Step 2 — Create a new key

```bash
ssh-keygen -t ed25519 -C "clenzey-qa-vps" -f ~/.ssh/id_ed25519_clenzey
```

- Press **Enter** to accept the default passphrase (or set one for extra security).
- This creates:
  - `~/.ssh/id_ed25519_clenzey` — **private** key (never share)
  - `~/.ssh/id_ed25519_clenzey.pub` — **public** key (paste into VPS provider)

#### Step 3 — Copy the public key

**macOS:**

```bash
pbcopy < ~/.ssh/id_ed25519_clenzey.pub
# or, if using default key:
pbcopy < ~/.ssh/id_ed25519.pub
```

**Linux:**

```bash
cat ~/.ssh/id_ed25519_clenzey.pub
# Select and copy the output (starts with ssh-ed25519 ...)
```

**Windows (PowerShell):**

```powershell
Get-Content $env:USERPROFILE\.ssh\id_ed25519_clenzey.pub | Set-Clipboard
```

Save this public key — you will paste it when creating the VPS in [Step 1](#4-step-1--provision-a-vps).

#### Step 4 — (Optional) Configure SSH alias

Add to `~/.ssh/config` so you can run `ssh clenzey-qa` later:

```
Host clenzey-qa
    HostName YOUR_VPS_IP
    User clenzey
    IdentityFile ~/.ssh/id_ed25519_clenzey
```

Replace `YOUR_VPS_IP` after the VPS is created.

**Verify:** You have a `.pub` file copied to your clipboard or saved in a notes app.

---

### 3.3 Git repository access

The VPS must clone `clenzey_backend` to run Docker Compose. Set this up according to how your repo is hosted.

#### Step 1 — Confirm repository URL

Find the clone URL in GitHub (or your Git host):

| Repo visibility | Clone URL format |
|-----------------|------------------|
| Public | `https://github.com/YOUR_ORG/clenzey_backend.git` |
| Private | HTTPS + token, or SSH deploy key (below) |

#### Step 2 — Test clone on your local machine

```bash
git clone https://github.com/YOUR_ORG/clenzey_backend.git /tmp/clenzey-clone-test
rm -rf /tmp/clenzey-clone-test
```

If this fails, fix access before continuing.

#### Step 3 — Private repo — choose an access method for the VPS

**Option A — HTTPS with fine-grained personal access token (simplest)**

1. GitHub → **Settings** → **Developer settings** → **Personal access tokens** → **Fine-grained tokens**
2. **Generate new token**
   - Repository access: **Only select repositories** → `clenzey_backend`
   - Permissions: **Contents** → Read-only
3. Copy the token (shown once).
4. On the VPS you will clone with:

   ```bash
   git clone https://YOUR_GITHUB_USERNAME:YOUR_TOKEN@github.com/YOUR_ORG/clenzey_backend.git
   ```

   Or clone normally and cache credentials when prompted.

**Option B — Deploy key (recommended for a long-lived QA server)**

1. On your **local machine**, generate a key used only by the VPS:

   ```bash
   ssh-keygen -t ed25519 -C "clenzey-qa-deploy" -f ~/.ssh/clenzey_qa_deploy -N ""
   ```

2. GitHub → repo → **Settings** → **Deploy keys** → **Add deploy key**
   - Title: `clenzey-qa-vps`
   - Key: paste contents of `~/.ssh/clenzey_qa_deploy.pub`
   - Allow write access: **unchecked** (read-only is enough)

3. Copy the **private** key to the VPS after creation:

   ```bash
   scp ~/.ssh/clenzey_qa_deploy clenzey@YOUR_VPS_IP:~/.ssh/
   ssh clenzey@YOUR_VPS_IP "chmod 600 ~/.ssh/clenzey_qa_deploy"
   ```

4. On the VPS, clone via SSH:

   ```bash
   GIT_SSH_COMMAND='ssh -i ~/.ssh/clenzey_qa_deploy -o IdentitiesOnly=yes' \
     git clone git@github.com:YOUR_ORG/clenzey_backend.git
   ```

**Verify:** `git clone` succeeds from your laptop (and you know which method the VPS will use).

---

### 3.4 AWS Route 53 access & hosted zone

DNS for `dev-api.clenzey.com` is managed in Route 53 (your domain `clenzey.com` is already pointed there from GoDaddy).

#### Step 1 — Sign in to AWS

1. Open [https://console.aws.amazon.com/](https://console.aws.amazon.com/)
2. Sign in with an IAM user or role that can edit Route 53 records.

Minimum IAM permissions needed:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "route53:ListHostedZones",
        "route53:GetHostedZone",
        "route53:ListResourceRecordSets",
        "route53:ChangeResourceRecordSets"
      ],
      "Resource": "*"
    }
  ]
}
```

If you are the account owner, you already have access.

#### Step 2 — Confirm the hosted zone exists

1. AWS Console → **Route 53** → **Hosted zones**
2. Find **`clenzey.com`**
3. Click it and confirm you see existing records (e.g. Amplify records for the landing page).

If the zone is missing:

- GoDaddy may still be the DNS host. Delegate DNS to Route 53 by updating GoDaddy nameservers to the four NS values Route 53 shows for the hosted zone.
- Wait up to 24–48 hours for propagation (often much faster).

#### Step 3 — Confirm you can create records

1. In the `clenzey.com` hosted zone, click **Create record**
2. You do **not** need to save yet — just confirm the form opens and you are not blocked by permissions.
3. Cancel if you are only verifying access.

The actual A record is created in [Step 4 — Configure DNS](#7-step-4--configure-dns-route-53) after you have the VPS IP.

**Verify:** You see the `clenzey.com` hosted zone and can open the create-record form.

---

### 3.5 Choose your QA subdomain

Pick a subdomain that is clearly **not** production.

| Subdomain | Use |
|-----------|-----|
| `dev-api.clenzey.com` | **Recommended** — QA / shared testing |
| `staging-api.clenzey.com` | Alternative if you prefer "staging" naming |
| `api.clenzey.com` | **Reserved** — use only for August AWS production |

#### Step 1 — Decide and document

Write down your choice, for example:

```
QA_DOMAIN=dev-api.clenzey.com
```

This value goes into `.env.qa` on the VPS ([Step 5.2](#82-create-environment-file)).

#### Step 2 — Confirm the name is free

In Route 53 → `clenzey.com` hosted zone, check that no A/CNAME record already uses `dev-api` (or your chosen name). If one exists, either remove it or pick another subdomain.

**Verify:** You have a single QA subdomain written down and it does not conflict with existing records.

---

### 3.6 VPS provider account

You need a cloud VPS account to run Docker 24/7 for ~€4–6/month.

#### Step 1 — Create an account (pick one)

| Provider | Sign-up URL | Notes |
|----------|-------------|-------|
| **Hetzner Cloud** (recommended) | [console.hetzner.cloud](https://console.hetzner.cloud) | Lowest cost; EU regions |
| DigitalOcean | [cloud.digitalocean.com](https://cloud.digitalocean.com) | `blr1` (Bangalore) if available |
| Vultr | [my.vultr.com](https://my.vultr.com) | Many regions |

#### Step 2 — Add a payment method

Complete billing verification in the provider dashboard. Hetzner and others may require a small verification charge.

#### Step 3 — Add your SSH public key to the provider

**Hetzner:** Project → **Security** → **SSH keys** → **Add SSH key**

- Name: `clenzey-qa-laptop`
- Public key: paste from [§3.2](#32-generate-an-ssh-key-pair)

**DigitalOcean:** **Settings** → **Security** → **SSH keys** → **Add SSH key**

Repeat for a **deploy key** if you generated a separate one in [§3.3](#33-git-repository-access) — or add it manually to the server later.

#### Step 4 — Note your project / region preference

Before Step 1, decide:

- **Hetzner:** Project name `clenzey`, location Nuremberg or Helsinki
- **DigitalOcean:** Bangalore or Singapore if serving testers primarily in India

**Verify:** Account is active, payment method accepted, SSH public key saved in the provider.

---

### 3.7 Generate application secrets

Generate these **now** and store them in a password manager (1Password, Bitwarden, etc.). You will paste them into `.env.qa` on the VPS.

#### Step 1 — Generate secrets locally

On your **local machine**:

```bash
# Database password (min 16 chars recommended)
echo "POSTGRES_PASSWORD=$(openssl rand -base64 24)"

# JWT signing secret (any length OK for QA; prod requires 32+)
echo "JWT_SECRET=$(openssl rand -base64 32)"
```

Copy both values to your password manager.

#### Step 2 — Prepare a local `.env.qa` draft (optional)

On your laptop, you can pre-fill a file to copy to the server later:

```bash
cd /path/to/clenzey_backend
cp .env.qa.example .env.qa.local
```

Edit `.env.qa.local`:

```bash
QA_DOMAIN=dev-api.clenzey.com
POSTGRES_PASSWORD=<paste generated value>
JWT_SECRET=<paste generated value>
```

Do **not** commit this file. `.env.qa*` is gitignored (except `.env.qa.example`).

#### Step 3 — Minimum vs full `.env.qa`

| Variable | Required for first boot? | Notes |
|----------|--------------------------|-------|
| `QA_DOMAIN` | **Yes** | Must match Route 53 record |
| `POSTGRES_PASSWORD` | **Yes** | Used by Postgres and backend |
| `JWT_SECRET` | **Yes** | Signs access tokens |
| `CORS_ORIGINS` | No | Defaults work for React Native |
| `MSG91_*` | No | Needed only for transactional/marketing SMS testing |
| `RAZORPAY_*` | No | Needed only for payment flow testing |
| `FIREBASE_*` | No | Needed only for push notifications |
| `GOOGLE_MAPS_API_KEY` | No | Needed only for maps / geocoding |

**Verify:** You have `POSTGRES_PASSWORD`, `JWT_SECRET`, and `QA_DOMAIN` saved securely.

---

### 3.8 Optional — third-party sandbox accounts

Skip this section for the **initial** deploy — the API, Swagger, and health checks work without integrations. Complete these when QA needs the corresponding flows.

#### MSG91 (transactional & marketing SMS)

Optional for QA unless testing SMS notification flows.

1. Sign up at [msg91.com](https://msg91.com)
2. Dashboard → **API** → copy **Auth Key**
3. Create or select an **SMS flow** → copy **Flow ID**
4. Add to `.env.qa`:

   ```bash
   MSG91_AUTH_KEY=your_auth_key
   MSG91_SMS_FLOW_ID=your_flow_id
   ```

5. Restart backend after updating env: `dcqa up -d --force-recreate backend`

#### Firebase (phone auth + push notifications)

Required for consumer/partner **phone OTP login** (client-side Firebase Phone Auth + backend token exchange).

1. [Firebase Console](https://console.firebase.google.com/) → create project (e.g. `clenzey-qa`)
2. Enable **Authentication** → **Phone** sign-in provider
3. **Project settings** → **Service accounts** → **Generate new private key**
4. From the downloaded JSON, extract:

   ```bash
   FIREBASE_PROJECT_ID=...
   FIREBASE_CLIENT_EMAIL=...
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   ```

5. Configure the same Firebase project in your React Native apps for QA builds (Phone Auth + FCM).

#### Razorpay (payments — test mode only)

1. Sign up at [razorpay.com](https://razorpay.com)
2. Switch dashboard to **Test Mode** (toggle in top bar)
3. **Settings** → **API Keys** → Generate → copy **Key ID** and **Key Secret**
4. **Settings** → **Webhooks** → create webhook (after QA URL is live):

   ```
   https://dev-api.clenzey.com/api/v1/payments/webhooks/razorpay
   ```

   Events: `payment.captured`, `refund.processed` → copy **Webhook Secret**

5. Add to `.env.qa`:

   ```bash
   RAZORPAY_KEY_ID=rzp_test_...
   RAZORPAY_KEY_SECRET=...
   RAZORPAY_WEBHOOK_SECRET=...
   ```

> Use **test mode** keys only on QA. Never put live Razorpay keys on a shared QA server.

#### Google Maps

1. [Google Cloud Console](https://console.cloud.google.com/) → create or select a project
2. **APIs & Services** → **Enable APIs** → enable **Geocoding API**, **Places API**, **Maps SDK** as needed
3. **Credentials** → **Create credentials** → **API key**
4. Restrict the key:
   - **Application restrictions:** IP addresses → add your **VPS public IP** (after creation)
   - **API restrictions:** limit to enabled Maps APIs
5. Add to `.env.qa`:

   ```bash
   GOOGLE_MAPS_API_KEY=AIza...
   ```

---

### 3.9 Optional — QA tester access plan

Before sharing the environment, decide:

| Item | Recommendation |
|------|----------------|
| Who gets the QA URL | Mobile devs, QA testers, founders only |
| Swagger exposure | `ENABLE_SWAGGER=true` is fine for internal QA |
| Test accounts | Create via `add-admin.js` and OTP/password test users |
| Mobile app build | Use a **QA flavor** with `API_BASE_URL=https://dev-api.clenzey.com/api/v1` |
| Production URL | Keep `api.clenzey.com` unused until August AWS launch |

Prepare a short message for testers:

```
QA API:     https://dev-api.clenzey.com/api/v1
Swagger:    https://dev-api.clenzey.com/api/v1/docs
Health:     https://dev-api.clenzey.com/api/v1/health/ready
Socket:     https://dev-api.clenzey.com
Test admin: <phone> / OTP or password as documented
```

---

### Prerequisites complete — ready for Step 1

When every **Required** row in [§3.1](#31-prerequisites-checklist) is checked:

1. SSH public key is in your VPS provider account
2. Git clone method is decided and tested
3. Route 53 hosted zone for `clenzey.com` is accessible
4. QA subdomain is chosen (`dev-api.clenzey.com`)
5. Secrets are generated and saved

Proceed to **[Step 1 — Provision a VPS](#4-step-1--provision-a-vps)**.

---

## 4. Step 1 — Provision a VPS

Pick a provider with a **€4–6/month** plan. All work equally well for this guide.

### Option A — Hetzner Cloud (recommended, lowest cost)

| Setting | Value |
|---------|-------|
| Plan | **CX22** (~€4.51/mo) |
| vCPU / RAM | 2 vCPU, 4 GB RAM |
| Location | **Nuremberg** or **Helsinki** (low latency to India is acceptable for QA) |
| OS | **Ubuntu 24.04 LTS** |
| SSH key | Add your public key at creation |

Note the **public IPv4 address** after creation (e.g. `49.12.xx.xx`).

### Option B — DigitalOcean

| Setting | Value |
|---------|-------|
| Plan | **Basic Droplet** $6/mo |
| Spec | 1 vCPU, 1 GB RAM (works; 2 GB is more comfortable for builds) |
| OS | Ubuntu 24.04 LTS |
| Region | Bangalore (`blr1`) if available, else Singapore |

### Option C — Vultr / Linode

Similar: Ubuntu 24.04, 1–2 GB RAM, ~$6/month.

---

## 5. Step 2 — Initial Server Setup

SSH into the server as root (or the default user):

```bash
ssh root@YOUR_VPS_IP
```

### 5.1 Create a deploy user

```bash
adduser clenzey
usermod -aG sudo clenzey
rsync --archive --chown=clenzey:clenzey ~/.ssh /home/clenzey
```

Log in as the new user:

```bash
ssh clenzey@YOUR_VPS_IP
```

### 5.2 Update system packages

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl ufw fail2ban
```

### 5.3 Configure firewall

Only expose SSH, HTTP, and HTTPS. PostgreSQL and Redis stay on the internal Docker network.

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

### 5.4 Enable fail2ban (SSH brute-force protection)

```bash
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

---

## 6. Step 3 — Install Docker

Install Docker Engine and the Compose plugin:

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

Log out and back in so the `docker` group applies:

```bash
exit
ssh clenzey@YOUR_VPS_IP
docker --version
docker compose version
```

---

## 7. Step 4 — Configure DNS (Route 53)

In the **AWS Route 53** hosted zone for `clenzey.com`:

1. Go to **Route 53 → Hosted zones → clenzey.com**
2. **Create record**

| Field | Value |
|-------|-------|
| Record name | `dev-api` |
| Record type | **A** |
| Value | `YOUR_VPS_IP` (e.g. `49.12.xx.xx`) |
| TTL | 300 |

Result: `dev-api.clenzey.com` → your VPS.

Verify propagation (may take a few minutes):

```bash
dig +short dev-api.clenzey.com
# Should return YOUR_VPS_IP
```

> **Important:** Create the DNS record **before** starting Caddy. Let's Encrypt validates domain ownership over HTTP on port 80.

---

## 8. Step 5 — Deploy the Application

### 8.1 Clone the repository

```bash
cd ~
git clone https://github.com/YOUR_ORG/clenzey_backend.git
cd clenzey_backend
```

Replace the URL with your actual Git remote. For a private repo, use a deploy key or HTTPS token.

### 8.2 Create environment file

```bash
cp .env.qa.example .env.qa
nano .env.qa
```

**Minimum required changes:**

```bash
QA_DOMAIN=dev-api.clenzey.com
POSTGRES_PASSWORD=<generate-a-strong-password>
JWT_SECRET=<generate-a-random-string>
```

Generate secrets:

```bash
openssl rand -base64 24    # POSTGRES_PASSWORD
openssl rand -base64 32    # JWT_SECRET
```

See [`.env.qa.example`](../.env.qa.example) for all available variables.

### 8.3 Review compose files

This deployment uses:

| File | Purpose |
|------|---------|
| [`docker-compose.qa.yml`](../docker-compose.qa.yml) | Full QA stack |
| [`deploy/Caddyfile.qa`](./Caddyfile.qa) | Caddy reverse proxy + auto TLS |
| [`.env.qa`](../.env.qa.example) | Secrets and config (not committed) |

### 8.4 Build and start

First deploy builds the backend image (may take 3–5 minutes on a small VPS):

```bash
docker compose -f docker-compose.qa.yml up --build -d
```

Watch startup:

```bash
docker compose -f docker-compose.qa.yml ps
docker compose -f docker-compose.qa.yml logs -f
```

Press `Ctrl+C` to stop following logs.

Expected services:

| Service | Status |
|---------|--------|
| `db` | healthy |
| `redis` | healthy |
| `backend` | healthy |
| `caddy` | running |

Caddy obtains a Let's Encrypt certificate on first request to `https://dev-api.clenzey.com`.

---

## 9. Step 6 — Run Migrations & Seed Data

### 9.1 Run database migrations

PostGIS is enabled automatically via `Dockerfile.db` on first database init.

```bash
docker compose -f docker-compose.qa.yml exec backend \
  npx drizzle-kit migrate --config drizzle-migrate.config.ts
```

Run this after every deploy that includes new migration files.

### 9.2 Seed service catalog (recommended)

Loads service definitions (cleaning, plumbing, etc.):

```bash
docker compose -f docker-compose.qa.yml exec backend \
  node dist/scripts/seed-services.js
```

### 9.3 Seed sample QA data (optional)

Creates test users, bookings, partners, etc. **QA only — never run in production.**

From the VPS host (requires Node/pnpm locally) **or** run inside the container:

```bash
# Option A — inside backend container (if tsx available; use compiled seed instead)
docker compose -f docker-compose.qa.yml exec backend \
  node dist/scripts/seed-services.js

# Option B — from your laptop against the QA DB (only if you temporarily expose port 5433 — not recommended)
# Prefer using the sample seed via exec after building a one-off seed command, or use Swagger + API to create test data.
```

To load full sample data, temporarily add a port mapping for `db` in `docker-compose.qa.yml`, run `make seed` from your laptop with the QA `DATABASE_URL`, then remove the port mapping. For most QA workflows, **seed-services + manual test accounts** is enough.

### 9.4 Create an admin user

```bash
docker compose -f docker-compose.qa.yml exec backend \
  node dist/scripts/add-admin.js --phone +919876543210 --role SUPER_ADMIN
```

Replace the phone number with a real test number your team uses.

---

## 10. Step 7 — Verify Deployment

### 10.1 Health checks

```bash
curl -s https://dev-api.clenzey.com/api/v1/health/live | jq
curl -s https://dev-api.clenzey.com/api/v1/health/ready | jq
```

Expected readiness response:

```json
{
  "data": {
    "status": "ready",
    "checks": {
      "database": "ok",
      "redis": "ok"
    },
    "timestamp": "..."
  }
}
```

### 10.2 TLS certificate

```bash
curl -vI https://dev-api.clenzey.com 2>&1 | grep -E "subject:|issuer:"
```

Should show a Let's Encrypt certificate.

### 10.3 Swagger UI

Open in a browser:

```
https://dev-api.clenzey.com/api/v1/docs
```

### 10.4 Socket.IO (optional quick test)

With a valid access token from the OTP or password login flow, connect using a Socket.IO client to `https://dev-api.clenzey.com` with `auth: { token: "<jwt>" }`.

---

## 11. Step 8 — Connect Mobile Apps

Configure both **consumer** and **partner** React Native apps:

```
API_BASE_URL=https://dev-api.clenzey.com/api/v1
SOCKET_URL=https://dev-api.clenzey.com
```

### Auth notes for mobile

| Flow | How it works |
|------|--------------|
| Access token | Send as `Authorization: Bearer <token>` on API requests |
| Refresh token | HttpOnly cookie (`rft_consumer` / `rft_partner`) — ensure your HTTP client persists cookies if using refresh |
| OTP login | Requires Firebase credentials in `.env.qa` and Phone Auth enabled in Firebase Console (see [Optional Integrations](#13-optional-integrations-sandbox)) |
| Password login | Works without MSG91 if test users exist in the database |

React Native fetch/axios calls typically send **no `Origin` header**, so CORS is not a blocker for native apps.

Share the base URL and test credentials with QA testers. Consider a shared doc with:

- API URL
- Test consumer phone numbers / OTP behavior
- Test partner accounts
- Known limitations (sandbox payments, etc.)

---

## 12. Day-2 Operations

Set an alias to save typing:

```bash
echo 'alias dcqa="docker compose -f docker-compose.qa.yml"' >> ~/.bashrc
source ~/.bashrc
```

### View logs

```bash
dcqa logs -f                  # all services
dcqa logs -f backend          # API only
dcqa logs -f caddy            # TLS / proxy
```

### Restart services

```bash
dcqa restart backend
dcqa restart
```

### Deploy an update (new code)

```bash
cd ~/clenzey_backend
git pull

dcqa up --build -d

dcqa exec backend \
  npx drizzle-kit migrate --config drizzle-migrate.config.ts
```

### Stop / start stack

```bash
dcqa down          # stop containers (data preserved in volumes)
dcqa up -d         # start again
```

### Shell access

```bash
dcqa exec backend sh
dcqa exec db psql -U clenzey -d clenzey
dcqa exec redis redis-cli
```

### Reset database completely

**Warning: deletes all QA data.**

```bash
dcqa down -v
dcqa up --build -d
dcqa exec backend npx drizzle-kit migrate --config drizzle-migrate.config.ts
dcqa exec backend node dist/scripts/seed-services.js
```

### Disk usage

```bash
docker system df
docker image prune -f    # remove unused images after deploys
```

---

## 13. Optional Integrations (Sandbox)

With `NODE_ENV=dev`, third-party keys are **optional**. Enable them as you need real end-to-end flows.

| Integration | Env vars | QA recommendation |
|-------------|----------|-------------------|
| MSG91 SMS | `MSG91_AUTH_KEY`, `MSG91_SMS_FLOW_ID` | Use MSG91 test/dev credentials for transactional/marketing SMS |
| Firebase auth + push | `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` | Use a Firebase dev project with Phone Auth enabled |
| Razorpay | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | Use **Razorpay test mode** keys |
| Google Maps | `GOOGLE_MAPS_API_KEY` | Restrict key to VPS IP in Google Cloud Console |

After editing `.env.qa`:

```bash
dcqa up -d --force-recreate backend
```

### Razorpay webhook (test mode)

In Razorpay Dashboard → Webhooks:

```
https://dev-api.clenzey.com/api/v1/payments/webhooks/razorpay
```

Subscribe to `payment.captured` and `refund.processed`. Set the webhook secret to match `RAZORPAY_WEBHOOK_SECRET` in `.env.qa`.

---

## 14. Security Notes

QA is not production, but basic hygiene matters when the URL is shared.

- [ ] Use a **strong** `POSTGRES_PASSWORD` — never leave the example value
- [ ] PostgreSQL and Redis are **not** port-mapped to the host (internal network only)
- [ ] UFW allows only **22, 80, 443**
- [ ] `.env.qa` is gitignored — never commit secrets
- [ ] `ENABLE_SWAGGER=true` exposes API docs publicly — acceptable for QA; disable if you need to restrict discovery
- [ ] Rotate `JWT_SECRET` if the QA URL was ever shared publicly and you want to invalidate tokens
- [ ] Use **test/sandbox** payment and SMS keys only
- [ ] Consider IP allowlisting in UFW if the QA server should only be reachable from your office (optional)

For August production, follow [`PRODUCTION_DEPLOYMENT.md`](./PRODUCTION_DEPLOYMENT.md) with `NODE_ENV=prod` and full secret validation.

---

## 15. Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Caddy fails to get certificate | DNS not propagated or port 80 blocked | Verify `dig dev-api.clenzey.com`; check UFW allows 80/443 |
| `502 Bad Gateway` from Caddy | Backend not healthy yet | `dcqa logs backend`; wait for health check |
| Backend crash on startup | Invalid `.env.qa` | `dcqa logs backend`; check Zod validation errors |
| `health/ready` returns unhealthy | DB or Redis down | `dcqa ps`; check `db` and `redis` health |
| Migrations fail | PostGIS / connection issue | `dcqa exec db psql -U clenzey -c "SELECT PostGIS_Version();"` |
| Cannot SSH after UFW enable | SSH rule missing | Use provider console to fix firewall / disable UFW |
| Docker build runs out of memory | VPS too small | Add 2GB swap (below) or upgrade to 4 GB plan |
| Socket.IO disconnects | Proxy timeout | Caddy defaults are fine; check client uses `wss://` via HTTPS URL |
| Firebase phone auth fails | Firebase credentials missing or Phone Auth disabled | Add Firebase keys to `.env.qa`; enable Phone sign-in in Firebase Console; recreate backend |

### Add swap (if builds fail on 1 GB RAM)

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### Check Caddy certificate storage

```bash
dcqa exec caddy caddy list-certificates
```

### Verify internal connectivity

```bash
dcqa exec backend wget -qO- http://localhost:3001/api/v1/health/ready
```

---

## 16. Migrating to AWS Production (August)

When ready for launch:

1. Deploy the AWS stack per [`PRODUCTION_DEPLOYMENT.md`](./PRODUCTION_DEPLOYMENT.md)
2. Point `api.clenzey.com` (not `dev-api`) to the production ALB
3. Set `NODE_ENV=prod` with all required secrets
4. Migrate data from QA if needed (`pg_dump` from VPS → RDS restore)
5. Update mobile apps to production URL
6. Decommission or keep the VPS as a staging environment

**Keep QA and production separate:**

| Environment | URL | `NODE_ENV` |
|-------------|-----|------------|
| QA (VPS) | `https://dev-api.clenzey.com` | `dev` |
| Production (AWS) | `https://api.clenzey.com` | `prod` |

---

## Quick Reference

```bash
# Start
docker compose -f docker-compose.qa.yml up --build -d

# Migrate
docker compose -f docker-compose.qa.yml exec backend \
  npx drizzle-kit migrate --config drizzle-migrate.config.ts

# Logs
docker compose -f docker-compose.qa.yml logs -f backend

# Update deploy
git pull && docker compose -f docker-compose.qa.yml up --build -d
```

| Item | Value |
|------|-------|
| Compose file | `docker-compose.qa.yml` |
| Env file | `.env.qa` (from `.env.qa.example`) |
| Caddy config | `deploy/Caddyfile.qa` |
| API URL | `https://dev-api.clenzey.com/api/v1` |
| Monthly cost | ~€4.5–6 |

---

*Last updated: June 2025 — aligned with Clenzey backend v1.0.0.*
