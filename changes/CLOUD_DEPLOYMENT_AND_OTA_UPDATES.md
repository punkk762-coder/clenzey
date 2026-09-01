# Cloud Deployment, Database Migration, and Over-The-Air (OTA) Updates

## Overview
This document records the full transition of the Clenzey monorepo from local-only development to a production-ready cloud testing environment. This setup allows mentors and external testers to use both the Consumer and Partner mobile applications on their physical devices with real-time database updates and seamless Over-The-Air (OTA) code deployments without reinstalling APKs.

---

## 1. Cloud Database Setup (Supabase PostgreSQL + PostGIS)

### Rationale
Local PostgreSQL (Windows PG 18) was running on `localhost:5432`, which is unreachable from external devices or cloud servers. Supabase was chosen to provide a high-performance PostgreSQL instance with native PostGIS geospatial support.

### Actions Taken
* **PostGIS Extension**: Enabled `postgis` extension on Supabase database for native spatial queries (`ST_Covers`, `ST_Distance`, `ST_DWithin`, `ST_MakePoint`).
* **Migrations Executed**: Applied all 12 Drizzle SQL migration files from `clenzey_backend-main/migrations/` to Supabase:
  1. `20260603170912_military_human_robot.sql` (Core enums, tables, schemas)
  2. `20260605110156_same_frank_castle.sql`
  3. `20260606152752_secret_doomsday.sql`
  4. `20260610115000_careful_scalphunter.sql`
  5. `20260617144746_daffy_hardball.sql`
  6. `20260626120000_partner_dispatch_engine.sql`
  7. `20260627120000_partner_salary_payroll.sql`
  8. `20260630120000_consumer_profile_image.sql`
  9. `20260701120000_dispute_evidence.sql`
  10. `20260707120000_corporate_catalog_and_booking.sql`
  11. `20260712120000_platform_pricing_settings.sql`
  12. `20260713120000_booking_check_in_code.sql`
* **Connection Routing**:
  * **Port 5432 (Session Mode)**: Used for running schema DDL migrations and direct pgAdmin inspection.
  * **Port 6543 (Transaction Pooler Mode)**: Configured in the Render backend environment to pool thousands of mobile app queries efficiently without exhausting database memory limits.

---

## 2. Backend Cloud Deployment (Render + UptimeRobot)

### Rationale
To allow mobile applications to access the backend API 24/7 from any cellular network or Wi-Fi without requiring the developer's laptop to stay powered on.

### Actions Taken
* **Render Web Service Deployed**:
  * Name: `clenzey`
  * Root Directory: `clenzey_backend-main`
  * Runtime: `Node` (Node.js 24)
  * Build Command: `pnpm install && pnpm build`
  * Start Command: `pnpm start`
  * Primary URL: `https://clenzey.onrender.com`
* **CORS Wildcard Handling**:
  * Modified [`clenzey_backend-main/src/configs/corsConfig.ts`](file:///c:/Users/vrund/OneDrive/Desktop/clenzey%20latest/clenzey_backend-main/src/configs/corsConfig.ts) to explicitly support `*` wildcard origins for development and cross-origin mobile web/admin clients.
* **Uptime Keep-Alive**:
  * Configured UptimeRobot HTTP monitor pinging `https://clenzey.onrender.com/api/v1/health` every 5 minutes to prevent free-tier instance spindown.

---

## 3. GitHub Monorepo Setup

### Rationale
Centralized all 4 apps/subsystems (`clenzey_backend-main`, `clenzey_mobile-main`, `clenzey_admin-main`, `clenzey_web-main`) into a single source of truth for CI/CD, EAS cloud builds, and team collaboration.

### Actions Taken
* Created root [`.gitignore`](file:///c:/Users/vrund/OneDrive/Desktop/clenzey%20latest/.gitignore) to exclude `node_modules`, build artifacts, `.expo`, logs, and sensitive environment keys.
* Initialized Git repository and linked remote origin: `https://github.com/punkk762-coder/clenzey.git`.
* Committed and pushed all workspace directories to `main` branch.

---

## 4. Mobile Apps & EAS Over-The-Air (OTA) Updates

### Rationale
Testers should install the mobile APKs once. Subsequent UI improvements, bug fixes, or logic changes must deploy instantly over the air without creating new APK files or requesting manual reinstalls.

### Actions Taken
1. **Installed `expo-updates`**:
   * Installed `expo-updates` in both `@clenzey/consumer` and `@clenzey/partner`.
2. **Configured API Endpoints**:
   * Updated `apps/consumer/.env.local` and `apps/partner/.env.local` to point to `https://clenzey.onrender.com`.
   * Updated `apps/consumer/eas.json` and `apps/partner/eas.json` environment definitions to inject `EXPO_PUBLIC_API_URL: "https://clenzey.onrender.com"`.
3. **EAS Project Linking**:
   * Linked Consumer App to Expo account `@punkkkkk`:
     * Project ID: `63668e32-188f-4a99-be75-c6cf3acd3b22`
     * Dashboard: `https://expo.dev/accounts/punkkkkk/projects/clenzey-consumer`
   * Linked Partner App to Expo account `@punkkkkk`:
     * Project ID: `37a0d76a-9d42-49bf-b052-0fb771d12f33`
     * Dashboard: `https://expo.dev/accounts/punkkkkk/projects/clenzey-partner`
4. **OTA Channel & Runtime Configuration**:
   * Added `updates.url` and `runtimeVersion: { "policy": "appVersion" }` in both `apps/consumer/app.json` and `apps/partner/app.json`.
   * Added `channel: "preview"` across development, preview, and production profiles in both `eas.json` files.

---

## 5. Mumbai Supabase Migration & E2E Database Seeding

### Rationale
Switched cloud database cluster from Tokyo (`ap-northeast-1`) to **AWS South Asia Mumbai (`ap-south-1`)** for lower latency in India (~15–25ms ping). Executed full E2E data seeding so all apps, admin panel, and partners are instantly interactive.

### Actions Taken
* **New Cluster Provisioned**:
  * Region: `aws-0-ap-south-1` (Mumbai, India)
  * Direct Migration Port (5432): `postgresql://postgres.saroufdtdwtuugnyrcph:vpqaAhENKPcogsTw@aws-0-ap-south-1.pooler.supabase.com:5432/postgres`
  * Render App Pooler Port (6543): `postgresql://postgres.saroufdtdwtuugnyrcph:vpqaAhENKPcogsTw@aws-0-ap-south-1.pooler.supabase.com:6543/postgres`
* **PostGIS Enabled**: Executed `CREATE EXTENSION IF NOT EXISTS postgis;` on Mumbai cluster.
* **12 Migrations Re-applied**: Applied all 12 schema migrations cleanly.
* **Full Database Seed Executed**: Ran `pnpm seed:prod` to seed:
  * Platform service catalog (Quick Shine, Deep Cleaning, Pro Cleaning) & spatial zone pricing.
  * 15-day time slots & corporate capacity schedules.
  * Active dispatch partner pool (8 online partners across Ahmedabad Central).
  * 37 bookings across instant, scheduled, and corporate lifecycles.
  * Admin accounts, coupons, KYC records, reviews, and test credentials.

---

## 6. App Stability & Crash Hardening

### Issues Resolved
1. **`expo-notifications` Error Handling**: Wrapped notification channel creation, notification listeners, and cold-start handlers in defensive `try/catch` blocks inside `src/services/notifications.ts` for both apps to prevent crashes on devices without local `google-services.json`.
2. **Schema & Config Cleanup**: Removed non-standard `minSdkVersion` and `gradleCommand` overrides in `app.json` and `eas.json`.
3. **Expo 54 Updates Compatibility**: Pinned `expo-updates: "~29.0.20"` to match Expo SDK 54 runtime.

---

## 7. Admin Web App Cloud Deployment (Vercel)

### Configuration
* **Platform**: Vercel (Next.js 15)
* **Live Production URL**: [https://clenzey-admin-tau.vercel.app/login](https://clenzey-admin-tau.vercel.app/login)
* **Environment Variables**:
  * `NEXT_PUBLIC_API_BASE_URL`: `https://clenzey.onrender.com/api/v1`
  * `NEXT_PUBLIC_SOCKET_URL`: `https://clenzey.onrender.com`
* **Admin Login**: `superadmin` / `Admin@1234`

---

## 8. Artifacts & Live Access URLs

### 📱 Android APKs (Fresh Production Builds):
* **Consumer App APK**: [Download Consumer APK](https://expo.dev/artifacts/eas/ihVtVx6bccSVhzEdMPlCE9J4cmrcsWJIcIXLN3cg5uw.apk)
* **Partner App APK**: [Download Partner APK](https://expo.dev/artifacts/eas/Eg7VuHvJfGf0k5DE-SyzriZh-QK3er9CTOJStYTsH-E.apk)

### 🔑 Test Login Credentials:
* **Customer**: `+919988776655` / `Test@1234` (`priya.consumer@clenzey.test`)
* **Partner**: `+919998887766` / `Test@1234` (`amit.partner@clenzey.test`)
* **Admin**: `superadmin` / `Admin@1234`

---

## 9. Standard Update Workflow (Air-to-Air OTA)

Whenever new features, UI tweaks, or bug fixes are developed:
```bash
# Push instant JS/UI update to Consumer App
cd apps/consumer && npx eas-cli update --branch preview --message "feature: update description"

# Push instant JS/UI update to Partner App
cd apps/partner && npx eas-cli update --branch preview --message "feature: update description"
```
* When the tester reopens the app, the update applies over the air automatically without reinstalling the APK.

