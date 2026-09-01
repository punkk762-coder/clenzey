# Implementation Plan: Clenzey React Native Apps

## Overview

Implementation of two React Native (Expo) mobile applications — Consumer and Partner — in a pnpm monorepo. Shared packages (API client, Socket.IO client, design system, TypeScript types) provide code reuse across both apps. The Consumer app handles service browsing, booking, payments, and real-time tracking. The Partner app handles availability management, assignment acceptance, booking status transitions, and background location streaming.

## Tasks

- [x] 1. Monorepo setup and configuration
  - [x] 1.1 Initialize pnpm workspace with root package.json containing workspaces config for apps/* and packages/*, create shared tsconfig.base.json with strict TypeScript settings and path aliases
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [x] 1.2 Create apps/consumer directory with Expo SDK 52+ initialization, configure app.json with Android package name and minSdkVersion 24
    - _Requirements: 1.1, 30.1, 30.4_

  - [x] 1.3 Create apps/partner directory with Expo SDK 52+ initialization, configure app.json with distinct Android package name and minSdkVersion 24
    - _Requirements: 1.1, 30.1, 30.4_

  - [x] 1.4 Create packages/types package with TypeScript interfaces for all shared domain types (auth, booking, address, service, notification, payment, review, quotation, socket events)
    - _Requirements: 1.2_

  - [x] 1.5 Create packages/design-system package scaffold with theme tokens and packages/api-client scaffold with Axios instance structure and packages/socket-client scaffold with socket.io-client connection manager
    - _Requirements: 1.2_

  - [x] 1.6 Configure EAS Build (eas.json) for both apps with development, preview, and production profiles targeting Android APK and AAB outputs
    - _Requirements: 30.1, 30.2, 30.3_

  - [x] 1.7 Verify workspace dependency resolution — ensure both apps can import from all shared packages
    - _Requirements: 1.3, 1.4_

- [x] 2. Design system package implementation
  - [x] 2.1 Implement theme provider with Horizon Blue color palette (#0043BA primary, #7C7AAD secondary, #F0EDFF tertiary, #6DBAA1 neutral, #e6fff4 surface) and configure Inter font loading via expo-font with headline, body, and label variants
    - _Requirements: 28.1, 28.2, 28.3_

  - [x] 2.2 Implement Button component (primary, secondary, outline, ghost variants with loading/disabled states), TextInput component (label, error, helper text, icons), and Card component (16px border radius, shadow, press handler)
    - _Requirements: 28.4, 28.5_

  - [x] 2.3 Implement Modal, BottomSheet (16px border radius), Toast notification, Badge, Chip, Avatar, Divider, and LoadingSpinner components; export all from package index
    - _Requirements: 28.4, 28.5_

- [x] 3. Shared API client package
  - [x] 3.1 Implement base Axios instance with configurable baseURL, request interceptor for Bearer token attachment, response interceptor for success envelope unwrapping, and error interceptor for structured ApiError extraction
    - _Requirements: 29.1, 29.2, 29.3_

  - [x] 3.2 Implement 401 interceptor with token refresh logic — queue pending requests, call /auth/refresh, retry or trigger onAuthFailure callback
    - _Requirements: 29.4, 29.5_

  - [x] 3.3 Implement consumer and partner auth endpoint modules (initiate, validate, refresh, logout)
    - _Requirements: 2.1, 2.2, 2.4, 2.6, 17.1, 17.2, 17.5, 17.7_

  - [x] 3.4 Implement addresses endpoint module (list, create, get, getDefault, update, delete, setDefault)
    - _Requirements: 4.1, 4.2, 4.4, 4.5, 4.6_

  - [x] 3.5 Implement services endpoint module (list, getById, estimate) and bookings endpoint module (create, preview, list, getById, cancel, transition, reschedule)
    - _Requirements: 6.1, 6.2, 6.3, 7.1, 7.3, 10.1, 10.2, 10.3, 10.4_

  - [x] 3.6 Implement payments (createOrder, confirm), coupons (validate), and location (reverseGeocode, placesSearch, placesDetails, serviceability) endpoint modules
    - _Requirements: 8.1, 8.3, 9.1, 5.1, 5.3, 5.4, 5.5_

  - [x] 3.7 Implement notifications (registerToken, removeToken, list, markRead, markAllRead), reviews (create, listByPartner), quotations (create, list, accept, delete), partner-specific (availability CRUD, location update, online status, assignments), contact, and ETA endpoint modules
    - _Requirements: 12.1, 12.3, 12.4, 12.5, 12.6, 13.2, 15.1, 15.2, 15.3, 15.4, 19.1, 19.2, 19.3, 20.2, 22.2, 22.3, 22.4, 23.2, 23.3, 24.1, 24.3, 25.1, 25.2, 14.2, 31.1_

- [x] 4. Shared Socket.IO client package
  - [x] 4.1 Implement SocketManager class with connect(token), disconnect(), reconnection with exponential backoff, and automatic room joining (consumer:{userId}/consumers for consumer, partner:{userId} for partner)
    - _Requirements: 27.1, 27.2, 27.3, 27.7_

  - [x] 4.2 Define typed event interfaces for all server-emitted events and implement client-emitted event helpers (booking:subscribe, booking:unsubscribe)
    - _Requirements: 11.1, 11.6, 27.4, 27.5, 27.6_

  - [x] 4.3 Implement React hooks: useSocket, useBookingStatus, usePartnerLocation, useEtaUpdates, useServiceUpdates, useAddressUpdates
    - _Requirements: 11.2, 11.3, 11.4, 11.5, 27.4, 27.6_

  - [ ]* 4.4 Write property test for Socket room subscription symmetry
    - **Property 6: Socket Room Subscription Symmetry**
    - **Validates: Requirements 11.1, 11.6**

- [x] 5. Checkpoint - Verify shared packages
  - Ensure all shared packages compile, exports are correct, and both apps can import them. Ask the user if questions arise.

- [x] 6. Consumer app — Authentication
  - [x] 6.1 Create Zustand auth store with accessToken, user, isAuthenticated, isLoading, hydrate, setToken, setUser, logout actions and implement secure token storage using expo-secure-store
    - _Requirements: 2.2, 2.4, 2.5, 2.6_

  - [x] 6.2 Create (auth)/login.tsx screen with phone number input (+91 prefix, E.164 validation) and (auth)/otp.tsx screen with 6-digit OTP input, resend timer, and validate API call
    - _Requirements: 2.1, 2.2_

  - [x] 6.3 Implement auth guard in root _layout.tsx (redirect to login if unauthenticated, redirect to tabs if authenticated), isNewUser profile completion flow, and token refresh trigger on 401
    - _Requirements: 2.3, 2.4, 2.5_

  - [ ]* 6.4 Write property test for auth token lifecycle consistency
    - **Property 3: Auth Token Lifecycle Consistency**
    - **Validates: Requirements 2.4, 2.5**

- [x] 7. Consumer app — Profile
  - [x] 7.1 Create profile/index.tsx screen displaying consumer name, phone, edit option, and logout button; implement profile edit form with fullName field (React Hook Form + Zod) and PATCH /consumers/me API call
    - _Requirements: 3.1, 3.2_

- [x] 8. Consumer app — Address management
  - [x] 8.1 Create addresses.tsx screen with address list (FlatList showing label, type badge, line1, default indicator) and address/create.tsx screen with full form fields and Zod validation schema (pincode regex, lat/lng coupling, field lengths)
    - _Requirements: 4.1, 4.2, 4.3, 4.7, 4.8_

  - [x] 8.2 Integrate map picker (react-native-maps) for coordinate selection, implement GPS → reverse-geocode → auto-fill flow using expo-location, and implement place search autocomplete with debounced query
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x] 8.3 Implement serviceability check display, address/[id]/edit.tsx with pre-populated form, address delete with confirmation, and set-as-default action with optimistic UI update
    - _Requirements: 4.4, 4.5, 4.6, 5.5, 5.6_

  - [ ]* 8.4 Write property test for address latitude/longitude coupling
    - **Property 1: Address Latitude/Longitude Coupling**
    - **Validates: Requirements 4.3, 4.7**

  - [ ]* 8.5 Write property test for pincode format validation
    - **Property 10: Pincode Format Validation**
    - **Validates: Requirements 4.2**

- [x] 9. Consumer app — Services and estimation
  - [x] 9.1 Create home (tabs)/index.tsx with promotional banner carousel, service category grid (Quick Shine, Deep Cleaning, Deep Luxe, Corporate), and trust badges
    - _Requirements: 6.1_

  - [x] 9.2 Create services/[id].tsx with service detail (description, duration, variant selector, instant/schedule toggle, add-on checkboxes), Deep Cleaning BHK variant, and Corporate variant with venue type/capacity/subscription plan
    - _Requirements: 6.2, 6.4, 6.5_

  - [x] 9.3 Implement price estimate calculation (POST /services/:serviceId/estimate on selection change) and React Query hooks (useServices, useServiceById, useEstimate)
    - _Requirements: 6.3_

- [x] 10. Consumer app — Booking creation and preview
  - [x] 10.1 Create booking/create.tsx screen with service summary, address selector, bookingType toggle (INSTANT/SCHEDULED), date-time picker, payment mode selector, coupon input, and notes field with Zod validation
    - _Requirements: 7.1, 7.2, 7.4_

  - [x] 10.2 Create booking/preview.tsx showing order summary with price breakdown (POST /bookings/preview), and implement POST /bookings creation with RAZORPAY vs CASH flow branching
    - _Requirements: 7.3, 7.5, 8.6_

  - [ ]* 10.3 Write property test for booking scheduled validation
    - **Property 2: Booking Scheduled Validation**
    - **Validates: Requirements 7.2**

- [x] 11. Consumer app — Payments
  - [x] 11.1 Install and configure react-native-razorpay, create booking/payment.tsx screen with booking summary and Pay Now button
    - _Requirements: 8.1, 8.2_

  - [x] 11.2 Implement payment flow: POST /payments/orders → open RazorpayCheckout → handle onSuccess (POST /payments/confirm, navigate to success screen) and onError (failure message with retry)
    - _Requirements: 8.3, 8.4, 8.5_

  - [ ]* 11.3 Write property test for payment state machine
    - **Property 5: Payment State Machine**
    - **Validates: Requirements 8.1, 8.3, 8.4, 8.5**

- [x] 12. Consumer app — Coupon validation
  - [x] 12.1 Implement coupon input field with Apply button in booking create/preview screens, POST /coupons/validate API call, and display validated discount or error message inline
    - _Requirements: 9.1, 9.2, 9.3_

- [x] 13. Consumer app — Booking management
  - [x] 13.1 Create (tabs)/bookings/index.tsx with tabbed booking list (Active, Completed, Cancelled) using React Query infinite query with pagination
    - _Requirements: 10.1_

  - [x] 13.2 Create (tabs)/bookings/[id].tsx with full booking detail (status badge, service info, partner info, address, timeline, action buttons), cancel flow with reason input, and reschedule flow with date-time picker
    - _Requirements: 10.2, 10.3, 10.4_

- [x] 14. Consumer app — Real-time tracking
  - [x] 14.1 Add map view to booking detail screen (react-native-maps) showing partner marker when PROFESSIONAL_EN_ROUTE or later, implement Socket.IO booking:subscribe/unsubscribe on mount/unmount
    - _Requirements: 11.1, 11.2, 11.6_

  - [x] 14.2 Implement partner:location_stream listener for marker updates, eta:updated listener for ETA display, partner:location_stale listener for unavailability indicator, booking:status_changed listener for real-time status updates, and GET /bookings/:id/eta as fallback
    - _Requirements: 11.2, 11.3, 11.4, 11.5, 31.1, 31.2_

- [x] 15. Consumer app — Notifications
  - [x] 15.1 Configure expo-notifications for Android FCM, implement device token registration (POST /consumers/device-token) on permission grant and removal (DELETE) on logout
    - _Requirements: 12.1, 12.3_

  - [x] 15.2 Implement foreground notification handler (in-app toast), notification press handler with deep linking, create profile/notifications.tsx inbox screen with list, read/unread filtering, and mark-as-read actions
    - _Requirements: 12.2, 12.4, 12.5, 12.6_

  - [ ]* 15.3 Write property test for notification token registration idempotence
    - **Property 9: Notification Token Registration Idempotence**
    - **Validates: Requirements 12.1**

- [x] 16. Consumer app — Reviews, contact, quotations, and referral
  - [x] 16.1 Add review prompt to completed booking detail (star rating + optional text), implement POST /reviews API call, and partner reviews list view (GET /reviews/partner/:partnerId)
    - _Requirements: 13.1, 13.2, 13.3_

  - [x] 16.2 Add "Call Partner" button to booking detail (visible during PROFESSIONAL_ASSIGNED through IN_PROGRESS), implement GET /bookings/:id/contact/partner and phone dialer launch
    - _Requirements: 14.1, 14.2_

  - [x] 16.3 Create quotations/create.tsx with form (name, phone, address, notes, preferredTime, serviceId, variantId), quotations/index.tsx with listing, and accept/cancel actions
    - _Requirements: 15.1, 15.2, 15.3, 15.4_

  - [x] 16.4 Create referral.tsx screen with referral code display, share button using React Native Share API, and referral code input field
    - _Requirements: 16.1, 16.2, 16.3_

- [x] 17. Consumer app — Navigation and layout
  - [x] 17.1 Implement bottom tab navigator in (tabs)/_layout.tsx with Home, Bookings, Profile tabs using design system icons and active tab highlighting (#0043BA), root _layout.tsx with auth guard, Socket.IO connection on auth, React Query provider, and splash/loading screen during auth hydration
    - _Requirements: 32.1, 32.2, 32.3_

- [x] 18. Checkpoint - Verify consumer app
  - Ensure all consumer app screens render, navigation works, and tests pass. Ask the user if questions arise.

- [x] 19. Partner app — Authentication
  - [x] 19.1 Create Zustand auth store for partner (accessToken, user with approvalStatus, isAuthenticated, hydrate, logout) and implement secure token storage
    - _Requirements: 17.2, 17.5, 17.6, 17.7_

  - [x] 19.2 Create (auth)/login.tsx with phone input, (auth)/otp.tsx with OTP input (including optional fullName for new partners), and implement approval status routing (PENDING → pending-approval, APPROVED → main tabs, REJECTED → rejection screen)
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 18.1, 18.2, 18.3_

  - [x] 19.3 Create (auth)/pending-approval.tsx screen with status message and check-again action, implement token refresh and logout flows
    - _Requirements: 18.1, 18.2, 17.5, 17.6, 17.7_

- [x] 20. Partner app — Dashboard and online toggle
  - [x] 20.1 Create (tabs)/index.tsx dashboard with prominent online/offline toggle, POST /partners/online API call on toggle change with optimistic UI, active assignment count, and today's booking summary
    - _Requirements: 20.1, 20.2, 20.3_

- [x] 21. Partner app — Availability management
  - [x] 21.1 Create profile/availability.tsx with weekly schedule grid (SUN-SAT), add availability slot form (day-of-week picker, startHour 0-23, endHour 1-24 > startHour), POST/DELETE availability API calls with validation
    - _Requirements: 19.1, 19.2, 19.3_

- [x] 22. Partner app — Background location
  - [x] 22.1 Implement expo-location permission request flow (foreground + background), define TaskManager background location task calling POST /partners/location, start task when online (timeInterval 5000-10000ms, accuracy High), stop when offline/logout
    - _Requirements: 21.1, 21.2, 21.3_

  - [x] 22.2 Implement error handling for GPS unavailability (retry + last known location fallback) and configure Android foreground service notification for background location
    - _Requirements: 21.4_

  - [ ]* 22.3 Write property test for background location toggle consistency
    - **Property 7: Background Location Toggle Consistency**
    - **Validates: Requirements 20.3, 21.1, 21.3**

- [x] 23. Partner app — Booking assignments
  - [x] 23.1 Create assignments screen showing pending assignments (GET /bookings/assignments/me) and assignments/[id].tsx detail with booking info, address, service details, accept/decline buttons
    - _Requirements: 22.2, 22.3, 22.4_

  - [x] 23.2 Implement accept assignment (POST /assignments/:id/accept), decline with optional reason (max 500 chars), and Socket.IO listener for booking:partner_proposed real-time notification
    - _Requirements: 22.1, 22.3, 22.4_

- [x] 24. Partner app — Booking management and transitions
  - [x] 24.1 Create (tabs)/bookings/index.tsx with active and completed lists, (tabs)/bookings/[id].tsx detail with status transition UI showing only valid next status (ASSIGNED→EN_ROUTE→CHECKED_IN→IN_PROGRESS→COMPLETED)
    - _Requirements: 23.1, 23.4_

  - [x] 24.2 Implement POST /bookings/:bookingId/transition API call, cancel booking with reason, and validation to prevent skipping statuses
    - _Requirements: 23.2, 23.3, 23.4_

  - [ ]* 24.3 Write property test for partner status transition ordering
    - **Property 4: Partner Status Transition Ordering**
    - **Validates: Requirements 23.1, 23.4**

- [x] 25. Partner app — Notifications
  - [x] 25.1 Configure expo-notifications for Android FCM, implement device token registration (POST /partners/device-token) on permission grant and removal (DELETE) on logout
    - _Requirements: 24.1, 24.3_

  - [x] 25.2 Implement foreground notification handler, notification press deep linking, create profile/notifications.tsx inbox with list, filtering, unreadCount badge, and mark-read actions
    - _Requirements: 24.2, 24.4, 24.5, 24.6_

- [x] 26. Partner app — Contact consumer and reviews
  - [x] 26.1 Add "Call Consumer" button to booking detail (visible during EN_ROUTE, CHECKED_IN, IN_PROGRESS), implement GET /bookings/:id/contact/consumer and phone dialer, create partner reviews screen with rating summary
    - _Requirements: 25.1, 25.2, 26.1_

- [x] 27. Partner app — Navigation and layout
  - [x] 27.1 Implement root _layout.tsx with auth guard + approval status guard, bottom tab navigator (Dashboard, Bookings, Profile), Socket.IO connection on auth/disconnection on logout, and splash/loading screen
    - _Requirements: 18.2, 20.1_

- [x] 28. Checkpoint - Verify partner app
  - Ensure all partner app screens render, navigation works, and tests pass. Ask the user if questions arise.

- [x] 29. Integration and polish
  - [x] 29.1 Implement React Query cache invalidation on Socket.IO real-time events (booking status changes, service updates, address updates) and pull-to-refresh on all list screens
    - _Requirements: 27.4, 27.5, 27.6_

  - [x] 29.2 Implement empty state components for lists, error boundary with generic error screen and retry, and network connectivity detection with offline indicator banner
    - _Requirements: 29.3, 29.4_

  - [x] 29.3 Test EAS Build production profile for both apps — generate APK and AAB artifacts, verify all shared packages are correctly bundled
    - _Requirements: 30.1, 30.2, 30.3, 30.4_

  - [ ]* 29.4 Write property test for form validation round-trip
    - **Property 8: Form Validation Round-Trip**
    - **Validates: Requirements 4.2, 4.7, 7.1, 7.4**

- [x] 30. Final checkpoint
  - Ensure all tests pass, both apps build successfully, and shared packages are properly integrated. Ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional property-based test tasks and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key integration points
- Property tests use `fast-check` library and validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The implementation uses TypeScript throughout with React Native (Expo SDK 52+), Zustand for client state, React Query for server state, and Axios for HTTP
- Background location (Partner app) requires Android foreground service notification for API 26+

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "1.4", "1.5"] },
    { "id": 2, "tasks": ["1.6", "1.7", "2.1"] },
    { "id": 3, "tasks": ["2.2", "2.3", "3.1"] },
    { "id": 4, "tasks": ["3.2", "3.3", "3.4"] },
    { "id": 5, "tasks": ["3.5", "3.6", "3.7", "4.1"] },
    { "id": 6, "tasks": ["4.2", "4.3", "4.4"] },
    { "id": 7, "tasks": ["6.1", "19.1"] },
    { "id": 8, "tasks": ["6.2", "6.3", "19.2", "19.3"] },
    { "id": 9, "tasks": ["6.4", "7.1", "8.1", "20.1"] },
    { "id": 10, "tasks": ["8.2", "8.3", "9.1", "21.1"] },
    { "id": 11, "tasks": ["8.4", "8.5", "9.2", "9.3", "22.1"] },
    { "id": 12, "tasks": ["10.1", "10.2", "22.2", "22.3"] },
    { "id": 13, "tasks": ["10.3", "11.1", "11.2", "23.1"] },
    { "id": 14, "tasks": ["11.3", "12.1", "13.1", "23.2"] },
    { "id": 15, "tasks": ["13.2", "14.1", "14.2", "24.1"] },
    { "id": 16, "tasks": ["15.1", "15.2", "24.2", "24.3"] },
    { "id": 17, "tasks": ["15.3", "16.1", "16.2", "25.1", "25.2"] },
    { "id": 18, "tasks": ["16.3", "16.4", "17.1", "26.1"] },
    { "id": 19, "tasks": ["27.1"] },
    { "id": 20, "tasks": ["29.1", "29.2"] },
    { "id": 21, "tasks": ["29.3", "29.4"] }
  ]
}
```
