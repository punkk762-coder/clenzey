# Bugfix Requirements Document

## Introduction

The Quick Shine booking creation screen (`apps/consumer/app/booking/create.tsx`) does not render service data from the server in a way that matches the intended design. The current implementation shows a generic checkout flow (address selection, payment methods, coupon input) instead of the service-specific booking experience with a hero image, duration selection pills, instant/schedule toggle, and add-on checkboxes with prices. This results in a broken user experience where users cannot properly configure their Quick Shine booking before proceeding to checkout.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a user navigates to the booking creation screen for the Quick Shine service THEN the system displays a generic "Checkout" heading instead of a header with back navigation and Clenzey logo

1.2 WHEN a user navigates to the booking creation screen for the Quick Shine service THEN the system does not display a hero image section with the service category badge ("QUICK SHINE") and service name ("Express Home Polish")

1.3 WHEN a user navigates to the booking creation screen for the Quick Shine service THEN the system does not render the service variants (30 MINS, 60 MINS, 90 MINS) as selectable duration pill buttons with a "Select Duration" heading and "RECOMMENDED FOR STUDIOS" subtitle

1.4 WHEN a user navigates to the booking creation screen for the Quick Shine service THEN the system does not display an INSTANT/SCHEDULE toggle for booking type selection

1.5 WHEN a user navigates to the booking creation screen for the Quick Shine service THEN the system does not display the add-ons as an "Extra Care Add-ons" section with icon, name, and price formatted as checkboxes (e.g., Bathroom +$15.00, Kitchen +$25.00, Balcony +$10.00)

1.6 WHEN a user navigates to the booking creation screen for the Quick Shine service THEN the system does not display a sticky bottom bar showing the estimated total and a "Book Now" button

### Expected Behavior (Correct)

2.1 WHEN a user navigates to the booking creation screen for the Quick Shine service THEN the system SHALL display a header with a back arrow and Clenzey logo

2.2 WHEN a user navigates to the booking creation screen for the Quick Shine service THEN the system SHALL display a hero image section showing the service image with the service category badge (e.g., "QUICK SHINE") and the service name (e.g., "Express Home Polish")

2.3 WHEN a user navigates to the booking creation screen for the Quick Shine service THEN the system SHALL render the service variants as selectable duration pill buttons (e.g., 30 MINS, 60 MINS, 90 MINS) under a "Select Duration" heading with a descriptive subtitle (e.g., "RECOMMENDED FOR STUDIOS"), with the first variant selected by default and highlighted in blue

2.4 WHEN a user navigates to the booking creation screen for the Quick Shine service THEN the system SHALL display a toggle between "INSTANT" and "SCHEDULE" booking types, with "INSTANT" selected by default and highlighted in blue

2.5 WHEN a user navigates to the booking creation screen for the Quick Shine service THEN the system SHALL display the service add-ons under an "Extra Care Add-ons" heading as selectable checkbox items, each showing an icon, the add-on name, and the price formatted with a "+" prefix and currency (e.g., "+$15.00")

2.6 WHEN a user navigates to the booking creation screen for the Quick Shine service THEN the system SHALL display a sticky bottom bar showing the estimated total (e.g., "ESTIMATED TOTAL $29.00") and a "Book Now" button that navigates to the next step

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a user navigates to the booking creation screen with a serviceId, variantId, and addonIds THEN the system SHALL CONTINUE TO fetch and use service data from the server via the useServiceById hook

3.2 WHEN a user selects a variant on the booking creation screen THEN the system SHALL CONTINUE TO calculate and display an updated price estimate via the useEstimate hook

3.3 WHEN a user selects or deselects add-ons on the booking creation screen THEN the system SHALL CONTINUE TO include the selected add-on IDs when navigating to the next step

3.4 WHEN a user presses "Book Now" on the booking creation screen THEN the system SHALL CONTINUE TO navigate forward with the serviceId, variantId, and addonIds parameters

3.5 WHEN a service has no add-ons THEN the system SHALL CONTINUE TO hide the add-ons section entirely
