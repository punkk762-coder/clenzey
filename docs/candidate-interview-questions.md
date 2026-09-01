# Candidate QA Interview: 5 Real-World Analysis Questions

Purpose: Evaluate mobile testing depth, edge-case intuition, and production launch readiness.

---

### Question 1: Payment Drop & Network Interruption
> **"A customer pays ₹999 for a deep cleaning via UPI. Money gets deducted from their bank account, but right as UPI finishes, their internet cuts out before returning to our app. Our app shows 'Payment Failed' or gets stuck loading. How do you test and troubleshoot this scenario end-to-end?"**

* **🟢 Green Flag (Senior Mobile QA)**:
  * Talks about **backend webhooks** vs client-side redirect.
  * Checks Razorpay dashboard/logs for payment status reconciliation.
  * Tests app reopening state (does app query `/bookings/:id/status` on cold start?).
  * Mentions network throttling (Charles Proxy / Proxyman) and idempotency keys to prevent double charging.
* **🔴 Red Flag (Junior / Web Tester)**:
  * Only says "I will click Pay button again and check screenshot."
  * Blames internet connection without knowing how backend webhook syncs state.

---

### Question 2: Background GPS & Battery Optimization
> **"A cleaner accepts a job, puts the phone in their pocket, and rides to the customer's house. 20 minutes later, the customer opens the app and still sees the cleaner 5 km away at the starting point. What could be the root causes, and how would you test this on real devices?"**

* **🟢 Green Flag (Senior Mobile QA)**:
  * Identifies Android OEM background battery optimization (Doze mode, Xiaomi/Samsung killing background location tasks).
  * Checks location permission level (`ACCESS_BACKGROUND_LOCATION` vs `ACCESS_FINE_LOCATION` "While Using App").
  * Checks WebSocket reconnection and foreground service notification status.
  * Mentions testing with simulated movement / GPS spoofing tools across iOS and Android.
* **🔴 Red Flag (Junior / Web Tester)**:
  * "Refresh the web browser / re-login."
  * Unaware of native mobile OS background task execution limits.

---

### Question 3: Race Condition / Double Dispatch
> **"Suppose 2 cleaners are near the same customer and receive the dispatch offer at the exact same second. Both tap 'Accept' simultaneously. How do you test to ensure only one cleaner gets the job, and what should the second cleaner experience?"**

* **🟢 Green Flag (Senior Mobile QA)**:
  * Tests concurrency using API load tools (JMeter/K6) or multiple physical test devices.
  * Verifies database locking/idempotency on backend (no double booking created).
  * Validates UI handling for the losing cleaner (clear message: "Job already accepted by another partner" without freezing or crash).
* **🔴 Red Flag (Junior / Web Tester)**:
  * Doesn't know how to simulate simultaneous API calls or race conditions.
  * Only tests manual single-user happy path.

---

### Question 4: Low-Connectivity Photo Uploads
> **"A technician finishes a cleaning job in a basement with 1-bar 3G signal. They need to upload 4 high-resolution 'after-service' photos before marking the job completed. The upload takes too long and fails. How do you test app resilience here?"**

* **🟢 Green Flag (Senior Mobile QA)**:
  * Tests background upload queues, retry policies (exponential backoff), and local image compression before upload.
  * Verifies app behavior if user minimizes app or receives a phone call mid-upload.
  * Checks S3 pre-signed URL expiration time limits.
  * Checks memory allocation to ensure camera photo capture doesn't cause out-of-memory (OOM) crash on low-end phones.
* **🔴 Red Flag (Junior / Web Tester)**:
  * "Tell cleaner to find better WiFi."
  * Only tests uploading small images on high-speed desktop internet.

---

### Question 5: App Store & Play Store Rejection Prevention
> **"We are submitting our consumer app to Apple App Store and Google Play Store for a September launch. What are 2 common reasons store reviewers reject on-demand service apps, and what checklist do you run before submission?"**

* **🟢 Green Flag (Senior Mobile QA)**:
  * **Apple**: Guideline 5.1.1 (Account deletion must be functional inside app), login demo credentials provided for reviewers, proper permission request description strings (Info.plist `NSLocationWhenInUseUsageDescription`).
  * **Google Play**: Target API level compliance, foreground service declaration justification for location/tracking, data safety form matching actual data collection.
  * Mentions testing release build (not debug build) on TestFlight & Play Console Internal Track.
* **🔴 Red Flag (Junior / Web Tester)**:
  * Has no idea about App Store Review Guidelines or Play Console policies.
  * Never submitted or verified an IPA/AAB build.
