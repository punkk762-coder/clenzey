# Legacy System Audit & Inheritance Brief

## Stack

- **Languages & Runtimes**: TypeScript (`^6.0.2` backend, `^5.7.3` admin, `^5` web), Node.js 24 (`24.0.0` via [clenzey_backend-main/.nvmrc](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/.nvmrc)), PostgreSQL 16 + PostGIS 3, Redis 7. Package manager: `pnpm` (10.x).
- **Backend ([clenzey_backend-main/package.json](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/package.json))**: Express `^5.1.0`, Drizzle ORM `^0.45.2`, BullMQ `^5.79.1`, Socket.IO `^4.8.3`, Zod `^4.3.6`, Jose `^6.2.2`, Razorpay `^2.9.6`, AWS SDK S3 `^3.1075.0`, Winston `^3.17.0`, Vitest `^4.1.3`.
- **Admin App ([clenzey_admin-main/package.json](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_admin-main/package.json))**: Next.js `^15.1.6`, React `^19.0.0`, Tailwind CSS `^4.3.1`, DaisyUI `^5.5.23`, TanStack Query `^5.66.0`, Zustand `^5.0.3`, Leaflet `^1.9.4`, Zod `^3.24.1`.
- **Marketing Web ([clenzey_web-main/package.json](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_web-main/package.json))**: Next.js `16.1.6`, React `19.2.3`, Tailwind CSS `^4`, Framer Motion `^12.35.0`, Zustand `^5.0.11`.
- **Version Discrepancies & Deprecation Risks**:
  - **Framework Split**: Web uses Next.js 16 + React 19.2; Admin uses Next.js 15 + React 19.0.
  - **Zod Split**: Backend uses Zod 4 canary (`^4.3.6`); Admin uses Zod 3 (`^3.24.1`). Schema sharing breaks without normalization.
  - **Bleeding-Edge Deps**: Express 5.1 and TS 6.0.2 types contain edge-case incompatibilities with older middleware signatures.
  - **Platform Migration Hack**: [package.json](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/package.json#L17) relies on macOS-specific `sed -i ''` to fix Drizzle PostGIS geography columns. Fails on Linux/Windows.

---

## Core Logic

Business logic lives in domain submodules under [clenzey_backend-main/src/api/v1/](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1) and background workers in [clenzey_backend-main/src/workers/](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/workers).

- **Booking Lifecycle State Machine**: [bookings/stateMachine.ts](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/bookings/stateMachine.ts). Governs 20+ allowed state transitions and caller permissions (`ADMIN`, `CONSUMER`, `PARTNER`, `SYSTEM`).
- **Partner Matching & Radial Search**: [bookings/partnerMatcher.ts](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/bookings/partnerMatcher.ts). PostGIS query expands search radius from 5km to 15km in 2km increments based on skills, availability, and active assignments.
- **Auto-Assignment Engine**: [bookings/assignmentEngine.ts](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/bookings/assignmentEngine.ts) and [queues/dispatchQueue.ts](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/queues/dispatchQueue.ts). BullMQ queue handles auto-dispatch, timeout escalations, and revalidations.
- **Dynamic Pricing & Tax Breakdown**: [bookings/pricing.ts](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/bookings/pricing.ts). Calculates GST rates, surge multipliers, coupons, and platform fee line items.
- **Partner Attendance & Payroll**: [api/v1/payroll/service.ts](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/payroll/service.ts) and [workers/payrollHandlers.ts](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/workers/payrollHandlers.ts). Monthly auto-aggregation of shift deductions, base pay, and ledger payouts.
- **Boilerplate / Scaffolding**: [src/server.ts](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/server.ts), [src/api/v1/index.ts](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/index.ts), [middlewares/](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/middlewares), and pass-through CRUD repositories.

---

## Fragile Areas

- **Global Mutable State & Singletons**:
  - In-memory pricing cache in [platformPricing/service.ts#L31](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/platformPricing/service.ts#L31) (`let ratesCache`). State diverges across multi-instance API deployments.
  - In-memory OTP store in [memoryCooldownStore.ts#L1](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/stores/memoryCooldownStore.ts#L1) (`Map<string, number>`). Rate limits wipe out on server restart or fail over multi-node setups.
  - Module singletons: [socketServer.ts#L41](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/realtime/socketServer.ts#L41) (`let io`), [redisConfig.ts#L8](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/configs/redisConfig.ts#L8), [razorpayConfig.ts#L7](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/configs/razorpayConfig.ts#L7).
- **Tightly Coupled Modules & Layer Bypassing**:
  - Controllers bypass service layer and query foreign domain tables directly: [admin/controllers.ts#L15-L20](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/admin/controllers.ts#L15-L20) (`addressesRepo`, `bookingsRepo`), [partners/controllers.ts#L18](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/partners/controllers.ts#L18).
  - Business logic files bypass repository layer and query raw `db` / `pool`: [partnerMatcher.ts#L3](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/bookings/partnerMatcher.ts#L3), [assignmentEngine.ts#L8](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/bookings/assignmentEngine.ts#L8), [notifications/service.ts#L3](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/notifications/service.ts#L3).
- **Magic Numbers & Hardcoded Strings**:
  - Service duration map in [bookings/service.ts#L54-L71](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/bookings/service.ts#L54-L71) hardcodes apartment string keys (`"1bhk": 120, "2bhk": 180, "emp_1_10": 120`). New database service variants will fail or miscalculate without code changes.
  - Raw SQL status filters in [partnerMatcher.ts#L118-L123](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/bookings/partnerMatcher.ts#L118-L123) hardcode strings (`'PROFESSIONAL_ASSIGNED', 'IN_PROGRESS'`) instead of enum references.
- **External Calls & Duplicate Scheduling**:
  - Unsynchronized Cron: `sweepStaleOnlinePartners` runs every minute in [index.ts#L56](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/index.ts#L56) (API) AND [src/workers/index.ts#L111](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/workers/index.ts#L111) (Worker) without Redis lock.
  - Razorpay error parsing in [payments/service.ts#L19-L28](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/payments/service.ts#L19-L28) roundtrips plain objects through `JSON.parse(JSON.stringify(err))` to intercept unstandardized SDK error shapes.

---

## Safe First Changes

1. **Eliminate Duplicate Cron in API Process**: Remove `sweepStaleOnlinePartners` from [clenzey_backend-main/index.ts](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/index.ts#L56-L65). Keep scheduled crons isolated exclusively to [clenzey_backend-main/src/workers/index.ts](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/workers/index.ts).
2. **Replace Hardcoded Status Strings in SQL**: Update [partnerMatcher.ts#L118-L123](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/bookings/partnerMatcher.ts#L118-L123) to use parameterized enum values from [enums.ts](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/db/schema/enums.ts) rather than hardcoded string literals.
3. **Move Variant Duration Map to Config/DB**: Extract `DEFAULT_DURATION_MIN_BY_VARIANT_VALUE` from [bookings/service.ts#L54](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/bookings/service.ts#L54) into database fields on `service_variants` or [pricingConfig.ts](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/configs/pricingConfig.ts).
4. **Fix Cross-Platform Migration Script**: Replace macOS `sed -i ''` in [package.json#L17](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/package.json#L17) with cross-platform node script or native custom Drizzle type definition.

---

## What Breaks First on Careless Change

**Partner Dispatch Engine ([partnerMatcher.ts](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/bookings/partnerMatcher.ts) + [stateMachine.ts](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/bookings/stateMachine.ts))**.

- **Why**: Dispatch query embeds raw PostGIS SQL (`ST_DWithin`, `ST_Distance`) coupled with hardcoded booking status strings. If statuses change in [enums.ts](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/db/schema/enums.ts) or transitions change in [stateMachine.ts](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/bookings/stateMachine.ts), SQL query silently fails to exclude busy partners, causing duplicate concurrent dispatches. Missing PostGIS spatial extensions in local/staging database immediately crashes matching algorithm.
