# Bugfix Requirements Document

## Introduction

The existing service detail screens (Quick Shine, Deep Cleaning, and Corporate) in `apps/consumer/app/services/[id].tsx` and the checkout screen in `apps/consumer/app/booking/create.tsx` have visual inconsistencies and lack polish. The Instant/Schedule selection uses different UI patterns across screens, cards lack decorative background elements, the checkout screen is missing shadow effects and background decoration, custom TouchableOpacity implementations are used instead of react-native-paper components, and UI elements use oversized sizing instead of compact/medium variants. All fixes are to be applied in-place to the existing screens using react-native-paper UI components and @hugeicons/react-native icons.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the Quick Shine service detail screen is displayed THEN the system renders the Instant/Schedule selection as a simple toggle bar, which differs from the Deep Cleaning screen's card-based layout with icons

1.2 WHEN the Deep Cleaning service detail screen is displayed THEN the system renders the Instant/Schedule selection as two side-by-side cards with icons and descriptions, which differs from Quick Shine's simple toggle bar

1.3 WHEN add-on cards are rendered on any service detail screen THEN the system displays them with plain white backgrounds and no decorative background elements or visual embellishments

1.4 WHEN Included Services cards are rendered on the Deep Cleaning screen THEN the system displays them with a flat #F9FAFB background and no decorative background elements

1.5 WHEN Custom Add-on cards are rendered on the Deep Cleaning screen THEN the system displays them with a plain white background and no decorative background elements

1.6 WHEN the checkout screen top card (service summary) is rendered THEN the system displays it without decorative background elements or visual embellishments

1.7 WHEN cards and sections are rendered on the checkout screen THEN the system displays them with minimal elevation (level 2) and no enhanced shadow effects

1.8 WHEN the Instant/Schedule toggle, add-on checkboxes, and booking type selectors are rendered THEN the system uses custom TouchableOpacity implementations instead of react-native-paper components (SegmentedButtons, Chip, Card)

1.9 WHEN input fields, tabs, and buttons are rendered across screens THEN the system uses default/large sizing instead of compact or medium sizing

### Expected Behavior (Correct)

2.1 WHEN any service detail screen (Quick Shine, Deep Cleaning, or Corporate) displays the Instant/Schedule selection THEN the system SHALL render a consistent UI pattern using the same react-native-paper component (e.g., SegmentedButtons) across all service screens

2.2 WHEN add-on cards are rendered on any service detail screen THEN the system SHALL display them with decorative background elements (e.g., subtle gradient overlays, rounded shape accents, or colored border accents) to enhance visual appeal

2.3 WHEN Included Services cards are rendered on the Deep Cleaning screen THEN the system SHALL display them with decorative background elements consistent with the add-on cards styling

2.4 WHEN Custom Add-on cards are rendered on the Deep Cleaning screen THEN the system SHALL display them with decorative background elements consistent with other card types

2.5 WHEN the checkout screen top card (service summary) is rendered THEN the system SHALL display it with decorative background elements (e.g., subtle gradient, accent shapes, or colored overlays)

2.6 WHEN cards and sections are rendered on the checkout screen THEN the system SHALL display enhanced shadow effects (deeper shadows, stronger elevation) for better visual depth and hierarchy

2.7 WHEN the Instant/Schedule selection, add-on selection, and other interactive elements are rendered THEN the system SHALL use react-native-paper components (SegmentedButtons, Chip, Card, etc.) and @hugeicons/react-native icons instead of custom TouchableOpacity implementations

2.8 WHEN input fields, tabs, and buttons are rendered across service detail and checkout screens THEN the system SHALL use small or medium sizing (compact prop, dense mode, or equivalent) instead of large/default sizing

2.9 WHEN fixes are applied THEN the system SHALL modify the existing screen files in-place without creating new screens or components

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a user selects a variant (duration or property size) THEN the system SHALL CONTINUE TO correctly update the active variant state and reflect it in the estimate

3.2 WHEN a user toggles add-ons on or off THEN the system SHALL CONTINUE TO correctly update the selectedAddonIds state and pass them through to the checkout flow

3.3 WHEN a user taps "Book Now" on a service detail screen THEN the system SHALL CONTINUE TO navigate to the checkout screen with the correct serviceId, variantId, and addonIds parameters

3.4 WHEN a user selects an address and payment method on the checkout screen THEN the system SHALL CONTINUE TO correctly store selections and pass them to the payment screen

3.5 WHEN a user submits a coupon code or notes on the checkout screen THEN the system SHALL CONTINUE TO pass those values correctly to the payment flow

3.6 WHEN the estimate API returns pricing breakdown data THEN the system SHALL CONTINUE TO display the correct breakdown items and total amount

3.7 WHEN no service data is available or an error occurs THEN the system SHALL CONTINUE TO display the appropriate error state with a "Go Back" option
