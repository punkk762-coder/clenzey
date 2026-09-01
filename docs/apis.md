# API Endpoint Catalog

Complete catalog of all HTTP API endpoints exposed by the Clenzey platform backend (`/api/v1`).

---

## Table of Contents
- [1. Health & System](#1-health--system)
- [2. Consumer Authentication & Profile](#2-consumer-authentication--profile)
- [3. Partner Authentication, Profile & Availability](#3-partner-authentication-profile--availability)
- [4. Services & Catalogue](#4-services--catalogue)
- [5. Quotations & Site Visits](#5-quotations--site-visits)
- [6. Bookings & Lifecycle Management](#6-bookings--lifecycle-management)
- [7. Coupons & Promotions](#7-coupons--promotions)
- [8. Referrals & Rewards](#8-referrals--rewards)
- [9. Disputes & Resolutions](#9-disputes--resolutions)
- [10. Slots & Capacity](#10-slots--capacity)
- [11. Payments & Webhooks](#11-payments--webhooks)
- [12. Addresses](#12-addresses)
- [13. Location, Geocoding & Places](#13-location-geocoding--places)
- [14. Zones & Zone Pricing Overrides](#14-zones--zone-pricing-overrides)
- [15. Partner Zones Management](#15-partner-zones-management)
- [16. Partner Skills](#16-partner-skills)
- [17. Partner KYC & Bank Details](#17-partner-kyc--bank-details)
- [18. Earnings & Payouts](#18-earnings--payouts)
- [19. Payroll & Incentives](#19-payroll--incentives)
- [20. Platform Pricing Settings](#20-platform-pricing-settings)
- [21. Refunds](#21-refunds)
- [22. Dispatch & Queue Operations](#22-dispatch--queue-operations)
- [23. Reviews & Ratings](#23-reviews--ratings)
- [24. Device Tokens (Push Notifications)](#24-device-tokens-push-notifications)
- [25. Notifications](#25-notifications)
- [26. File Uploads](#26-file-uploads)
- [27. Admin Core & Analytics](#27-admin-core--analytics)
- [Specific Analysis & Findings](#specific-analysis--findings)
  - [1. Endpoints with No Visible Authentication Check](#1-endpoints-with-no-visible-authentication-check)
  - [2. Endpoints Unused in Frontend or Tests](#2-endpoints-unused-in-frontend-or-tests)
  - [3. Inconsistent Patterns Across Endpoints](#3-inconsistent-patterns-across-endpoints)

---

## 1. Health & System

| Method | Full Route | Handler | Auth / Role | Parameters / Body Shape | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/health/live` | [healthLive](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/health/controllers.ts#L9) | None | None | Returns basic liveness status and current ISO timestamp. |
| `GET` | `/api/v1/health/ready` | [healthReady](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/health/controllers.ts#L18) | None | None | Checks database and Redis connectivity and returns health readiness. |
| `GET` | `/api/v1/health` | [healthLive](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/health/controllers.ts#L9) | None | None | Alias endpoint for system liveness probe. |

---

## 2. Consumer Authentication & Profile

| Method | Full Route | Handler | Auth / Role | Parameters / Body Shape | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/consumers/auth/firebase` | [consumerAuthFirebase](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/consumers/controllers.ts) | None | **Body**: `{ firebaseIdToken: string }` | Verifies Firebase phone OTP token and issues consumer JWT session tokens. |
| `POST` | `/api/v1/consumers/auth/refresh` | [consumerAuthRefresh](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/consumers/controllers.ts) | Refresh Cookie / Body | **Body**: `{ refreshToken?: string }` | Issues new JWT access token using HttpOnly cookie or mobile refresh token. |
| `POST` | `/api/v1/consumers/auth/logout` | [consumerAuthLogout](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/consumers/controllers.ts) | None | None | Logs out consumer by invalidating session and clearing refresh cookie. |
| `POST` | `/api/v1/consumers/auth/signup` | [consumerPasswordSignUp](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/consumers/authPasswordControllers.ts) | None | **Body**: `{ email?: string, phone: string, password: string, fullName: string, referralCode?: string }` | Creates new consumer account using email/phone credentials. |
| `POST` | `/api/v1/consumers/auth/signin` | [consumerPasswordSignIn](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/consumers/authPasswordControllers.ts) | None | **Body**: `{ identifier: string, password: string }` | Authenticates consumer via email or phone with password. |
| `GET` | `/api/v1/consumers/me` | [getConsumer](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/consumers/controllers.ts) | `CONSUMER` | None | Retrieves profile information for currently authenticated consumer. |
| `PATCH` | `/api/v1/consumers/me` | [updateConsumer](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/consumers/controllers.ts) | `CONSUMER` | **Body**: `{ fullName?: string, profileImage?: string }` | Updates profile name and avatar for authenticated consumer. |
| `DELETE` | `/api/v1/consumers/me` | [deleteConsumer](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/consumers/controllers.ts) | `CONSUMER` | None | Soft deletes authenticated consumer account if no active bookings exist. |

---

## 3. Partner Authentication, Profile & Availability

| Method | Full Route | Handler | Auth / Role | Parameters / Body Shape | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/partners/auth/firebase` | [partnerAuthFirebase](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/partners/controllers.ts) | None | **Body**: `{ idToken: string, fullName?: string }` | Authenticates partner via Firebase phone OTP token and creates pending profile on first sign-in. |
| `POST` | `/api/v1/partners/auth/refresh` | [partnerAuthRefresh](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/partners/controllers.ts) | Refresh Cookie / Body | **Body**: `{ refreshToken?: string }` | Issues new partner access token from refresh token. |
| `POST` | `/api/v1/partners/auth/logout` | [partnerAuthLogout](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/partners/controllers.ts) | None | None | Logs out partner and clears refresh cookie. |
| `POST` | `/api/v1/partners/auth/signup` | [partnerPasswordSignUp](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/partners/authPasswordControllers.ts) | None | **Body**: `{ email?: string, phone: string, password: string, fullName: string }` | Registers partner with password credentials in pending approval state. |
| `POST` | `/api/v1/partners/auth/signin` | [partnerPasswordSignIn](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/partners/authPasswordControllers.ts) | None | **Body**: `{ identifier: string, password: string }` | Authenticates partner via email/phone and password. |
| `GET` | `/api/v1/partners/me` | [getPartnerProfile](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/partners/controllers.ts) | `PARTNER` | None | Retrieves profile information for authenticated partner. |
| `PATCH` | `/api/v1/partners/me` | [updatePartnerProfile](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/partners/controllers.ts) | `PARTNER` | **Body**: `{ fullName?: string, bio?: string, dob?: string, gender?: "male"\|"female"\|"other", languages?: string[], experienceYears?: number, profileImage?: string }` | Updates profile details and background info for authenticated partner. |
| `GET` | `/api/v1/partners/availability` | [listAvailability](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/partners/controllers.ts) | `PARTNER` | None | Returns weekly recurring working hour windows for partner. |
| `POST` | `/api/v1/partners/availability` | [createAvailability](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/partners/controllers.ts) | `PARTNER` + `APPROVED` | **Body**: `{ dayOfWeek: "SUN"\|"MON"\|"TUE"\|"WED"\|"THU"\|"FRI"\|"SAT", startHour: number, endHour: number }` | Adds recurring weekly availability time window for partner. |
| `DELETE` | `/api/v1/partners/availability/:availabilityId` | [deleteAvailability](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/partners/controllers.ts) | `PARTNER` + `APPROVED` | **Params**: `{ availabilityId: string }` | Removes recurring availability window for partner. |
| `POST` | `/api/v1/partners/location` | [pingLocation](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/partners/controllers.ts) | `PARTNER` + `APPROVED` | **Body**: `{ latitude: number, longitude: number, heading?: number, speed?: number, isOnline?: boolean }` | Updates partner GPS coordinates and marks partner online for dispatch. |
| `POST` | `/api/v1/partners/online` | [setOnline](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/partners/controllers.ts) | `PARTNER` + `APPROVED` | **Body**: `{ isOnline: boolean }` | Toggles partner online operational status without GPS update. |

---

## 4. Services & Catalogue

| Method | Full Route | Handler | Auth / Role | Parameters / Body Shape | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/services` | [listServices](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/services/controllers.ts) | None | None | Lists all active services with inline variants, add-ons, and inclusions. |
| `GET` | `/api/v1/services/:serviceId` | [getServiceDetail](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/services/controllers.ts) | None | **Params**: `{ serviceId: string }` | Retrieves detailed configuration for a specific service. |
| `POST` | `/api/v1/services/:serviceId/estimate` | [getEstimate](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/services/controllers.ts) | None | **Params**: `{ serviceId: string }`<br>**Body**: `{ variantId: string, addonIds?: string[] }` | Computes price estimate for selected service variant and add-ons. |
| `POST` | `/api/v1/services/:serviceId/large-office-estimate` | [getLargeOfficeEstimate](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/services/controllers.ts) | None | **Params**: `{ serviceId: string }`<br>**Body**: `{ variantId: string, scope: object }` | Computes corporate instant price estimate based on scope questionnaire. |
| `POST` | `/api/v1/services` | [createService](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/services/controllers.ts) | `ADMIN` | **Body**: `{ name: string, category: string, variants: array, addons?: array, inclusions?: array, ... }` | Creates new service with variants and add-on options in catalogue. |
| `PATCH` | `/api/v1/services/:serviceId` | [updateService](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/services/controllers.ts) | `ADMIN` | **Params**: `{ serviceId: string }`<br>**Body**: Service fields and JSON arrays to replace | Updates existing service catalogue entry and JSON arrays. |
| `DELETE` | `/api/v1/services/:serviceId` | [deleteService](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/services/controllers.ts) | `ADMIN` + `SUPER_ADMIN` | **Params**: `{ serviceId: string }` | Soft-deletes a service from active catalogue. |

---

## 5. Quotations & Site Visits

| Method | Full Route | Handler | Auth / Role | Parameters / Body Shape | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/quotations` | [createQuotationRequest](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/services/controllers.ts) | `CONSUMER` | **Body**: `{ serviceId: string, addressId: string, preferredDate?: string, preferredTimeSlot?: string, notes?: string, scopeDetails?: object }` | Submits quotation or inspection site visit request. |
| `GET` | `/api/v1/quotations` | [listConsumerQuotations](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/services/controllers.ts) | `CONSUMER` | None | Lists quotation requests submitted by authenticated consumer. |
| `POST` | `/api/v1/quotations/:id/accept` | [acceptConsumerQuotation](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/services/controllers.ts) | `CONSUMER` | **Params**: `{ id: string }` | Accepts estimated quotation to proceed to booking checkout. |
| `DELETE` | `/api/v1/quotations/:id` | [deleteConsumerQuotation](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/services/controllers.ts) | `CONSUMER` | **Params**: `{ id: string }` | Cancels or deletes consumer quotation request. |
| `GET` | `/api/v1/admin/quotations` | [listAdminQuotations](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/services/controllers.ts) | `ADMIN` | None | Lists all quotation requests across platform for admin management. |
| `PATCH` | `/api/v1/admin/quotations/:id` | [updateAdminQuotationStatus](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/services/controllers.ts) | `ADMIN` | **Params**: `{ id: string }`<br>**Body**: `{ status: string, estimatedPrice?: number, adminNotes?: string }` | Updates quotation status and provides price estimate. |

---

## 6. Bookings & Lifecycle Management

| Method | Full Route | Handler | Auth / Role | Parameters / Body Shape | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/bookings` | [createBooking](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/bookings/controllers.ts) | `CONSUMER` | **Body**: `{ bookingType: "INSTANT"\|"SCHEDULED", serviceId: string, variantId: string, addressId: string, addonIds?: string[], scheduledAt?: string, subscriptionPlan?: "ONCE"\|"WEEKLY"\|"BIWEEKLY"\|"MONTHLY", couponCode?: string, paymentMode: "RAZORPAY"\|"CASH", consumerNotes?: string }` | Snapshots pricing, address, and creates booking in `PENDING` state. |
| `POST` | `/api/v1/bookings/preview` | [previewBooking](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/bookings/controllers.ts) | `CONSUMER` | **Body**: `{ serviceId: string, variantId: string, addressId: string, addonIds?: string[], subscriptionPlan?: string, couponCode?: string }` | Executes complete pricing pipeline and returns fee breakdown without saving. |
| `POST` | `/api/v1/bookings/availability/check` | [checkAvailability](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/bookings/controllers.ts) | `CONSUMER` | **Body**: `{ serviceId: string, variantId: string, scheduledAt: string, addressId: string }` | Validates partner availability for scheduled slot or returns alternative windows. |
| `GET` | `/api/v1/bookings` | [listBookings](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/bookings/controllers.ts) | `CONSUMER` \| `PARTNER` \| `ADMIN` | **Query**: `{ status?: string, limit?: number, offset?: number }` | Lists bookings scoped to caller (consumer own, partner assigned, admin all). |
| `GET` | `/api/v1/bookings/:bookingId` | [getBooking](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/bookings/controllers.ts) | `CONSUMER` \| `PARTNER` \| `ADMIN` | **Params**: `{ bookingId: string }` | Returns booking details, snapshots, addons, and status history timeline. |
| `POST` | `/api/v1/bookings/:bookingId/cancel` | [cancelBooking](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/bookings/controllers.ts) | `CONSUMER` \| `PARTNER` \| `ADMIN` | **Params**: `{ bookingId: string }`<br>**Body**: `{ reason?: string }` | Cancels booking subject to role and state machine lifecycle constraints. |
| `POST` | `/api/v1/bookings/:bookingId/transition` | [transitionBooking](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/bookings/controllers.ts) | `CONSUMER` \| `PARTNER` \| `ADMIN` | **Params**: `{ bookingId: string }`<br>**Body**: `{ toStatus: string, reason?: string, metadata?: object }` | Validates and transitions booking state machine. |
| `POST` | `/api/v1/bookings/:bookingId/verify-start` | [verifyStartBooking](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/bookings/controllers.ts) | `PARTNER` + `APPROVED` | **Params**: `{ bookingId: string }`<br>**Body**: `{ code: string }` | Verifies consumer 4-digit check-in code and starts job. |
| `POST` | `/api/v1/bookings/:id/reschedule` | [rescheduleBooking](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/bookings/controllers.ts) | `CONSUMER` | **Params**: `{ id: string }`<br>**Body**: `{ newScheduledAt: string, timeSlotId?: string }` | Reschedules scheduled booking to a new future time window. |
| `GET` | `/api/v1/bookings/assignments/me` | [listMyAssignments](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/bookings/controllers.ts) | `PARTNER` + `APPROVED` | None | Lists open dispatch assignment proposals offered to partner. |
| `GET` | `/api/v1/bookings/assignments/:assignmentId` | [getMyAssignment](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/bookings/controllers.ts) | `PARTNER` + `APPROVED` | **Params**: `{ assignmentId: string }` | Retrieves single assignment proposal details. |
| `POST` | `/api/v1/bookings/assignments/:assignmentId/accept` | [acceptAssignment](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/bookings/controllers.ts) | `PARTNER` + `APPROVED` | **Params**: `{ assignmentId: string }` | Accepts booking assignment proposal and assigns partner. |
| `POST` | `/api/v1/bookings/assignments/:assignmentId/decline` | [declineAssignment](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/bookings/controllers.ts) | `PARTNER` + `APPROVED` | **Params**: `{ assignmentId: string }`<br>**Body**: `{ reason?: string }` | Declines booking assignment proposal. |
| `POST` | `/api/v1/bookings/:bookingId/call` | [initiateCall](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/bookings/maskedCallController.ts) | `CONSUMER` | **Params**: `{ bookingId: string }` | Initiates virtual number masked call bridge between consumer and assigned partner. |
| `GET` | `/api/v1/bookings/:id/contact/partner` | [getPartnerContact](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/contact/controllers.ts) | `CONSUMER` | **Params**: `{ id: string }` | Fetches assigned partner phone number for an active booking. |
| `GET` | `/api/v1/bookings/:id/contact/consumer` | [getConsumerContact](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/contact/controllers.ts) | `PARTNER` | **Params**: `{ id: string }` | Fetches consumer phone number for assigned partner on active booking. |
| `GET` | `/api/v1/bookings/:id/eta` | [getEta](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/eta/controllers.ts) | `CONSUMER` \| `PARTNER` | **Params**: `{ id: string }` | Computes live partner estimated arrival time when en route. |
| `POST` | `/api/v1/bookings/:id/photos` | [uploadPhoto](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/photos/controllers.ts) | `PARTNER` + `APPROVED` | **Params**: `{ id: string }`<br>**Body**: `{ type: "BEFORE"\|"AFTER", fileUrl: string }` | Links uploaded before or after job photo to booking. |
| `GET` | `/api/v1/bookings/:id/photos` | [listPhotos](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/photos/controllers.ts) | `CONSUMER` \| `PARTNER` \| `ADMIN` | **Params**: `{ id: string }` | Lists all before/after job photos uploaded for booking. |
| `POST` | `/api/v1/admin/bookings/:id/assign` | [adminAssignPartner](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/bookings/controllers.ts) | `ADMIN` + `OPERATIONS` | **Params**: `{ id: string }`<br>**Body**: `{ partnerId: string }` | Manually assigns specific approved partner to confirmed booking. |
| `GET` | `/api/v1/admin/bookings/:id/assignable-partners` | [listAssignablePartnersForBooking](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/bookings/controllers.ts) | `ADMIN` + `OPERATIONS` | **Params**: `{ id: string }` | Lists available eligible partners matching required service skill for manual booking assignment. |

---

## 7. Coupons & Promotions

| Method | Full Route | Handler | Auth / Role | Parameters / Body Shape | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/coupons/validate` | [validateCoupon](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/coupons/controllers.ts) | `CONSUMER` | **Body**: `{ code: string, amount?: number, serviceId?: string, variantId?: string, addressId?: string, addonIds?: string[] }` | Validates coupon eligibility and returns computed discount value. |
| `GET` | `/api/v1/coupons/offers` | [listOffers](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/coupons/controllers.ts) | None | **Query**: `{ limit?: number }` | Returns active promotional banner coupons for consumer home screen. |
| `GET` | `/api/v1/coupons` | [listCoupons](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/coupons/controllers.ts) | `ADMIN` | **Query**: `{ activeOnly?: boolean, limit?: number, offset?: number }` | Lists all configured promotional coupons for admin. |
| `POST` | `/api/v1/coupons` | [createCoupon](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/coupons/controllers.ts) | `ADMIN` + `OPERATIONS` | **Body**: `{ code: string, discountType: "PERCENT"\|"FLAT", discountValue: number, minOrderValue?: number, maxDiscount?: number, validFrom: string, validTo: string, ... }` | Creates new promotional coupon with discount and eligibility rules. |
| `GET` | `/api/v1/coupons/:couponId` | [getCoupon](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/coupons/controllers.ts) | `ADMIN` | **Params**: `{ couponId: string }` | Retrieves detailed coupon rule configuration. |
| `PATCH` | `/api/v1/coupons/:couponId` | [updateCoupon](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/coupons/controllers.ts) | `ADMIN` + `OPERATIONS` | **Params**: `{ couponId: string }`<br>**Body**: Updated coupon properties | Modifies validity dates, discount values, or usage limits of coupon. |

---

## 8. Referrals & Rewards

| Method | Full Route | Handler | Auth / Role | Parameters / Body Shape | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/referrals/me` | [getReferralMe](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/referrals/controllers.ts) | `CONSUMER` | None | Returns consumer referral code, share URL, and rewards earned. |
| `POST` | `/api/v1/referrals/apply` | [applyReferralCode](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/referrals/controllers.ts) | `CONSUMER` | **Body**: `{ referralCode: string }` | Applies referral code and generates one-time reward discount coupons. |

---

## 9. Disputes & Resolutions

| Method | Full Route | Handler | Auth / Role | Parameters / Body Shape | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/disputes` | [createDispute](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/disputes/controllers.ts) | `CONSUMER` \| `PARTNER` | **Body**: `{ bookingId: string, category: "SERVICE_QUALITY"\|"PRICING"\|"DAMAGE"\|"NO_SHOW"\|"OTHER", description: string }` | Opens dispute for booking within eligible 7-day window. |
| `GET` | `/api/v1/disputes` | [listMyDisputes](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/disputes/controllers.ts) | `CONSUMER` \| `PARTNER` | **Query**: `{ status?: string, limit?: number, offset?: number }` | Lists disputes raised by authenticated caller. |
| `GET` | `/api/v1/disputes/booking/:bookingId` | [getBookingDisputeStatus](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/disputes/controllers.ts) | `CONSUMER` \| `PARTNER` | **Params**: `{ bookingId: string }` | Returns dispute status and eligibility for specific booking. |
| `POST` | `/api/v1/disputes/:id/evidence` | [addDisputeEvidence](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/disputes/controllers.ts) | `CONSUMER` \| `PARTNER` | **Params**: `{ id: string }`<br>**Body**: `{ fileUrl: string }` | Attaches photo evidence URL to an open dispute. |
| `GET` | `/api/v1/disputes/:id/evidence` | [listDisputeEvidence](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/disputes/controllers.ts) | `CONSUMER` \| `PARTNER` | **Params**: `{ id: string }` | Lists evidence files attached to dispute. |
| `GET` | `/api/v1/disputes/:id` | [getDispute](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/disputes/controllers.ts) | `CONSUMER` \| `PARTNER` | **Params**: `{ id: string }` | Retrieves single dispute details and resolution notes. |
| `GET` | `/api/v1/admin/disputes` | [listAdminDisputes](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/disputes/controllers.ts) | `ADMIN` | **Query**: `{ status?: string, category?: string, bookingId?: string, dateFrom?: string, dateTo?: string, limit?: number, offset?: number }` | Lists all platform disputes with search filters for admin review. |
| `GET` | `/api/v1/admin/disputes/:id` | [getAdminDispute](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/disputes/controllers.ts) | `ADMIN` | **Params**: `{ id: string }` | Retrieves dispute detail with full booking context for investigation. |
| `PATCH` | `/api/v1/admin/disputes/:id` | [updateDispute](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/disputes/controllers.ts) | `ADMIN` | **Params**: `{ id: string }`<br>**Body**: `{ status: "UNDER_REVIEW"\|"RESOLVED"\|"CLOSED", resolutionNotes?: string }` | Updates dispute status and records resolution notes. |

---

## 10. Slots & Capacity

| Method | Full Route | Handler | Auth / Role | Parameters / Body Shape | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/slots` | [listAvailableSlots](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/slots/controllers.ts) | None | **Query**: `{ serviceId: string, date: string }` | Returns available booking time slots with remaining capacity. |
| `GET` | `/api/v1/slots/admin` | [listAdminSlots](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/slots/controllers.ts) | `ADMIN` + `OPERATIONS` | **Query**: `{ serviceId: string, fromAt: string, toAt: string }` | Lists all slots including full and inactive slots in time range. |
| `POST` | `/api/v1/slots/generate` | [generateSlots](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/slots/controllers.ts) | `ADMIN` + `OPERATIONS` | **Body**: `{ serviceId: string, fromDate: string, toDate: string, startHour: number, endHour: number, slotDurationMin: number, capacity: number }` | Batch generates recurring time slots across date range. |
| `PATCH` | `/api/v1/slots/:slotId/capacity` | [updateSlotCapacity](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/slots/controllers.ts) | `ADMIN` + `OPERATIONS` | **Params**: `{ slotId: string }`<br>**Body**: `{ capacity: number }` | Adjusts capacity limit for a specific booking slot. |

---

## 11. Payments & Webhooks

| Method | Full Route | Handler | Auth / Role | Parameters / Body Shape | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/payments/orders` | [createOrder](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/payments/controllers.ts) | `CONSUMER` | **Body**: `{ bookingId: string }` | Creates Razorpay order for booking payment and transitions to `PAYMENT_PENDING`. |
| `POST` | `/api/v1/payments/confirm` | [confirmPayment](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/payments/controllers.ts) | `CONSUMER` | **Body**: `{ razorpayOrderId: string, razorpayPaymentId: string, razorpaySignature: string }` | Validates HMAC signature from Razorpay checkout and marks booking `CONFIRMED`. |
| `POST` | `/api/v1/payments/webhooks/razorpay` | [razorpayWebhook](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/payments/controllers.ts) | Webhook Signature Header (`x-razorpay-signature`) | **Body**: Razorpay Webhook Payload | Processes asynchronous payment capture and failure webhooks from Razorpay. |

---

## 12. Addresses

| Method | Full Route | Handler | Auth / Role | Parameters / Body Shape | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/addresses` | [listAddresses](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/addresses/controllers.ts) | `CONSUMER` | None | Lists saved addresses for consumer with default address first. |
| `POST` | `/api/v1/addresses` | [createAddress](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/addresses/controllers.ts) | `CONSUMER` | **Body**: `{ label: string, addressType?: "HOME"\|"WORK"\|"OTHER", line1: string, line2?: string, landmark?: string, city: string, state: string, country?: string, pincode: string, latitude?: number, longitude?: number, placeId?: string, accessNotes?: string, recipientName?: string, recipientPhone?: string, setAsDefault?: boolean }` | Saves address and maps to serviceable zone polygon. |
| `GET` | `/api/v1/addresses/default` | [getDefaultAddress](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/addresses/controllers.ts) | `CONSUMER` | None | Retrieves current default address for consumer. |
| `GET` | `/api/v1/addresses/:addressId` | [getAddress](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/addresses/controllers.ts) | `CONSUMER` | **Params**: `{ addressId: string }` | Retrieves single saved address by ID. |
| `PATCH` | `/api/v1/addresses/:addressId` | [updateAddress](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/addresses/controllers.ts) | `CONSUMER` | **Params**: `{ addressId: string }`<br>**Body**: Updated address fields | Modifies saved address and re-verifies zone coverage. |
| `DELETE` | `/api/v1/addresses/:addressId` | [deleteAddress](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/addresses/controllers.ts) | `CONSUMER` | **Params**: `{ addressId: string }` | Soft-deletes saved address and reassigns default if necessary. |
| `POST` | `/api/v1/addresses/:addressId/default` | [setDefaultAddress](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/addresses/controllers.ts) | `CONSUMER` | **Params**: `{ addressId: string }` | Sets specified address as primary default. |

---

## 13. Location, Geocoding & Places

| Method | Full Route | Handler | Auth / Role | Parameters / Body Shape | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/location/reverse-geocode` | [reverseGeocode](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/location/controllers.ts) | `CONSUMER` \| `PARTNER` \| `ADMIN` | **Query**: `{ latitude: number, longitude: number }` | Reverse-geocodes GPS coordinates and validates zone serviceability. |
| `GET` | `/api/v1/location/geocode` | [geocodeAddress](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/location/controllers.ts) | `CONSUMER` \| `PARTNER` \| `ADMIN` | **Query**: `{ query: string }` | Forward-geocodes address string to coordinates and zone status. |
| `GET` | `/api/v1/location/places/search` | [searchPlaces](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/location/controllers.ts) | `CONSUMER` \| `PARTNER` \| `ADMIN` | **Query**: `{ query: string, sessionToken?: string }` | Returns place autocomplete suggestions for search input. |
| `GET` | `/api/v1/location/places/details` | [resolvePlace](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/location/controllers.ts) | `CONSUMER` \| `PARTNER` \| `ADMIN` | **Query**: `{ placeId: string }` | Resolves Google Place ID to coordinates and address fields. |
| `GET` | `/api/v1/location/serviceability` | [checkServiceability](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/location/controllers.ts) | None | **Query**: `{ latitude: number, longitude: number, serviceId?: string }` | Checks if GPS coordinates fall within an active serviceable zone polygon. |
| `GET` | `/api/v1/location/nearby-zones` | [nearbyZones](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/location/controllers.ts) | None | **Query**: `{ latitude: number, longitude: number, radiusMeters?: number }` | Returns active serviceable zones near coordinates ordered by distance. |

---

## 14. Zones & Zone Pricing Overrides

| Method | Full Route | Handler | Auth / Role | Parameters / Body Shape | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/admin/zones` | [listZones](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/zones/controllers.ts) | `ADMIN` | **Query**: `{ city?: string, status?: "ACTIVE"\|"INACTIVE"\|"DRAFT", limit?: number, offset?: number }` | Lists all configured service zones with boundary metadata. |
| `POST` | `/api/v1/admin/zones` | [createZone](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/zones/controllers.ts) | `ADMIN` | **Body**: `{ name: string, slug: string, city: string, state: string, country?: string, status?: string, tier?: string, priority?: number, boundary: number[][][][], serviceIds?: string[] }` | Creates service zone defined by GeoJSON MultiPolygon boundary. |
| `GET` | `/api/v1/admin/zones/:zoneId` | [getZone](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/zones/controllers.ts) | `ADMIN` | **Params**: `{ zoneId: string }` | Returns zone detail, boundary polygon, and mapped service IDs. |
| `PATCH` | `/api/v1/admin/zones/:zoneId` | [updateZone](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/zones/controllers.ts) | `ADMIN` | **Params**: `{ zoneId: string }`<br>**Body**: Updated zone properties/boundary | Modifies zone details, priority, active services, or boundary polygon. |
| `DELETE` | `/api/v1/admin/zones/:zoneId` | [deleteZone](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/zones/controllers.ts) | `ADMIN` + `SUPER_ADMIN` | **Params**: `{ zoneId: string }` | Permanently deletes service zone and mappings. |
| `POST` | `/api/v1/admin/zones/:zoneId/price-overrides` | [createOverride](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/zones/pricingController.ts) | `ADMIN` | **Params**: `{ zoneId: string }`<br>**Body**: `{ serviceId: string, variantId: string, overridePrice: number }` | Creates custom price override for service variant within specific zone. |
| `GET` | `/api/v1/admin/zones/:zoneId/price-overrides` | [listOverrides](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/zones/pricingController.ts) | `ADMIN` | **Params**: `{ zoneId: string }` | Lists all price overrides defined for zone. |
| `PUT` | `/api/v1/admin/zones/:zoneId/price-overrides/:overrideId` | [updateOverride](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/zones/pricingController.ts) | `ADMIN` | **Params**: `{ zoneId: string, overrideId: string }`<br>**Body**: `{ overridePrice: number }` | Updates override price value for existing zone override. |
| `DELETE` | `/api/v1/admin/zones/:zoneId/price-overrides/:overrideId` | [deleteOverride](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/zones/pricingController.ts) | `ADMIN` | **Params**: `{ zoneId: string, overrideId: string }` | Deletes zone price override to revert variant to global catalogue pricing. |

---

## 15. Partner Zones Management

| Method | Full Route | Handler | Auth / Role | Parameters / Body Shape | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/admin/partners/:id/zones` | [assignZones](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/partnerZones/controllers.ts) | `ADMIN` + `OPERATIONS` | **Params**: `{ id: string }`<br>**Body**: `{ zoneIds: string[], primaryZoneId?: string }` | Assigns operational zones to partner. |
| `GET` | `/api/v1/admin/partners/:id/zones` | [getPartnerZones](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/partnerZones/controllers.ts) | `ADMIN` + `OPERATIONS` | **Params**: `{ id: string }` | Lists zones assigned to specified partner. |
| `DELETE` | `/api/v1/admin/partners/:id/zones/:zoneId` | [removeZone](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/partnerZones/controllers.ts) | `ADMIN` + `OPERATIONS` | **Params**: `{ id: string, zoneId: string }` | Revokes partner operational zone assignment. |
| `PATCH` | `/api/v1/admin/partners/:id/zones/:zoneId/primary` | [setPrimaryZone](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/partnerZones/controllers.ts) | `ADMIN` + `OPERATIONS` | **Params**: `{ id: string, zoneId: string }` | Designates primary dispatch zone for partner. |
| `PATCH` | `/api/v1/admin/partners/:id/base-location` | [updateBaseLocation](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/partnerZones/controllers.ts) | `ADMIN` + `OPERATIONS` | **Params**: `{ id: string }`<br>**Body**: `{ baseLatitude: number, baseLongitude: number }` | Updates partner home/base location coordinates. |
| `GET` | `/api/v1/partners/zones` | [getMyPartnerZones](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/partnerZones/controllers.ts) | `PARTNER` | None | Returns operational service zones assigned to authenticated partner. |

---

## 16. Partner Skills

| Method | Full Route | Handler | Auth / Role | Parameters / Body Shape | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/admin/partners/:id/skills` | [assignSkills](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/skills/controllers.ts) | `ADMIN` + `OPERATIONS` | **Params**: `{ id: string }`<br>**Body**: `{ serviceIds: string[] }` | Assigns qualified service skills to partner. |
| `DELETE` | `/api/v1/admin/partners/:id/skills/:serviceId` | [removeSkill](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/skills/controllers.ts) | `ADMIN` + `OPERATIONS` | **Params**: `{ id: string, serviceId: string }` | Revokes partner service skill assignment. |
| `GET` | `/api/v1/admin/partners/by-skill/:serviceId` | [listPartnersBySkill](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/skills/controllers.ts) | `ADMIN` + `OPERATIONS` | **Params**: `{ serviceId: string }`<br>**Query**: `{ limit?: number, offset?: number }` | Lists all partners qualified in specified service skill. |
| `GET` | `/api/v1/partners/skills` | [getMySkills](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/skills/controllers.ts) | `PARTNER` | None | Lists qualified service skills assigned to authenticated partner. |

---

## 17. Partner KYC & Bank Details

| Method | Full Route | Handler | Auth / Role | Parameters / Body Shape | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/partners/bank-details` | [submitBankDetails](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/kyc/controllers.ts) | `PARTNER` | **Body**: `{ accountHolderName: string, accountNumber: string, ifscCode: string, bankName: string }` | Submits or updates partner bank payout account info. |
| `GET` | `/api/v1/partners/bank-details` | [getBankDetails](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/kyc/controllers.ts) | `PARTNER` | None | Retrieves submitted bank payout details for partner. |
| `POST` | `/api/v1/partners/kyc/documents` | [uploadKycDocument](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/kyc/controllers.ts) | `PARTNER` | **Body**: `{ documentType: "AADHAAR"\|"PAN"\|"DRIVING_LICENSE"\|"BUSINESS_PROOF"\|"SELFIE", fileUrl: string }` | Submits KYC verification document reference. |
| `GET` | `/api/v1/partners/kyc/documents` | [listKycDocuments](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/kyc/controllers.ts) | `PARTNER` | None | Lists submitted KYC documents and approval statuses. |
| `GET` | `/api/v1/admin/partners/:id/kyc` | [getPartnerKyc](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/kyc/controllers.ts) | `ADMIN` | **Params**: `{ id: string }` | Retrieves partner KYC documents and bank details for audit. |
| `PATCH` | `/api/v1/admin/kyc/documents/:id` | [approveRejectDocument](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/kyc/controllers.ts) | `ADMIN` | **Params**: `{ id: string }`<br>**Body**: `{ action: "APPROVE"\|"REJECT", rejectionReason?: string }` | Approves or rejects a submitted KYC document. |

---

## 18. Earnings & Payouts

| Method | Full Route | Handler | Auth / Role | Parameters / Body Shape | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/partners/earnings/summary` | [getEarningsSummary](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/earnings/controllers.ts) | `PARTNER` + `APPROVED` | **Query**: `{ from: string, to: string }` | Returns salary, incentives, deductions, payouts, and available balance for date range. |
| `GET` | `/api/v1/partners/earnings` | [listEarnings](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/earnings/controllers.ts) | `PARTNER` + `APPROVED` | **Query**: `{ limit?: number, offset?: number }` | Lists earning transaction records for partner. |
| `GET` | `/api/v1/partners/payouts` | [listPartnerPayouts](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/earnings/controllers.ts) | `PARTNER` + `APPROVED` | **Query**: `{ limit?: number, offset?: number }` | Returns historical payout records for partner. |
| `GET` | `/api/v1/admin/payouts/available-balance` | [getPartnerAvailableBalance](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/earnings/controllers.ts) | `ADMIN` + `FINANCE` | **Query**: `{ partnerId: string }` | Checks partner balance eligible for payout. |
| `POST` | `/api/v1/admin/payouts` | [initiatePayout](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/earnings/controllers.ts) | `ADMIN` + `FINANCE` | **Body**: `{ partnerId: string, amount: number, notes?: string }` | Initiates new payout transaction for partner. |
| `GET` | `/api/v1/admin/payouts` | [listAdminPayouts](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/earnings/controllers.ts) | `ADMIN` + `FINANCE` | **Query**: `{ partnerId?: string, status?: "PENDING"\|"PROCESSING"\|"PAID"\|"FAILED", limit?: number, offset?: number }` | Lists all payout transactions with status filters. |
| `PATCH` | `/api/v1/admin/payouts/:id/status` | [updatePayoutStatus](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/earnings/controllers.ts) | `ADMIN` + `FINANCE` | **Params**: `{ id: string }`<br>**Body**: `{ status: "PROCESSING"\|"PAID"\|"FAILED" }` | Updates lifecycle status of payout record. |

---

## 19. Payroll & Incentives

| Method | Full Route | Handler | Auth / Role | Parameters / Body Shape | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `PATCH` | `/api/v1/admin/partners/:id/salary` | [setPartnerSalary](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/payroll/controllers.ts) | `ADMIN` + `FINANCE` | **Params**: `{ id: string }`<br>**Body**: `{ baseSalary: number, effectiveFrom?: string }` | Configures partner base monthly salary. |
| `GET` | `/api/v1/admin/partners/:id/salary` | [getPartnerSalary](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/payroll/controllers.ts) | `ADMIN` + `FINANCE` | **Params**: `{ id: string }` | Retrieves partner current base salary configuration. |
| `PUT` | `/api/v1/admin/partners/:id/attendance/:period` | [setPartnerAttendance](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/payroll/controllers.ts) | `ADMIN` + `FINANCE` | **Params**: `{ id: string, period: string }`<br>**Body**: `{ daysPresent: number, daysAbsent: number, leavesAllowed?: number }` | Records monthly attendance metrics for salary calculation. |
| `GET` | `/api/v1/admin/payroll/runs` | [listPayrollRuns](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/payroll/controllers.ts) | `ADMIN` + `FINANCE` | **Query**: `{ period?: string, limit?: number, offset?: number }` | Lists summaries of monthly payroll calculation runs. |
| `POST` | `/api/v1/admin/payroll/runs/:period/reprocess` | [reprocessPayrollRun](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/payroll/controllers.ts) | `ADMIN` + `FINANCE` | **Params**: `{ period: string }`<br>**Body**: `{ partnerId?: string }` | Triggers re-computation of payroll run for period. |
| `POST` | `/api/v1/admin/incentive-configs` | [createIncentiveConfig](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/payroll/controllers.ts) | `ADMIN` + `FINANCE` | **Body**: `{ name: string, type: string, criteria: object, bonusAmount: number, activeFrom: string, activeTo?: string }` | Creates performance incentive rule. |
| `PATCH` | `/api/v1/admin/incentive-configs/:id` | [updateIncentiveConfig](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/payroll/controllers.ts) | `ADMIN` + `FINANCE` | **Params**: `{ id: string }`<br>**Body**: Updated incentive fields | Updates existing incentive rule parameters. |
| `GET` | `/api/v1/admin/incentive-configs` | [listIncentiveConfigs](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/payroll/controllers.ts) | `ADMIN` + `FINANCE` | **Query**: `{ activeOnly?: boolean, limit?: number, offset?: number }` | Lists configured performance incentive rules. |
| `GET` | `/api/v1/admin/incentive-configs/total` | [getTotalIncentives](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/payroll/controllers.ts) | `ADMIN` + `FINANCE` | **Query**: `{ period: string }` | Computes aggregated incentive amount across all partners for period. |
| `GET` | `/api/v1/partners/earnings/payroll/:period` | [getPartnerPayrollBreakdown](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/payroll/controllers.ts) | `PARTNER` + `APPROVED` | **Params**: `{ period: string }` | Returns detailed salary slip and incentive breakdown for partner. |
| `PUT` | `/api/v1/internal/partners/:id/attendance/:period` | [setInternalPartnerAttendance](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/payroll/controllers.ts) | Internal API Key (`x-internal-service-key`) | **Params**: `{ id: string, period: string }`<br>**Body**: `{ daysPresent: number, daysAbsent: number, leavesAllowed?: number }` | Internal service sync endpoint for attendance records. |

---

## 20. Platform Pricing Settings

| Method | Full Route | Handler | Auth / Role | Parameters / Body Shape | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/admin/pricing-settings` | [getPlatformPricing](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/platformPricing/controllers.ts) | `ADMIN` + `FINANCE` | None | Retrieves global platform fee, GST rates, and subscription discounts. |
| `PUT` | `/api/v1/admin/pricing-settings` | [updatePlatformPricing](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/platformPricing/controllers.ts) | `ADMIN` + `FINANCE` | **Body**: `{ platformFee: number, gstRate: number, weeklyDiscountPercent: number, biweeklyDiscountPercent: number, monthlyDiscountPercent: number }` | Updates global platform pricing parameters and logs audit history. |
| `GET` | `/api/v1/admin/pricing-settings/history` | [listPlatformPricingHistory](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/platformPricing/controllers.ts) | `ADMIN` + `FINANCE` | **Query**: `{ limit?: number, offset?: number }` | Lists historical audit logs of platform pricing modifications. |

---

## 21. Refunds

| Method | Full Route | Handler | Auth / Role | Parameters / Body Shape | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/admin/refunds` | [initiateRefund](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/refunds/controllers.ts) | `ADMIN` + `FINANCE` | **Body**: `{ bookingId: string, amount: number, reason?: string }` | Initiates full or partial Razorpay refund for captured booking payment. |
| `GET` | `/api/v1/admin/refunds` | [listRefunds](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/refunds/controllers.ts) | `ADMIN` + `FINANCE` | **Query**: `{ status?: "INITIATED"\|"PROCESSING"\|"COMPLETED"\|"FAILED", bookingId?: string, dateFrom?: string, dateTo?: string, limit?: number, offset?: number }` | Lists refund transaction logs and payment processing status. |

---

## 22. Dispatch & Queue Operations

| Method | Full Route | Handler | Auth / Role | Parameters / Body Shape | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/admin/dispatch/jobs/failed` | [listFailedJobs](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/dispatch/controllers.ts) | `ADMIN` + `OPERATIONS` | **Query**: `{ queueName?: string }` | Lists dead-letter or failed background dispatch jobs. |
| `POST` | `/api/v1/admin/dispatch/jobs/:queueName/:jobId/retry` | [retryFailedJob](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/dispatch/controllers.ts) | `ADMIN` + `OPERATIONS` | **Params**: `{ queueName: string, jobId: string }` | Re-queues a failed background dispatch job. |
| `GET` | `/api/v1/admin/dispatch/escalated` | [listEscalatedBookings](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/dispatch/controllers.ts) | `ADMIN` + `OPERATIONS` | None | Lists bookings that failed auto-dispatch and require operator intervention. |
| `POST` | `/api/v1/admin/dispatch/bookings/:bookingId/instant` | [triggerInstantDispatch](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/dispatch/controllers.ts) | `ADMIN` + `OPERATIONS` | **Params**: `{ bookingId: string }` | Manually triggers instant booking partner discovery and dispatch loop. |
| `POST` | `/api/v1/admin/dispatch/bookings/:bookingId/redispatch` | [triggerRedispatch](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/dispatch/controllers.ts) | `ADMIN` + `OPERATIONS` | **Params**: `{ bookingId: string }`<br>**Body**: `{ reason?: string }` | Re-runs dispatch algorithm after partner declines or timeout. |
| `POST` | `/api/v1/admin/dispatch/bookings/:bookingId/scheduled-assign` | [triggerScheduledAssign](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/dispatch/controllers.ts) | `ADMIN` + `OPERATIONS` | **Params**: `{ bookingId: string }` | Manually triggers partner matching for scheduled booking. |
| `POST` | `/api/v1/admin/dispatch/bookings/:bookingId/revalidate` | [triggerRevalidate](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/dispatch/controllers.ts) | `ADMIN` + `OPERATIONS` | **Params**: `{ bookingId: string }` | Re-checks assigned partner availability prior to scheduled start time. |
| `POST` | `/api/v1/admin/dispatch/scheduled-batch/run` | [triggerScheduledBatch](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/dispatch/controllers.ts) | `ADMIN` + `OPERATIONS` | None | Manually triggers scheduled batch assignment cron worker. |

---

## 23. Reviews & Ratings

| Method | Full Route | Handler | Auth / Role | Parameters / Body Shape | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/reviews` | [submitReview](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/reviews/controllers.ts) | `CONSUMER` | **Body**: `{ bookingId: string, rating: number, review?: string }` | Submits 1–5 star rating and review for completed booking. |
| `GET` | `/api/v1/reviews/booking/:bookingId` | [getBookingReviewStatus](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/reviews/controllers.ts) | `CONSUMER` | **Params**: `{ bookingId: string }` | Checks if consumer already reviewed completed booking. |
| `GET` | `/api/v1/reviews/partner/:partnerId` | [getPartnerReviews](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/reviews/controllers.ts) | None | **Params**: `{ partnerId: string }`<br>**Query**: `{ limit?: number, offset?: number }` | Returns public customer reviews and ratings for a partner. |
| `GET` | `/api/v1/admin/reviews` | [listAdminReviews](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/reviews/controllers.ts) | `ADMIN` | **Query**: `{ partnerId?: string, consumerId?: string, ratingMin?: number, ratingMax?: number, dateFrom?: string, dateTo?: string, limit?: number, offset?: number }` | Lists all platform reviews with search and filter options for admin. |

---

## 24. Device Tokens (Push Notifications)

| Method | Full Route | Handler | Auth / Role | Parameters / Body Shape | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/partners/device-token` | [registerPartnerToken](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/device-tokens/controllers.ts) | `PARTNER` | **Body**: `{ deviceToken: string, platform: "ANDROID"\|"IOS" }` | Registers partner FCM/APNS push notification device token. |
| `DELETE` | `/api/v1/partners/device-token` | [removePartnerToken](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/device-tokens/controllers.ts) | `PARTNER` | **Body**: `{ deviceToken: string }` | Unregisters partner device token upon logout. |
| `POST` | `/api/v1/consumers/device-token` | [registerConsumerToken](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/device-tokens/controllers.ts) | `CONSUMER` | **Body**: `{ deviceToken: string, platform: "ANDROID"\|"IOS" }` | Registers consumer FCM/APNS push notification device token. |
| `DELETE` | `/api/v1/consumers/device-token` | [removeConsumerToken](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/device-tokens/controllers.ts) | `CONSUMER` | **Body**: `{ deviceToken: string }` | Unregisters consumer device token upon logout. |

---

## 25. Notifications

| Method | Full Route | Handler | Auth / Role | Parameters / Body Shape | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/notifications/unread-count` | [getUnreadCount](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/notifications/controllers.ts) | `CONSUMER` \| `PARTNER` \| `ADMIN` | None | Returns total count of unread in-app notifications for caller. |
| `GET` | `/api/v1/notifications` | [listNotifications](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/notifications/controllers.ts) | `CONSUMER` \| `PARTNER` \| `ADMIN` | **Query**: `{ isRead?: "true"\|"false", limit?: number, offset?: number }` | Returns paginated list of in-app notifications for caller. |
| `PATCH` | `/api/v1/notifications/:id/read` | [markAsRead](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/notifications/controllers.ts) | `CONSUMER` \| `PARTNER` \| `ADMIN` | **Params**: `{ id: string }` | Marks a specific notification as read. |
| `POST` | `/api/v1/notifications/read-all` | [markAllAsRead](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/notifications/controllers.ts) | `CONSUMER` \| `PARTNER` \| `ADMIN` | None | Marks all in-app notifications as read for caller. |

---

## 26. File Uploads

| Method | Full Route | Handler | Auth / Role | Parameters / Body Shape | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/uploads/presign` | [presignUpload](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/uploads/controllers.ts) | `ADMIN` \| `CONSUMER` \| `PARTNER` | **Body**: `{ purpose: "kyc"\|"booking_photo"\|"dispute_evidence"\|"profile", contentType: "image/jpeg"\|"image/png"\|"image/webp"\|"image/heic", bookingId?: string }` | Generates S3 presigned PUT URL and CloudFront CDN URL for direct client upload. |

---

## 27. Admin Core & Analytics

| Method | Full Route | Handler | Auth / Role | Parameters / Body Shape | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/admin/auth/login` | [adminAuthLogin](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/admin/controllers.ts) | None | **Body**: `{ username: string, password: string }` | Authenticates administrator and issues JWT with role claim. |
| `POST` | `/api/v1/admin/auth/refresh` | [adminAuthRefresh](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/admin/controllers.ts) | Refresh Cookie (`rft_admin`) | None | Issues new admin JWT access token from HttpOnly cookie. |
| `POST` | `/api/v1/admin/auth/logout` | [adminAuthLogout](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/admin/controllers.ts) | None | None | Logs out admin and clears refresh cookie. |
| `GET` | `/api/v1/admin/consumers` | [listConsumers](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/admin/controllers.ts) | `ADMIN` | **Query**: `{ query?: string, limit?: number, offset?: number }` | Returns paginated list of consumers with booking counts and lifetime spend. |
| `GET` | `/api/v1/admin/consumers/:id` | [getConsumer](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/admin/controllers.ts) | `ADMIN` | **Params**: `{ id: string }` | Returns detailed consumer profile and aggregate stats. |
| `PATCH` | `/api/v1/admin/consumers/:id` | [updateConsumer](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/admin/controllers.ts) | `ADMIN` + `OPERATIONS` | **Params**: `{ id: string }`<br>**Body**: `{ isBlocked?: boolean, blockReason?: string }` | Blocks or unblocks consumer account. |
| `GET` | `/api/v1/admin/consumers/:id/addresses` | [getConsumerAddresses](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/admin/controllers.ts) | `ADMIN` | **Params**: `{ id: string }` | Retrieves saved addresses of specified consumer. |
| `GET` | `/api/v1/admin/consumers/:id/bookings` | [getConsumerBookings](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/admin/controllers.ts) | `ADMIN` | **Params**: `{ id: string }` | Retrieves booking history for specified consumer. |
| `GET` | `/api/v1/admin/partners` | [listPartners](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/admin/controllers.ts) | `ADMIN` | **Query**: `{ approvalStatus?: "PENDING"\|"UNDER_REVIEW"\|"APPROVED"\|"REJECTED"\|"SUSPENDED", limit?: number, offset?: number }` | Returns paginated list of partners filtered by approval status. |
| `GET` | `/api/v1/admin/partners/operational-status` | [listPartnerOperationalStatuses](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/admin/controllers.ts) | `ADMIN` | **Query**: `{ limit?: number, offset?: number }` | Returns fleet operational status snapshot for live map monitoring. |
| `GET` | `/api/v1/admin/partners/:id` | [getPartner](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/admin/controllers.ts) | `ADMIN` | **Params**: `{ id: string }` | Returns partner profile details and verification state. |
| `GET` | `/api/v1/admin/partners/:id/operational-status` | [getPartnerOperationalStatus](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/admin/controllers.ts) | `ADMIN` | **Params**: `{ id: string }` | Returns operational GPS and online status snapshot for single partner. |
| `POST` | `/api/v1/admin/partners/:id/approve` | [approvePartner](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/admin/controllers.ts) | `ADMIN` + `OPERATIONS` | **Params**: `{ id: string }` | Approves partner account for job dispatch and records acting admin. |
| `POST` | `/api/v1/admin/partners/:id/reject` | [rejectPartner](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/admin/controllers.ts) | `ADMIN` + `OPERATIONS` | **Params**: `{ id: string }`<br>**Body**: `{ reason?: string }` | Rejects partner onboarding application with reason. |
| `POST` | `/api/v1/admin/partners/:id/suspend` | [suspendPartner](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/admin/controllers.ts) | `ADMIN` + `OPERATIONS` | **Params**: `{ id: string }`<br>**Body**: `{ reason?: string }` | Suspends partner account from active dispatch. |
| `GET` | `/api/v1/admin/kpis` | [getKPIs](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/admin/controllers.ts) | `ADMIN` | None | Returns real-time platform KPIs (today bookings, revenue, fleet count). |
| `GET` | `/api/v1/admin/analytics/revenue` | [getRevenueAnalytics](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/admin/controllers.ts) | `ADMIN` | **Query**: `{ dateFrom: string, dateTo: string }` | Generates daily revenue breakdown and average order value across date range. |
| `GET` | `/api/v1/admin/analytics/partners` | [getPartnerPerformance](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/admin/controllers.ts) | `ADMIN` | **Query**: `{ dateFrom: string, dateTo: string }` | Computes partner performance metrics (completed jobs, ratings, earnings). |
| `GET` | `/api/v1/admin/analytics/customers` | [getCustomerAnalytics](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/admin/controllers.ts) | `ADMIN` | **Query**: `{ dateFrom: string, dateTo: string }` | Computes customer acquisition, repeat booking rate, and LTV. |
| `GET` | `/api/v1/admin/export/bookings` | [exportBookingsCsv](file:///c:/Users/vrund/OneDrive/Desktop/clenzey/clenzey_backend-main/src/api/v1/admin/controllers.ts) | `ADMIN` | **Query**: `{ dateFrom?: string, dateTo?: string, status?: string, serviceType?: string }` | Streams filtered booking records in CSV format. |

---

# Specific Analysis & Findings

## 1. Endpoints with No Visible Authentication Check
Total: **23 public endpoints + 1 secret-header internal endpoint**

1. **System & Health**:
   - `GET /api/v1/health/live`
   - `GET /api/v1/health/ready`
   - `GET /api/v1/health`
2. **Auth Handlers (Public by design)**:
   - `POST /api/v1/consumers/auth/firebase`
   - `POST /api/v1/consumers/auth/refresh` *(Cookie / token payload check inside handler)*
   - `POST /api/v1/consumers/auth/logout`
   - `POST /api/v1/consumers/auth/signup`
   - `POST /api/v1/consumers/auth/signin`
   - `POST /api/v1/partners/auth/firebase`
   - `POST /api/v1/partners/auth/refresh` *(Cookie / token payload check inside handler)*
   - `POST /api/v1/partners/auth/logout`
   - `POST /api/v1/partners/auth/signup`
   - `POST /api/v1/partners/auth/signin`
   - `POST /api/v1/admin/auth/login`
   - `POST /api/v1/admin/auth/refresh` *(Cookie check inside handler)*
   - `POST /api/v1/admin/auth/logout`
3. **Catalogue & Pricing Estimates (Public by design)**:
   - `GET /api/v1/services`
   - `GET /api/v1/services/:serviceId`
   - `POST /api/v1/services/:serviceId/estimate`
   - `POST /api/v1/services/:serviceId/large-office-estimate`
   - `GET /api/v1/coupons/offers`
   - `GET /api/v1/slots`
4. **Public Location & Social**:
   - `GET /api/v1/location/serviceability`
   - `GET /api/v1/location/nearby-zones`
   - `GET /api/v1/reviews/partner/:partnerId`
5. **Webhook & Internal Service Endpoints**:
   - `POST /api/v1/payments/webhooks/razorpay` *(No JWT auth; verified via HMAC signature header `x-razorpay-signature`)*
   - `PUT /api/v1/internal/partners/:id/attendance/:period` *(No user JWT auth; uses `requireInternalApiKey` checking `x-internal-service-key` header)*

---

## 2. Endpoints Unused in Frontend or Tests
Several endpoints are implemented in the backend API router but are not invoked anywhere in `clenzey_admin-main`, `clenzey_web-main`, or integration tests in `clenzey_backend-main/tests`:

1. **Mobile-Specific Push Token Registration**:
   - `POST /api/v1/partners/device-token`
   - `DELETE /api/v1/partners/device-token`
   - `POST /api/v1/consumers/device-token`
   - `DELETE /api/v1/consumers/device-token`
   *(Built for native mobile apps; not called in web portal or backend tests).*
2. **In-App Notification HTTP Routes**:
   - `GET /api/v1/notifications/unread-count`
   - `GET /api/v1/notifications`
   - `PATCH /api/v1/notifications/:id/read`
   - `POST /api/v1/notifications/read-all`
   *(Service methods are tested in isolation, but HTTP routes are unreferenced in frontend/tests).*
3. **Consumer Masked Phone Calls**:
   - `POST /api/v1/bookings/:bookingId/call`
   *(Controller and service implemented; not invoked in admin or test suite).*
4. **Referral Program Routes**:
   - `GET /api/v1/referrals/me`
   - `POST /api/v1/referrals/apply`
   *(Referral controllers and schemas exist; no test or frontend caller present).*
5. **Large Office Instant Pricing**:
   - `POST /api/v1/services/:serviceId/large-office-estimate`
   *(Pricing utility has unit tests in `largeOfficePricing.spec.ts`, but route is not called).*
6. **Consumer Quotation Lifecycle**:
   - `POST /api/v1/quotations/:id/accept`
   - `DELETE /api/v1/quotations/:id`
   *(Quotation creation and admin update are wired, but consumer acceptance and deletion routes have no active callers).*
7. **Catalogue Deletion**:
   - `DELETE /api/v1/services/:serviceId`
   - `DELETE /api/v1/admin/zones/:zoneId`
   - `DELETE /api/v1/admin/zones/:zoneId/price-overrides/:overrideId`
   *(Delete handlers exist in backend; admin UI only consumes list/create/update).*

---

## 3. Inconsistent Patterns Across Endpoints

1. **Validation Middleware vs Direct Handler Parsing**:
   - **Schema-middleware validated**: Routes like `bookingsRoutes`, `consumerRoutes`, `photosRoutes`, `contactRoutes`, `earningsRoutes`, `payrollRoutes`, and `disputesRoutes` consistently chain dedicated middleware (e.g. `photosValidation.validateBookingIdParam`, `bookingsValidation.createBookingRequest`, `payrollValidation.validatePartnerIdParam`).
   - **Unvalidated route params / queries**: Routes in `quotationsRoutes` (`GET /`, `POST /:id/accept`, `DELETE /:id`), `adminRoutes` (`GET /consumers/:id/addresses`, `GET /consumers/:id/bookings`, `GET /partners/:id/operational-status`, `GET /quotations`), and `zonesRoutes` (`GET /:zoneId`, `DELETE /:zoneId`) omit validation middleware and parse raw parameters directly in controllers.
2. **URL Parameter Naming Divergence**:
   - For booking IDs: `bookingsRoutes` uses `:bookingId` on `/:bookingId`, `/:bookingId/cancel`, `/:bookingId/transition`, but switches to `:id` on `/:id/reschedule`, `photosRoutes` (`/:id/photos`), `contactRoutes` (`/:id/contact/partner`), and `etaRoutes` (`/:id/eta`).
   - For partner IDs: `adminRoutes` and `partnerZonesRoutes` use `:id` (`/partners/:id/zones`), whereas `reviewsRoutes` uses `:partnerId` (`/partner/:partnerId`) and `adminSkillsRoutes` uses `:serviceId` vs `:id`.
3. **HTTP Verb Inconsistency on Resource Updates**:
   - Almost all update operations use `PATCH` (e.g. `PATCH /consumers/me`, `PATCH /partners/me`, `PATCH /services/:serviceId`, `PATCH /admin/disputes/:id`, `PATCH /slots/:slotId/capacity`, `PATCH /admin/payouts/:id/status`, `PATCH /notifications/:id/read`).
   - `pricingRoutes` and `platformPricingRoutes` use `PUT` (`PUT /admin/zones/:zoneId/price-overrides/:overrideId`, `PUT /admin/pricing-settings`, `PUT /admin/partners/:id/attendance/:period`).
4. **Admin Role Authorization Granularity**:
   - Sub-role middlewares (`requireOperationsAdmin`, `requireFinanceAdmin`, `requireSuperAdmin`) are strictly applied on specific operational tasks (e.g. payout management, partner approvals, dispatch retries).
   - Other admin endpoints accept any admin token with `requireAuth(["ADMIN"])` without role distinction (e.g. `listConsumers`, `getConsumer`, `listPartners`, `getKPIs`, `getRevenueAnalytics`, `listZones`, `createZone`, `updateZone`, `listOverrides`, `createOverride`).
5. **Rate Limiting Application**:
   - Dedicated limiters protect auth endpoints (`loginRateLimiter`), location endpoints (`geocodingRequestLimiter`), uploads (`presignUploadRateLimiter`), and contact reveals (`contactRateLimiter`).
   - Critical data export `GET /api/v1/admin/export/bookings` and admin analytics lack dedicated rate limiting and rely only on generic top-level limiter.
