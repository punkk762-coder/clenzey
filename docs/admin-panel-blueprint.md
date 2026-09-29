# Admin Panel AI Brain — Execution Blueprint

> **What this file is**: Drop this into any project where the **user/customer app** is ready (or nearly ready). The AI reads it, scans the codebase, and self-drives through five phases — ending with a fully designed and implemented admin panel + partner/provider surface. No hand-holding.
>
> **What this file is NOT**: A reference manual to read and think about. Every section is an instruction. The AI executes them in order.

---

## How to Activate

Paste this into the project's `docs/` directory. Then tell the AI:

```
Read docs/admin-panel-blueprint.md and execute from Phase 1.
The user app is in [path]. The backend is in [path].
```

The AI will:
1. Scan → produce `docs/entities.md`
2. Derive → produce `docs/partner-features.md` + `docs/admin-screens.md`
3. Design → produce `docs/design-system.md` + Stitch screen targets
4. Build → implement schema → API → partner app → admin panel
5. Verify → run checklist, compare output

---

# PHASE 1: SCAN

**Goal**: Read the user app + backend. Output a complete entity map.

## 1.1 — Scan the Backend Schema

Read every model/table definition. For each model, record:

```
Model: [name]
Fields: [list with types]
Relations: [foreign keys, joins]
Statuses: [enum values if any]
Who creates: USER | PARTNER | SYSTEM | ADMIN
Touches money: YES | NO
Has lifecycle: YES (list states) | NO
```

**Where to look:**
- Prisma: `prisma/schema.prisma`
- Drizzle: `src/db/schema/` or `src/db/schema.ts`
- TypeORM: `src/entities/`
- Sequelize: `src/models/`
- Raw SQL: `migrations/`

## 1.2 — Scan the User App

Read every screen/route in the user app. For each screen, record:

```
Screen: [name]
Route: [path]
API calls: [endpoints hit]
User actions: [what the user does]
Data displayed: [what fields are shown]
States: [loading, empty, error, success variants]
```

**Where to look:**
- React Native (Expo Router): `app/` directory, `(tabs)/`, route files
- Next.js: `app/` or `pages/` directory
- Flutter: `lib/screens/` or `lib/pages/`

## 1.3 — Scan the Backend API Routes

List every endpoint. For each:

```
Method: GET | POST | PATCH | DELETE
Path: /api/v1/[resource]
Auth: public | consumer | partner | admin
Request body: [shape]
Response body: [shape]
Side effects: [notifications, status changes, money movement]
```

**Where to look:**
- Express/Hono: `src/api/` or router files
- Next.js API: `app/api/` routes

## 1.4 — Output: `docs/entities.md`

Write this file. One table per entity. This is the source of truth for everything that follows.

```markdown
# Entity Map

## [Entity Name]

| Field | Type | Notes |
|-------|------|-------|
| id | string (cuid/uuid) | PK |
| ... | ... | ... |

**Created by**: USER / PARTNER / SYSTEM
**Status lifecycle**: PENDING → CONFIRMED → COMPLETED → CANCELLED
**Touches money**: YES — [which fields]
**User app screens**: [list screens that display/create this entity]
**Relations**: belongs to [X], has many [Y]

### Admin Surface Required

| Surface | What |
|---------|------|
| List | filters: [status, date, search by name/phone] |
| Detail | show: [all fields + relations + timeline] |
| Actions | [approve, reject, cancel, reassign, refund] |
| Audit | every action logged with actor + reason |
```

Repeat for every model in the schema. **Miss nothing.** If a model exists in the schema, it gets a section.

---

# PHASE 2: DERIVE

**Goal**: From the entity map, derive two things simultaneously — what the partner app needs, and what the admin panel needs. They are mirrors of each other.

## 2.1 — The Dual-Derivation Rule

For every entity the user interacts with, ask three questions:

```
1. USER creates/sees X → WHO fulfills X?
   → That's a PARTNER feature

2. USER creates/sees X → WHO monitors X?
   → That's an ADMIN feature

3. What can go WRONG with X?
   → PARTNER needs to handle it on their end
   → ADMIN needs to override/resolve it
```

### Derivation Table (fill for every entity)

| User Does | Partner Needs | Admin Needs |
|-----------|--------------|-------------|
| Books service | Accept/decline offer, navigate to location, check in, complete | Monitor bookings, reassign, cancel, refund, view timeline |
| Pays | See earnings per job, weekly statement | Revenue dashboard, payout management, refund console |
| Rates partner | See own rating, respond to reviews | Moderate reviews, hide with reason, recompute rating |
| Files complaint | See complaints against them, appeal | Triage, resolve, refund, escalate |
| Uses promo code | — | CRUD promos, track usage |
| Adds address | — | View customer addresses (support) |
| Creates profile | Create profile, upload KYC | Verify KYC, approve/suspend partner |

## 2.2 — Output: `docs/partner-features.md`

Write this file. One section per partner feature derived from the user app:

```markdown
# Partner Features (Derived from User App)

## [Feature Name]
**Derived from**: [which user feature]
**Screen**: [route in partner app]
**Device**: MOBILE
**API endpoints needed**: [list]
**States**: [list all states including error/empty]
**Actor**: PARTNER (must be APPROVED status)

### Functional Spec
- [bullet list of what this screen does]
- [what data it shows]
- [what actions the partner can take]
- [error handling]
```

## 2.3 — Output: `docs/admin-screens.md`

Write this file. One section per admin screen. Use this exact format per screen (it feeds directly into Stitch later):

```markdown
# Admin Screens

## [Screen ID] — [Screen Name]
**Actor**: ADMIN · **Route**: /[path] · **Device**: DESKTOP
**Data**: [API endpoints for reading]
**Actions**: [API endpoints for mutations]
**States**: loading · data · empty · error · stale
**Permissions**: [which admin roles can access]

### Layout
- [describe the page structure top to bottom]
- [KPI cards if dashboard]
- [filter bar configuration]
- [table columns]
- [detail panel contents]
- [action buttons and their confirmation dialogs]

### Stitch Prompt
[Full prompt for screen generation — written AFTER design-system.md exists]
```

## 2.4 — The Console Pattern (Apply to Every Entity)

Every entity with a status lifecycle gets this admin treatment. No exceptions:

| Surface | Contents |
|---------|----------|
| **List page** | Filterable table + status tabs (PillTabs with counts) + search + CSV export + pagination (10/20/50) |
| **Detail page** | Header card + status badge + timeline of state changes + related entities as linked cards + action buttons + audit trail |
| **Status tabs** | All \| Active \| Pending — each with count badge, computed client-side from same query |
| **Every action** | Confirmation dialog with reason field → audit log entry → optimistic UI + rollback → toast feedback |

## 2.5 — KPI Derivation

For every **countable action** in the user app, derive a KPI card:

| User/Partner Action | Admin KPI | Polling |
|---------------------|-----------|---------|
| Books a service | Today's Bookings (count + % change vs yesterday) | 60s |
| Pays for service | Revenue Today (sum + % change) | 60s |
| Partner goes online | Active Partners (online count) | 60s |
| Leaves a review | Avg Rating (weighted average) | 60s |
| Files dispute/complaint | Active Disputes (open count) | 60s |
| Booking sits unassigned | Unassigned Tasks (CONFIRMED with no partner) | 60s |

**Alert chips** — derive from KPIs representing problems:
- Unassigned bookings → warning chip → links to `/bookings`
- Open disputes → error chip → links to `/disputes`
- Pending partner approvals → info chip → links to `/partners?tab=pending`

## 2.6 — Route Structure

Auto-generate from entities. Group into sidebar sections:

```
/(dashboard)/
│
├── OPERATIONS
│   ├── overview/              → KPI dashboard
│   ├── bookings/              → list
│   │   └── [id]/              → detail
│   ├── dispatch/              → escalation queue (if dispatch exists)
│   ├── quotations/            → quote requests (if inspection pricing)
│   └── slots/                 → scheduling (if time-slot based)
│
├── NETWORK
│   ├── partners/              → list with approval workflow
│   │   ├── [id]/              → detail
│   │   └── live/              → real-time status (if location tracking)
│   ├── customers/             → list
│   │   └── [id]/              → detail
│   └── zones/                 → geo management (if location-based)
│       ├── [id]/              → detail + boundary editor
│       └── new/               → creator
│
├── CATALOG
│   ├── services/              → CRUD
│   │   └── [id]/              → detail + variants + pricing
│   ├── coupons/               → promo management
│   └── pricing-settings/      → platform pricing config
│
├── FINANCE
│   ├── payments/              → revenue + payouts + refunds
│   ├── payroll/               → partner salaries (if salary model)
│   └── reviews/               → moderation
│
├── DISPUTES
│   └── disputes/              → resolution hub
│       └── [id]/              → detail
│
└── SYSTEM
    └── settings/              → health + admin profile + config
```

**Derivation logic:**
- Entity has user-facing CRUD → create route
- Entity has status lifecycle → add `[id]/` detail route
- Entity is geo-based → add `/live` under parent
- Entity has financial impact → goes under FINANCE
- Entity is configurable → goes under SYSTEM or gets own settings route

## 2.7 — RBAC Matrix

Scan backend for role enums. Default matrix if none found:

| Role | Read | Ops Write | Finance Write | Super |
|------|------|-----------|---------------|-------|
| OPERATIONS | ✅ all | ✅ bookings, partners, dispatch, services | ❌ | ❌ |
| SUPPORT | ✅ all | ✅ disputes, customers | ❌ | ❌ |
| FINANCE | ✅ all | ❌ | ✅ payments, payroll, refunds | ❌ |
| SUPER_ADMIN | ✅ all | ✅ all | ✅ all | ✅ settings, admin mgmt |

Implementation:
- `<AuthGuard>` — route-level, redirects to login if no token
- `<FinanceRouteGuard>` — blocks finance routes for non-finance roles
- `<RoleGate allow="role">` — component-level, hides buttons
- `useAdminPermissions()` — hook returning `{ canOperate, canFinance, isSuper }`

---

# PHASE 3: DESIGN

**Goal**: Create the visual design system, then generate screen targets via Stitch MCP.

## 3.1 — Output: `docs/design-system.md`

Write this file. Structure:

```markdown
# Design System

## 1. Palette
[Derive from user app's existing colors. Map to tokens:]
| Token | Hex | Use |
| primary | [from user app] | buttons, links, active states |
| primary-dark | [darker variant] | hover/pressed |
| primary-tint | [light variant] | selected rows, badge backgrounds |
| accent | [one highlight color] | ONE call-to-action per screen. Never for status. |
| surface | #FFFFFF or equivalent | cards, tables, modals |
| canvas | #F8FAFC or equivalent | page background |
| border | [from user app] | card/table borders |
| text | [from user app] | headings and body |
| text-muted | [from user app] | labels, captions |
| success | green | completed, approved, paid |
| warning | amber | pending, awaiting |
| danger | red | cancelled, suspended, failed |
| info | blue | in-progress, assigned |

## 2. Typography
[Match user app. Default: Inter.]
| Role | Size | Weight |
| Page title | 24px | 600 |
| Section header | 18px | 600 |
| Body | 14px | 400 |
| Caption | 12px | 500, text-muted |
| Metric value | 28px | 700 |

## 3. Shape
- Corner radius: 8px. Pills fully rounded.
- Cards: 1px border, NO drop shadow.
- Card padding: 20px. Section spacing: 24px.

## 4. Component Vocabulary
[Name every component so screens reference them consistently]
| Component | Definition |
| Metric card | Label + large number + optional delta. 4 per row desktop. |
| Data table | Sticky header, 48px rows, right-aligned numbers |
| Status badge | Uppercase pill, 12px, color from status map |
| Filter bar | Search + status tabs + date range, above every table |
| Reason dialog | Modal with required reason field. Confirm disabled until non-empty. |
| Empty state | Icon + one line + action button |
| Timeline | Vertical status history with timestamps + actor |

## 5. Status Color Map
[Map EVERY status enum to a color. Two screens showing same status = same badge.]

## 6. Density
- Admin (DESKTOP): dense. Tables over cards. 12+ rows visible.
- Partner (MOBILE): spacious. Cards over tables. One decision per screen.

## 7. Style Suffix
[One paragraph appended verbatim to every Stitch prompt. Never vary between screens.]
> [Write it based on palette + shape + typography decisions above]
```

## 3.2 — Stitch MCP Screen Generation

For every screen in `docs/admin-screens.md`, generate a visual target using Stitch.

### Stitch Workflow

```
STEP 1: Create Stitch project
        → StitchMCP.create_project({ title: "[ProductName] Admin Panel" })
        → Save projectId

STEP 2: Write DESIGN.md content (base64 encode design-system.md)
        → StitchMCP.upload_design_md({ projectId, designMdBase64 })

STEP 3: Create design system from uploaded DESIGN.md
        → StitchMCP.create_design_system_from_design_md({
            projectId,
            deviceType: "DESKTOP",  // MOBILE for partner screens
            selectedScreenInstance: { id, sourceScreen }
          })

STEP 4: For each screen, generate using the prompt from admin-screens.md
        → Append the style suffix from design-system.md §7 to every prompt
        → Device type: DESKTOP for admin, MOBILE for partner

STEP 5: Save outputs to screens/ directory
        screens/admin/[ScreenID]-[name].html
        screens/admin/[ScreenID]-[name].png
        screens/partner/[ScreenID]-[name].html
        screens/partner/[ScreenID]-[name].png
```

### Stitch Rules (Critical)
1. **Do NOT add style suffix to prompts manually** — if using a batch script, the script appends it
2. **Do NOT edit individual prompts to fix look** — fix the style suffix ONCE, regenerate all
3. **Generated output = visual target, NOT shippable code** — build real screens against real APIs
4. **Generate P1 (or A1) alone first** — verify look matches expectations before batch
5. **One shared style suffix = entire consistency mechanism** — editing per-screen = different design systems

## 3.3 — Sample Data

Write realistic sample data for prompts. Never `{{placeholders}}` or lorem ipsum.
Use real-length names and numbers from the target market — they break layouts designed around short filler.

```markdown
## Sample Data for Prompts
[Product-specific names, phone numbers, amounts, locations, dates]
[Use these consistently across ALL screen prompts so they tell one story]
```

---

# PHASE 4: BUILD

**Goal**: Implement everything. Strict ordering — dependencies first.

## 4.1 — Implementation Order

```
LAYER 1: Backend Schema + Migrations
         → Add admin tables (AdminProfile, AuditLog, PlatformSetting)
         → Add any missing partner tables
         → Run migrations

LAYER 2: Backend API Routes (admin namespace)
         → /admin/auth (login, refresh, me)
         → /admin/analytics (KPIs, revenue, partner performance, customer analytics)
         → /admin/bookings (list, detail, reassign, cancel, export)
         → /admin/partners (list, detail, approve, reject, suspend, skills)
         → /admin/customers (list, detail, block)
         → /admin/services (CRUD)
         → /admin/payments (summary, payouts, refunds)
         → /admin/disputes (list, detail, resolve)
         → /admin/reviews (list, hide, flag)
         → /admin/coupons (CRUD)
         → /admin/zones (CRUD + geo)
         → /admin/dispatch (escalated, force-assign, redispatch)
         → /admin/settings (platform settings CRUD)
         → /admin/health (API + DB status)

LAYER 3: Backend Realtime (Socket.IO / WebSocket)
         → booking:created, booking:status_changed
         → partner:operational_status
         → quotation:created, service:created

LAYER 4: Partner App (if not built yet)
         → Onboarding + KYC upload
         → Home + duty toggle
         → Dispatch offer accept/decline
         → Active job flow (navigate, check-in, complete)
         → Earnings view
         → Profile + schedule

LAYER 5: Admin Panel
         → Auth (login page + AuthGuard + token management)
         → Layout (sidebar + topbar + drawer)
         → Overview dashboard (KPIs + charts + activity feed)
         → Entity pages (in route structure order from §2.6)
         → Settings page (health + admin profile)

LAYER 6: Wiring
         → Socket client connection
         → KPI polling hook (60s interval)
         → Activity feed hook (socket events)
         → Partner operational status hook (socket + REST fallback)
         → Export hooks (CSV download)
         → Pagination hooks
```

## 4.2 — Tech Stack Selection

```
IF user app = React Native (Expo) + Node backend:
  Partner app = React Native (Expo), same monorepo
  Admin panel = Next.js (App Router)
  State = React Query (TanStack Query)
  Realtime = Socket.IO
  Styling = match user app (Tailwind/DaisyUI/vanilla CSS)

IF user app = Flutter + Node backend:
  Partner app = Flutter, same project
  Admin panel = Next.js or Vite + React
  State = React Query
  Realtime = Socket.IO

IF user app = Flutter + any backend:
  Partner app = Flutter
  Admin panel = Next.js or Vite + React
  State = React Query
```

## 4.3 — API Client Pattern

```typescript
// Thin client wrapper — one file
const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

async function request(method, url, body?) {
  const token = getStoredToken();
  const res = await fetch(BASE_URL + url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    ...(body && { body: JSON.stringify(body) }),
  });
  if (!res.ok) throw await parseError(res);
  return res.json();
}

// Per-entity API module — one file per entity
export const bookingsApi = {
  list: (filters) => request('GET', '/admin/bookings?' + qs(filters)),
  detail: (id) => request('GET', `/admin/bookings/${id}`),
  cancel: (id, reason) => request('POST', `/admin/bookings/${id}/cancel`, { reason }),
  reassign: (id, partnerId, reason) => request('POST', `/admin/bookings/${id}/reassign`, { partnerId, reason }),
  exportCsv: (filters) => request('GET', '/admin/bookings/export?' + qs(filters)),
};
```

## 4.4 — Offline / Stale Data Rules (Apply Everywhere)

```
RULE 1: Every query → placeholderData: (prev) => prev
        → Never blank screen on refetch failure

RULE 2: KPI polling → on error, keep last data
        → Show warning: "Showing cached data — live refresh failed"
        → Retry button

RULE 3: Lists → on error, show ErrorState with retry
        → "Failed to load [entity]. Retry?"

RULE 4: Mutations → on error, toast with specific message
        → getApiErrorMessage(error, fallbackMsg) pattern

RULE 5: Socket → track connection globally
        → useSocketStatus() → boolean
        → Disconnected → fall back to REST polling (30s)
        → Settings page shows connection health
```

## 4.5 — KPI Card Pattern

```
┌────────────────────────────────────┐
│ LABEL (11px uppercase tracking)    │
│ VALUE (3xl bold)                   │  [Icon Box]
│ ▲ +12% or ▼ -5%  (trend)          │  (rounded-xl)
│ subtitle (xs muted)               │
│ [optional sparkline]              │
└────────────────────────────────────┘

Props: label, value, icon, iconBg, iconColor, change, subtitle, children
Polling: 60s default, stale-data fallback, "Live" badge with pulsing dot
```

## 4.6 — Required UI Components

Build or install these. Every admin panel uses all of them:

| Component | Purpose |
|-----------|---------|
| `PageHeader` | eyebrow + title + description + actions slot |
| `PageStack` | vertical spacing container for page sections |
| `KpiCard` | label + value + trend + icon + sparkline |
| `DataTableWrapper` | loading/error/empty states wrapping tables |
| `FilterBar` | horizontal filter controls + result count |
| `PaginationFooter` | page nav + page size (10/20/50) |
| `StatusBadge` | colored pill per status enum |
| `PillTabs` | horizontal tabs with count badges |
| `EmptyState` | icon + heading + subtext |
| `ErrorState` | message + retry button |
| `Skeleton` | loading placeholder matching content shape |
| `DateRangePicker` | start/end date + clear |
| `ActionChip` | icon + label + link, colored by severity |
| `StatusDot` | colored dot, optional pulse |
| `Alert` | banner with variant + optional action |
| `Card` | header + content + optional footer |

## 4.7 — Booking Lifecycle Admin Actions

Map every booking status to admin capabilities:

| Status | User Sees | Partner Sees | Admin Can Do |
|--------|-----------|-------------|-------------|
| PENDING | Processing | — | Cancel |
| PAYMENT_PENDING | Payment sheet | — | Cancel, mark paid |
| CONFIRMED | Assigned | Job in upcoming | Reassign, cancel+refund |
| ASSIGNED | Partner card | Assignment notif | Reassign |
| EN_ROUTE | On the way | Navigation | — (monitor) |
| CHECKED_IN | Started | OTP verified, timer | View lateness |
| IN_PROGRESS | Live status | Active job | — (monitor) |
| COMPLETED | Rating prompt | Earnings credited | Review moderation |
| CANCELLED | Refund status | Slot freed | Override policy, adjust refund |
| NO_SHOW | Refund per policy | Photo proof | Adjudicate |

Every admin action requires: confirmation + reason + audit log + optimistic UI + toast.

## 4.8 — Money Views (Three-Way)

```
PAYER (customer → admin mirrors):
  Price breakdown: base + surge + addons - discount + tax + platform fee
  Payment status timeline: PENDING → AUTHORIZED → CAPTURED → REFUNDED
  Refund tracker

PAYEE (partner → admin mirrors):
  Per-job earnings with commission shown
  Payout table: partner, amount, status, period
  Ledger: BOOKING_GROSS, PLATFORM_COMMISSION, PARTNER_NET, CASH_COLLECTED

HOUSE (admin-only):
  KPIs: total revenue (sparkline), payouts (pending count), refund rate (%),
        open refunds (count), repeat rate (%), lifetime value (avg LTV)
  Payout Table component
  Refund Tracker component
  Ratings Distribution Chart
```

## 4.9 — Partner App Screens (Derive from User App)

If partner app not built yet, derive these screens from what the user app implies:

| User App Feature | Partner Screen Needed |
|------------------|----------------------|
| User books service | **Dispatch offer** — accept/decline with 60s countdown |
| User sees "partner assigned" | **Home dashboard** — duty toggle + active jobs list |
| User sees "partner en route" | **Navigation** — map + directions to address |
| User enters check-in OTP | **Check-in** — OTP input to verify arrival |
| User sees "service in progress" | **Active job** — timer + service checklist |
| User sees "completed" | **Completion** — OTP/confirmation + earnings summary |
| User rates partner | **Ratings view** — see own rating + reviews |
| User uses address | **Job detail** — see customer address + navigate |
| Service catalog exists | **Onboarding** — select services + upload KYC |
| Payments exist | **Earnings** — per-job, weekly, monthly breakdown |

---

# PHASE 5: VERIFY

**Goal**: Confirm everything works. Run before shipping.

## 5.1 — Entity Coverage Checklist

For every entity in `docs/entities.md`:

```
□ Has list page with filters + status tabs + search
□ Has detail page (if entity has status lifecycle)
□ Every mutation has confirmation + reason + audit log
□ Every page handles: loading, error, empty, stale states
□ CSV/Excel export on list page
□ Pagination (10/20/50 per page)
```

## 5.2 — Dashboard Checklist

```
□ KPI cards poll at 60s with stale-data fallback
□ Stale data shows warning banner + retry button
□ "Live" badge with pulsing green dot when data fresh
□ "Updated X ago" timestamp
□ Alert chips link to relevant pages
□ Activity feed updates in realtime via socket
□ Partner growth chart renders 30d data
□ Top performers table shows top 5
```

## 5.3 — Realtime Checklist

```
□ Socket connects on dashboard mount
□ Socket auto-reconnects on disconnect
□ Activity feed receives booking:created events
□ Activity feed receives booking:status_changed events
□ Partner operational status updates via socket
□ Socket disconnect → REST polling fallback (30s)
□ Settings page shows socket connection status
□ Socket auth uses stored token
```

## 5.4 — Auth & Permissions Checklist

```
□ Login page with JWT token storage
□ AuthGuard redirects unauthenticated to login
□ Token refresh on 401
□ Finance routes gated for finance roles
□ Mutation buttons respect role permissions
□ RoleGate hides unauthorized actions
□ Admin management restricted to SUPER_ADMIN
```

## 5.5 — Stitch Comparison (if screens generated)

For each generated screen, open the PNG beside the running app:

```
□ Layout matches (header, table, cards in right positions)
□ Colors match design system (no rogue blues or oranges)
□ Status badges use correct colors from status map
□ Typography hierarchy matches (title > section > body > caption)
□ Data density correct (desktop = dense, mobile = spacious)
```

**Write down differences. Do NOT auto-fix.** A difference is not automatically a defect — the built screen may be right and the design wrong.

## 5.6 — Ops Coverage Matrix

For every entity, verify the admin can handle every failure:

```
□ User created bad data → admin can correct it
□ System made wrong decision → admin can override it
□ Money moved incorrectly → admin can refund/adjust
□ Partner misbehaved → admin can suspend with reason
□ Entity stuck in limbo → admin can force-transition with reason
□ No action requires an engineer running SQL
```

> **The rule**: every failure mode must be resolvable from the admin console, by a non-engineer, without database access. If the honest answer is "an engineer runs SQL" — that's a missing feature.

## 5.7 — Final Sign-off

```
□ Every entity from schema has admin surface
□ Partner app derives correctly from user app
□ All financial values in local currency format
□ All dates use locale-aware formatting
□ No hardcoded business values — all from settings/config
□ Mobile-responsive layout (drawer sidebar on mobile)
□ Error toasts use specific messages, not generic
□ Settings page shows API + Socket health
□ Sidebar badges show live counts from KPI polling
```

---

# APPENDIX A: Clenzey Reference Implementation

**Product**: Home services marketplace (cleaning, plumbing, etc.)
**Stack**: Next.js 14 (App Router), React Query, Socket.IO, DaisyUI/Tailwind, Drizzle ORM

### Backend Schema (33 tables)
admins, bankDetails, bookingEta, bookingPhotos, bookings, consumers, contactLogs, deviceTokens, disputes, disputeEvidence, incentiveConfigs, kycDocuments, notifications, partners, partnerLedgerEntries, partnerMonthlyAttendance, partnerPayrollRuns, partnerSkills, partnerZones, payments, platformPricingSettings, payouts, pricing, referrals, refunds, reviews, scheduling, secrets, services, users, zones

### Backend API (30 resource groups)
addresses, admin, bookings, consumers, contact, coupons, device-tokens, dispatch, disputes, earnings, eta, health, incentive, kyc, location, notifications, partnerZones, partners, payments, payroll, photos, platformPricing, referrals, refunds, reviews, services, skills, slots, uploads, zones

### Admin Panel (16+ routes)
overview, bookings, bookings/[id], partners, partners/[id], partners/live, customers, customers/[id], services, services/[id], payments, disputes, disputes/[id], reviews, coupons, zones, zones/[id], zones/new, dispatch, slots, quotations, payroll, pricing-settings, settings

### KPIs
Today's Bookings (count+%), Revenue Today (₹+%), Active Partners (count+%), Avg Rating, Fulfillment Rate, Unassigned Tasks, Active Disputes

### Fleet Status (via socket)
IN_TRANSIT, ON_JOB, IDLE — counts shown as ActionChips linking to /partners/live

### Realtime Events
booking:created, booking:status_changed, booking:partner_proposed, quotation:created, service:created, partner:operational_status

### Roles
OPERATIONS, SUPPORT, FINANCE, SUPER_ADMIN

### Offline Pattern
- `useKpiPolling(60s)` with `placeholderData` + stale warning + retry
- `usePartnerOperationalStatus()` with socket + 30s REST fallback
- `useActivityFeed()` with socket auto-reconnect
- All queries use `placeholderData: (prev) => prev`

---

# APPENDIX B: CanoVet Reference Implementation

**Product**: Pet services marketplace (vet visits, grooming, clinics)
**Stack**: Next.js (App Router), Prisma, Razorpay, multi-city, dispatch offers

### Key Design Decisions
- Money stored as **integer paise** (never rupees, never floats)
- Append-only **LedgerEntry** table — balances derived by summing, never stored
- **AuditLog** — every admin action recorded with actor + reason + metadata
- **PlatformSetting** — key-value store for business-tunable values (no deploy needed)
- **BookingOffer** — ranked dispatch with 60s timeout + escalation at 5 min
- Partner states: PENDING → APPROVED → SUSPENDED (replaces boolean isVerified)
- Partner **commission** cascades: partner override → city override → platform default

### Ops Coverage Rule
> Every failure mode must be resolvable from the admin console, by a non-engineer, without database access.

### Screen Doc Format (feeds Stitch)
```
### [ID] — [Name]
**Actor**: [role] · **Route**: [path] · **Device**: MOBILE | DESKTOP
**Data**: [GET endpoints]
**Actions**: [POST/PATCH/DELETE endpoints]
**States**: [all UI states]
**Permissions**: [role requirements]

```stitch
deviceType: DESKTOP
prompt: |
  [Detailed visual description of the screen]
  [Include sample data, not placeholders]
  [Style suffix appended at end — from design-system.md §7]
```​
```

### Design System Style Suffix Pattern
One paragraph. Appended verbatim to every prompt. Never varied between screens. If look is wrong, fix suffix once, regenerate all.

---

# APPENDIX C: Doc Files This Blueprint Generates

During execution, the AI writes these files to `docs/`:

| File | Written In | Purpose |
|------|-----------|---------|
| `docs/entities.md` | Phase 1 | Complete entity map from schema |
| `docs/partner-features.md` | Phase 2 | Partner app features derived from user app |
| `docs/admin-screens.md` | Phase 2 | Every admin screen with layout + Stitch prompt |
| `docs/design-system.md` | Phase 3 | Palette, typography, components, style suffix |
| `docs/admin-routes.md` | Phase 2 | Route tree with sidebar grouping |

Screen outputs go to `screens/`:
| File | Written In | Purpose |
|------|-----------|---------|
| `screens/admin/[ID]-[name].html` | Phase 3 | Stitch-generated screen design |
| `screens/admin/[ID]-[name].png` | Phase 3 | Screenshot of generated design |
| `screens/partner/[ID]-[name].html` | Phase 3 | Partner screen designs |
| `screens/partner/[ID]-[name].png` | Phase 3 | Partner screen screenshots |

---

*Derived from Clenzey (home services) and CanoVet (pet services). Applicable to any two-sided marketplace with user + partner/provider apps.*
