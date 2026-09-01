# Clenzey Architecture Map & Dependency Analysis

Comprehensive architectural mapping of the Clenzey monorepo codebase.

---

## 1. System Architectural Pattern

**Architectural Pattern**: **Modular Monolith** with **Layered (N-Tier / Controller-Service-Repository) Domain Structure** + **Asynchronous Job Worker Subsystem** + **Decoupled Multi-Client Frontends**.

### Justification with Concrete Codebase References:
- **Modular Monolithic Backend**:
  - Central Express server application initializes in [clenzey_backend-main/index.ts](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/index.ts) and [clenzey_backend-main/src/server.ts](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/server.ts).
  - Routes 30+ domain submodules under [clenzey_backend-main/src/api/v1/](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1) mounted through a single aggregated router in [clenzey_backend-main/src/api/v1/index.ts](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/index.ts).
  - Shared database connection pool and unified Drizzle schema in [clenzey_backend-main/src/db/index.ts](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/db/index.ts) and [clenzey_backend-main/src/db/schema.ts](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/db/schema.ts).
- **Layered Domain Partitioning**:
  - Each business domain isolates HTTP transport ([routes.ts](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/bookings/routes.ts), [controllers.ts](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/bookings/controllers.ts)), business logic & domain rules ([service.ts](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/bookings/service.ts), [stateMachine.ts](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/bookings/stateMachine.ts)), and data access queries ([repository.ts](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/bookings/repository.ts)).
- **Event-Driven & Background Worker Subsystem**:
  - Decoupled asynchronous tasks (batch dispatching, partner matching, redispatch escalation, monthly partner payroll) run outside HTTP request cycles via BullMQ queues ([clenzey_backend-main/src/queues/dispatchQueue.ts](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/queues/dispatchQueue.ts)) and a standalone worker process ([clenzey_backend-main/src/workers/index.ts](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/workers/index.ts)).
- **Decoupled Frontend Clients**:
  - Independent Next.js 15+ client applications ([clenzey_admin-main](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_admin-main) and [clenzey_web-main](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_web-main)) communicating via stateless REST HTTP endpoints and stateful WebSockets.

---

## 2. Major Layers & Module Responsibilities

### Layer 1: Presentation / Frontend Clients
- **Folders & Files**:
  - [clenzey_web-main/app/](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_web-main/app): [page.tsx](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_web-main/app/page.tsx), [layout.tsx](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_web-main/app/layout.tsx), [globals.css](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_web-main/app/globals.css)
  - [clenzey_admin-main/src/app/](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_admin-main/src/app): `(auth)/login`, `(dashboard)/overview`, `(dashboard)/bookings`, `(dashboard)/partners`, `(dashboard)/zones`
  - [clenzey_admin-main/src/lib/api/](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_admin-main/src/lib/api): [client.ts](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_admin-main/src/lib/api/client.ts), [bookings.ts](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_admin-main/src/lib/api/bookings.ts), [partners.ts](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_admin-main/src/lib/api/partners.ts)
  - [clenzey_admin-main/src/lib/socket/](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_admin-main/src/lib/socket): Socket.IO client event subscriptions
- **Responsibilities**:
  - Render customer-facing service catalogs, coverage areas, FAQ, and waitlist forms.
  - Render operations console with live booking status timelines, KYC verification workflows, Leaflet geofence polygon editors, and financial reports.
  - Manage client-side cache and asynchronous server state via TanStack Query and Zustand.

### Layer 2: API Routing, Transport & Middlewares
- **Folders & Files**:
  - [clenzey_backend-main/src/server.ts](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/server.ts)
  - [clenzey_backend-main/src/api/v1/index.ts](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/index.ts)
  - [clenzey_backend-main/src/middlewares/](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/middlewares): [authMiddleware.ts](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/middlewares/authMiddleware.ts), [errorHandlerMiddleware.ts](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/middlewares/errorHandlerMiddleware.ts), [rateLimiterMiddleware.ts](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/middlewares/rateLimiterMiddleware.ts), [requestIdMiddleware.ts](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/middlewares/requestIdMiddleware.ts), [reqLoggerMiddleware.ts](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/middlewares/reqLoggerMiddleware.ts)
  - [clenzey_backend-main/src/api/v1/*/routes.ts](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/bookings/routes.ts)
  - [clenzey_backend-main/src/api/v1/*/controllers.ts](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/bookings/controllers.ts)
- **Responsibilities**:
  - Terminate HTTP requests, configure CORS policies, compress payloads, log access logs with trace IDs.
  - Authenticate JWT session cookies, enforce role-based access control (`CONSUMER`, `PARTNER`, `ADMIN`).
  - Translate HTTP parameters to structured requests and format domain results into HTTP responses.

### Layer 3: Contract & Input Validation Layer
- **Folders & Files**:
  - [clenzey_backend-main/src/validations/](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/validations)
  - [clenzey_backend-main/src/api/v1/*/validations.ts](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/bookings/validations.ts)
- **Responsibilities**:
  - Define declarative Zod schemas for request payloads, query strings, and path parameters.
  - Fail fast on malformed user input before triggering business logic or database operations.

### Layer 4: Domain Service & Business Logic Layer
- **Folders & Files**:
  - [clenzey_backend-main/src/services/](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/services): [firebasePhoneAuthService.ts](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/services/firebasePhoneAuthService.ts), [s3PresignService.ts](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/services/s3PresignService.ts), [refreshTokenSessionService.ts](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/services/refreshTokenSessionService.ts)
  - [clenzey_backend-main/src/api/v1/*/service.ts](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/bookings/service.ts)
  - Domain Rule Engines:
    - [bookings/stateMachine.ts](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/bookings/stateMachine.ts): Strict status transitions and actor permissions.
    - [bookings/assignmentEngine.ts](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/bookings/assignmentEngine.ts): Geofence matching and auto-assignment.
    - [bookings/partnerMatcher.ts](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/bookings/partnerMatcher.ts): Scoring and candidate ranking algorithms.
    - [bookings/pricing.ts](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/bookings/pricing.ts): Dynamic surge calculation, platform fee tiers, coupon deductions.
    - [bookings/checkInCode.ts](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/bookings/checkInCode.ts): Secure OTP start verification.
- **Responsibilities**:
  - Execute end-to-end business workflows and manage database transaction boundaries.
  - Enforce booking state machine transitions and audit trail creation.
  - Integrate with external provider APIs (Firebase Auth, Razorpay Payment Gateway, AWS S3 / Cloudflare R2, MSG91 SMS, Google Maps).

### Layer 5: Data Access & Persistence Layer
- **Folders & Files**:
  - [clenzey_backend-main/src/db/index.ts](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/db/index.ts): PostgreSQL connection pool initialization.
  - [clenzey_backend-main/src/db/schema.ts](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/db/schema.ts) & [src/db/schema/*](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/db/schema): Entity tables, foreign keys, spatial PostGIS indexes.
  - [clenzey_backend-main/src/api/v1/*/repository.ts](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/bookings/repository.ts): Domain-specific query methods using Drizzle ORM.
- **Responsibilities**:
  - Execute type-safe SQL queries, transactions, and spatial lookups (`ST_DWithin`, `ST_Contains`, `ST_MakePoint`).
  - Encapsulate database table schemas, indices, and migrations.

### Layer 6: Realtime & WebSocket Layer
- **Folders & Files**:
  - [clenzey_backend-main/src/realtime/socketServer.ts](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/realtime/socketServer.ts)
  - [clenzey_backend-main/src/realtime/bookingEvents.ts](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/realtime/bookingEvents.ts)
  - [clenzey_backend-main/src/realtime/domainEvents.ts](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/realtime/domainEvents.ts)
- **Responsibilities**:
  - Manage authenticated Socket.IO rooms for admins, partners, and consumers.
  - Stream live partner GPS coordinates and emit real-time status transitions.

### Layer 7: Background Jobs & Worker Layer
- **Folders & Files**:
  - [clenzey_backend-main/src/queues/dispatchQueue.ts](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/queues/dispatchQueue.ts)
  - [clenzey_backend-main/src/queues/dispatchTrigger.ts](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/queues/dispatchTrigger.ts)
  - [clenzey_backend-main/src/workers/index.ts](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/workers/index.ts)
  - [clenzey_backend-main/src/workers/dispatchHandlers.ts](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/workers/dispatchHandlers.ts)
  - [clenzey_backend-main/src/workers/payrollHandlers.ts](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/workers/payrollHandlers.ts)
- **Responsibilities**:
  - Manage Redis-backed BullMQ job queues (`instant`, `redispatch`, `escalate`, `scheduled_assign`, `revalidate`).
  - Execute scheduled cron sweeps (batch assignment, stale partner online cleanup, monthly payroll generation).

---

## 3. Inter-Layer Communication Mechanisms

| Path | Protocol / Mechanism | Description |
| :--- | :--- | :--- |
| **Frontend $\rightarrow$ Backend API** | **HTTP / JSON REST** | Next.js clients invoke REST endpoints via `fetch`/`Axios` in [src/lib/api/client.ts](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_admin-main/src/lib/api/client.ts). |
| **Frontend $\leftrightarrow$ Realtime Hub** | **WebSockets (Socket.IO)** | Bi-directional streaming for GPS tracking and live admin booking signal feeds via [src/lib/socket](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_admin-main/src/lib/socket) and [src/realtime/socketServer.ts](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/realtime/socketServer.ts). |
| **Routes $\rightarrow$ Controllers** | **Direct Function Calls** | Express router delegates to handler functions. |
| **Controllers $\rightarrow$ Services** | **Direct Function Calls** | Controllers unpack HTTP input, execute Zod validations, invoke service functions, return JSON results. |
| **Services $\rightarrow$ Repositories** | **Direct Function Calls** | Services call typed repository methods to query or persist entities. |
| **Repositories $\rightarrow$ Database** | **PostgreSQL TCP Pool** | Drizzle ORM compiles queries executed over `pg` connection pool ([src/db/index.ts](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/db/index.ts)). |
| **Services $\rightarrow$ Background Queues** | **BullMQ / Redis Messages** | Business logic produces jobs into Redis queues via [src/queues/dispatchQueue.ts](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/queues/dispatchQueue.ts). |
| **Workers $\rightarrow$ Domain Services / DB** | **Direct Calls & Drizzle SQL** | BullMQ workers consume Redis jobs and invoke domain assignment algorithms. |
| **Services $\rightarrow$ Third-Party Cloud** | **HTTP REST / SDKs** | Outbound calls to Firebase Auth, Razorpay, S3/R2 presigning, and MSG91 SMS. |

---

## 4. Layer Dependency Direction (Text Diagram)

```text
       +----------------------------+        +----------------------------+
       |   Marketing Web Client     |        |   Operations Admin Console |
       |     (clenzey_web-main)     |        |    (clenzey_admin-main)    |
       +----------------------------+        +----------------------------+
                     |                                      |        |
         HTTP (REST) |                          HTTP (REST) |        | WebSockets
                     |                                      |        | (Socket.IO)
                     v                                      v        |
+--------------------------------------------------------------------+--|-----+
|  BACKEND API SERVER PROCESS (clenzey_backend: index.ts -> src/server.ts)    |
|                                                                       |
|  +-----------------------------------------------------------------+  |
|  | Transport Layer: Middlewares & Routes (src/api/v1/*/routes.ts)  |  |
|  +-----------------------------------------------------------------+  |
|                                  | (Direct Call)                      |
|                                  v                                    |
|  +-----------------------------------------------------------------+  |
|  | Controllers Layer (src/api/v1/*/controllers.ts)                 |  |
|  +-----------------------------------------------------------------+  |
|          | (Validates via)               | (Direct Call)              |
|          v                               v                            |
|  [ Zod Validations ]             +---------------------------------+  |
|                                  | Service Layer                   |  |
|                                  | (src/api/v1/*/service.ts,       |  |
|                                  |  src/services/*)                |  |
|                                  +---------------------------------+  |
|                                     /          |             \        |
|                  +-----------------+           | (Redis Job)  +-----+ |
|                  | (Direct Call)               v                    | |
|                  v                 [ Redis Queue Producers ]        | |
|  +-------------------------------+ (src/queues/dispatchQueue.ts)    | |
|  | Data Access / Repositories    |             |                    | |
|  | (src/api/v1/*/repository.ts)  |             | (Push to Redis)    | |
|  +-------------------------------+             |                    | |
+------------------|-----------------------------|--------------------+
                   |                             |
                   | (Drizzle / pg TCP)          | (BullMQ / Redis)
                   v                             v
+------------------------------------+  +-------------------------------+
|  PERSISTENCE STORAGE               |  |  REDIS 7 (Cache & BullMQ)     |
|  - PostgreSQL 16 + PostGIS 3       |  +-------------------------------+
+------------------------------------+                  ^
                   ^                                    | (Pull Jobs)
                   | (Drizzle / pg TCP)                 |
+------------------|------------------------------------|---------------+
|  BACKGROUND WORKER PROCESS (src/workers/index.ts)     |               |
|                                                       |               |
|  +----------------------------------------------------+------------+  |
|  | BullMQ Worker Handlers (src/workers/dispatchHandlers.ts)        |  |
|  | Cron Jobs (Scheduled Batch, Revalidate, Payroll, Stale Sweep)   |  |
|  +-----------------------------------------------------------------+  |
|                                  | (Direct Call)                      |
|                                  v                                    |
|  +-----------------------------------------------------------------+  |
|  | Matching Engine / Domain Services (partnerMatcher, assignment)  |  |
|  +-----------------------------------------------------------------+  |
+-----------------------------------------------------------------------+
```

---

## 5. Architectural Violations & Risks

### 1. Controllers Bypassing Service Layer (Direct Repository Access)
- **Violation Locations**:
  - [admin/controllers.ts#L15-L20](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/admin/controllers.ts#L15-L20) imports `addressesRepo`, `bookingsRepo`, and `adminRepo` directly.
  - [partners/controllers.ts#L18-L21](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/partners/controllers.ts#L18-L21) imports `bookingsRepo` and `partnerRepo` directly.
  - [consumers/controllers.ts#L17](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/consumers/controllers.ts#L17) imports `consumerRepo` directly.
  - [refunds/controllers.ts#L7](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/refunds/controllers.ts#L7) imports `repository.ts` directly.
- **Why it is a problem**: Violates Layered Architecture constraints. Controllers become polluted with database query manipulation and business rules. Bypasses transaction boundaries, domain event triggers, and audit logging.

### 2. Services & Domain Engines Bypassing Repository Layer (Direct Database / Pool Imports)
- **Violation Locations**:
  - [notifications/service.ts#L3](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/notifications/service.ts#L3) imports `db` directly instead of using [notifications/repository.ts](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/notifications/repository.ts).
  - [partners/operationalStatus.ts#L3](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/partners/operationalStatus.ts#L3), [partners/dispatchBootstrap.ts#L3](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/partners/dispatchBootstrap.ts#L3), and [admin/analytics.ts#L3](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/admin/analytics.ts#L3) import `db` directly.
  - [bookings/dispatchService.ts#L5](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/bookings/dispatchService.ts#L5), [bookings/partnerMatcher.ts#L3](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/bookings/partnerMatcher.ts#L3), [bookings/assignmentEngine.ts#L8](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/bookings/assignmentEngine.ts#L8), and [bookings/locationStream.ts#L3](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/bookings/locationStream.ts#L3) import `db` or `pool` directly.
- **Why it is a problem**: Breaks persistence abstraction. Domain logic becomes tightly coupled to specific SQL queries and Drizzle ORM primitives. Prevents isolated unit testing (cannot mock repository interfaces) and scatters raw SQL maintenance across business logic files.

### 3. Cross-Domain Repository Coupling
- **Violation Locations**:
  - [admin/controllers.ts#L15-L16](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/admin/controllers.ts#L15-L16) imports data repositories from `addresses` and `bookings`.
  - [partners/controllers.ts#L18](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/partners/controllers.ts#L18) imports repository from `bookings`.
- **Why it is a problem**: Degrades modular monolith boundaries into an entangled mesh. Modules should only communicate through public domain service interfaces rather than accessing sibling module repositories directly.

### 4. Duplicate Unsynchronized Cron Jobs across Processes
- **Violation Locations**:
  - [index.ts#L56-L65](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/index.ts#L56-L65) runs `sweepStaleOnlinePartners` cron job every minute inside API process.
  - [src/workers/index.ts#L111-L120](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/workers/index.ts#L111-L120) runs the exact same `sweepStaleOnlinePartners` cron job every minute inside background worker process.
- **Why it is a problem**: When running multi-task API clusters alongside worker containers in production, multiple processes trigger overlapping database sweeps concurrently without distributed locks, risking database race conditions and duplicate queries. Background scheduled jobs must reside exclusively in the worker tier or use distributed Redis locks.
