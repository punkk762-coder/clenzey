# Implementation Plan

## Overview

Bugfix implementation for service screens UI polish. Replaces custom `TouchableOpacity` toggles with react-native-paper `SegmentedButtons`, adds decorative `View` accent elements to cards, increases checkout card elevation, and applies compact/dense sizing — all in-place modifications to `apps/consumer/app/services/[id].tsx` and `apps/consumer/app/booking/create.tsx`.

## Tasks

- [ ] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Custom TouchableOpacity Toggles and Plain Cards
  - **IMPORTANT**: Write this property-based test BEFORE implementing the fix
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: Scope the property to the concrete failing cases: screens that render toggles and cards
  - Test that `services/[id].tsx` Quick Shine layout renders `SegmentedButtons` for Instant/Schedule toggle (from Bug Condition: `screen.hasInstantScheduleToggle AND NOT usesSegmentedButtons(screen.instantScheduleToggle)`)
  - Test that `services/[id].tsx` Deep Cleaning layout renders `SegmentedButtons` for Service Type toggle (from Bug Condition: same condition for Deep Cleaning branch)
  - Test that `booking/create.tsx` renders `SegmentedButtons` for payment mode toggle (from Bug Condition: `usesCustomTouchableOpacity(screen.interactiveElements)`)
  - Test that add-on cards contain decorative accent `View` elements with `position: 'absolute'` styling (from Bug Condition: `screen.hasCards AND NOT hasDecorativeAccents(screen.cards)`)
  - Test that checkout cards use `elevation` >= 3 (from Bug Condition: `screen.isCheckout AND screen.cardElevation <= 2`)
  - Test that `TextInput` components have `dense` prop and `Button` components have `compact` prop (from Bug Condition: `screen.hasInputsOrButtons AND NOT usesCompactSizing`)
  - Run test on UNFIXED code - expect FAILURE (this confirms the bug exists)
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found (e.g., "Quick Shine toggle renders TouchableOpacity instead of SegmentedButtons", "Add-on cards have no absolute-positioned decorative Views")
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9_

- [ ] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Functional Behavior Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - **IMPORTANT**: Write these tests BEFORE implementing the fix
  - Observe: selecting a variant updates `selectedVariantId` state and triggers estimate re-fetch on unfixed code
  - Observe: toggling an add-on updates `selectedAddonIds` array on unfixed code
  - Observe: tapping "Book Now" navigates to `/booking/create` with correct `serviceId`, `variantId`, `addonIds` params on unfixed code
  - Observe: selecting an address sets `selectedAddressId` / `activeAddressId` on unfixed code
  - Observe: selecting a payment mode sets `paymentMode` state on unfixed code
  - Observe: coupon code and notes values pass to the payment screen on unfixed code
  - Write property-based test: for all variant selections, `selectedVariantId` updates correctly and estimate hook is called with new variantId (from Preservation Requirements 3.1)
  - Write property-based test: for all add-on toggle combinations, `selectedAddonIds` state reflects the toggled set (from Preservation Requirements 3.2)
  - Write property-based test: for all valid booking configurations, "Book Now" navigates with correct params (from Preservation Requirements 3.3)
  - Write property-based test: for all address/payment/coupon/notes combinations, `handlePay` navigates with correct params (from Preservation Requirements 3.4, 3.5)
  - Verify tests PASS on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

- [ ] 3. Fix for service screens UI polish — replace custom toggles with SegmentedButtons, add decorative accents, increase elevation, apply compact sizing

  - [ ] 3.1 Replace Quick Shine Instant/Schedule toggle with SegmentedButtons in `apps/consumer/app/services/[id].tsx`
    - Import `SegmentedButtons` from `react-native-paper`
    - Remove the custom `toggleContainer` with two `TouchableOpacity` buttons in `renderQuickShineLayout()`
    - Render `<SegmentedButtons value={bookingType} onValueChange={setBookingType} buttons={[{value: 'INSTANT', label: 'Instant'}, {value: 'SCHEDULE', label: 'Schedule'}]} />`
    - Remove unused `toggleContainer`, `toggleBtn`, `toggleBtnActive`, `toggleText`, `toggleTextActive` styles (after all toggle replacements are done)
    - _Bug_Condition: isBugCondition(screen) where screen.hasInstantScheduleToggle AND NOT usesSegmentedButtons_
    - _Expected_Behavior: screen renders SegmentedButtons with correct value and buttons props_
    - _Preservation: bookingType state must still update correctly on toggle_
    - _Requirements: 1.1, 2.1, 2.7_

  - [ ] 3.2 Replace Deep Cleaning Service Type toggle with SegmentedButtons in `apps/consumer/app/services/[id].tsx`
    - Remove the `serviceTypeRow` with two `TouchableOpacity` cards (Instant with Clock01Icon, Schedule with Calendar01Icon) in `renderDeepCleaningLayout()`
    - Render `<SegmentedButtons value={bookingType} onValueChange={setBookingType} buttons={[{value: 'INSTANT', label: 'Instant'}, {value: 'SCHEDULE', label: 'Schedule'}]} />`
    - Remove unused `serviceTypeRow`, `serviceTypeCard`, `serviceTypeCardActive`, `serviceTypeIcon`, `serviceTypeIconActive`, `serviceTypeTitle`, `serviceTypeTitleActive`, `serviceTypeDesc` styles
    - _Bug_Condition: isBugCondition(screen) where Deep Cleaning uses custom TouchableOpacity cards for service type_
    - _Expected_Behavior: Deep Cleaning renders same SegmentedButtons as Quick Shine for consistency_
    - _Preservation: bookingType state must still update correctly on toggle_
    - _Requirements: 1.2, 2.1, 2.7_

  - [ ] 3.3 Replace checkout payment mode toggle with SegmentedButtons in `apps/consumer/app/booking/create.tsx`
    - Import `SegmentedButtons` from `react-native-paper`
    - Remove the custom `toggleContainer` with two `TouchableOpacity` buttons (Online/Cash) in `CheckoutScreen`
    - Render `<SegmentedButtons value={paymentMode} onValueChange={setPaymentMode} buttons={[{value: 'RAZORPAY', label: 'Online'}, {value: 'CASH', label: 'Cash'}]} />`
    - Remove unused toggle styles from `styles` StyleSheet in create.tsx
    - _Bug_Condition: isBugCondition(screen) where checkout uses custom TouchableOpacity for payment mode_
    - _Expected_Behavior: checkout renders SegmentedButtons for payment mode selection_
    - _Preservation: paymentMode state must still update correctly on toggle_
    - _Requirements: 1.8, 2.7_

  - [ ] 3.4 Add decorative accents to Quick Shine add-on cards in `apps/consumer/app/services/[id].tsx`
    - Add `overflow: 'hidden'` to the `addonCard` style
    - Inside each add-on card, add absolute-positioned decorative `View` elements:
      - Small circle: `{ position: 'absolute', top: -4, right: -4, width: 24, height: 24, borderRadius: 12, backgroundColor: '#EEF2FF' }`
      - Rounded rectangle: `{ position: 'absolute', bottom: -2, left: 8, width: 32, height: 8, borderRadius: 4, backgroundColor: '#F0F4FF' }`
    - _Bug_Condition: isBugCondition(screen) where cards have no decorative accents_
    - _Expected_Behavior: add-on cards contain decorative View elements with absolute positioning_
    - _Preservation: add-on toggle functionality unchanged_
    - _Requirements: 1.3, 2.2_

  - [ ] 3.5 Add decorative accents to Deep Cleaning inclusion cards in `apps/consumer/app/services/[id].tsx`
    - Add `overflow: 'hidden'` to the `inclusionCard` style
    - Inside each inclusion card, add absolute-positioned decorative `View` elements:
      - Small circle: `{ position: 'absolute', top: -6, right: -6, width: 28, height: 28, borderRadius: 14, backgroundColor: '#EEF2FF' }`
      - Rounded rectangle: `{ position: 'absolute', bottom: -2, left: 6, width: 28, height: 6, borderRadius: 3, backgroundColor: '#F0F4FF' }`
    - _Bug_Condition: isBugCondition(screen) where inclusion cards have flat #F9FAFB background with no decoration_
    - _Expected_Behavior: inclusion cards contain decorative accent shapes_
    - _Preservation: inclusion card content and layout unchanged_
    - _Requirements: 1.4, 2.3_

  - [ ] 3.6 Add decorative accents to Deep Cleaning custom add-on cards in `apps/consumer/app/services/[id].tsx`
    - Add `overflow: 'hidden'` to the `dcAddonCard` style
    - Inside each DC add-on card, add absolute-positioned decorative `View` elements:
      - Small circle: `{ position: 'absolute', top: -4, right: -4, width: 24, height: 24, borderRadius: 12, backgroundColor: '#EEF2FF' }`
      - Rounded rectangle: `{ position: 'absolute', bottom: -2, left: 10, width: 32, height: 8, borderRadius: 4, backgroundColor: '#F0F4FF' }`
    - _Bug_Condition: isBugCondition(screen) where DC add-on cards have plain white background_
    - _Expected_Behavior: DC add-on cards contain decorative accent shapes_
    - _Preservation: add-on toggle functionality unchanged_
    - _Requirements: 1.5, 2.4_

  - [ ] 3.7 Add decorative accents to checkout service summary card and increase card elevation in `apps/consumer/app/booking/create.tsx`
    - Add `overflow: 'hidden'` to the service summary `Card` style
    - Inside the service summary Card.Content, add absolute-positioned decorative `View` elements:
      - Small circle: `{ position: 'absolute', top: -8, right: -8, width: 32, height: 32, borderRadius: 16, backgroundColor: '#EEF2FF' }`
      - Rounded rectangle: `{ position: 'absolute', bottom: -3, left: 12, width: 40, height: 8, borderRadius: 4, backgroundColor: '#F0F4FF' }`
    - Change service summary `Card` elevation from `elevation={2}` to `elevation={3}`
    - Change order summary `Card` elevation from `elevation={2}` to `elevation={3}`
    - _Bug_Condition: isBugCondition(screen) where checkout cards have elevation <= 2 and no decorative accents_
    - _Expected_Behavior: checkout cards have elevation >= 3 and contain decorative accent shapes_
    - _Preservation: card content rendering and estimate display unchanged_
    - _Requirements: 1.6, 1.7, 2.5, 2.6_

  - [ ] 3.8 Apply compact/dense sizing to inputs and buttons in `apps/consumer/app/booking/create.tsx`
    - Add `dense` prop to the coupon code `TextInput` component
    - Add `dense` prop to the notes `TextInput` component
    - Verify the "Add New Address" `Button` already has `compact` prop (it does) — no change needed
    - _Bug_Condition: isBugCondition(screen) where inputs/buttons use default/large sizing_
    - _Expected_Behavior: TextInput components use dense mode, Button components use compact mode_
    - _Preservation: input values and state bindings unchanged_
    - _Requirements: 1.9, 2.8_

  - [ ] 3.9 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - SegmentedButtons and Decorated Cards Render Correctly
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior (SegmentedButtons present, decorative accents present, elevation >= 3, dense/compact applied)
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9_

  - [ ] 3.10 Verify preservation tests still pass
    - **Property 2: Preservation** - Functional Behavior Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix (no regressions introduced)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

- [ ] 4. Checkpoint - Ensure all tests pass
  - Run `npx tsc --noEmit` to verify no TypeScript errors in modified files
  - Run `npx jest --passWithNoTests` to ensure existing tests still pass
  - Verify the app renders without crashes (no runtime import errors from SegmentedButtons)
  - Ensure all exploration tests (Property 1) pass after fix
  - Ensure all preservation tests (Property 2) pass after fix
  - Confirm no new files or components were created — all changes are in-place (Requirement 2.9)
  - Ask the user if questions arise


## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1", "2"] },
    { "id": 1, "tasks": ["3.1", "3.2", "3.3", "3.4", "3.5", "3.6", "3.7", "3.8"] },
    { "id": 2, "tasks": ["3.9"] },
    { "id": 3, "tasks": ["3.10"] },
    { "id": 4, "tasks": ["4"] }
  ]
}
```

## Notes

- All changes are in-place — no new files or components should be created
- The project uses `jest-expo` for testing; run tests with `npx jest --passWithNoTests`
- TypeScript checking: `npx tsc --noEmit`
- `SegmentedButtons` is available in `react-native-paper` v5.15.3 (already installed)
- Since this is purely visual/UI polish, testing is lighter weight — focus on render verification and state preservation
