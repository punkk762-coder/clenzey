# Requirements Document

## Introduction

This feature enhances the authentication and onboarding experience across both the Consumer and Partner Expo React Native apps in the Clenzey monorepo. The enhancements include onboarding screens for first-time users, branding improvements (logo integration, custom fonts), UI polish (input field focus outline fix, background decorations on auth screens), and new authentication flows (email/password sign-in and sign-up pages) in addition to the existing OTP-based login.

## Glossary

- **Consumer_App**: The Clenzey consumer-facing mobile application located at `apps/consumer/`
- **Partner_App**: The Clenzey partner-facing mobile application located at `apps/partner/`
- **Design_System**: The shared UI component and theme package located at `packages/design-system/`
- **Onboarding_Flow**: A sequence of 3 introductory screens shown to first-time users before the authentication screens
- **Login_Screen**: The screen where users enter credentials (phone/OTP or email/password) to authenticate
- **Signup_Screen**: The screen where new users register an account with email, password, and phone number
- **OTP_Screen**: The screen where users enter a one-time password received via SMS
- **TextInput_Component**: The shared text input component in the Design_System (`packages/design-system/src/components/TextInput.tsx`)
- **Auth_API**: The backend authentication endpoints for sign-in and sign-up
- **Clenzey_Logo**: The brand logo featuring blue text with a sparkle element
- **Custom_Font**: A curated font loaded via `expo-font` to replace or enhance the current Inter font family
- **AsyncStorage_Flag**: A persisted boolean flag indicating whether the user has completed onboarding

## Requirements

### Requirement 1: Onboarding Screens for First-Time Users

**User Story:** As a first-time user, I want to see introductory onboarding screens when I open the app, so that I understand the value and features of Clenzey before signing in.

#### Acceptance Criteria

1. WHEN the Consumer_App is launched for the first time, THE Onboarding_Flow SHALL display exactly 3 swipeable screens introducing features of the consumer experience
2. WHEN the Partner_App is launched for the first time, THE Onboarding_Flow SHALL display exactly 3 swipeable screens introducing features of the partner experience
3. THE Onboarding_Flow SHALL include a "Skip" button on each screen that navigates the user directly to the Login_Screen
4. WHILE the Onboarding_Flow is displaying any screen other than the last screen, THE Onboarding_Flow SHALL display a "Next" button that advances to the next onboarding screen
5. WHEN the user reaches the last onboarding screen, THE Onboarding_Flow SHALL display a "Get Started" button in place of the "Next" button that navigates to the Login_Screen
6. WHEN the user completes or skips the Onboarding_Flow, THE Consumer_App SHALL persist the completion status using AsyncStorage_Flag so that onboarding is not shown on subsequent launches
7. WHEN the user completes or skips the Onboarding_Flow, THE Partner_App SHALL persist the completion status using AsyncStorage_Flag so that onboarding is not shown on subsequent launches
8. WHILE the AsyncStorage_Flag indicates onboarding has been completed, THE Consumer_App SHALL navigate directly to the Login_Screen on launch (bypassing onboarding)
9. WHILE the AsyncStorage_Flag indicates onboarding has been completed, THE Partner_App SHALL navigate directly to the Login_Screen on launch (bypassing onboarding)
10. THE Onboarding_Flow SHALL include a page indicator (dots) showing the current screen position within the sequence, with the active screen dot visually distinct from inactive dots
11. IF the AsyncStorage_Flag cannot be read on launch due to a storage error, THEN THE Consumer_App SHALL default to showing the Onboarding_Flow
12. IF the AsyncStorage_Flag cannot be read on launch due to a storage error, THEN THE Partner_App SHALL default to showing the Onboarding_Flow
13. THE Onboarding_Flow SHALL support both swipe gestures (left to advance, right to go back) and button navigation to move between screens

### Requirement 2: Clenzey Logo Integration

**User Story:** As a user, I want to see the Clenzey brand logo on the login screen and relevant auth screens, so that I have confidence I am using the official app.

#### Acceptance Criteria

1. THE Login_Screen in the Consumer_App SHALL display the Clenzey_Logo above the login form with a minimum vertical spacing of 24 pixels between the logo and the first form element
2. THE Login_Screen in the Partner_App SHALL display the Clenzey_Logo above the login form with a minimum vertical spacing of 24 pixels between the logo and the first form element
3. THE Signup_Screen in the Consumer_App SHALL display the Clenzey_Logo above the signup form with a minimum vertical spacing of 24 pixels between the logo and the first form element
4. THE Signup_Screen in the Partner_App SHALL display the Clenzey_Logo above the signup form with a minimum vertical spacing of 24 pixels between the logo and the first form element
5. THE Clenzey_Logo SHALL render as an image asset with a fixed display width between 120 and 200 pixels, maintaining the original aspect ratio, featuring the blue text and sparkle design matching the provided brand image
6. THE Clenzey_Logo SHALL be horizontally centered on the screen
7. IF the Clenzey_Logo image asset fails to load, THEN THE screen SHALL still display the remaining form content without blank space where the logo would appear
8. THE Clenzey_Logo SHALL be provided as a shared asset accessible to both the Consumer_App and the Partner_App through the Design_System package

### Requirement 3: Input Field Focus Outline Fix

**User Story:** As a user, I want input fields to not show a distracting outline when focused, so that the UI appears clean and polished.

#### Acceptance Criteria

1. WHEN a TextInput_Component receives focus, THE TextInput_Component SHALL NOT display a visible outline style (the default platform focus outline must be suppressed via outlineStyle: 'none' or outlineWidth: 0)
2. WHEN a TextInput_Component receives focus, THE TextInput_Component SHALL indicate the focused state through a border color change to the primary color only (no additional outline or shadow)
3. THE TextInput_Component fix SHALL apply globally across the Consumer_App and the Partner_App through the Design_System

### Requirement 4: Custom Font Integration

**User Story:** As a user, I want the app to use a visually appealing custom font, so that the overall look and feel is polished and professional.

#### Acceptance Criteria

1. THE Design_System SHALL load the custom font variants (regular, semi-bold, and bold weights) via the `expo-font` package and export a hook that both the Consumer_App and the Partner_App call to initiate font loading
2. THE Design_System SHALL define the theme typography configuration so that each text variant (headline1, headline2, headline3, body1, body2, label) references a specific loaded custom font weight — bold for headlines, regular for body text, and semi-bold for labels
3. WHILE fonts are loading, THE Consumer_App SHALL display a loading indicator and prevent rendering of application screens until the font hook reports loaded status or a maximum of 5 seconds has elapsed
4. WHILE fonts are loading, THE Partner_App SHALL display a loading indicator and prevent rendering of application screens until the font hook reports loaded status or a maximum of 5 seconds has elapsed
5. IF the custom font fails to load or the 5-second timeout elapses before fonts are ready, THEN THE Design_System SHALL fall back to the platform default sans-serif font family for all text variants so that text renders without blank or missing glyphs

### Requirement 5: Enhanced Login and OTP Screen Visuals

**User Story:** As a user, I want the login and OTP screens to have visually appealing background elements, so that the authentication experience feels engaging and branded.

#### Acceptance Criteria

1. THE Login_Screen in the Consumer_App SHALL render decorative background elements positioned behind all interactive content, using only colors defined in the Design_System theme palette
2. THE Login_Screen in the Partner_App SHALL render decorative background elements positioned behind all interactive content, using only colors defined in the Design_System theme palette
3. THE OTP_Screen in the Consumer_App SHALL render the same decorative background component used on the Login_Screen, with identical element shapes, colors, and positions
4. THE OTP_Screen in the Partner_App SHALL render the same decorative background component used on the Login_Screen, with identical element shapes, colors, and positions
5. THE decorative background elements SHALL be rendered at a layer behind all text and interactive elements, and all foreground text SHALL maintain a minimum contrast ratio of 4.5:1 against any background element it overlaps
6. THE decorative background elements SHALL be exported as a reusable shared component from the Design_System package and accept a variant prop to distinguish between Consumer_App and Partner_App styling
7. WHEN the screen dimensions change due to device size or orientation, THE decorative background elements SHALL scale proportionally without clipping or overflowing the screen bounds

### Requirement 6: Email/Password Login

**User Story:** As a user, I want to sign in using my email or phone number with a password, so that I have an alternative to OTP-based login.

#### Acceptance Criteria

1. THE Login_Screen in the Consumer_App SHALL provide an email-or-phone input field and a password input field for credential-based sign-in
2. THE Login_Screen in the Partner_App SHALL provide an email-or-phone input field and a password input field for credential-based sign-in
3. THE Login_Screen SHALL provide a toggle or tab to switch between OTP-based login and email/password login, with OTP-based login as the default active mode
4. WHEN the user submits valid credentials in the Consumer_App, THE Consumer_App SHALL send a POST request to `/consumers/auth/signin` with `{ "identifier": "<email_or_phone>", "password": "<password>" }`
5. WHEN the user submits valid credentials in the Partner_App, THE Partner_App SHALL send a POST request to `/partners/auth/signin` with `{ "identifier": "<email_or_phone>", "password": "<password>" }`
6. WHEN the Auth_API returns a successful response with an accessToken, THE Consumer_App SHALL store the accessToken and user data and navigate to the main app
7. WHEN the Auth_API returns a successful response with an accessToken, THE Partner_App SHALL store the accessToken and user data and navigate based on the approvalStatus (APPROVED → main app, PENDING → pending-approval screen)
8. IF the Auth_API returns an error response, THEN THE Login_Screen SHALL display the error message returned by the API in a visible error text element below the input fields
9. WHILE a sign-in request is in progress, THE Login_Screen SHALL display a loading indicator and disable the submit button to prevent duplicate submissions
10. THE Login_Screen SHALL validate that the identifier field is either a valid email address format or a 10-digit phone number, and the password field is at least 6 characters, before enabling the submit button
11. THE Login_Screen SHALL include a navigation link to the Signup_Screen with the text "Don't have an account? Sign Up"
12. THE Login_Screen SHALL include a password visibility toggle that allows the user to show or hide the entered password, with the password hidden by default
13. IF the identifier field or password field fails client-side validation, THEN THE Login_Screen SHALL display an inline error message indicating the specific validation failure (invalid email/phone format or password too short)

### Requirement 7: Sign Up Page

**User Story:** As a new user, I want to create an account with my email, phone number, and password, so that I can start using the Clenzey app.

#### Acceptance Criteria

1. THE Consumer_App SHALL have a Signup_Screen accessible from the Login_Screen
2. THE Partner_App SHALL have a Signup_Screen accessible from the Login_Screen
3. THE Signup_Screen in the Consumer_App SHALL include input fields for email, phone number (with +91 prefix), and password
4. THE Signup_Screen in the Partner_App SHALL include input fields for full name, email, phone number (with +91 prefix), and password
5. WHEN the user submits valid signup data in the Consumer_App, THE Consumer_App SHALL send a POST request to `/consumers/auth/signup` with `{ "email": "<email>", "password": "<password>", "phone": "+91<phone>" }`
6. WHEN the user submits valid signup data in the Partner_App, THE Partner_App SHALL send a POST request to `/partners/auth/signup` with `{ "email": "<email>", "fullName": "<full_name>", "password": "<password>", "phone": "+91<phone>" }`
7. WHEN the Auth_API returns a successful signup response for the Consumer_App, THE Consumer_App SHALL store the accessToken and user data and navigate to the main app
8. WHEN the Auth_API returns a successful signup response for the Partner_App, THE Partner_App SHALL store the accessToken and user data and navigate to the pending-approval screen (approvalStatus is PENDING)
9. IF the Auth_API returns an error during signup, THEN THE Signup_Screen SHALL display the error message returned by the Auth_API to the user and keep all form field values intact
10. THE Signup_Screen SHALL validate the following before enabling the submit button: email matches a standard email format (local-part@domain with at least one dot in the domain), phone number is exactly 10 digits, and password is between 6 and 128 characters inclusive
11. WHILE a signup request is in progress, THE Signup_Screen SHALL display a loading indicator and disable the submit button
12. THE Signup_Screen SHALL include a navigation link to the Login_Screen with the text "Already have an account? Log In"
13. THE Signup_Screen SHALL display the Clenzey_Logo and decorative background elements consistent with the Login_Screen
14. THE Signup_Screen in the Partner_App SHALL validate that the full name field contains between 2 and 100 characters inclusive before enabling the submit button
15. IF the user submits the signup form with any field failing client-side validation, THEN THE Signup_Screen SHALL display an inline error message below each invalid field indicating the specific validation failure
