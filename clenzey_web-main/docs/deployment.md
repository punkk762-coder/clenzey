# Clenzey Landing Page — AWS Amplify Deployment Guide

## Overview

This guide covers deploying the Clenzey landing page to AWS Amplify Console with custom domains (clenzey.com and clenzey.in) purchased from GoDaddy.

**Why Amplify?**
- Vercel-like experience with auto-deploys from Git
- Free SSL certificates and CDN included
- Auto-detects Next.js static export
- Free tier: 1000 build minutes/month, 15GB served/month
- Estimated cost: Free–$1/month for a landing page

---

## Prerequisites

- AWS Account (create at https://aws.amazon.com)
- GitHub/GitLab repository with the Clenzey codebase
- GoDaddy account with clenzey.com and clenzey.in domains
- Next.js configured with `output: "export"` (already done in `next.config.ts`)

---

## Step 1: Push Code to Git Repository

Make sure your latest code is pushed to GitHub/GitLab:

```bash
git add .
git commit -m "Prepare for AWS Amplify deployment"
git push origin main
```

---

## Step 2: Create Amplify App

1. Go to **AWS Console → AWS Amplify**
2. Click **"New app"** → **"Host web app"**
3. Select your Git provider (GitHub, GitLab, Bitbucket, or AWS CodeCommit)
4. Authorize AWS Amplify to access your repository
5. Select the **repository** and **branch** (e.g., `main`)

---

## Step 3: Configure Build Settings

Amplify auto-detects Next.js. Verify or update the build settings:

**Build specification (amplify.yml):**

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm install -g pnpm
        - pnpm install
    build:
      commands:
        - pnpm build
  artifacts:
    baseDirectory: out
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
      - .next/cache/**/*
```

You can also create this file at the root of your project:

```bash
touch amplify.yml
```

**Important settings:**
- Framework: Next.js (SSG)
- Build output directory: `out`
- Node.js version: 20 (or latest LTS)

Click **"Save and deploy"**.

---

## Step 4: Verify Initial Deployment

1. Wait for the build to complete (2–4 minutes)
2. Amplify provides a temporary URL like: `https://main.d1234abcdef.amplifyapp.com`
3. Visit the URL to verify the site works correctly
4. Check all pages: `/`, `/faq`, `/terms`, `/privacy`, `/safety-guarantee`

---

## Step 5: Add Custom Domain — clenzey.com

1. In Amplify Console, go to **App settings → Domain management**
2. Click **"Add domain"**
3. Enter: `clenzey.com`
4. Configure subdomains:
   - `clenzey.com` → branch: `main`
   - `www.clenzey.com` → redirect to `clenzey.com`
5. Click **"Configure domain"**

Amplify will provide DNS records to configure.

---

## Step 6: Add Custom Domain — clenzey.in

1. Still in **Domain management**, click **"Add domain"** again
2. Enter: `clenzey.in`
3. Configure subdomains:
   - `clenzey.in` → branch: `main`
   - `www.clenzey.in` → redirect to `clenzey.in`
4. Click **"Configure domain"**

---

## Step 7: Configure GoDaddy DNS for clenzey.com

Amplify will show you the required DNS records. Go to **GoDaddy → DNS Management** for clenzey.com:

1. **Delete** any existing A records or CNAME for `@` and `www`

2. **Add CNAME record for domain verification** (provided by Amplify):
   | Type | Name | Value | TTL |
   |------|------|-------|-----|
   | CNAME | `_c3e2d7...` | `_c3e2d7....acm-validations.aws` | 600 |

3. **Add CNAME record for www**:
   | Type | Name | Value | TTL |
   |------|------|-------|-----|
   | CNAME | www | `d1234abcdef.cloudfront.net` | 600 |

4. **For root domain (clenzey.com)** — Amplify uses ANAME/ALIAS records. Since GoDaddy doesn't natively support ALIAS:
   - Option A: Use GoDaddy's **Domain Forwarding** to forward `clenzey.com` to `www.clenzey.com`
   - Option B: Change nameservers to AWS Route 53 (recommended for full control)

### Option B: Transfer DNS to Route 53 (Recommended)

1. In AWS Console → **Route 53 → Hosted zones → Create hosted zone**
2. Domain: `clenzey.com`
3. Note the 4 nameservers provided (e.g., `ns-123.awsdns-45.com`)
4. In GoDaddy → Domain Settings → **Nameservers → Change to custom**
5. Enter the 4 Route 53 nameservers
6. Wait 24–48 hours for propagation
7. Back in Route 53, Amplify will auto-create the necessary A/AAAA ALIAS records

---

## Step 8: Configure GoDaddy DNS for clenzey.in

Repeat the same process as Step 7 for `clenzey.in`:

1. Add the CNAME verification record from Amplify
2. Either forward root domain or transfer nameservers to Route 53
3. Add www CNAME pointing to CloudFront distribution

---

## Step 9: Verify SSL and Domain

1. Back in Amplify → Domain management
2. Wait for SSL certificate status to show **"Available"** (can take 10–30 minutes)
3. Wait for domain status to show **"Available"**
4. Test both domains:
   - `https://clenzey.com`
   - `https://www.clenzey.com`
   - `https://clenzey.in`
   - `https://www.clenzey.in`

---

## Step 10: Set Up Auto-Deploy

Amplify automatically deploys when you push to the connected branch. To verify:

1. Make a small change to the code
2. Push to `main`
3. Watch Amplify Console — it should trigger a new build automatically
4. Site updates in 2–4 minutes

---

## Custom Rewrites for SPA Routing

Since this is a static export, add a `customHttp.yml` file in the root for proper 404 handling:

```yaml
customHeaders:
  - pattern: '**/*'
    headers:
      - key: 'Cache-Control'
        value: 'public, max-age=31536000, immutable'
  - pattern: '*.html'
    headers:
      - key: 'Cache-Control'
        value: 'public, max-age=0, must-revalidate'
```

And in Amplify Console → App settings → Rewrites and redirects, add:

| Source | Target | Type |
|--------|--------|------|
| `/<*>` | `/index.html` | 404 (Rewrite) |

This ensures that direct navigation to `/faq`, `/terms`, etc. works correctly.

---

## Troubleshooting

### Build fails with "pnpm not found"
Add `npm install -g pnpm` in the preBuild phase (already in the amplify.yml above).

### Domain shows "Pending verification"
- Ensure CNAME records are correctly added in GoDaddy
- DNS propagation can take up to 48 hours
- Use `dig` or https://dnschecker.org to verify records

### Site shows old version after push
- Clear CloudFront cache: Amplify does this automatically, but can take 1–2 minutes
- Hard refresh: Ctrl+Shift+R in browser

### 404 on page refresh
- Ensure the Amplify rewrite rule is configured (see above)
- Verify all pages export correctly with `output: "export"`

---

## Cost Breakdown

| Resource | Monthly Cost |
|----------|-------------|
| Amplify Hosting (free tier) | $0 |
| Amplify Build (free tier: 1000 min) | $0 |
| Route 53 Hosted Zone (if used) | $0.50/zone × 2 = $1 |
| SSL Certificates | Free (included) |
| **Total** | **$0–$1/month** |

After free tier (15GB/month): $0.15/GB served.

---

## Useful Commands

```bash
# Build locally to test
pnpm build

# Check output
ls out/

# Preview locally
npx serve out
```
