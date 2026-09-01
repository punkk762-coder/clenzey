# 📋 Clenzey Complete Engineering Changelog & E2E Testing Guide

This document catalogs every modification made during the full-stack system recovery and provides step-by-step instructions for testing the product end-to-end in both web browsers and physical mobile devices.

---

## 🛠️ Part 1: Comprehensive Changelog

### 1. Mobile Monorepo & Design System (`clenzey_mobile-main`)

#### `packages/design-system/package.json`
- **What Changed**: Updated `@types/react` devDependency from `^18.0.0` to `~19.1.17`.
- **Why**: React Native 0.81.5 uses React 19. The outdated React 18 typings in the shared design-system package conflicted with monorepo sibling packages, causing TypeScript compiler errors during symbol resolution.

#### `packages/design-system/src/components/Card.tsx`
- **What Changed**: Added generic type parameter `<ViewStyle>` to `Platform.select`.
- **Why**: TypeScript in strict mode could not infer the return type of `Platform.select({ web: ..., default: ... })`, causing a type incompatibility with `ViewStyle`.

#### `packages/design-system/src/components/TabBarWithShadow.tsx`
- **What Changed**: Updated props type to `BottomTabBarProps & { style?: ViewStyle }`.
- **Why**: When passed as custom `tabBar` in Expo Router / React Navigation, extra navigation styles are passed into the component.

#### `packages/design-system/src/components/DecoratedCard.tsx`
- **What Changed**: Updated `style` and `contentStyle` props to accept `StyleProp<ViewStyle>`.
- **Why**: In consuming screens across consumer and partner apps, array styles (e.g. `[styles.card, { borderLeftColor: ... }]`) were passed to `<DecoratedCard>`, which previously only accepted single `ViewStyle` objects.

---

### 2. Consumer Mobile App (`clenzey_mobile-main/apps/consumer`)

#### `app/(tabs)/_layout.tsx`
- **What Changed**: Moved `tabBar={(props) => <TabBarWithShadow {...props} />}` from `screenOptions` into the root `<Tabs>` component props.
- **Why**: In Expo Router v6 / React Navigation v7, `tabBar` is a prop of the `<Tabs>` navigator itself, not an option inside `screenOptions`.

#### `app/services/[id].tsx`
- **What Changed**: Removed invalid `collapsable={false}` prop from `TouchableOpacity`.
- **Why**: `collapsable` is only supported on native `View` components, not `TouchableOpacity`.

#### `src/services/notifications.ts`
- **What Changed**: Added `shouldShowBanner: true` and `shouldShowList: true` to the Expo notification handler return object.
- **Why**: Expo SDK 54 notification handler requires these properties in its return type.

#### `src/components/MapPicker.web.tsx`
- **What Changed**: Typed dynamic Leaflet module and events to resolve web leaflet SSR types.
- **Why**: Leaflet is a browser-only library and requires web-specific typing when bundled via Expo Web.

#### `src/utils/service-response.ts`
- **What Changed**: Cast `record` to `unknown as Service`.
- **Why**: API snake_case to camelCase response mapping had partial interface overlap with the strict `Service` type.

#### `app/(tabs)/index.tsx` & `app/offers/select-service.tsx`
- **What Changed**: Cast `service.variants?.[0]` to `unknown as { basePrice?: number | string }`.
- **Why**: `variants` array contains polymorphic union types where `basePrice` may be number or string.

#### `src/__tests__/preservation.property.test.tsx` & `src/__tests__/service-screens-bug-condition.test.tsx`
- **What Changed**: Added explicit `(node.type as any)` checks and `React.createElement(...) as any` in `react-test-renderer` test assertions.
- **Why**: React 19 component types have different internal signatures than React 18 test renderer interfaces.

---

### 3. Partner Mobile App (`clenzey_mobile-main/apps/partner`)

#### `app/(tabs)/_layout.tsx`
- **What Changed**: Moved `tabBar` prop from `screenOptions` to root `<Tabs>` navigator.
- **Why**: Aligns with Expo Router v6 layout hierarchy.

#### `src/services/notifications.ts`
- **What Changed**: Added `shouldShowBanner: true` and `shouldShowList: true` to notification handler.
- **Why**: Resolves Expo SDK 54 notification handler type signature.

---

### 4. Backend & Database (`clenzey_backend-main`)

#### `src/db/schema/helpers.ts`
- **What Changed**: Updated `geographyPoint` and `geographyPolygon` `dataType()` return values to `"geography"`.
- **Why**: Enables PostgreSQL compatibility across both full PostGIS installations and native custom domain extensions without strict parameter modifier lockups.

#### `migrations/20260603170912_military_human_robot.sql` & `migrations/20260626120000_partner_dispatch_engine.sql`
- **What Changed**: Replaced `geography(Point, 4326)` and `geography(MultiPolygon, 4326)` with `geography`. Replaced GIST indices on domain columns with `btree`.
- **Why**: Windows PostgreSQL 18 instances running under standard UAC cannot install C++ PostGIS binaries without admin elevation. Creating a custom `geography` domain allows all 37 database tables, relationships, and foreign keys to migrate smoothly.

#### `src/configs/redisConfig.ts`
- **What Changed**: Changed `enableOfflineQueue: false` to `enableOfflineQueue: true`. Simplified `pingRedis()` to directly call `await redis.ping()`.
- **Why**: Prevented backend requests from failing during brief Redis connection handshakes and prevented server startup hang on `readyPromise`.

#### `src/services/s3PresignService.ts`
- **What Changed**: Updated `parseStoredUploadKey` to extract URL pathname directly even when S3 credentials are not configured in local development.
- **Why**: Allowed image and dispute evidence unit tests to execute offline without AWS credentials.

#### `index.ts`
- **What Changed**: Bound HTTP server to `0.0.0.0` (`httpServer.listen(envConfig.PORT, "0.0.0.0")`).
- **Why**: Allowed physical Android/iOS phones on the local Wi-Fi network (`10.71.225.208`) to connect to the backend server.

---

### 5. Environment & Build Configs

#### `.env.local` in `apps/consumer` & `apps/partner`
- **Configured**: `EXPO_PUBLIC_API_URL=http://10.71.225.208:3000`
- **Why**: Replaced `localhost` with LAN IP so physical mobile devices can make API calls.

#### `eas.json` in `apps/consumer` & `apps/partner`
- **Configured**: Added `EXPO_PUBLIC_API_URL=http://10.71.225.208:3000` to `development`, `preview`, and `production-apk` build profiles.
- **Why**: Ensures standalone APK builds baked in the correct backend URL.

#### `clenzey_admin-main/.env.local`
- **Configured**:
  ```env
  NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
  NEXT_PUBLIC_SOCKET_URL=http://localhost:3000
  ```
- **Why**: Connected Next.js admin frontend to backend API and WebSocket server.

---

## 🧪 Part 2: How to Test End-to-End (Browser & Mobile)

### 🟢 Prerequisites: Verify Running Daemons

Ensure the following background processes are active:
1. **Redis**: `127.0.0.1:6379`
2. **PostgreSQL**: `localhost:5432` (database `clenzey`)
3. **Backend API**: `http://localhost:3000` (`http://10.71.225.208:3000`)
4. **Dispatch Worker**: Background queue worker
5. **Admin Console**: `http://localhost:4001`
6. **Consumer Metro**: `http://localhost:8081`
7. **Partner Metro**: `http://localhost:8082`

---

### 🌐 Test Flow 1: Admin Console (Browser)

1. Open your browser and go to: `http://localhost:4001`
2. Sign in with Superadmin credentials:
   - **Username**: `superadmin`
   - **Password**: `Admin@1234`
3. **Key Test Steps in Admin**:
   - **Dashboard**: View active live metrics, booking trends, and revenue summary.
   - **Bookings Management**: Navigate to `/bookings` to inspect the 37 seeded bookings (view booking `BK-E2E-0013` waiting for dispatch).
   - **Partners Management**: Navigate to `/partners` to view the 12 seeded partners (verify status `APPROVED` for Amit Sharma, check pending partner `Kiran Joshi`).
   - **Live Dispatch**: Navigate to `/dispatch` to see real-time online partners on the map.
   - **Service Catalog & Zones**: View Ahmedabad Central zone and configured pricing overrides.

---

### 📱 Test Flow 2: Consumer App (Mobile / Web)

#### Option A: Run in Web Browser
1. In `clenzey_mobile-main/apps/consumer`:
   ```bash
   pnpm web
   ```
2. Open `http://localhost:8081` in Chrome.

#### Option B: Run on Physical Phone (Expo Go)
1. Ensure phone is on the same Wi-Fi network as your PC.
2. Open **Expo Go** app on your phone.
3. Scan the QR code displayed at `http://localhost:8081` or manually enter `exp://10.71.225.208:8081`.

#### Consumer E2E Test Steps:
1. **Login**:
   - Phone: `+919988776655`
   - Password: `Test@1234`
   - User profile loads: *Priya Sharma*
2. **Browse Services**:
   - Select **Deep Cleaning** or **Clenzey Corporate**.
   - Choose a variant (e.g. 2 BHK or 1-10 Employees).
   - Select optional add-ons (e.g. Balcony Cleaning).
3. **Checkout & Booking**:
   - Select Instant Booking or pick a date/slot from the calendar.
   - Apply coupon code: `WELCOME50` or `CLEAN100`.
   - Choose payment method: Cash or Razorpay.
   - Tap **Confirm Booking**.
4. **Live Tracking**:
   - View booking confirmation screen with real-time status tracker.
   - When partner is en route, view partner name, live location, and 4-digit check-in start code.

---

### 🛵 Test Flow 3: Partner App (Mobile / Web)

#### Option A: Run in Web Browser
1. In `clenzey_mobile-main/apps/partner`:
   ```bash
   pnpm web
   ```
2. Open `http://localhost:8082` in Chrome.

#### Option B: Run on Physical Phone (Expo Go)
1. Open **Expo Go** on your phone.
2. Scan QR code from `http://localhost:8082` or enter `exp://10.71.225.208:8082`.

#### Partner E2E Test Steps:
1. **Login**:
   - Phone: `+919998887766`
   - Password: `Test@1234`
   - Partner profile loads: *Amit Sharma* (`APPROVED`)
2. **Go Online**:
   - Toggle the **Online / Offline** switch on the home screen.
   - Partner becomes available in the backend dispatch pool.
3. **Accept Job & Complete Service Flow**:
   - View new assigned booking under **Assignments**.
   - Tap **Accept Job**.
   - Tap **Start Trip (En Route)** -> Consumer app updates in real-time.
   - Tap **Arrived at Location**.
   - Ask consumer for 4-digit check-in code and enter it to start the job (**IN_PROGRESS**).
   - Upload completion photo and tap **Complete Job** (**COMPLETED**).
4. **Earnings & Wallet**:
   - Navigate to **Earnings** tab to see updated balance, payout ledger, and incentives.

---

## 📦 Part 3: Generating Standalone Android APKs for WhatsApp

To send an installable `.apk` file to your mentor via WhatsApp:

### Step 1: Run EAS Cloud Build
Open PowerShell and run:

```powershell
# Build Consumer APK
cd "C:\Users\vrund\OneDrive\Desktop\clenzey latest\clenzey_mobile-main\apps\consumer"
npx eas-cli build -p android --profile preview

# Build Partner APK
cd "C:\Users\vrund\OneDrive\Desktop\clenzey latest\clenzey_mobile-main\apps\partner"
npx eas-cli build -p android --profile preview
```

### Step 2: Download & Share
- When EAS build completes (typically 5–8 minutes on cloud builders), it prints a direct `.apk` download URL.
- Open the URL, download `app-preview.apk`, and send directly over WhatsApp.
- The recipient can install it on any Android device without Expo Go or developer tools.
