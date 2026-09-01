# Requirements Document

## Introduction

This document defines the requirements for two React Native (Expo) mobile applications — Consumer and Partner — built in a monorepo structure. The apps replace existing Flutter implementations and target the Indian market (INR, +91 country code, Android API 24+). The Consumer app enables users to browse services, book cleaning professionals, manage payments, and track service delivery in real time. The Partner app enables service professionals to manage availability, receive and fulfill booking assignments, and update their location for consumer tracking.

## Glossary

- **Consumer_App**: The React Native (Expo) mobile application used by end customers to browse, book, and pay for cleaning services
- **Partner_App**: The React Native (Expo) mobile application used by cleaning professionals to manage availability and fulfill bookings
- **Monorepo**: A single repository containing both apps and shared packages (API client, types, Socket.IO client, design system)
- **Auth_Module**: The authentication subsystem handling phone OTP-based login for both apps
- **Booking_Engine**: The subsystem responsible for creating, previewing, and managing booking lifecycle
- **Payment_Module**: The subsystem handling Razorpay payment order creation, checkout, and confirmation
- **Location_Service**: The subsystem handling GPS positioning, geocoding, serviceability checks, and background location updates
- **Notification_Service**: The subsystem managing FCM push notifications, device token registration, and in-app notification inbox
- **Socket_Client**: The shared Socket.IO client handling real-time event subscriptions and emissions
- **Design_System**: The shared Horizon Blue themed component library (Inter typography, #0043BA primary, 4px base spacing, 8px/16px rounded shapes)
- **API_Client**: The shared HTTP client for communicating with the backend REST API using Bearer token authentication
- **EAS_Build**: Expo Application Services used to generate production APKs and AABs for Play Store distribution
- **Razorpay_SDK**: The Razorpay React Native SDK used for in-app payment checkout
- **FCM**: Firebase Cloud Messaging used for push notification delivery
- **OTP**: One-Time Password delivered via SMS for phone-based authentication
- **E164_Format**: International phone number format (e.g., +919876543210)
- **Serviceability**: Whether a given geographic location falls within the operational area of Clenzey
- **Booking_Status**: One of PENDING, PAYMENT_PENDING, CONFIRMED, PROFESSIONAL_ASSIGNED, PROFESSIONAL_EN_ROUTE, CHECKED_IN, IN_PROGRESS, COMPLETED, CANCELLED, REFUNDED, NO_SHOW
- **Approval_Status**: The partner account verification state (PENDING, APPROVED, REJECTED)
- **Assignment**: A booking proposed to a partner for acceptance or decline

## Requirements

### Requirement 1: Monorepo Project Structure

**User Story:** As a developer, I want both apps and shared code organized in a monorepo, so that common logic is reused and maintained in one place.

#### Acceptance Criteria

1. THE Monorepo SHALL contain two Expo app workspaces: one for Consumer_App and one for Partner_App
2. THE Monorepo SHALL contain shared packages for API_Client, TypeScript types, Socket_Client, and Design_System
3. THE Monorepo SHALL use a workspace-aware package manager for dependency resolution across packages
4. WHEN a shared package is modified, THE Monorepo SHALL allow both apps to consume the updated code without publishing to a registry

---

### Requirement 2: Consumer Phone OTP Authentication

**User Story:** As a consumer, I want to log in using my phone number and OTP, so that I can securely access my account without a password.

#### Acceptance Criteria

1. WHEN the consumer enters a valid phone number in E164_Format and submits, THE Auth_Module SHALL call POST /api/v1/consumers/auth/initiate with the phone number and store the returned token
2. WHEN the consumer enters the OTP secret and submits, THE Auth_Module SHALL call POST /api/v1/consumers/auth/validate with the token and secret, and store the returned accessToken
3. WHEN the auth/validate response contains isNewUser as true, THE Consumer_App SHALL navigate the consumer to a profile completion screen
4. WHEN the accessToken expires, THE Auth_Module SHALL call POST /api/v1/consumers/auth/refresh using the HttpOnly cookie and store the new accessToken
5. IF the refresh token request fails with a 401 status, THEN THE Auth_Module SHALL clear stored credentials and navigate to the login screen
6. WHEN the consumer triggers logout, THE Auth_Module SHALL call POST /api/v1/consumers/auth/logout and clear all stored credentials and navigation state

---

### Requirement 3: Consumer Profile Management

**User Story:** As a consumer, I want to view and update my profile name, so that partners and the system display my correct identity.

#### Acceptance Criteria

1. WHEN the profile screen loads, THE Consumer_App SHALL call GET /api/v1/consumers/me and display the consumer's full name and phone number
2. WHEN the consumer edits the fullName field and submits, THE Consumer_App SHALL call PATCH /api/v1/consumers/me with the updated fullName and display the response

---

### Requirement 4: Consumer Address Management

**User Story:** As a consumer, I want to manage multiple delivery/service addresses, so that I can quickly select where I need services performed.

#### Acceptance Criteria

1. WHEN the address list screen loads, THE Consumer_App SHALL call GET /api/v1/addresses and display all saved addresses
2. WHEN the consumer adds a new address with all required fields (label max 50 chars, line1 max 200 chars, city, state, pincode matching ^\d{4,8}$), THE Consumer_App SHALL call POST /api/v1/addresses and display the created address
3. WHEN the consumer provides latitude, THE Consumer_App SHALL require longitude to also be provided, and vice versa
4. WHEN the consumer edits an existing address, THE Consumer_App SHALL call PATCH /api/v1/addresses/:addressId with the modified fields
5. WHEN the consumer deletes an address, THE Consumer_App SHALL call DELETE /api/v1/addresses/:addressId and remove it from the list
6. WHEN the consumer sets an address as default, THE Consumer_App SHALL call POST /api/v1/addresses/:addressId/default and update the UI to reflect the new default
7. THE Consumer_App SHALL validate latitude values between -90 and 90, and longitude values between -180 and 180 before submission
8. THE Consumer_App SHALL support address types HOME, WORK, and OTHER

---

### Requirement 5: Location and Serviceability

**User Story:** As a consumer, I want to use GPS or search for locations, so that I can verify serviceability and auto-fill my address details.

#### Acceptance Criteria

1. WHEN the consumer grants GPS permission and requests current location, THE Location_Service SHALL obtain device coordinates and call GET /api/v1/location/reverse-geocode with the latitude and longitude
2. WHEN reverse-geocode returns address and serviceability data, THE Consumer_App SHALL auto-fill the address form fields and display the serviceability status
3. WHEN the consumer types a search query in the location search field, THE Location_Service SHALL call GET /api/v1/location/places/search with the query and display matching predictions
4. WHEN the consumer selects a prediction, THE Location_Service SHALL call GET /api/v1/location/places/details with the placeId and auto-fill the address form
5. WHEN a location is determined (via GPS or search), THE Consumer_App SHALL call GET /api/v1/location/serviceability to check whether the area is served
6. IF the selected location is not serviceable, THEN THE Consumer_App SHALL display a message informing the consumer that services are unavailable at that location

---

### Requirement 6: Service Browsing and Estimation

**User Story:** As a consumer, I want to browse available services and see price estimates, so that I can choose the right service before booking.

#### Acceptance Criteria

1. WHEN the home screen loads, THE Consumer_App SHALL call GET /api/v1/services and display service categories (Quick Shine, Deep Cleaning, Deep Luxe, Corporate) with promotional banners and trust badges
2. WHEN the consumer selects a service, THE Consumer_App SHALL call GET /api/v1/services/:serviceId and display the service detail screen with duration options, variants, instant/schedule toggle, and add-ons
3. WHEN the consumer selects a variant and optional add-ons, THE Consumer_App SHALL call POST /api/v1/services/:serviceId/estimate and display the estimated total price
4. THE Consumer_App SHALL display Deep Cleaning services with property size selection (BHK options), included service items, and custom add-on choices
5. THE Consumer_App SHALL display Corporate services with venue type selection (Office, Shop, Clinic), capacity input, and subscription plan options (ONE_TIME, WEEKLY, MONTHLY)

---

### Requirement 7: Booking Creation and Preview

**User Story:** As a consumer, I want to create bookings for services (instant or scheduled), so that I can get cleaning professionals at my chosen time and location.

#### Acceptance Criteria

1. WHEN the consumer submits a booking with all required fields (serviceId, variantId, addressId, bookingType), THE Booking_Engine SHALL call POST /api/v1/bookings and display the created booking
2. WHEN bookingType is SCHEDULED and no timeSlotId is provided, THE Booking_Engine SHALL require scheduledAt in ISO datetime format
3. WHEN the consumer requests a booking preview, THE Booking_Engine SHALL call POST /api/v1/bookings/preview and display the price breakdown before final submission
4. THE Consumer_App SHALL allow the consumer to specify optional fields: subVariantId, addonIds (array of UUIDs), subscriptionPlan, paymentMode (RAZORPAY or CASH), couponCode (max 40 chars), consumerNotes (max 1000 chars), and bookingName (max 200 chars)
5. WHEN the consumer selects RAZORPAY as paymentMode, THE Booking_Engine SHALL create the booking in PENDING status and initiate the payment flow

---

### Requirement 8: Payment Processing

**User Story:** As a consumer, I want to pay for my booking via Razorpay (UPI, Card) or Cash, so that my booking is confirmed and a professional is assigned.

#### Acceptance Criteria

1. WHEN the booking is created with RAZORPAY payment mode, THE Payment_Module SHALL call POST /api/v1/payments/orders with the bookingId and receive a Razorpay order
2. WHEN the payment order is created, THE Payment_Module SHALL open the Razorpay_SDK checkout screen with UPI and Card payment options
3. WHEN the Razorpay_SDK returns a success callback with razorpayOrderId, razorpayPaymentId, and razorpaySignature, THE Payment_Module SHALL call POST /api/v1/payments/confirm with those values
4. WHEN payment confirmation succeeds, THE Consumer_App SHALL display a payment success screen and the booking status SHALL transition to CONFIRMED
5. IF the Razorpay_SDK returns a failure callback, THEN THE Payment_Module SHALL display a payment failure message and allow the consumer to retry
6. WHEN the consumer selects CASH payment mode, THE Booking_Engine SHALL create the booking and transition it to CONFIRMED without payment processing

---

### Requirement 9: Coupon Validation

**User Story:** As a consumer, I want to apply a coupon code to my booking, so that I can receive a discount on the service price.

#### Acceptance Criteria

1. WHEN the consumer enters a coupon code and submits for validation, THE Consumer_App SHALL call POST /api/v1/coupons/validate with the code, booking amount, and optional serviceId and serviceCategory
2. WHEN the coupon is valid, THE Consumer_App SHALL display the discount amount and update the booking total in the preview
3. IF the coupon validation returns an error, THEN THE Consumer_App SHALL display the error message from the API response

---

### Requirement 10: Booking Management

**User Story:** As a consumer, I want to view, cancel, and reschedule my bookings, so that I can manage my service appointments.

#### Acceptance Criteria

1. WHEN the bookings screen loads, THE Consumer_App SHALL call GET /api/v1/bookings with optional status filter, limit, and offset parameters and display the paginated booking list
2. WHEN the consumer selects a booking, THE Consumer_App SHALL call GET /api/v1/bookings/:bookingId and display the full booking details including current status
3. WHEN the consumer cancels a booking, THE Consumer_App SHALL call POST /api/v1/bookings/:bookingId/cancel with an optional reason and update the booking status to CANCELLED
4. WHEN the consumer reschedules a booking, THE Consumer_App SHALL call POST /api/v1/bookings/:id/reschedule with the newScheduledAt datetime and optional timeSlotId

---

### Requirement 11: Real-Time Booking Tracking

**User Story:** As a consumer, I want to track my assigned partner's location in real time, so that I know when the professional will arrive.

#### Acceptance Criteria

1. WHEN a booking reaches PROFESSIONAL_ASSIGNED status, THE Socket_Client SHALL emit booking:subscribe with the bookingId to join the booking room
2. WHEN the server emits partner:location_stream, THE Consumer_App SHALL display the partner's latitude, longitude, heading, and etaMinutes on a map
3. WHEN the server emits eta:updated, THE Consumer_App SHALL update the displayed ETA
4. WHEN the server emits partner:location_stale (no ping for 30 seconds), THE Consumer_App SHALL display a notification that partner location is temporarily unavailable
5. WHEN the server emits booking:status_changed, THE Consumer_App SHALL update the booking status display in real time
6. WHEN the consumer leaves the booking tracking screen, THE Socket_Client SHALL emit booking:unsubscribe with the bookingId

---

### Requirement 12: Consumer Push Notifications

**User Story:** As a consumer, I want to receive push notifications for booking updates, so that I am informed of important events without checking the app.

#### Acceptance Criteria

1. WHEN the consumer grants notification permission, THE Notification_Service SHALL obtain the FCM device token via expo-notifications and call POST /api/v1/consumers/device-token with the token and platform (ANDROID)
2. WHEN the consumer receives a push notification for booking confirmed, partner assigned, partner en-route, booking completed, or payment captured/failed, THE Consumer_App SHALL display the notification
3. WHEN the consumer logs out, THE Notification_Service SHALL call DELETE /api/v1/consumers/device-token to unregister the token
4. WHEN the notifications inbox screen loads, THE Consumer_App SHALL call GET /api/v1/notifications with optional isRead filter, limit, and offset and display the notification list with unreadCount
5. WHEN the consumer marks a notification as read, THE Consumer_App SHALL call PATCH /api/v1/notifications/:id/read
6. WHEN the consumer marks all notifications as read, THE Consumer_App SHALL call POST /api/v1/notifications/read-all

---

### Requirement 13: Consumer Reviews and Ratings

**User Story:** As a consumer, I want to rate and review my completed bookings, so that I can provide feedback on the service quality.

#### Acceptance Criteria

1. WHEN a booking status is COMPLETED, THE Consumer_App SHALL prompt the consumer to submit a rating
2. WHEN the consumer submits a review with a rating (integer 1 to 5) and optional review text (max 1000 chars), THE Consumer_App SHALL call POST /api/v1/reviews with the bookingId, rating, and review
3. WHEN viewing a partner's profile, THE Consumer_App SHALL call GET /api/v1/reviews/partner/:partnerId and display the reviews, total count, and averageRating

---

### Requirement 14: Consumer Contact Partner

**User Story:** As a consumer, I want to contact my assigned partner during a booking, so that I can provide directions or coordinate arrival.

#### Acceptance Criteria

1. WHILE a booking is in PROFESSIONAL_ASSIGNED, PROFESSIONAL_EN_ROUTE, CHECKED_IN, or IN_PROGRESS status, THE Consumer_App SHALL display a contact option
2. WHEN the consumer taps the contact option, THE Consumer_App SHALL call GET /api/v1/bookings/:id/contact/partner and initiate a phone call to the returned partner phone number

---

### Requirement 15: Quotations and Site Visits

**User Story:** As a consumer, I want to request site visit quotations for complex services, so that I can get an accurate estimate before committing.

#### Acceptance Criteria

1. WHEN the consumer submits a quotation request with name, phone, address, and optional notes/preferredTime/serviceId/variantId, THE Consumer_App SHALL call POST /api/v1/quotations and display a confirmation
2. WHEN the quotation list screen loads, THE Consumer_App SHALL call GET /api/v1/quotations and display all submitted quotations
3. WHEN the consumer accepts a quotation, THE Consumer_App SHALL call POST /api/v1/quotations/:id/accept
4. WHEN the consumer cancels a quotation, THE Consumer_App SHALL call DELETE /api/v1/quotations/:id

---

### Requirement 16: Referral Sharing

**User Story:** As a consumer, I want to share a referral code with friends, so that both parties receive benefits when the code is used.

#### Acceptance Criteria

1. THE Consumer_App SHALL display a referral screen showing the consumer's unique referral code
2. WHEN the consumer taps the share button, THE Consumer_App SHALL invoke the device's native share sheet with a pre-formatted referral message containing the code
3. THE Consumer_App SHALL provide an input field for applying a received referral code

---

### Requirement 17: Partner Phone OTP Authentication

**User Story:** As a partner, I want to log in using my phone number and OTP, so that I can securely access the partner portal.

#### Acceptance Criteria

1. WHEN the partner enters a valid phone number and submits, THE Auth_Module SHALL call POST /api/v1/partners/auth/initiate with the phone number and store the returned token
2. WHEN the partner enters the OTP secret and submits (with optional fullName for new partners), THE Auth_Module SHALL call POST /api/v1/partners/auth/validate with token, secret, and fullName, and store the returned accessToken
3. WHEN auth/validate returns approvalStatus as PENDING, THE Partner_App SHALL navigate to the pending approval screen and prevent access to the main app
4. WHEN auth/validate returns approvalStatus as APPROVED, THE Partner_App SHALL navigate to the main dashboard
5. WHEN the accessToken expires, THE Auth_Module SHALL call POST /api/v1/partners/auth/refresh using the HttpOnly cookie and store the new accessToken
6. IF the refresh token request fails with a 401 status, THEN THE Auth_Module SHALL clear stored credentials and navigate to the login screen
7. WHEN the partner triggers logout, THE Auth_Module SHALL call POST /api/v1/partners/auth/logout and clear all stored credentials

---

### Requirement 18: Partner Approval Pending Screen

**User Story:** As a new partner, I want to see a clear pending approval screen, so that I understand my account is under review and cannot access features until approved.

#### Acceptance Criteria

1. WHILE the partner's approvalStatus is PENDING, THE Partner_App SHALL display a dedicated pending approval screen with a status message
2. WHILE the partner's approvalStatus is PENDING, THE Partner_App SHALL prevent navigation to the main dashboard or any operational features
3. WHILE the partner's approvalStatus is REJECTED, THE Partner_App SHALL display a rejection message with appropriate guidance

---

### Requirement 19: Partner Availability Management

**User Story:** As a partner, I want to set my weekly availability schedule, so that I only receive booking assignments during my working hours.

#### Acceptance Criteria

1. WHEN the availability screen loads, THE Partner_App SHALL call GET /api/v1/partners/availability and display the current weekly schedule
2. WHEN the partner adds an availability slot with dayOfWeek (SUN through SAT), startHour (0-23), and endHour (1-24, greater than startHour), THE Partner_App SHALL call POST /api/v1/partners/availability and display the new slot
3. WHEN the partner removes an availability slot, THE Partner_App SHALL call DELETE /api/v1/partners/availability/:availabilityId and remove it from the display

---

### Requirement 20: Partner Online/Offline Toggle

**User Story:** As a partner, I want to toggle my online status, so that I control when I am available to receive new booking assignments.

#### Acceptance Criteria

1. THE Partner_App SHALL display a prominent online/offline toggle on the main dashboard
2. WHEN the partner toggles online status, THE Partner_App SHALL call POST /api/v1/partners/online with the new isOnline value and update the UI immediately
3. WHEN the partner goes offline, THE Partner_App SHALL stop background location pinging

---

### Requirement 21: Partner Background Location Tracking

**User Story:** As a partner, I want my location to be tracked in the background while I am online, so that consumers can see my real-time position during active bookings.

#### Acceptance Criteria

1. WHILE the partner is online, THE Location_Service SHALL obtain the device GPS position and call POST /api/v1/partners/location with latitude, longitude, heading, speed, and isOnline at intervals between 5 and 10 seconds
2. WHILE the partner is online, THE Location_Service SHALL continue sending location updates even when the Partner_App is in the background
3. WHEN the partner goes offline or logs out, THE Location_Service SHALL stop all background location tracking
4. IF the device GPS is unavailable, THEN THE Location_Service SHALL retry obtaining the position and report the last known location

---

### Requirement 22: Partner Booking Assignments

**User Story:** As a partner, I want to receive, accept, or decline booking assignment proposals, so that I can choose which jobs to fulfill.

#### Acceptance Criteria

1. WHEN the server emits booking:partner_proposed via Socket_Client, THE Partner_App SHALL display a prominent assignment notification with booking details
2. WHEN the assignments screen loads, THE Partner_App SHALL call GET /api/v1/bookings/assignments/me and display all pending assignments
3. WHEN the partner accepts an assignment, THE Partner_App SHALL call POST /api/v1/bookings/assignments/:assignmentId/accept and update the assignment status
4. WHEN the partner declines an assignment with an optional reason (max 500 chars), THE Partner_App SHALL call POST /api/v1/bookings/assignments/:assignmentId/decline with the reason

---

### Requirement 23: Partner Booking Status Transitions

**User Story:** As a partner, I want to update booking status as I progress through a job, so that the consumer sees accurate real-time status.

#### Acceptance Criteria

1. WHEN the partner views an assigned booking, THE Partner_App SHALL display the allowed next status transition based on the sequence: PROFESSIONAL_ASSIGNED → PROFESSIONAL_EN_ROUTE → CHECKED_IN → IN_PROGRESS → COMPLETED
2. WHEN the partner triggers a status transition, THE Partner_App SHALL call POST /api/v1/bookings/:bookingId/transition with the toStatus and optional reason/metadata
3. WHEN the partner cancels a booking, THE Partner_App SHALL call POST /api/v1/bookings/:bookingId/cancel with an optional reason
4. THE Partner_App SHALL prevent the partner from skipping statuses in the transition sequence

---

### Requirement 24: Partner Push Notifications

**User Story:** As a partner, I want to receive push notifications for new assignments and booking updates, so that I respond promptly.

#### Acceptance Criteria

1. WHEN the partner grants notification permission, THE Notification_Service SHALL obtain the FCM device token via expo-notifications and call POST /api/v1/partners/device-token with the token and platform (ANDROID)
2. WHEN the partner receives a push notification for a new assignment proposal, THE Partner_App SHALL display the notification with booking summary
3. WHEN the partner logs out, THE Notification_Service SHALL call DELETE /api/v1/partners/device-token to unregister the token
4. WHEN the notifications inbox screen loads, THE Partner_App SHALL call GET /api/v1/notifications with optional isRead filter, limit, and offset and display the notification list with unreadCount
5. WHEN the partner marks a notification as read, THE Partner_App SHALL call PATCH /api/v1/notifications/:id/read
6. WHEN the partner marks all notifications as read, THE Partner_App SHALL call POST /api/v1/notifications/read-all

---

### Requirement 25: Partner Contact Consumer

**User Story:** As a partner, I want to contact the consumer during an active booking, so that I can get directions or coordinate arrival.

#### Acceptance Criteria

1. WHILE a booking is in PROFESSIONAL_EN_ROUTE, CHECKED_IN, or IN_PROGRESS status, THE Partner_App SHALL display a contact consumer option
2. WHEN the partner taps the contact option, THE Partner_App SHALL call GET /api/v1/bookings/:id/contact/consumer and initiate a phone call to the returned consumer phone number

---

### Requirement 26: Partner Reviews (View Only)

**User Story:** As a partner, I want to view my reviews and average rating, so that I can track my service quality.

#### Acceptance Criteria

1. WHEN the partner views the reviews screen, THE Partner_App SHALL call GET /api/v1/reviews/partner/:partnerId with limit and offset and display the reviews list, total count, and averageRating

---

### Requirement 27: Socket.IO Real-Time Connection

**User Story:** As a user, I want real-time updates for bookings and service changes, so that I see the latest information without refreshing.

#### Acceptance Criteria

1. WHEN the user is authenticated, THE Socket_Client SHALL establish a connection to the server with auth: { token: accessToken } in the handshake
2. WHEN the consumer connects, THE Socket_Client SHALL auto-join rooms consumer:{userId} and consumers
3. WHEN the partner connects, THE Socket_Client SHALL auto-join room partner:{userId}
4. WHEN the server emits service:created, service:updated, or service:deleted, THE Consumer_App SHALL update the local service data
5. WHEN the server emits quotation:created or quotation:updated, THE Consumer_App SHALL update the local quotation data
6. WHEN the server emits address:created, address:updated, or address:deleted, THE Consumer_App SHALL update the local address data
7. IF the Socket.IO connection is lost, THEN THE Socket_Client SHALL attempt reconnection with exponential backoff

---

### Requirement 28: Design System Implementation

**User Story:** As a developer, I want a shared design system package, so that both apps maintain visual consistency with the Horizon Blue theme.

#### Acceptance Criteria

1. THE Design_System SHALL define the primary color as #0043BA, secondary as #7C7AAD, tertiary as #F0EDFF, neutral as #6DBAA1, and surface background as #e6fff4
2. THE Design_System SHALL use Inter font family across all typography levels: Headlines 24-32px bold, Body 14-16px regular, Labels 12px semi-bold
3. THE Design_System SHALL use a 4px base spacing unit with 16px gutters and mobile margins
4. THE Design_System SHALL apply 8px border radius for standard components and 16px border radius for cards and modals
5. THE Design_System SHALL export reusable components consumed by both Consumer_App and Partner_App

---

### Requirement 29: API Client and Error Handling

**User Story:** As a developer, I want a shared API client with consistent error handling, so that all API communication follows the same patterns.

#### Acceptance Criteria

1. THE API_Client SHALL attach the Authorization: Bearer <accessToken> header to all protected endpoint requests
2. WHEN the API returns a success response, THE API_Client SHALL extract and return the data field from the envelope { success: true, data: {...} }
3. WHEN the API returns an error response, THE API_Client SHALL extract the message and error.code from the envelope { success: false, message, error: { code, details } } and propagate a structured error
4. WHEN the API returns a 401 status on a protected endpoint, THE API_Client SHALL trigger the token refresh flow before retrying the request
5. IF the token refresh also fails, THEN THE API_Client SHALL trigger the logout flow

---

### Requirement 30: Build and Distribution

**User Story:** As a developer, I want production builds generated via EAS Build, so that both apps are distributed to the Play Store as APKs and AABs.

#### Acceptance Criteria

1. THE EAS_Build configuration SHALL target Android API 24 (Android 7.0) as the minimum SDK version
2. THE EAS_Build configuration SHALL produce both APK and AAB artifacts for each app
3. THE Monorepo SHALL contain separate EAS Build profiles for Consumer_App and Partner_App
4. THE Consumer_App and Partner_App SHALL each have distinct application identifiers and display names

---

### Requirement 31: Consumer ETA Display

**User Story:** As a consumer, I want to see the estimated time of arrival for my assigned partner, so that I can prepare for the service.

#### Acceptance Criteria

1. WHILE a booking is in PROFESSIONAL_EN_ROUTE status, THE Consumer_App SHALL call GET /api/v1/bookings/:id/eta and display the etaMinutes value
2. WHEN the server emits eta:updated via Socket_Client, THE Consumer_App SHALL update the displayed ETA in real time

---

### Requirement 32: Bottom Navigation Structure

**User Story:** As a consumer, I want consistent bottom navigation, so that I can quickly access Home, Bookings, and Profile sections.

#### Acceptance Criteria

1. THE Consumer_App SHALL display a bottom navigation bar with three tabs: Home, Bookings, and Profile
2. WHEN the consumer taps a navigation tab, THE Consumer_App SHALL navigate to the corresponding screen and highlight the active tab
3. THE Consumer_App SHALL persist the active tab state across screen transitions within the same session
