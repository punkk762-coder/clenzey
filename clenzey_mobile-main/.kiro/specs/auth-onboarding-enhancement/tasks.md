# Implementation Plan: Auth & Onboarding Enhancement

## Overview

This plan implements the full auth and onboarding enhancement across the Clenzey monorepo. Work begins with design system foundations (fonts, components), then builds onboarding and auth screens in both apps, and finishes by wiring everything together with API integration and navigation guards.

## Tasks

- [x] 1. Design System foundations — fonts, TextInput fix, and new shared components
  - [x] 1.1 Upgrade fonts from Inter to Poppins
    - Install `@expo-google-fonts/poppins` in `packages/design-system`
    - Update `packages/design-system/src/theme/useFonts.ts` to load `Poppins_400Regular`, `Poppins_600SemiBold`, `Poppins_700Bold` instead of Inter variants
    - Update `packages/design-system/src/theme/index.ts` typography config to reference Poppins font families
    - Export remains unchanged (`useDesignSystemFonts`)
    - _Requirements: 4.1, 4.2_

  - [x] 1.2 Fix TextInput focus outline
    - In `packages/design-system/src/components/TextInput.tsx`, add `outlineStyle: 'none'` to the `styles.input` StyleSheet entry
    - Verify the focused state only changes border color to `theme.colors.primary` (already implemented)
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 1.3 Create Logo component
    - Create `packages/design-system/src/components/Logo.tsx`
    - Accept `width` prop (default 160) and optional `style` prop
    - Render `<Image>` from `packages/design-system/assets/logo.png` with `resizeMode="contain"`
    - Horizontally center by default
    - On `onError`, hide the image (set internal state to not render, zero height)
    - Export from `packages/design-system/src/components/index.ts` and `packages/design-system/src/index.ts`
    - _Requirements: 2.5, 2.6, 2.7, 2.8_

  - [x] 1.4 Create AuthBackground component
    - Create `packages/design-system/src/components/AuthBackground.tsx`
    - Accept `variant: 'consumer' | 'partner'` and `children` props
    - Render 2–3 abstract shapes (circles, rounded rectangles) using theme colors (`tertiary`, `secondary` at low opacity) with absolute positioning behind children
    - Use `useWindowDimensions()` for proportional scaling
    - Export from component index and package index
    - _Requirements: 5.1, 5.2, 5.5, 5.6, 5.7_

  - [ ]* 1.5 Write unit tests for Logo and AuthBackground components
    - Test Logo renders with correct default width and aspect ratio
    - Test Logo hides gracefully on image load error
    - Test AuthBackground renders children correctly and accepts variant prop
    - _Requirements: 2.5, 2.7, 5.6_

- [x] 2. Font loading with timeout and fallback in app root layouts
  - [x] 2.1 Add font loading timeout to Consumer app root layout
    - In `apps/consumer/app/_layout.tsx`, call `useDesignSystemFonts()` and implement a 5-second timeout with `setTimeout` + state flag (`fontTimedOut`)
    - Show loading indicator while fonts load; proceed with system fallback if timeout elapses
    - Gate rendering on `fontsLoaded || fontTimedOut`
    - _Requirements: 4.3, 4.5_

  - [x] 2.2 Add font loading timeout to Partner app root layout
    - In `apps/partner/app/_layout.tsx`, apply the same font loading + timeout pattern as consumer
    - _Requirements: 4.4, 4.5_

- [x] 3. Onboarding flow implementation
  - [x] 3.1 Create onboarding screen for Consumer app
    - Create `apps/consumer/app/(auth)/onboarding.tsx`
    - Implement swipeable `FlatList` (horizontal, pagingEnabled) with 3 slides introducing consumer features
    - Include page indicator dots showing current position with active dot visually distinct
    - "Skip" button on each screen navigating to login
    - "Next" button on screens 1 and 2; "Get Started" button on screen 3 navigating to login
    - Support both swipe gestures and button navigation
    - On complete or skip: persist via `AsyncStorage.setItem('onboarding_completed', 'true')`
    - _Requirements: 1.1, 1.3, 1.4, 1.5, 1.6, 1.10, 1.13_

  - [x] 3.2 Create onboarding screen for Partner app
    - Create `apps/partner/app/(auth)/onboarding.tsx`
    - Same structure as consumer but with 3 partner-specific slides
    - Same Skip/Next/Get Started buttons and AsyncStorage persistence
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.7, 1.10, 1.13_

  - [x] 3.3 Integrate onboarding check in Consumer app navigation
    - In `apps/consumer/app/_layout.tsx`, read `AsyncStorage.getItem('onboarding_completed')` on launch
    - If null or read fails → navigate to `/(auth)/onboarding`
    - If `'true'` → navigate to `/(auth)/login` (existing auth guard handles the rest)
    - _Requirements: 1.6, 1.8, 1.11_

  - [x] 3.4 Integrate onboarding check in Partner app navigation
    - In `apps/partner/app/_layout.tsx`, apply same onboarding check pattern
    - _Requirements: 1.7, 1.9, 1.12_

  - [ ]* 3.5 Write unit tests for onboarding flow
    - Test that 3 slides render
    - Test Skip button navigates to login and sets AsyncStorage flag
    - Test Get Started on last slide navigates to login and sets AsyncStorage flag
    - Test page indicator reflects current slide index
    - _Requirements: 1.1, 1.3, 1.5, 1.6_

- [x] 4. Checkpoint — Verify design system and onboarding
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Form validation utilities
  - [x] 5.1 Create validation utility functions
    - Create `apps/consumer/src/utils/validation.ts` and `apps/partner/src/utils/validation.ts`
    - Implement pure functions: `validateEmail`, `validatePhone`, `validatePassword`, `validateFullName` (partner only)
    - Implement `validateLoginForm(identifier, password)` and `validateSignupForm(form)` returning `{ isValid, errors }`
    - Email regex: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
    - Phone: exactly 10 digits
    - Password: 6–128 characters
    - Full name (partner): 2–100 characters
    - _Requirements: 6.10, 6.13, 7.10, 7.14, 7.15_

  - [ ]* 5.2 Write property test for validation determinism
    - **Property 4: Input Validation Determinism**
    - For any given input string, validation functions always produce the same output (pure, no side effects)
    - Use fast-check to generate arbitrary strings and verify idempotent results
    - **Validates: Requirements 6.10, 6.13, 7.10, 7.14, 7.15**

  - [ ]* 5.3 Write unit tests for validation functions
    - Test `validateEmail` with valid/invalid emails, edge cases (empty, spaces, missing domain)
    - Test `validatePhone` with valid 10-digit, too short, too long, non-digits
    - Test `validatePassword` with min (6), max (128), too short, empty
    - Test `validateFullName` with min (2), max (100), too short
    - _Requirements: 6.10, 7.10, 7.14_

- [x] 6. API service layer for email/password auth
  - [x] 6.1 Add signin and signup API functions to Consumer app
    - In `apps/consumer/src/lib/api.ts`, add `consumerSignIn(identifier, password)` → POST `/api/v1/consumers/auth/signin`
    - Add `consumerSignUp({ email, password, phone })` → POST `/api/v1/consumers/auth/signup`
    - Define `AuthResponse` type with `accessToken` and `user` fields
    - _Requirements: 6.4, 7.5_

  - [x] 6.2 Add signin and signup API functions to Partner app
    - In `apps/partner/src/lib/api.ts`, add `partnerSignIn(identifier, password)` → POST `/api/v1/partners/auth/signin`
    - Add `partnerSignUp({ email, fullName, password, phone })` → POST `/api/v1/partners/auth/signup`
    - Define `AuthResponse` type with `accessToken`, `user` (including `approvalStatus`)
    - _Requirements: 6.5, 7.6_

- [x] 7. Redesign Login screen with OTP/Password tabs
  - [x] 7.1 Redesign Consumer Login screen
    - Rewrite `apps/consumer/app/(auth)/login.tsx`
    - Add `AuthBackground` with variant `'consumer'` wrapping the screen
    - Add `Logo` component above the form with minimum 24px spacing below
    - Implement tab bar with two modes: OTP (default) and Password
    - OTP tab: existing phone input → send OTP flow (unchanged logic)
    - Password tab: identifier field (email or phone) + password field with visibility toggle
    - Client-side validation: identifier must be valid email or 10-digit phone; password ≥ 6 chars; submit disabled until valid
    - On submit: call `consumerSignIn` → store token + user → navigate to main app
    - Display API error messages below form; loading state disables submit
    - Add "Don't have an account? Sign Up" link navigating to `/(auth)/signup`
    - Inline validation error messages on field blur
    - _Requirements: 2.1, 5.1, 6.1, 6.3, 6.4, 6.6, 6.8, 6.9, 6.10, 6.11, 6.12, 6.13_

  - [x] 7.2 Redesign Partner Login screen
    - Rewrite `apps/partner/app/(auth)/login.tsx` with same pattern as consumer
    - Use `AuthBackground` with variant `'partner'`
    - On successful password signin: check `approvalStatus` — if APPROVED → main app, if PENDING → pending-approval screen
    - Call `partnerSignIn` for password mode
    - _Requirements: 2.2, 5.2, 6.2, 6.3, 6.5, 6.7, 6.8, 6.9, 6.10, 6.11, 6.12, 6.13_

  - [ ]* 7.3 Write property test for tab state isolation
    - **Property 5: Tab State Isolation**
    - Switching between OTP and Password tabs does not carry over form state between tabs
    - **Validates: Requirements 6.3**

  - [ ]* 7.4 Write integration tests for Login screen
    - Test OTP flow: enter phone → tap send → navigates to OTP screen
    - Test Password flow: enter credentials → mock API success → navigates to main
    - Test API error display
    - Test validation prevents submit with invalid input
    - _Requirements: 6.4, 6.8, 6.10_

- [x] 8. Create Signup screens
  - [x] 8.1 Create Consumer Signup screen
    - Create `apps/consumer/app/(auth)/signup.tsx`
    - Wrap in `AuthBackground` variant `'consumer'` + `Logo` with 24px spacing
    - Input fields: email, phone (with +91 prefix display), password
    - Client-side validation using `validateSignupForm`; submit disabled until valid
    - On submit: call `consumerSignUp` → store token + user → navigate to main app
    - Display API errors; preserve field values on error; loading state
    - "Already have an account? Log In" link to login screen
    - Inline error messages per field on validation failure
    - _Requirements: 2.3, 7.1, 7.3, 7.5, 7.7, 7.9, 7.10, 7.11, 7.12, 7.13, 7.15_

  - [x] 8.2 Create Partner Signup screen
    - Create `apps/partner/app/(auth)/signup.tsx`
    - Same pattern but with additional `fullName` field
    - Payload includes `fullName`; calls `partnerSignUp`
    - On success: navigate to pending-approval screen (approvalStatus is PENDING)
    - Validate full name 2–100 characters
    - _Requirements: 2.4, 7.2, 7.4, 7.6, 7.8, 7.9, 7.10, 7.11, 7.12, 7.13, 7.14, 7.15_

  - [ ]* 8.3 Write unit tests for Signup screens
    - Test form validation prevents submit with invalid data
    - Test successful signup stores token and navigates
    - Test API error is displayed and fields are preserved
    - _Requirements: 7.9, 7.10, 7.15_

- [x] 9. Update OTP screens with decorative background
  - [x] 9.1 Add AuthBackground to Consumer OTP screen
    - In `apps/consumer/app/(auth)/otp.tsx`, wrap content in `AuthBackground` variant `'consumer'`
    - Same decorative elements as login screen
    - _Requirements: 5.3_

  - [x] 9.2 Add AuthBackground to Partner OTP screen
    - In `apps/partner/app/(auth)/otp.tsx`, wrap content in `AuthBackground` variant `'partner'`
    - _Requirements: 5.4_

- [x] 10. Checkpoint — Verify all auth screens and integration
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Wire navigation and auth guard updates
  - [x] 11.1 Update Consumer auth navigation guard
    - In `apps/consumer/app/_layout.tsx`, ensure the auth guard correctly handles the new onboarding route
    - Add `/(auth)/onboarding` and `/(auth)/signup` to the Stack.Screen definitions in `(auth)` layout
    - Verify: unauthenticated users → onboarding (if first time) or login; authenticated users → main app
    - _Requirements: 1.8, 1.11, 6.6_

  - [x] 11.2 Update Partner auth navigation guard
    - In `apps/partner/app/_layout.tsx`, same navigation guard updates
    - Ensure partner-specific routing: authenticated + APPROVED → main, PENDING → pending-approval
    - _Requirements: 1.9, 1.12, 6.7_

  - [ ]* 11.3 Write property test for auth state consistency
    - **Property 2: Auth State Consistency**
    - After successful signin/signup, both `accessToken` and `user` are set atomically in the store before navigation
    - **Validates: Requirements 6.6, 6.7, 7.7, 7.8**

  - [ ]* 11.4 Write property test for onboarding idempotency
    - **Property 1: Onboarding Idempotency**
    - Once AsyncStorage flag is `'true'`, onboarding is never shown regardless of relaunch count
    - **Validates: Requirements 1.6, 1.7, 1.8, 1.9**

- [x] 12. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The design system changes (tasks 1.x) must be completed first as all other screens depend on them
- Both apps share the same patterns but have app-specific content and API endpoints

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3", "1.4"] },
    { "id": 1, "tasks": ["1.5", "2.1", "2.2", "5.1"] },
    { "id": 2, "tasks": ["3.1", "3.2", "5.2", "5.3", "6.1", "6.2"] },
    { "id": 3, "tasks": ["3.3", "3.4", "3.5"] },
    { "id": 4, "tasks": ["7.1", "7.2"] },
    { "id": 5, "tasks": ["7.3", "7.4", "8.1", "8.2"] },
    { "id": 6, "tasks": ["8.3", "9.1", "9.2"] },
    { "id": 7, "tasks": ["11.1", "11.2"] },
    { "id": 8, "tasks": ["11.3", "11.4"] }
  ]
}
```
