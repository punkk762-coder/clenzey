# Implementation Plan

## Overview

Replace the generic checkout UI in `apps/consumer/app/booking/create.tsx` with the service-specific Quick Shine booking screen. This includes adding a hero image with category badge, duration selection pills, INSTANT/SCHEDULE toggle, add-on checkboxes with prices, and a sticky bottom bar with estimated total and "Book Now" button. Existing data-fetching (`useServiceById`, `useEstimate`) and navigation logic must be preserved.

## Tasks

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Booking Screen Renders Service-Specific UI
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the booking screen renders a generic checkout instead of the service-specific booking UI
  - **Scoped PBT Approach**: Scope the property to a concrete case: render `CheckoutScreen` with `serviceId=qs1`, `variantId=v1`, and mock service data containing variants and add-ons
  - Create test file at `apps/consumer/src/components/__tests__/BookingCreateScreen.test.tsx`
  - Mock `useServiceById` to return a service with category "QUICK_SHINE", name "Express Home Polish", variants [{id:'v1', name:'30 Mins', duration:30, price:29}, {id:'v2', name:'60 Mins', duration:60, price:49}, {id:'v3', name:'90 Mins', duration:90, price:69}], and addons [{id:'a1', name:'Bathroom', price:15}, {id:'a2', name:'Kitchen', price:25}, {id:'a3', name:'Balcony', price:10}]
  - Mock `useEstimate` to return `{ total: 29, basePrice: 29, addonsTotal: 0, breakdown: [{label:'Base', amount:29}] }`
  - Mock `expo-router` `useLocalSearchParams` and `useRouter`
  - Assert: screen contains text matching "QUICK SHINE" category badge (from Bug Condition `screenRendersHeroImage`)
  - Assert: screen contains touchable duration pill buttons with "30 MINS", "60 MINS", "90 MINS" text (from Bug Condition `screenRendersDurationPills`)
  - Assert: screen contains "INSTANT" and "SCHEDULE" toggle buttons (from Bug Condition `screenRendersBookingTypeToggle`)
  - Assert: screen contains add-on checkbox items with names "Bathroom", "Kitchen", "Balcony" and prices "+$15.00", "+$25.00", "+$10.00" (from Bug Condition `screenRendersAddonCheckboxes`)
  - Assert: screen contains "ESTIMATED TOTAL" text and "Book Now" button in sticky bottom bar (from Bug Condition `screenRendersStickyBottomBar`)
  - Assert: screen does NOT contain "Checkout" heading text (verifying generic checkout is gone)
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists because the screen renders the generic checkout layout)
  - Document counterexamples found: "QUICK SHINE" badge not found, no duration pills, no INSTANT/SCHEDULE toggle, no add-on checkboxes, no sticky bottom bar with "Book Now"
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Data Fetching and Navigation Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Create test file at `apps/consumer/src/components/__tests__/BookingCreatePreservation.test.tsx`
  - Mock `useServiceById`, `useEstimate`, `expo-router` hooks
  - Observe on UNFIXED code: `useServiceById` is called with `serviceId` from route params
  - Observe on UNFIXED code: `useEstimate` is called with `{ serviceId, variantId, addonIds }` matching route params
  - Observe on UNFIXED code: navigating forward passes `serviceId`, `variantId`, and `addonIds` to the next screen
  - Observe on UNFIXED code: when service has no add-ons, no add-on UI section is rendered
  - Write property-based test: for any valid `serviceId`, `useServiceById` is called with that exact serviceId (preservation of data fetching)
  - Write property-based test: for any combination of `variantId` and `addonIds` selections, `useEstimate` receives `{ serviceId, variantId, addonIds }` with correctly shaped params (preservation of estimate calculation)
  - Write property-based test: for any "Book Now" / navigation action, router receives `serviceId`, `variantId`, and comma-joined `addonIds` (preservation of navigation params)
  - Write property-based test: when `service.addons` is empty array, no add-on section elements are rendered (preservation of conditional rendering)
  - Verify tests pass on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3. Fix for Quick Shine booking screen rendering generic checkout instead of service-specific UI

  - [x] 3.1 Replace header and add hero image section
    - In `apps/consumer/app/booking/create.tsx`, remove the generic "Checkout" `Text` heading
    - Add a header row with back arrow (`ArrowLeft01Icon` from `@hugeicons/core-free-icons`) that calls `router.back()` and a Clenzey logo image
    - Below the header, add a hero image section using `Image` with `require('../../assets/quick-shine.png')` or category-mapped image
    - Overlay a semi-transparent gradient on the hero image
    - Add a badge `View` with text showing `service.category` formatted as uppercase (e.g., "QUICK SHINE")
    - Add service name text below the badge (e.g., "Express Home Polish")
    - _Bug_Condition: isBugCondition(input) where screen='/booking/create' AND screenRendersGenericCheckout AND NOT screenRendersHeroImage_
    - _Expected_Behavior: screen SHALL display header with back arrow and logo, hero image with category badge and service name_
    - _Preservation: Existing useServiceById data fetching must remain unchanged_
    - _Requirements: 2.1, 2.2_

  - [x] 3.2 Add duration selection pills from service variants
    - Remove the existing service summary `Card` component that shows variant as text
    - Add a "Select Duration" heading with subtitle text (e.g., "RECOMMENDED FOR STUDIOS")
    - Render `service.variants` as horizontally laid out pill/chip `TouchableOpacity` buttons showing `${variant.duration} MINS`
    - Add state `activeVariantId` initialized from `params.variantId` or first variant ID
    - Selected pill uses `PRIMARY` (#0043BA) background with white text; unselected uses light background (#F1F5F9)
    - On pill press, update `activeVariantId` state which triggers `useEstimate` recalculation
    - _Bug_Condition: isBugCondition(input) where NOT screenRendersDurationPills_
    - _Expected_Behavior: screen SHALL render selectable duration pills with first variant selected by default and highlighted in blue_
    - _Preservation: useEstimate must continue to recalculate when variant selection changes_
    - _Requirements: 2.3, 3.2_

  - [x] 3.3 Add INSTANT/SCHEDULE booking type toggle
    - Remove the existing RAZORPAY/CASH payment mode toggle
    - Add a new toggle component with "INSTANT" and "SCHEDULE" options using the same pill-shaped toggle visual pattern
    - Add state `bookingType: 'INSTANT' | 'SCHEDULE'` defaulting to `'INSTANT'`
    - Active option uses `PRIMARY` background with white text; inactive uses gray text on light background
    - _Bug_Condition: isBugCondition(input) where NOT screenRendersBookingTypeToggle_
    - _Expected_Behavior: screen SHALL display INSTANT/SCHEDULE toggle with INSTANT selected by default and highlighted in blue_
    - _Requirements: 2.4_

  - [x] 3.4 Add add-on checkboxes with prices
    - Remove address selection, coupon input, and notes sections entirely
    - Add "Extra Care Add-ons" section header with an icon
    - Render `service.addons` as checkbox rows: each row has a custom checkbox (square with checkmark when selected), add-on name, and price formatted as `+$${addon.price.toFixed(2)}`
    - Add state `selectedAddonIds: string[]` initialized from `params.addonIds`
    - Toggling a checkbox adds/removes the addon ID from `selectedAddonIds`, which triggers `useEstimate` recalculation
    - When `service.addons` is empty or undefined, hide the entire add-ons section
    - _Bug_Condition: isBugCondition(input) where NOT screenRendersAddonCheckboxes_
    - _Expected_Behavior: screen SHALL display add-ons as checkbox items with icon, name, and "+$X.XX" price format_
    - _Preservation: When service has no add-ons, section must be hidden. Selected addon IDs must be passed to navigation._
    - _Requirements: 2.5, 3.3, 3.5_

  - [x] 3.5 Add sticky bottom bar with estimated total and Book Now button
    - Remove the existing "Pay ₹X" footer button
    - Add a sticky bottom bar (`View` with absolute positioning or SafeAreaView footer) containing:
      - Left side: "ESTIMATED TOTAL" label with `$${estimate?.total?.toFixed(2)}` value below
      - Right side: "Book Now" `TouchableOpacity` or `Button` that navigates forward
    - "Book Now" press calls `router.push` with `{ serviceId, variantId: activeVariantId, addonIds: selectedAddonIds.join(',') }` to `/booking/preview` or next step
    - _Bug_Condition: isBugCondition(input) where NOT screenRendersStickyBottomBar_
    - _Expected_Behavior: screen SHALL display sticky bottom bar with estimated total and "Book Now" button that navigates to next step_
    - _Preservation: Navigation must continue to pass serviceId, variantId, and addonIds parameters_
    - _Requirements: 2.6, 3.4_

  - [x] 3.6 Remove unused imports, state, and code
    - Remove `selectedAddressId`, `paymentMode`, `couponCode`, `notes`, `errorDialog`, `errorMessage` state variables
    - Remove `addresses` query (`useQuery` for addresses)
    - Remove imports: `Location01Icon`, `CreditCardAcceptIcon`, `TextInput`, `Divider`, `Portal`, `Dialog`, `DialogIcon`, `createAddressesEndpoints`, `ActivityIndicator` (if unused)
    - Remove `addressesApi` constant
    - Remove `activeAddressId`, `selectedAddress` useMemo hooks
    - Remove `handlePay` callback (replace with "Book Now" navigation logic)
    - Update `StyleSheet` with new styles for hero image, duration pills, toggle, checkbox rows, and sticky bottom bar
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x] 3.7 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Booking Screen Renders Service-Specific UI
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior (hero image, duration pills, toggle, checkboxes, sticky bar)
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x] 3.8 Verify preservation tests still pass
    - **Property 2: Preservation** - Data Fetching and Navigation Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm useServiceById still called with correct serviceId
    - Confirm useEstimate still receives correct params on variant/addon changes
    - Confirm "Book Now" navigation still passes serviceId, variantId, addonIds
    - Confirm add-ons section hidden when service has no add-ons

- [x] 4. Checkpoint - Ensure all tests pass
  - Run full test suite with `jest --passWithNoTests` in `apps/consumer`
  - Ensure all tests pass, ask the user if questions arise
  - Verify no TypeScript errors with `tsc --noEmit`
  - Confirm the booking screen renders the service-specific UI as designed

## Task Dependency Graph

```json
{
  "waves": [
    {
      "wave": 1,
      "tasks": ["1", "2"],
      "description": "Write exploration and preservation tests before fix"
    },
    {
      "wave": 2,
      "tasks": ["3.1", "3.2", "3.3", "3.4", "3.5", "3.6"],
      "description": "Implement the UI fix: hero image, duration pills, toggle, add-ons, bottom bar, cleanup"
    },
    {
      "wave": 3,
      "tasks": ["3.7", "3.8"],
      "description": "Verify exploration test passes and preservation tests still pass"
    },
    {
      "wave": 4,
      "tasks": ["4"],
      "description": "Final checkpoint - all tests and type checks pass"
    }
  ]
}
```

## Notes

- Tests use `react-test-renderer` with `@tanstack/react-query` QueryClientProvider wrapper pattern (consistent with existing `TrackingSection.test.tsx`)
- Jest is configured with `jest-expo` preset; mocks for expo modules already exist in `jest.setup.js`
- The `useServiceById` and `useEstimate` hooks must be mocked in tests since they depend on API client
- Property-based testing for preservation uses generated combinations of serviceId, variantId, and addonIds to verify hook call patterns remain consistent
