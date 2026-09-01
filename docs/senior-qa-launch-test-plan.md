# Clenzey Senior QA Pre-Launch Test Plan (App Store & Play Store)

Target Launch: September  
Platform: iOS & Android (Consumer App, Partner App), Admin Console, Backend API

---

## 1. Real-Time Geofence & Dispatch Edge Cases
* **GPS Spoofing & Mock Providers**: Test Partner App against fake GPS apps (Android developer options mock locations) to prevent fake attendance and fraudulent payouts.
* **Zone Boundary Crossover**: Trigger bookings on exact coordinates of PostGIS polygon borders; verify dynamic surge pricing, zone taxes, and partner auto-dispatch worker behavior.
* **Aggressive OS Background Killing**: Test Partner background location tracking on Android OEM devices (Xiaomi MIUI/HyperOS, Oppo/Vivo ColorOS, Samsung OneUI) under aggressive battery optimization and Doze mode.
* **Location Permission Revocation**: Revoke GPS permissions mid-transit; verify app fallback UI, prompt recovery, and backend socket disconnect logging without crash.

---

## 2. Network Chaos & Socket.io State Reconciliation
* **Network Flapping (4G $\leftrightarrow$ 3G $\leftrightarrow$ WiFi $\leftrightarrow$ Offline)**: Transition network states during critical booking phases:
  * During Partner 30-second `DISPATCH_OFFER` countdown timer.
  * While transitioning status: `ACCEPTED` $\rightarrow$ `ARRIVED` $\rightarrow$ `IN_PROGRESS` $\rightarrow$ `COMPLETED`.
* **Zombie / Orphan Bookings**: Kill Partner App process when dispatch offer arrives. Verify BullMQ worker auto-reassigns to next nearest partner after timeout.
* **Socket Reconnect Storm**: Simulate 500 socket disconnects/reconnects; verify duplicate event suppression and state synchronization across Customer, Partner, and Admin dashboard.

---

## 3. Payment & Webhook Race Conditions (Razorpay)
* **UPI Intent Drop & App Switch**: Customer initiates Razorpay UPI payment, switches to GPay/PhonePe, pays, kills Clenzey app, then reopens. Verify backend webhook reconciles booking to `PAID` without client-side confirmation.
* **Double-Tap / Idempotency**: Rapidly tap "Pay Now" under 3G throttling to test backend idempotency keys and prevent duplicate charges.
* **Webhook Failure & Delayed Callback**: Block Razorpay webhook delivery for 5 minutes; verify polling fallback and booking state auto-recovery on user return.
* **Cancellation & Partial Refund Flow**: Cancel booking at `ARRIVED` state; test cancellation fee deduction, wallet refund calculation, and ledger balance consistency.

---

## 4. Native OS & Media Upload Resilience
* **High-Res Media Upload in Low Bandwidth**: Partner uploads 4 high-resolution job verification photos (S3 pre-signed URLs) with 1-bar EDGE network. Test background upload queue, chunking, retry backoff, and memory leak prevention.
* **Camera Crash on Memory Pressure**: Test photo capture on low-end 2GB/3GB RAM Android devices to ensure OS does not kill host app on camera intent launch.
* **Push Notification Routing (FCM / APNs)**:
  * Foreground, background, and killed states.
  * Tapping notification with expired token or cancelled booking deep-links safely without crashing to blank screen.

---

## 5. Store Review Compliance & Security Gatekeeping
* **Apple Guideline 5.1.1 (Account Deletion)**: Verify in-app account deletion permanently scrubs user tokens, anonymizes PII, and terminates active sessions immediately.
* **Android 14/15 Foreground Service Types**: Audit `FOREGROUND_SERVICE_TYPE_LOCATION` compliance and runtime disclosure dialogs to prevent Play Store auto-rejections.
* **JWT Expiry & Refresh Token Rotation**: Expire access token mid-booking; ensure silent refresh token exchange succeeds without kicking user out to login screen mid-order.
