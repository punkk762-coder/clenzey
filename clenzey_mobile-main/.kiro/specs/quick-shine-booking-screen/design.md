# Quick Shine Booking Screen Bugfix Design

## Overview

The booking creation screen (`apps/consumer/app/booking/create.tsx`) currently renders a generic checkout flow (address selection, payment mode toggle, coupon input, notes field, order summary) instead of the intended service-specific booking experience. The fix replaces the generic checkout UI with a purpose-built screen featuring a hero image with service badge, duration selection pills, instant/schedule toggle, add-on checkboxes with prices, and a sticky bottom bar with estimated total and "Book Now" button. The existing data-fetching hooks (`useServiceById`, `useEstimate`) and navigation parameters remain unchanged.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug — when a user navigates to `/booking/create` for the Quick Shine service, the screen renders a generic checkout layout instead of the intended booking design
- **Property (P)**: The desired behavior — the screen renders hero image, duration pills, instant/schedule toggle, add-on checkboxes, and sticky bottom bar using data from `useServiceById` and `useEstimate`
- **Preservation**: Existing data-fetching, variant/add-on selection state management, price estimation, and forward navigation that must remain unchanged by the fix
- **CheckoutScreen**: The current component in `apps/consumer/app/booking/create.tsx` that renders the generic checkout flow
- **Service**: Type from `@clenzey/types` containing `id`, `name`, `category`, `description`, `variants: ServiceVariant[]`, and `addons: ServiceAddon[]`
- **ServiceVariant**: Type with `id`, `name`, `duration: number`, `price: number`
- **ServiceAddon**: Type with `id`, `name`, `price: number`
- **EstimateResult**: Type from `useEstimate` hook with `total`, `basePrice`, `addonsTotal`, `breakdown[]`

## Bug Details

### Bug Condition

The bug manifests when a user navigates to the booking creation screen for any service. The `CheckoutScreen` component renders a generic "Checkout" heading, address selection, payment method toggle, coupon input, notes field, and order summary instead of the intended design with hero image, duration pills, booking type toggle, add-on checkboxes, and sticky bottom bar.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { screen: string, serviceId: string }
  OUTPUT: boolean
  
  RETURN input.screen == '/booking/create'
         AND serviceExists(input.serviceId)
         AND screenRendersGenericCheckout(input.screen)
         AND NOT screenRendersHeroImage()
         AND NOT screenRendersDurationPills()
         AND NOT screenRendersBookingTypeToggle()
         AND NOT screenRendersAddonCheckboxes()
         AND NOT screenRendersStickyBottomBar()
END FUNCTION
```

### Examples

- User navigates to `/booking/create?serviceId=qs1&variantId=v1` → **Current**: sees "Checkout" heading, address picker, payment mode, coupon field. **Expected**: sees hero image with "QUICK SHINE" badge, "Express Home Polish" title, duration pills (30/60/90 MIN), INSTANT/SCHEDULE toggle, add-on checkboxes, sticky bottom bar with total and "Book Now"
- User navigates to `/booking/create?serviceId=qs1&variantId=v2&addonIds=a1,a2` → **Current**: sees generic order summary card with breakdown. **Expected**: sees pre-selected add-ons checked, duration pill for v2 highlighted, and estimated total in sticky bar
- User taps a duration pill → **Current**: no duration pills exist. **Expected**: selected pill highlights blue, estimate recalculates
- User toggles add-on checkbox → **Current**: no add-on checkboxes exist on this screen. **Expected**: checkbox toggles, estimated total updates in sticky bar

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Service data fetching via `useServiceById(serviceId)` hook must continue to work
- Price estimation via `useEstimate({ serviceId, variantId, addonIds })` hook must continue to recalculate when selections change
- Forward navigation to the next step must continue to pass `serviceId`, `variantId`, and `addonIds` parameters
- When a service has no add-ons, the add-ons section must be hidden
- The first variant must be auto-selected by default when no `variantId` is provided

**Scope:**
All data-fetching logic, state management for variant/add-on selection, estimate calculation triggers, and navigation parameter passing should be completely unaffected by this UI fix. This includes:
- `useServiceById` query key and fetch logic
- `useEstimate` query key, params shape, and enabled condition
- Router push to `/booking/payment` with all required params
- React Query caching behavior

## Hypothesized Root Cause

Based on the bug description, the root cause is a **UI implementation mismatch** — the screen was built as a generic checkout flow rather than the intended service-specific booking screen:

1. **Wrong Screen Layout**: The component renders address selection, payment method, coupon, and notes sections that belong in a later checkout step, not the initial booking configuration step

2. **Missing Hero Section**: No `Image` component with overlay badge and service name is rendered at the top of the screen

3. **Missing Duration Pills**: Service variants are shown as a text summary inside a Card instead of as selectable pill/chip buttons

4. **Missing Booking Type Toggle**: An INSTANT/SCHEDULE toggle is absent; the existing toggle is for RAZORPAY/CASH payment modes

5. **Missing Add-on Checkboxes**: Add-ons are shown as comma-separated text in the service summary card instead of as interactive checkbox items with individual prices

6. **Wrong Bottom Bar**: The footer shows a "Pay ₹X" button (payment action) instead of "ESTIMATED TOTAL" label + "Book Now" button (configuration confirmation)

## Correctness Properties

Property 1: Bug Condition - Booking Screen Renders Service-Specific UI

_For any_ navigation to `/booking/create` with a valid `serviceId`, the fixed screen SHALL render the hero image section (with category badge and service name), duration selection pills (one per variant), an INSTANT/SCHEDULE toggle, add-on checkboxes (when add-ons exist), and a sticky bottom bar with estimated total and "Book Now" button.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6**

Property 2: Preservation - Data Fetching and Navigation Unchanged

_For any_ interaction on the booking creation screen (selecting variants, toggling add-ons, pressing "Book Now"), the fixed code SHALL produce the same data-fetching calls (`useServiceById`, `useEstimate`) and the same navigation parameters (`serviceId`, `variantId`, `addonIds`) as the original code, preserving all server communication and forward navigation behavior.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `apps/consumer/app/booking/create.tsx`

**Function**: `CheckoutScreen` (default export)

**Specific Changes**:

1. **Replace Header**: Remove "Checkout" heading. Add a header row with back arrow (`ArrowLeft01Icon`) and Clenzey logo (via `@clenzey/design-system/assets/logo.png` image or `Logo` component).

2. **Add Hero Image Section**: Below the header, render a full-width image (use `require('../../assets/quick-shine.png')` or service-category-mapped image) with a semi-transparent overlay, a badge showing `service.category` formatted as "QUICK SHINE", and the service name below it.

3. **Replace Service Summary Card with Duration Pills**: Remove the existing `Card` with variant text summary. Add a "Select Duration" heading with subtitle (e.g., "RECOMMENDED FOR STUDIOS"). Render `service.variants` as horizontally scrollable pill buttons showing `${variant.duration} MINS`. The selected pill uses `PRIMARY` background with white text; unselected uses `TERTIARY` background.

4. **Replace Payment Mode Toggle with Booking Type Toggle**: Remove the RAZORPAY/CASH toggle. Add an INSTANT/SCHEDULE toggle using the same visual pattern (pill-shaped toggle container). Default to "INSTANT" selected. Store selection in new state: `bookingType: 'INSTANT' | 'SCHEDULE'`.

5. **Replace Address/Coupon/Notes Sections with Add-on Checkboxes**: Remove address selection, coupon input, and notes sections entirely. Add "Extra Care Add-ons" section header with icon. Render `service.addons` as checkbox rows: each row has a custom checkbox (square with checkmark when selected), add-on name, and price formatted as `+$${addon.price.toFixed(2)}`.

6. **Replace Footer**: Remove "Pay ₹X" button. Add a sticky bottom bar with two elements: left-aligned "ESTIMATED TOTAL" label with `$${estimate?.total?.toFixed(2)}` value, and right-aligned "Book Now" `Button` that navigates forward.

7. **Remove Unused Imports/State**: Remove `addresses` query, `selectedAddressId`, `paymentMode`, `couponCode`, `notes` state variables, and related imports (`Location01Icon`, `CreditCardAcceptIcon`, `TextInput`, `Divider`, `Portal`, `Dialog`, `DialogIcon`, `createAddressesEndpoints`).

8. **Preserve Core Logic**: Keep `useServiceById`, `useEstimate`, variant selection via `activeVariantId`, addon toggle via `selectedAddonIds` (rename from `addonIds` param-derived to user-interactive state), and the router push with `serviceId`, `variantId`, `addonIds` params.

9. **Add New State**: Add `bookingType: 'INSTANT' | 'SCHEDULE'` state (default `'INSTANT'`). Convert `selectedAddonIds` from param-derived to interactive state initialized from `params.addonIds`.

10. **Update Styles**: Replace existing `StyleSheet` with new styles matching the design: hero image with rounded corners, pill button styles, checkbox row styles, sticky bottom bar with shadow.

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write component render tests using `@testing-library/react-native` that assert the presence of expected UI elements. Run these tests on the UNFIXED code to observe failures.

**Test Cases**:
1. **Hero Image Test**: Render `CheckoutScreen` with a valid serviceId and assert a hero image with category badge text "QUICK SHINE" exists (will fail on unfixed code)
2. **Duration Pills Test**: Render screen and assert pill buttons matching service variant durations exist (will fail on unfixed code — currently renders text summary)
3. **Booking Type Toggle Test**: Assert INSTANT/SCHEDULE toggle buttons exist (will fail on unfixed code — has RAZORPAY/CASH instead)
4. **Add-on Checkboxes Test**: Assert checkbox items with add-on names and prices exist (will fail on unfixed code — shows comma-separated text)
5. **Sticky Bottom Bar Test**: Assert bottom bar contains "ESTIMATED TOTAL" text and "Book Now" button (will fail — currently shows "Pay ₹X")

**Expected Counterexamples**:
- "QUICK SHINE" badge text not found in rendered output
- No touchable elements with "30 MINS", "60 MINS", "90 MINS" accessible labels
- "INSTANT" toggle text not found
- Possible cause: component renders generic checkout layout with address/payment sections

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := renderBookingScreen_fixed(input.serviceId, input.variantId, input.addonIds)
  ASSERT result.contains(heroImageWithBadge(service.category))
  ASSERT result.contains(durationPills(service.variants))
  ASSERT result.contains(bookingTypeToggle(['INSTANT', 'SCHEDULE']))
  ASSERT result.contains(addonCheckboxes(service.addons)) OR service.addons.length == 0
  ASSERT result.contains(stickyBottomBar(estimate.total, 'Book Now'))
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold (data-fetching and navigation behavior), the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT useServiceById_fixed(input.serviceId) == useServiceById_original(input.serviceId)
  ASSERT useEstimate_fixed(input.params) == useEstimate_original(input.params)
  ASSERT navigationParams_fixed(input) == navigationParams_original(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many combinations of serviceId, variantId, and addonIds selections
- It verifies the estimate recalculates correctly for any variant/addon combination
- It confirms navigation params are consistently passed regardless of UI state

**Test Plan**: Observe behavior on UNFIXED code first for data-fetching calls and navigation params, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Data Fetch Preservation**: Verify `useServiceById` is called with the same serviceId on both versions
2. **Estimate Recalculation Preservation**: Verify selecting any variant triggers `useEstimate` with correct `{ serviceId, variantId, addonIds }` params
3. **Navigation Params Preservation**: Verify "Book Now" press navigates with `serviceId`, `variantId`, and selected `addonIds` joined by comma
4. **Empty Addons Preservation**: Verify when service has no addons, the addon section is hidden and navigation excludes addonIds

### Unit Tests

- Test that hero image renders with correct category badge text for each `ServiceCategory`
- Test duration pills render one pill per variant with correct duration label
- Test pill selection updates `activeVariantId` state and triggers estimate refetch
- Test INSTANT/SCHEDULE toggle switches state correctly
- Test add-on checkbox toggle adds/removes addon ID from selected list
- Test sticky bottom bar displays formatted estimate total
- Test "Book Now" button is disabled when no variant is selected
- Test "Book Now" navigates with correct params

### Property-Based Tests

- Generate random `Service` objects with 1-5 variants and 0-5 addons; verify the screen renders the correct number of pills and checkboxes
- Generate random variant/addon selection sequences; verify estimate params are always { serviceId, selectedVariantId, selectedAddonIds }
- Generate random service categories; verify badge text matches formatted category name

### Integration Tests

- Test full flow: render screen → select variant → toggle add-on → press "Book Now" → verify navigation params
- Test screen with pre-selected variant and addons from route params
- Test loading states (service loading, estimate loading) render activity indicators
- Test error state when service fails to load
