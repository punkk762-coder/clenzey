# Design Document

## Overview

This design describes the architecture and implementation approach for two React Native (Expo) mobile applications — Consumer and Partner — organized in a monorepo. The apps share common packages for API communication, real-time events, type definitions, and UI components. The architecture emphasizes code reuse, offline-first patterns, and a clear separation between platform-specific and shared logic.

## Architecture

### Monorepo Structure

```
clenzey_mobile/
├── apps/
│   ├── consumer/          # Consumer Expo app
│   │   ├── app/           # Expo Router file-based routing
│   │   ├── src/
│   │   │   ├── components/  # Consumer-specific components
│   │   │   ├── hooks/       # Consumer-specific hooks
│   │   │   ├── screens/     # Screen compositions
│   │   │   └── store/       # Zustand stores (consumer-specific)
│   │   ├── app.json
│   │   ├── eas.json
│   │   └── package.json
│   └── partner/           # Partner Expo app
│       ├── app/           # Expo Router file-based routing
│       ├── src/
│       │   ├── components/
│       │   ├── hooks/
│       │   ├── screens/
│       │   └── store/
│       ├── app.json
│       ├── eas.json
│       └── package.json
├── packages/
│   ├── api-client/        # Shared Axios-based HTTP client
│   │   ├── src/
│   │   │   ├── client.ts      # Base client with interceptors
│   │   │   ├── endpoints/     # Endpoint modules (auth, bookings, etc.)
│   │   │   └── types.ts       # Response envelope types
│   │   └── package.json
│   ├── types/             # Shared TypeScript interfaces
│   │   ├── src/
│   │   │   ├── booking.ts
│   │   │   ├── address.ts
│   │   │   ├── service.ts
│   │   │   ├── auth.ts
│   │   │   ├── notification.ts
│   │   │   └── index.ts
│   │   └── package.json
│   ├── socket-client/     # Shared Socket.IO client
│   │   ├── src/
│   │   │   ├── client.ts     # Connection management
│   │   │   ├── events.ts     # Event type definitions
│   │   │   └── hooks.ts      # React hooks for socket events
│   │   └── package.json
│   └── design-system/     # Shared Horizon Blue UI components
│       ├── src/
│       │   ├── theme/         # Colors, typography, spacing tokens
│       │   ├── components/    # Button, Input, Card, etc.
│       │   └── index.ts
│       └── package.json
├── package.json           # Root workspace config
└── tsconfig.base.json     # Shared TS config
```

### Technology Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Framework | Expo SDK 52+ | Managed workflow, EAS Build support, expo-notifications, expo-location |
| Navigation | Expo Router (file-based) | Convention over configuration, deep linking support |
| State Management | Zustand + React Query (TanStack Query) | Zustand for client state, React Query for server state caching/sync |
| HTTP Client | Axios | Interceptors for auth/refresh, request/response transforms |
| Real-time | socket.io-client | Matches backend Socket.IO implementation |
| Maps | react-native-maps | Google Maps for location display |
| Payments | react-native-razorpay | Official Razorpay SDK bridge |
| Notifications | expo-notifications | FCM integration for Android |
| Location | expo-location | Foreground + background location tracking |
| Forms | React Hook Form + Zod | Declarative validation, TypeScript inference |
| Package Manager | pnpm workspaces | Fast, disk-efficient, strict dependency resolution |

### Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    React Components (Screens)                 │
├─────────────────────────────────────────────────────────────┤
│  Zustand Stores        │  React Query Cache                  │
│  (auth, ui state)      │  (bookings, services, addresses)    │
├─────────────────────────────────────────────────────────────┤
│           API Client (Axios + Interceptors)                   │
│           Socket Client (socket.io-client)                    │
├─────────────────────────────────────────────────────────────┤
│                    Backend REST API + Socket.IO               │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### Shared API Client (`packages/api-client`)

The API client wraps Axios with:
- **Request interceptor**: Attaches `Authorization: Bearer <token>` header from secure storage
- **Response interceptor**: Unwraps `{ success, data }` envelope; on 401, queues request, attempts refresh, retries or triggers logout
- **Typed endpoint modules**: Each domain (auth, bookings, addresses, payments, etc.) exports typed functions

```typescript
// packages/api-client/src/client.ts
interface ApiConfig {
  baseURL: string;
  getToken: () => Promise<string | null>;
  setToken: (token: string) => Promise<void>;
  onAuthFailure: () => void;
}
```

### Auth Flow

```
Phone Input → POST /auth/initiate → OTP Screen → POST /auth/validate
  ↓ success
Store accessToken (secure storage) + refresh cookie (HttpOnly, managed by server)
  ↓ token expired (401)
POST /auth/refresh → new accessToken → retry original request
  ↓ refresh fails
Clear storage → Navigate to Login
```

### Zustand Auth Store

```typescript
interface AuthState {
  accessToken: string | null;
  user: Consumer | Partner | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  // Actions
  setToken: (token: string) => void;
  setUser: (user: Consumer | Partner) => void;
  logout: () => void;
  hydrate: () => Promise<void>; // Load from secure storage on app start
}
```

### Socket.IO Client (`packages/socket-client`)

```typescript
// Connection lifecycle
connect(token: string) → auto-joins user room
disconnect() → cleanup

// Consumer-specific
subscribeToBooking(bookingId: string) → emits booking:subscribe
unsubscribeFromBooking(bookingId: string) → emits booking:unsubscribe

// Event listeners (via React hooks)
useBookingStatus(bookingId) → listens booking:status_changed
usePartnerLocation(bookingId) → listens partner:location_stream, partner:location_stale
useEtaUpdates(bookingId) → listens eta:updated
```

### Background Location (Partner)

Uses `expo-location` TaskManager API:
1. Define background task that posts location to `/partners/location`
2. Start task when partner goes online (with `accuracy: High`, `timeInterval: 5000-10000ms`)
3. Stop task when partner goes offline or logs out
4. Handle permission requests (foreground + background location)

```typescript
// Configuration
TaskManager.defineTask(LOCATION_TASK, ({ data, error }) => {
  if (data) {
    const { locations } = data;
    apiClient.partners.updateLocation({
      latitude: locations[0].coords.latitude,
      longitude: locations[0].coords.longitude,
      heading: locations[0].coords.heading,
      speed: locations[0].coords.speed,
      isOnline: true,
    });
  }
});
```

### Payment Flow (Consumer)

```
1. Create Booking (POST /bookings) → booking in PENDING status
2. Create Order (POST /payments/orders) → Razorpay orderId, booking → PAYMENT_PENDING
3. Open RazorpayCheckout.open({ order_id, amount, currency: "INR", ... })
4a. onSuccess → POST /payments/confirm { orderId, paymentId, signature } → CONFIRMED
4b. onError → Show retry UI, booking stays PAYMENT_PENDING
```

### Consumer Navigation Structure (Expo Router)

```
app/
├── (auth)/
│   ├── login.tsx          # Phone input
│   └── otp.tsx            # OTP verification
├── (tabs)/
│   ├── _layout.tsx        # Bottom tab navigator (Home, Bookings, Profile)
│   ├── index.tsx          # Home (services, banners)
│   ├── bookings/
│   │   ├── index.tsx      # Booking list
│   │   └── [id].tsx       # Booking detail + tracking
│   └── profile/
│       ├── index.tsx      # Profile overview
│       ├── addresses.tsx  # Address list
│       └── notifications.tsx
├── services/
│   └── [id].tsx           # Service detail
├── booking/
│   ├── create.tsx         # Booking form
│   ├── preview.tsx        # Order summary
│   └── payment.tsx        # Payment screen
├── address/
│   ├── create.tsx         # Add address (with map)
│   └── [id]/edit.tsx      # Edit address
├── quotations/
│   ├── index.tsx          # Quotation list
│   └── create.tsx         # Request quotation
├── referral.tsx           # Referral screen
└── _layout.tsx            # Root layout (auth guard)
```

### Partner Navigation Structure (Expo Router)

```
app/
├── (auth)/
│   ├── login.tsx
│   ├── otp.tsx
│   └── pending-approval.tsx
├── (tabs)/
│   ├── _layout.tsx        # Tab navigator
│   ├── index.tsx          # Dashboard (online toggle, assignments)
│   ├── bookings/
│   │   ├── index.tsx      # Active/completed bookings
│   │   └── [id].tsx       # Booking detail + transition
│   └── profile/
│       ├── index.tsx      # Profile + reviews
│       ├── availability.tsx
│       └── notifications.tsx
├── assignments/
│   └── [id].tsx           # Assignment detail (accept/decline)
└── _layout.tsx            # Root layout (auth + approval guard)
```

### Design System (`packages/design-system`)

Theme tokens:

```typescript
export const theme = {
  colors: {
    primary: '#0043BA',
    secondary: '#7C7AAD',
    tertiary: '#F0EDFF',
    neutral: '#6DBAA1',
    surface: '#e6fff4',
    white: '#FFFFFF',
    black: '#1A1A1A',
    error: '#DC3545',
    success: '#28A745',
    textPrimary: '#1A1A1A',
    textSecondary: '#6B7280',
  },
  typography: {
    fontFamily: 'Inter',
    headline1: { fontSize: 32, fontWeight: '700' },
    headline2: { fontSize: 28, fontWeight: '700' },
    headline3: { fontSize: 24, fontWeight: '700' },
    body1: { fontSize: 16, fontWeight: '400' },
    body2: { fontSize: 14, fontWeight: '400' },
    label: { fontSize: 12, fontWeight: '600' },
  },
  spacing: {
    base: 4,
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    gutter: 16,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 16,
  },
};
```

Core components: Button, TextInput, Card, Badge, BottomSheet, Modal, Toast, Avatar, Icon, Chip, Divider, LoadingSpinner.

### Form Validation (Zod Schemas)

```typescript
// Address validation
const addressSchema = z.object({
  label: z.string().min(1).max(50),
  addressType: z.enum(['HOME', 'WORK', 'OTHER']),
  line1: z.string().min(1).max(200),
  line2: z.string().max(200).optional(),
  landmark: z.string().optional(),
  city: z.string().min(1),
  state: z.string().min(1),
  pincode: z.string().regex(/^\d{4,8}$/),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
}).refine(
  (data) => (data.latitude === undefined) === (data.longitude === undefined),
  { message: 'Latitude and longitude must be provided together' }
);

// Booking validation
const bookingSchema = z.object({
  serviceId: z.string().uuid(),
  variantId: z.string().uuid(),
  addressId: z.string().uuid(),
  bookingType: z.enum(['INSTANT', 'SCHEDULED']),
  scheduledAt: z.string().datetime().optional(),
  timeSlotId: z.string().uuid().optional(),
  paymentMode: z.enum(['RAZORPAY', 'CASH']),
  couponCode: z.string().max(40).optional(),
  consumerNotes: z.string().max(1000).optional(),
  bookingName: z.string().max(200).optional(),
}).refine(
  (data) => data.bookingType !== 'SCHEDULED' || data.scheduledAt || data.timeSlotId,
  { message: 'scheduledAt or timeSlotId required for scheduled bookings' }
);
```

### React Query Pattern

```typescript
// Example: Bookings
const useBookings = (params: { status?: string; limit?: number; offset?: number }) =>
  useQuery({
    queryKey: ['bookings', params],
    queryFn: () => apiClient.bookings.list(params),
  });

const useCancelBooking = () =>
  useMutation({
    mutationFn: ({ bookingId, reason }: { bookingId: string; reason?: string }) =>
      apiClient.bookings.cancel(bookingId, reason),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bookings'] }),
  });
```

### Secure Storage

- Access tokens stored in `expo-secure-store` (encrypted device storage)
- Refresh handled via HttpOnly cookies (server-managed, sent automatically)
- Token hydration on app start via `authStore.hydrate()`

### Push Notification Flow

```
App Start → Request Permission → Get FCM Token (expo-notifications)
  → POST /device-token { token, platform: 'ANDROID' }

On Notification Received (foreground) → Show in-app toast
On Notification Pressed → Navigate to relevant screen (booking detail, etc.)

On Logout → DELETE /device-token { token }
```

## Data Models

### Consumer

```typescript
interface Consumer {
  id: string;
  phone: string; // E164 format (+919876543210)
  fullName: string;
  createdAt: string;
  updatedAt: string;
}
```

### Partner

```typescript
interface Partner {
  id: string;
  phone: string; // E164 format
  fullName: string;
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  isOnline: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### Address

```typescript
interface Address {
  id: string;
  consumerId: string;
  label: string; // max 50 chars
  addressType: 'HOME' | 'WORK' | 'OTHER';
  line1: string; // max 200 chars
  line2?: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string; // regex: ^\d{4,8}$
  latitude?: number; // -90 to 90
  longitude?: number; // -180 to 180
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### Booking

```typescript
interface Booking {
  id: string;
  consumerId: string;
  serviceId: string;
  variantId: string;
  subVariantId?: string;
  addressId: string;
  bookingType: 'INSTANT' | 'SCHEDULED';
  scheduledAt?: string; // ISO datetime
  timeSlotId?: string;
  status: BookingStatus;
  paymentMode: 'RAZORPAY' | 'CASH';
  couponCode?: string; // max 40 chars
  consumerNotes?: string; // max 1000 chars
  bookingName?: string; // max 200 chars
  addonIds?: string[]; // array of UUIDs
  subscriptionPlan?: 'ONE_TIME' | 'WEEKLY' | 'MONTHLY';
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
}

type BookingStatus =
  | 'PENDING'
  | 'PAYMENT_PENDING'
  | 'CONFIRMED'
  | 'PROFESSIONAL_ASSIGNED'
  | 'PROFESSIONAL_EN_ROUTE'
  | 'CHECKED_IN'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REFUNDED'
  | 'NO_SHOW';
```

### Payment Order

```typescript
interface PaymentOrder {
  id: string;
  bookingId: string;
  razorpayOrderId: string;
  amount: number;
  currency: 'INR';
  status: 'CREATED' | 'PAID' | 'FAILED';
}

interface PaymentConfirmation {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}
```

### Service

```typescript
interface Service {
  id: string;
  name: string;
  category: 'QUICK_SHINE' | 'DEEP_CLEANING' | 'DEEP_LUXE' | 'CORPORATE';
  description: string;
  variants: ServiceVariant[];
  addons: ServiceAddon[];
}

interface ServiceVariant {
  id: string;
  name: string;
  duration: number; // minutes
  price: number;
  subVariants?: ServiceSubVariant[];
}

interface ServiceSubVariant {
  id: string;
  name: string;
  price: number;
}

interface ServiceAddon {
  id: string;
  name: string;
  price: number;
}
```

### Notification

```typescript
interface Notification {
  id: string;
  title: string;
  body: string;
  isRead: boolean;
  type: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}
```

### Assignment

```typescript
interface Assignment {
  id: string;
  bookingId: string;
  partnerId: string;
  status: 'PROPOSED' | 'ACCEPTED' | 'DECLINED';
  declineReason?: string; // max 500 chars
  booking: Booking;
  createdAt: string;
}
```

### Availability Slot

```typescript
interface AvailabilitySlot {
  id: string;
  partnerId: string;
  dayOfWeek: 'SUN' | 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT';
  startHour: number; // 0-23
  endHour: number; // 1-24, must be > startHour
}
```

### Location Data

```typescript
interface PartnerLocation {
  latitude: number;
  longitude: number;
  heading: number;
  speed: number;
  isOnline: boolean;
}

interface LocationStreamEvent {
  latitude: number;
  longitude: number;
  heading: number;
  etaMinutes: number;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Address Latitude/Longitude Coupling

*For any* address submission, if latitude is provided then longitude must also be provided, and if longitude is provided then latitude must also be provided. Both values are either present or absent together.

**Validates: Requirements 4.3, 4.7**

### Property 2: Booking Scheduled Validation

*For any* booking with bookingType SCHEDULED, either scheduledAt or timeSlotId must be provided (at least one is non-null).

**Validates: Requirements 7.2**

### Property 3: Auth Token Lifecycle Consistency

*For any* authenticated API request that receives a 401 response, the client attempts exactly one token refresh before triggering logout. No request is sent without a valid token or during an active refresh cycle.

**Validates: Requirements 2.4, 2.5, 17.5, 17.6, 29.4, 29.5**

### Property 4: Partner Status Transition Ordering

*For any* partner booking status transition, the toStatus follows the strict sequence PROFESSIONAL_ASSIGNED → PROFESSIONAL_EN_ROUTE → CHECKED_IN → IN_PROGRESS → COMPLETED. No status in the sequence may be skipped.

**Validates: Requirements 23.1, 23.4**

### Property 5: Payment State Machine

*For any* Razorpay booking, the state transitions follow: PENDING → PAYMENT_PENDING → CONFIRMED (on payment success) or PAYMENT_PENDING remains retryable (on payment failure). A booking cannot reach CONFIRMED without a successful payment confirmation call.

**Validates: Requirements 8.1, 8.3, 8.4, 8.5**

### Property 6: Socket Room Subscription Symmetry

*For any* booking tracking session, every booking:subscribe emission has a corresponding booking:unsubscribe emission when the consumer leaves the tracking screen. No orphaned subscriptions exist after screen unmount.

**Validates: Requirements 11.1, 11.6**

### Property 7: Background Location Toggle Consistency

*For any* online/offline transition, when isOnline becomes false the background location task is stopped, and when isOnline becomes true the background location task is started. The location task running state always matches the isOnline state.

**Validates: Requirements 20.3, 21.1, 21.3**

### Property 8: Form Validation Round-Trip

*For any* address or booking form data that passes Zod client-side validation, the resulting API request body is structurally valid and accepted by the server without 400 validation errors.

**Validates: Requirements 4.2, 4.7, 7.1, 7.4**

### Property 9: Notification Token Registration Idempotence

*For any* device token, calling POST /device-token with the same token multiple times produces the same result as calling it once. Token state is consistent regardless of registration frequency.

**Validates: Requirements 12.1, 24.1**

### Property 10: Pincode Format Validation

*For any* address pincode input, the value matches the regex `^\d{4,8}$` — containing only digits with length between 4 and 8 characters inclusive. Invalid formats are rejected before submission.

**Validates: Requirements 4.2**

## Error Handling

### Network Errors

- Show a toast notification with a retry option
- React Query provides automatic retries (3 attempts with exponential backoff)
- Offline state detected via NetInfo; queued mutations retry on reconnection

### Validation Errors

- Client-side: Zod schemas provide immediate inline field-level errors via React Hook Form
- Server-side: API `error.details` array is mapped to corresponding form fields for display

### Authentication Errors

- 401 responses trigger transparent token refresh via the API client interceptor
- If refresh succeeds, the original request is retried automatically
- If refresh fails (401 on refresh endpoint), all stored credentials are cleared and the user is navigated to the login screen

### Server Errors (5xx)

- Display a generic error screen with a retry button
- React Query's `retry` configuration handles transient failures automatically
- Critical flows (payments, booking creation) show explicit error messages with recovery guidance

### Business Logic Errors

- API `message` field is displayed directly to the user (e.g., "Coupon expired", "Service unavailable at this location")
- Error codes from `error.code` drive conditional UI behavior (e.g., showing an alternative action)

### Payment Errors

- Razorpay SDK failure callback triggers a payment failure screen with retry option
- Booking remains in PAYMENT_PENDING status and can be retried
- Network failures during payment confirmation show a "verifying payment" state with automatic retry

### Socket Connection Errors

- Socket.IO `reconnect` event triggers re-subscription to active booking rooms
- Connection loss for >30 seconds shows an inline "reconnecting" indicator
- Exponential backoff prevents excessive reconnection attempts

## Testing Strategy

### Unit Tests

- **Zod validation schemas**: Test address, booking, and auth form schemas with valid and invalid inputs
- **Zustand stores**: Test auth store state transitions (login, logout, hydrate, token refresh)
- **Utility functions**: Test formatters (phone numbers, currency, dates), validation helpers, and data transformers
- **React Query hooks**: Test with MSW (Mock Service Worker) for API mocking

### Integration Tests

- **API Client interceptors**: Verify token attachment, 401 refresh flow, envelope unwrapping
- **Navigation guards**: Verify auth guard redirects unauthenticated users, approval guard blocks pending partners
- **Payment flow**: End-to-end Razorpay mock flow from order creation through confirmation
- **Socket.IO events**: Verify subscription/unsubscription lifecycle and event handler updates

### Component Tests

- **Design System components**: Snapshot tests for visual consistency across Button, Card, TextInput, etc.
- **Screen compositions**: Test critical user flows (booking creation, address management) with React Native Testing Library

### Property-Based Tests

Property-based tests validate universal properties across generated inputs using `fast-check`:

- Minimum 100 iterations per property test
- Each test references its design document property
- Tag format: **Feature: clenzey-react-native-apps, Property {number}: {property_text}**

Properties tested:
1. Address latitude/longitude coupling (mutual presence/absence)
2. Booking scheduled validation (scheduledAt or timeSlotId required)
3. Auth token lifecycle (single refresh attempt before logout)
4. Partner status transition ordering (no skips in sequence)
5. Payment state machine (valid transitions only)
6. Socket subscription symmetry (subscribe/unsubscribe pairing)
7. Background location toggle consistency (task state matches online state)
8. Form validation round-trip (valid client data produces valid API payloads)
9. Notification token registration idempotence
10. Pincode format validation (regex compliance)

### End-to-End Tests

- **Detox** for critical consumer flows: login → browse services → create booking → payment → tracking
- **Detox** for critical partner flows: login → go online → receive assignment → accept → transition statuses
