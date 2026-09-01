# Clenzey Codebase Architecture & Technical Overview

Senior engineer first-pass audit and architectural map of the Clenzey monorepo / multi-project repository.

---

## 1. Application Summary & Target Audience

**Clenzey** is a tech-enabled on-demand home & commercial services platform (deep cleaning, plumbing, electrical, maintenance) featuring automated dispatch, PostGIS geolocation matching, real-time tracking, transparent pricing, KYC verification, and automated partner payroll.

The workspace consists of three coordinated sub-applications:
- **`clenzey_backend`**: Core REST API, WebSocket server, and BullMQ worker engine. Handles booking lifecycle state machine, real-time partner geo-dispatch, dynamic surge pricing, payment processing (Razorpay), OTP auth (MSG91 / Firebase), S3 media uploads, and attendance/payroll calculation.
- **`clenzey_admin`**: Operations control console for internal operators and dispatch controllers. Manages live booking feeds, manual dispatch overrides, service zone polygon mapping (Leaflet), partner KYC approval, coupon management, and revenue analytics.
- **`clenzey_web`**: Public marketing portal and customer onboarding landing page. Showcases service tiers, safety guarantees, coverage zones, customer waitlist capture, and direct mobile app download links.

### Target Audience
1. **Consumers**: Homeowners and office managers booking on-demand services with scheduled time slots and live tracking.
2. **Service Partners**: Field technicians and cleaning professionals receiving geo-dispatches, uploading job verification photos, and tracking earnings.
3. **Operations & Dispatch Team**: Internal operations managers overseeing SLA compliance, zone geofences, dispute resolutions, and partner payroll.

---

## 2. Tech Stack (Exact Versions from Manifest Files)

### A. Backend (`clenzey_backend-main/package.json`)
- **Runtime & Node**: Node.js `24.0.0` (from [`.nvmrc`](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/.nvmrc)), `pnpm@10.33.0`
- **Core Server & Routing**: `express`: `^5.1.0`
- **Database & ORM**: `drizzle-orm`: `^0.45.2`, `drizzle-kit`: `^0.31.10`, `pg`: `^8.20.0` (PostgreSQL 16 + PostGIS 3)
- **Caching & Queues**: `ioredis`: `^5.11.1`, `bullmq`: `^5.79.1`
- **Realtime / WebSockets**: `socket.io`: `^4.8.3`
- **Validation & Types**: `zod`: `^4.3.6`, `typescript`: `^6.0.2`, `libphonenumber-js`: `^1.12.41`
- **Authentication & Security**: `jose`: `^6.2.2`, `bcrypt`: `^6.0.0`, `firebase-admin`: `^13.10.0`, `helmet`: `^8.1.0`, `cors`: `^2.8.5`, `express-rate-limit`: `^8.5.2`, `rate-limit-redis`: `^5.0.0`, `cookie-parser`: `^1.4.7`
- **Cloud, Storage & Payments**: `@aws-sdk/client-s3`: `^3.1075.0`, `@aws-sdk/s3-request-presigner`: `^3.1075.0`, `razorpay`: `^2.9.6`
- **Logging & Utilities**: `winston`: `^3.17.0`, `cron`: `^4.4.0`, `axios`: `^1.14.0`, `nanoid`: `^5.1.7`, `compression`: `^1.8.1`, `swagger-ui-express`: `^5.0.1`, `swagger-jsdoc`: `^6.2.8`, `dotenv`: `^17.2.1`
- **Testing & Tooling**: `vitest`: `^4.1.3`, `supertest`: `^7.2.2`, `fast-check`: `^4.8.0`, `@vitest/coverage-v8`: `^4.1.3`, `tsx`: `^4.20.5`, `eslint`: `^10.2.0`, `prettier`: `^3.8.1`

### B. Admin Panel (`clenzey_admin-main/package.json`)
- **Runtime**: `pnpm@10.0.0`
- **Framework & React**: `next`: `^15.1.6`, `react`: `^19.0.0`, `react-dom`: `^19.0.0`
- **UI & Styling**: `tailwindcss`: `^4.3.1`, `@tailwindcss/postcss`: `^4.3.1`, `daisyui`: `^5.5.23`, `clsx`: `^2.1.1`, `tailwind-merge`: `^3.0.1`, `lucide-react`: `^0.474.0`, `cally`: `^0.9.2`
- **State & Data Fetching**: `@tanstack/react-query`: `^5.66.0`, `@tanstack/react-query-devtools`: `^5.66.0`, `zustand`: `^5.0.3`, `axios`: `^1.7.9`, `date-fns`: `^4.1.0`
- **Forms & Validation**: `react-hook-form`: `^7.54.2`, `@hookform/resolvers`: `^3.10.0`, `zod`: `^3.24.1`
- **Maps & Charts**: `leaflet`: `^1.9.4`, `react-leaflet`: `^5.0.0`, `leaflet-draw`: `^1.0.4`, `recharts`: `^2.15.1`
- **Realtime**: `socket.io-client`: `^4.8.1`
- **Testing & Tooling**: `vitest`: `^4.1.8`, `@playwright/test`: `^1.61.1`, `@testing-library/react`: `^16.3.2`, `@testing-library/jest-dom`: `^6.9.1`, `msw`: `^2.14.6`, `jsdom`: `^29.1.1`, `typescript`: `^5.7.3`, `eslint`: `^9.19.0`

### C. Marketing Website (`clenzey_web-main/package.json`)
- **Framework & React**: `next`: `16.1.6`, `react`: `19.2.3`, `react-dom`: `19.2.3`
- **UI & Styling**: `tailwindcss`: `^4`, `@tailwindcss/postcss`: `^4`, `framer-motion`: `^12.35.0`, `lucide-react`: `^0.577.0`, `sonner`: `^2.0.7`, `@radix-ui/react-slot`: `^1.2.4`, `class-variance-authority`: `^0.7.1`, `clsx`: `^2.1.1`, `tailwind-merge`: `^3.5.0`
- **State**: `zustand`: `^5.0.11`
- **Tooling**: `typescript`: `^5`, `eslint`: `^9`, `eslint-config-next`: `16.1.6`

---

## 3. Annotated Folder Tree

```text
clenzey/
├── clenzey_backend-main/
│   ├── deploy/              # Production deployment guides and ECS task definition templates
│   ├── docs/                # Architecture, setup, and service documentation
│   ├── migrations/          # Drizzle ORM generated SQL migration scripts with PostGIS geography fixes
│   ├── scripts/             # Admin user creation, service catalog seeders, and E2E test data seeders
│   ├── src/                 # Backend source root
│   │   ├── api/v1/          # 30 API resource modules (bookings, dispatch, partners, consumers, payments, etc.)
│   │   ├── configs/         # Zod environment validation, CORS, Redis, S3, MSG91, Firebase, and Swagger configurations
│   │   ├── constants/       # Domain constants, status enums, and system defaults
│   │   ├── db/              # Database pool connection and Drizzle schema table/relation definitions
│   │   │   └── schema/      # Entity schema files (bookings, partners, consumers, payouts, zones, ledger, etc.)
│   │   ├── errors/          # Custom AppError classes, HTTP error codes, and exception structures
│   │   ├── filters/         # Logging filters and sensitive data sanitizers
│   │   ├── middlewares/     # Authentication, RBAC, rate limiting, request tracing, and global error handlers
│   │   ├── queues/          # BullMQ queue definitions and trigger handlers for background dispatch
│   │   ├── realtime/        # Socket.IO connection manager, room routing, and event broadcasters
│   │   ├── services/        # Third-party integrations (Firebase phone auth, S3 presigning, token session store)
│   │   ├── stores/          # Redis and in-memory stores for OTP cooldowns and rate limits
│   │   ├── utilities/       # Math, geo, crypto, payroll, phone parsing, and timezone helpers
│   │   ├── validations/     # Shared Zod validation schemas for request bodies and params
│   │   └── workers/         # BullMQ background worker processor (dispatch logic, auto-assignment, payroll cron)
│   └── tests/               # 70+ Vitest unit, integration, and E2E spec suites
│
├── clenzey_admin-main/
│   ├── e2e/                 # Playwright end-to-end browser test suites
│   ├── public/              # Static assets, brand logos, and icons
│   └── src/                 # Admin frontend source root
│       ├── __tests__/       # Vitest component and unit test suites
│       ├── app/             # Next.js 15 App Router pages ((auth) login and (dashboard) management routes)
│       │   ├── (auth)/      # Admin OTP authentication routes
│       │   └── (dashboard)/ # 16 Operations dashboards (bookings, dispatch, partners, zones, surge, payroll, etc.)
│       ├── components/      # UI components (shadcn/Radix primitives, Leaflet zone maps, data tables)
│       ├── hooks/           # Custom React hooks for data fetching, responsive UI, and WebSocket events
│       ├── lib/             # Axios API clients, auth token handlers, socket clients, and utility functions
│       └── types/           # TypeScript interfaces and domain type declarations
│
└── clenzey_web-main/
    ├── app/                 # Next.js 16 App Router marketing pages, terms, privacy, FAQ, and sitemaps
    │   └── components/      # Marketing UI sections (Hero, Services, Why Clenzey, Waitlist, Areas)
    ├── components/          # Reusable shared UI primitives
    ├── docs/                # AWS Amplify deployment instructions
    ├── lib/                 # App links, SEO schema builders, and CSS utility helpers
    └── public/              # Public images, icons, and hero illustrations
```

---

## 4. Top 8 Files to Read First in 1 Hour (Ranked by Importance)

1. [`clenzey_backend-main/src/api/v1/bookings/stateMachine.ts`](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/bookings/stateMachine.ts)
   - **Why:** Core business rules. Defines the complete booking status transition graph, terminal states, and strict role-based execution constraints across `CONSUMER`, `PARTNER`, `ADMIN`, and `SYSTEM`.
2. [`clenzey_backend-main/src/api/v1/bookings/service.ts`](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/bookings/service.ts)
   - **Why:** Central business orchestrator. Executes booking creation, multi-tier pricing calculations, cancellation refund policies, verification check-in codes, partner assignments, and state transitions.
3. [`clenzey_backend-main/src/api/v1/bookings/assignmentEngine.ts`](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/bookings/assignmentEngine.ts)
   - **Why:** PostGIS geo-matching engine. Handles radial partner searches, incremental geofence expansions, availability verification, skill filtering, and auto-dispatch assignment.
4. [`clenzey_backend-main/src/workers/index.ts`](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/workers/index.ts)
   - **Why:** BullMQ background worker engine. Runs asynchronous scheduled dispatches, partner retry loops, escalation timeouts, and monthly partner payroll calculations outside HTTP request cycles.
5. [`clenzey_backend-main/src/realtime/socketServer.ts`](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/realtime/socketServer.ts)
   - **Why:** Real-time event broker. Manages authenticated WebSocket rooms for admin live feeds, partner GPS streams, and customer booking status broadcasts.
6. [`clenzey_backend-main/src/db/schema.ts`](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/db/schema.ts)
   - **Why:** Domain database blueprint. Aggregates all 30+ relational schemas, PostGIS geometry fields, payment ledgers, partner KYC docs, and foreign key relations.
7. [`clenzey_backend-main/src/configs/environmentConfig.ts`](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/configs/environmentConfig.ts)
   - **Why:** Runtime boundary & validation. Comprehensive Zod schema enforcing all system settings, API keys, database connection limits, Redis configuration, and dispatch thresholds.
8. [`clenzey_admin-main/src/middleware.ts`](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_admin-main/src/middleware.ts) & [`clenzey_admin-main/src/lib/api/client.ts`](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_admin-main/src/lib/api/client.ts)
   - **Why:** Frontend security gateway and HTTP communication layer. Details session token rotation, route guards for non-authenticated users, and Axios error handling.

---

## 5. Exact Commands (Directly from Configs & Manifests)

### A. Backend (`clenzey_backend-main`)

```bash
# 1. Install dependencies
pnpm install

# 2. Environment setup
cp .env.example .env.dev
# Edit .env.dev with DATABASE_URL, REDIS_URL, JWT_SECRET

# 3. Database migrations & seed
pnpm db:dev:generate
pnpm db:dev:migrate
pnpm seed

# 4. Run API dev server
pnpm dev

# 5. Run background worker (Terminal 2)
pnpm worker

# 6. Run test suite
pnpm test:run       # Unit & integration tests
pnpm test:e2e       # End-to-end tests
pnpm test:all       # All tests sequentially
pnpm test:coverage  # Coverage report

# 7. Type check & lint
pnpm type-check
pnpm lint
```

#### Docker Compose Alternative:
```bash
make bootstrap      # Starts db, redis, backend (port 3001), worker and migrates
# or
make up
make migrate
make seed
```

---

### B. Admin Panel (`clenzey_admin-main`)

```bash
# 1. Install dependencies
pnpm install

# 2. Environment setup
cp .env.example .env.local
# Set NEXT_PUBLIC_API_BASE_URL=http://localhost:3000 (or matching backend port)
# Set NEXT_PUBLIC_SOCKET_URL=http://localhost:3000

# 3. Run dev server (Port 4001 via Turbopack)
pnpm dev

# 4. Run tests
pnpm test:run       # Vitest unit/component tests
pnpm test:e2e       # Playwright E2E browser tests
```

---

### C. Marketing Website (`clenzey_web-main`)

```bash
# 1. Install dependencies
pnpm install

# 2. Run dev server (Port 3000)
pnpm dev

# 3. Build & Lint
pnpm lint
pnpm build
```

---

## 6. Ambiguities & Discrepancies Observed in Codebase

1. **Port Mismatch Between Backend and Admin Documentation:**
   - `clenzey_admin-main/README.md` lines 27–38 state backend runs on port `8051` and admin runs on `3001`.
   - `clenzey_backend-main/.env.example` defaults to `PORT=3000`.
   - `clenzey_backend-main/docker-compose.yml` maps backend to `PORT=3001`.
   - `clenzey_admin-main/package.json` script runs `next dev -p 4001`.
   - **Resolution:** Explicitly verify `NEXT_PUBLIC_API_BASE_URL` in `clenzey_admin/.env.local` matches the active backend port.
2. **Web Package Manager Lockfiles:**
   - `clenzey_web-main` contains both `package-lock.json` and `pnpm-lock.yaml`. Root workspace convention is `pnpm`.
3. **External Service Fallbacks in Local Dev:**
   - Exotel masked calling endpoint returns HTTP `503` stub until provider credentials are wired.
   - S3 presigning and SMS OTP fall back to dev mocks when `OBJECT_STORAGE_ENDPOINT` and `MSG91_AUTH_KEY` are left blank in `.env.dev`.
