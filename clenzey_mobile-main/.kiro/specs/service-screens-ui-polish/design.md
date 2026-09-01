# Service Screens UI Polish Bugfix Design

## Overview

The service detail screens (`apps/consumer/app/services/[id].tsx`) and checkout screen (`apps/consumer/app/booking/create.tsx`) have visual inconsistencies: the Instant/Schedule toggle uses different patterns across screen branches, cards lack decorative background accents, the checkout screen has minimal elevation and no decoration, and interactive elements use custom `TouchableOpacity` instead of react-native-paper components. The fix replaces custom toggle implementations with `SegmentedButtons`, adds decorative `View` elements (small colored circles and rounded rectangles) as background accents on cards, increases card elevation on the checkout screen, and applies compact/dense sizing to inputs and buttons.

## Glossary

- **Bug_Condition (C)**: A screen renders interactive elements using custom `TouchableOpacity` toggles, plain cards without decorative backgrounds, or oversized components — instead of react-native-paper `SegmentedButtons`, decorated `Card` components, and compact sizing
- **Property (P)**: Screens render with consistent `SegmentedButtons` for Instant/Schedule, decorative background accents on cards, enhanced shadows on the checkout screen, and compact/dense sizing
- **Preservation**: Existing navigation flow, state management (variant selection, add-on toggling, address/payment selection), API calls, and data passing between screens must remain unchanged
- **`renderQuickShineLayout()`**: The function in `services/[id].tsx` that renders the Quick Shine branch with a simple toggle bar for booking type
- **`renderDeepCleaningLayout()`**: The function in `services/[id].tsx` that renders the Deep Cleaning branch with side-by-side service type cards
- **`CheckoutScreen`**: The component in `booking/create.tsx` that renders service summary, address selection, payment method, coupon, notes, and order summary
- **SegmentedButtons**: A react-native-paper component that renders a row of segmented toggle buttons with consistent styling
- **Decorative Accents**: Small `View` elements with absolute positioning (colored circles, rounded rectangles) placed behind card content for visual embellishment

## Bug Details

### Bug Condition

The bug manifests when any service detail screen or the checkout screen is rendered with its current implementation. The Quick Shine layout uses a custom `TouchableOpacity`-based toggle bar for Instant/Schedule, the Deep Cleaning layout uses side-by-side `TouchableOpacity` cards with icons, and the checkout screen uses a custom toggle for payment mode — all lacking consistency and react-native-paper component usage. Additionally, all card-type elements (add-on cards, inclusion cards, checkout service summary) render with plain backgrounds and no decorative elements.

**Formal Specification:**
```
FUNCTION isBugCondition(screen)
  INPUT: screen of type ScreenRenderOutput
  OUTPUT: boolean
  
  RETURN (screen.hasInstantScheduleToggle AND NOT usesSegmentedButtons(screen.instantScheduleToggle))
         OR (screen.hasCards AND NOT hasDecorativeAccents(screen.cards))
         OR (screen.isCheckout AND screen.cardElevation <= 2 AND NOT hasDecorativeAccents(screen.topCard))
         OR (screen.hasInteractiveElements AND usesCustomTouchableOpacity(screen.interactiveElements))
         OR (screen.hasInputsOrButtons AND NOT usesCompactSizing(screen.inputsAndButtons))
END FUNCTION
```

### Examples

- **Quick Shine toggle**: User opens a Quick Shine service → sees a gray rounded rectangle with INSTANT/SCHEDULE text buttons (custom `TouchableOpacity`) instead of a react-native-paper `SegmentedButtons` component
- **Deep Cleaning toggle**: User opens a Deep Cleaning service → sees two side-by-side cards with clock/calendar icons (custom `TouchableOpacity`) instead of matching `SegmentedButtons` used on Quick Shine
- **Add-on cards (Quick Shine)**: User sees add-on items with plain white backgrounds and a simple border — no decorative circles or accent shapes behind the icon area
- **Inclusion cards (Deep Cleaning)**: User sees included services in a grid with flat `#F9FAFB` background and no decorative accent elements
- **Checkout top card**: The service summary card uses `elevation={2}` with no background decorative elements
- **Checkout payment toggle**: Payment mode uses a custom `TouchableOpacity` toggle bar identical to the Quick Shine booking type toggle — should use `SegmentedButtons`

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Selecting a variant (duration pill or BHK pill) must continue to update `selectedVariantId` state and trigger the estimate API call
- Toggling add-ons on/off must continue to update `selectedAddonIds` state and reflect in the estimate
- Tapping "Book Now" must continue to navigate to `/booking/create` with correct `serviceId`, `variantId`, and `addonIds` params
- Selecting an address on checkout must continue to set `selectedAddressId` / `activeAddressId`
- Selecting a payment method must continue to set `paymentMode` state
- Submitting coupon code and notes must continue to pass values to the payment screen
- The estimate API response must continue to render breakdown items and total correctly
- Error states (service not found, missing address) must continue to display appropriate feedback

**Scope:**
All state management logic, API hooks (`useServiceById`, `useEstimate`, address query), navigation flows (`handleProceed`, `handlePay`), and data transformations are completely unaffected by this fix. Only the JSX rendering and `StyleSheet` values change.

## Hypothesized Root Cause

Based on the bug description, the most likely issues are:

1. **Inconsistent Design Decisions**: The Quick Shine and Deep Cleaning layouts were built at different times with different visual approaches for the same Instant/Schedule selection — one uses a simple toggle bar, the other uses icon cards
2. **Missing react-native-paper Adoption**: The screens were initially built with custom `TouchableOpacity` components before react-native-paper was fully integrated (it's in `package.json` but not leveraged for toggles/chips)
3. **No Decorative Layer**: Cards were implemented as functional containers without a decorative background layer — no absolute-positioned accent shapes were added
4. **Default Sizing**: Components use default sizes (react-native-paper `Button` without `compact`, `TextInput` without `dense`) because compact mode was not specified in the original implementation

## Correctness Properties

Property 1: Bug Condition - Consistent SegmentedButtons and Decorated Cards

_For any_ screen render where the bug condition holds (custom TouchableOpacity toggles, plain card backgrounds, low elevation, or oversized components are present), the fixed screens SHALL render using react-native-paper `SegmentedButtons` for all Instant/Schedule and payment mode toggles, SHALL include decorative `View` accent elements (small colored circles and rounded rectangles with absolute positioning) on add-on cards, inclusion cards, and the checkout service summary card, SHALL use elevation level 3+ for checkout cards, and SHALL apply compact/dense sizing to buttons and inputs.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9**

Property 2: Preservation - Functional Behavior Unchanged

_For any_ user interaction (selecting variants, toggling add-ons, navigating to checkout, selecting addresses, choosing payment methods, entering coupons/notes, viewing estimates), the fixed screens SHALL produce exactly the same state changes, API calls, navigation events, and data outputs as the original screens, preserving all functional behavior.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `apps/consumer/app/services/[id].tsx`

**Functions**: `renderQuickShineLayout()`, `renderDeepCleaningLayout()`

**Specific Changes**:
1. **Replace Quick Shine toggle with SegmentedButtons**: Remove the custom `toggleContainer` with two `TouchableOpacity` buttons. Import `SegmentedButtons` from `react-native-paper` and render it with `value={bookingType}`, `onValueChange={setBookingType}`, and buttons `[{value: 'INSTANT', label: 'Instant'}, {value: 'SCHEDULE', label: 'Schedule'}]`.

2. **Replace Deep Cleaning service type cards with SegmentedButtons**: Remove the `serviceTypeRow` with two `TouchableOpacity` cards. Use the same `SegmentedButtons` component with identical value/buttons configuration to ensure consistency across both layouts.

3. **Add decorative accents to Quick Shine add-on cards**: Wrap each add-on card's content in a container with `overflow: 'hidden'`. Add absolute-positioned `View` elements — a small circle (`width: 24, height: 24, borderRadius: 12, backgroundColor: '#EEF2FF'`) in the top-right area and a small rounded rectangle (`width: 32, height: 8, borderRadius: 4, backgroundColor: '#F0F4FF'`) offset near the bottom-left — as subtle background decoration.

4. **Add decorative accents to Deep Cleaning inclusion cards**: Add similar absolute-positioned decorative `View` elements (a small colored circle and a rounded rectangle) inside each `inclusionCard` with `overflow: 'hidden'`.

5. **Add decorative accents to Deep Cleaning custom add-on cards**: Add subtle background accent shapes to each `dcAddonCard` matching the style of other decorated cards.

6. **Apply compact sizing**: Add `compact` prop to `Button` components where used, and `dense` prop to any relevant inputs if present.

**File**: `apps/consumer/app/booking/create.tsx`

**Function**: `CheckoutScreen`

**Specific Changes**:
1. **Replace payment mode toggle with SegmentedButtons**: Remove the custom `toggleContainer` with `TouchableOpacity` buttons for Online/Cash. Import `SegmentedButtons` from `react-native-paper` and render with `value={paymentMode}`, `onValueChange={setPaymentMode}`, buttons `[{value: 'RAZORPAY', label: 'Online'}, {value: 'CASH', label: 'Cash'}]`.

2. **Add decorative accents to service summary card**: Inside the first `Card` (service summary), add absolute-positioned decorative `View` elements — a colored circle and a rounded rectangle — with `overflow: 'hidden'` on the card to clip the shapes.

3. **Increase card elevation**: Change `elevation={2}` to `elevation={3}` (or higher) on the service summary and order summary cards for deeper shadow effects.

4. **Apply dense mode to TextInput**: Add `dense` prop to the coupon and notes `TextInput` components.

5. **Apply compact to buttons**: Add `compact` prop to the "Add New Address" button and adjust the pay button label size.

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write snapshot and render tests that check the component tree for the presence of custom `TouchableOpacity` toggles, absence of `SegmentedButtons`, plain card backgrounds without decorative child elements, and default sizing props. Run these tests on the UNFIXED code to observe failures and understand the current state.

**Test Cases**:
1. **Quick Shine Toggle Test**: Render Quick Shine layout, assert it contains a `TouchableOpacity` toggle and does NOT contain `SegmentedButtons` (will confirm bug on unfixed code)
2. **Deep Cleaning Toggle Test**: Render Deep Cleaning layout, assert it uses `TouchableOpacity` service type cards and does NOT contain `SegmentedButtons` (will confirm bug on unfixed code)
3. **Add-on Card Decoration Test**: Render add-on cards, assert they do NOT contain absolute-positioned decorative child `View` elements (will confirm bug on unfixed code)
4. **Checkout Payment Toggle Test**: Render checkout screen, assert payment mode uses `TouchableOpacity` toggle (will confirm bug on unfixed code)

**Expected Counterexamples**:
- `SegmentedButtons` component is not present in the rendered tree
- Cards contain no children with `position: 'absolute'` decorative styling
- Possible causes: components were built with custom implementations before react-native-paper adoption was standard

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed screens produce the expected visual output.

**Pseudocode:**
```
FOR ALL screen WHERE isBugCondition(screen) DO
  result := renderFixedScreen(screen)
  ASSERT containsSegmentedButtons(result.instantScheduleToggle)
  ASSERT hasDecorativeAccents(result.cards)
  ASSERT result.checkoutCardElevation >= 3
  ASSERT usesCompactSizing(result.buttonsAndInputs)
END FOR
```

### Preservation Checking

**Goal**: Verify that for all user interactions, the fixed screens produce the same functional outcomes as the original screens.

**Pseudocode:**
```
FOR ALL interaction WHERE NOT isBugCondition(interaction) DO
  ASSERT originalScreen.stateAfter(interaction) = fixedScreen.stateAfter(interaction)
  ASSERT originalScreen.navigationCall(interaction) = fixedScreen.navigationCall(interaction)
  ASSERT originalScreen.apiCalls(interaction) = fixedScreen.apiCalls(interaction)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many combinations of variant selections, add-on toggles, and address picks
- It catches edge cases where state transitions might differ
- It provides strong guarantees that navigation params and API calls are unchanged

**Test Plan**: Observe behavior on UNFIXED code first for all interactive flows (variant selection, add-on toggle, proceed to checkout, address selection, payment mode selection), then write property-based tests capturing that behavior and verify it persists after the fix.

**Test Cases**:
1. **Variant Selection Preservation**: Verify that selecting any variant updates `selectedVariantId` and triggers estimate recalculation identically before and after fix
2. **Add-on Toggle Preservation**: Verify that toggling any add-on updates `selectedAddonIds` array identically before and after fix
3. **Navigation Preservation**: Verify that "Book Now" navigates with identical params (`serviceId`, `variantId`, `addonIds`) before and after fix
4. **Checkout Flow Preservation**: Verify that address selection, payment mode, coupon, and notes are passed identically to the payment screen

### Unit Tests

- Test that `SegmentedButtons` renders with correct `value` and `buttons` props on Quick Shine layout
- Test that `SegmentedButtons` renders with correct props on Deep Cleaning layout
- Test that `SegmentedButtons` renders for payment mode on checkout screen
- Test that add-on cards contain decorative accent `View` elements with expected styles
- Test that checkout cards use elevation >= 3
- Test that `TextInput` components have `dense` prop

### Property-Based Tests

- Generate random service data with varying numbers of variants and add-ons, verify `SegmentedButtons` always renders with correct booking type value
- Generate random sequences of variant/add-on selections, verify state changes match original behavior
- Generate random checkout scenarios (different addresses, payment modes, coupons), verify navigation params match original behavior

### Integration Tests

- Test full flow: open Quick Shine → select variant → toggle Instant/Schedule via SegmentedButtons → add add-on → Book Now → verify checkout receives correct params
- Test full flow: open Deep Cleaning → select BHK → toggle Instant/Schedule via SegmentedButtons → add custom add-on → Book Now → verify checkout receives correct params
- Test checkout flow: select address → switch payment mode via SegmentedButtons → enter coupon → Pay → verify payment screen receives correct params
