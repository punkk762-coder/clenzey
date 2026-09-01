# Clenzey · Admin

Operations terminal for the Clenzey home-services platform. Talks to the
`clenzey_backend` API and Socket.IO channel for live booking events.

## Stack

- **Next.js 15** (App Router) · **React 19** · **TypeScript**
- **Tailwind CSS** with custom editorial-dark tokens (lime signal accent)
- **shadcn/ui** primitives (hand-implemented Radix-based components)
- **TanStack Query** for data fetching, cache, and mutations
- **Socket.IO client** for the realtime booking feed
- **react-leaflet + leaflet-draw** for geofence polygon editing
- **recharts** for revenue charts

## Getting started

```bash
# from the repo root
cd clenzey_admin

# install dependencies
pnpm install        # (matches the backend's package manager)

# create your env file
cp .env.example .env.local
# → edit values if your backend lives somewhere other than http://localhost:8051

# run the dev server (defaults to port 3001 so it doesn't clash with the API)
pnpm dev
```

Then open <http://localhost:3001>. The root page redirects to `/overview`
which is guarded — you'll land on `/login` until authenticated.

### Backend prerequisites

Run the backend first (typically `pnpm dev` inside `clenzey_backend` on
port 8051). The admin uses OTP login via Twilio; make sure your phone is
whitelisted in the `admins` table (`pnpm admin:add` in the backend repo).

## Environment variables

| Name                          | Default                       | Purpose                          |
| ----------------------------- | ----------------------------- | -------------------------------- |
| `NEXT_PUBLIC_API_BASE_URL`    | `http://localhost:8051/v1`    | REST API base URL                |
| `NEXT_PUBLIC_SOCKET_URL`      | `http://localhost:8051`       | Socket.IO endpoint               |

## Feature map

| Route                | Description                                                                            |
| -------------------- | -------------------------------------------------------------------------------------- |
| `/login`             | Two-step admin OTP login                                                               |
| `/overview`          | Revenue chart, live signal feed, KPI cards, service heatmap, active jobs list          |
| `/bookings`          | Filterable booking log with status, search, total                                      |
| `/bookings/[id]`     | Lifecycle timeline, status transition controls, cancellation dialog, pricing breakdown |
| `/partners`          | Roster with approval tabs, ratings, online status, approve / suspend actions           |
| `/partners/[id]`     | Profile, KYC docs scaffold, earnings buckets                                           |
| `/customers`         | Directory with block / reactivate                                                      |
| `/customers/[id]`    | Profile, saved addresses placeholder, booking history placeholder                      |
| `/services`          | Catalogue cards with pricing model + status                                            |
| `/zones`             | Coverage map, polygon list, status toggle                                              |
| `/zones/new`         | Draw a new polygon (leaflet-draw) + zone metadata form                                 |
| `/zones/[id]`        | Edit zone polygon and metadata, delete                                                 |
| `/surge`             | Surge rules table with activation toggles                                              |
| `/coupons`           | Coupon catalogue                                                                       |
| `/quotations`        | Corporate / site-visit triage with quote / reject                                      |
| `/slots`             | Bulk slot generator form                                                               |
| `/settings`          | Auth profile and connectivity                                                          |

## Backend endpoints expected

The frontend assumes these admin endpoints alongside the public ones already
exposed by `clenzey_backend`. If they don't yet exist, the corresponding pages
render the empty / fallback state gracefully.

- `GET /admin/partners`, `GET /admin/partners/:id`, `POST /admin/partners/:id/approve|reject|suspend`
- `GET /admin/consumers`, `PATCH /admin/consumers/:id` (`isActive`)
- `GET /admin/quotations`, `PATCH /admin/quotations/:id`

Other resources already wired:

- `/admin/auth/{initiate,validate,refresh,logout}`
- `/admin/zones/*` (GET, POST, PATCH, DELETE)
- `/admin/surge-rules/*`
- `/services/*`, `/bookings/*`, `/coupons/*`, `/slots/*`, `/location/*`

## Design system

- **Display font**: Instrument Serif (italic for editorial flair)
- **Sans**: Geist Variable
- **Mono**: JetBrains Mono Variable (tabular numerals for data)
- **Accent**: lime `#d4ff3a` (`--signal`) — clean, citric, unambiguous
- **Surfaces**: deep ink green-black with warm cream foreground
- Tokens live in [`src/app/globals.css`](src/app/globals.css), exposed to
  Tailwind via [`tailwind.config.ts`](tailwind.config.ts).

## Notes & roadmap

- The dashboard is a single-tenant operations console — there's no consumer
  signup or partner-side flow here.
- Socket.IO events drive the **Live signal** feed on the overview and the
  badge in the sidebar. The connection auto-attaches the admin access token.
- The Leaflet map uses CARTO's dark tiles to match the theme; swap the URL
  in `ZoneMap.tsx` if you self-host tiles.
- For larger admin teams, gate destructive actions behind the SUPER_ADMIN
  role via the `useAuth().user?.role` field.
