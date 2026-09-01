# Landing Page Links and Pages Bugfix Design

## Overview

The Clenzey landing page has broken/placeholder links in the Support section and Footer, missing legal/informational pages, unwanted footer items, and poor hyperlink styling. This fix updates the `SUPPORT_CHANNELS` data in `SupportSection.tsx` to point to correct destinations (WhatsApp, `/faq`, business email), replaces `hover:underline` with polished hover effects, creates four new pages (`/faq`, `/terms`, `/privacy`, `/safety-guarantee`), and updates `Footer.tsx` to remove unwanted items and add correct hrefs.

## Glossary

- **Bug_Condition (C)**: Any user interaction with links/hrefs in the Support section or Footer that currently navigate to non-functional anchors, incorrect emails, or non-existent pages
- **Property (P)**: All links navigate to their correct destinations, new pages exist with proper content, and hover states use color transitions instead of underlines
- **Preservation**: Existing section structure, animation behavior, remaining footer links, layout fonts/styles, and overall page composition remain unchanged
- **SUPPORT_CHANNELS**: The data array in `app/components/sections/SupportSection.tsx` defining the three support cards (Live Chat, Help Center, Email Support)
- **COMPANY_LINKS / SERVICE_LINKS**: The data arrays in `app/components/Footer.tsx` defining footer navigation items
- **Design Tokens**: CSS custom properties and Tailwind theme values defined in `globals.css` (colors, fonts, spacing)

## Bug Details

### Bug Condition

The bug manifests when a user interacts with links in the Support section or Footer. The `SUPPORT_CHANNELS` array contains placeholder hrefs (`#chat`, `#help`, wrong email), the footer `COMPANY_LINKS` all point to `#` with no actual pages existing, the footer includes items that shouldn't be shown, and action links use `hover:underline` instead of polished transitions.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type UserInteraction (click or hover on a link element)
  OUTPUT: boolean

  RETURN (input.target IN SupportSection.actionLinks
          AND input.target.href IN ['#chat', '#help', 'mailto:support@clenzey.com'])
         OR (input.target IN Footer.companyLinks
             AND input.target.href == '#'
             AND input.target.text IN ['Terms of Service', 'Privacy Policy', 'Safety Guarantee', 'Contact Support'])
         OR (input.type == 'hover' AND input.target.class CONTAINS 'hover:underline')
         OR (input.type == 'view' AND visibleFooterItems CONTAINS 'Join as a Cleaner')
         OR (input.type == 'view' AND visibleFooterItems CONTAINS 'Sofa & Carpet Cleaning')
END FUNCTION
```

### Examples

- **Live Chat click**: User clicks "Start Chat" → navigates to `#chat` (broken anchor). Expected: opens `https://wa.me/917008410996` in new tab.
- **Help Center click**: User clicks "Visit Help Center" → navigates to `#help` (broken anchor). Expected: navigates to `/faq` page with FAQ content.
- **Email click**: User clicks "Send Email" → opens `mailto:support@clenzey.com` (wrong email). Expected: opens `mailto:business.clenzey@gmail.com`.
- **Link hover**: User hovers action link → underline appears. Expected: text color shifts to `primary-container` with smooth transition and arrow translates slightly right.
- **Footer "Terms of Service" click**: User clicks → navigates to `#` (nowhere). Expected: navigates to `/terms` page.
- **Footer "Privacy Policy" click**: User clicks → navigates to `#` (nowhere). Expected: navigates to `/privacy` page.
- **Footer "Safety Guarantee" click**: User clicks → navigates to `#` (nowhere). Expected: navigates to `/safety-guarantee` page.
- **Footer "Contact Support" click**: User clicks → navigates to `#` (nowhere). Expected: scrolls to `/#support` section.
- **Footer displays "Join as a Cleaner"**: Visible in Company column. Expected: removed entirely.
- **Footer displays "Sofa & Carpet Cleaning"**: Visible in Cleaning Services column. Expected: removed entirely.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- The Support section continues to display three cards (Live Chat, Help Center, Email Support) with identical icons, titles, and descriptions
- The Support section card animation (Framer Motion staggered fade-up) continues to work identically
- The Footer continues to display Brand, Cleaning Services, Company, and Book on the go sections
- Remaining Cleaning Services links (Bathroom Cleaning, Kitchen Cleaning, Deep Home Cleaning, Express Clean) continue to navigate to `#services`
- The shared layout (Plus Jakarta Sans, DM Sans fonts, Material Symbols Outlined, global CSS) continues to apply on all pages
- All existing landing page sections render in correct order
- The Footer's social icons, brand description, and app store buttons remain unchanged

**Scope:**
All interactions that do NOT involve the broken links, removed items, or hover:underline styling should be completely unaffected by this fix. This includes:
- Mouse clicks on non-affected elements (Nav, Hero CTA, Waitlist form, etc.)
- Scrolling and section reveal animations
- Footer Cleaning Services links for items that remain
- App Store / Play Store links in footer
- Social icon links in footer

## Hypothesized Root Cause

Based on the bug description, the most likely issues are:

1. **Placeholder Data in SUPPORT_CHANNELS**: The `href` values in the `SUPPORT_CHANNELS` array were set to `#chat`, `#help`, and a placeholder email during initial development and never updated to final destinations.

2. **Missing Route Pages**: The Next.js App Router has no route files for `/faq`, `/terms`, `/privacy`, or `/safety-guarantee` — these pages were planned but never created.

3. **Placeholder Footer hrefs**: All `COMPANY_LINKS` items render with `href="#"` because the component maps the array to links without individual href data, and the target pages didn't exist yet.

4. **Premature Footer Items**: "Join as a Cleaner" and "Sofa & Carpet Cleaning" were added to the data arrays speculatively and should be removed until those features/services are available.

5. **Inconsistent Link Styling**: The `hover:underline` class was used as a quick default during initial styling; it doesn't match the polished Material Design–inspired aesthetic of the rest of the site.

## Correctness Properties

Property 1: Bug Condition - Support Section Links Navigate to Correct Destinations

_For any_ click interaction where the target is a Support section action link (Live Chat, Help Center, or Email Support), the fixed component SHALL render the correct `href` attribute (`https://wa.me/917008410996` with `target="_blank"` for Live Chat, `/faq` for Help Center, `mailto:business.clenzey@gmail.com` for Email Support) and SHALL NOT use `hover:underline` styling.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

Property 2: Bug Condition - Footer Links Navigate to Correct Pages

_For any_ click interaction where the target is a Footer Company link (Terms of Service, Privacy Policy, Safety Guarantee, Contact Support), the fixed component SHALL render the correct `href` attribute (`/terms`, `/privacy`, `/safety-guarantee`, `/#support` respectively), SHALL NOT display "Join as a Cleaner" or "Sofa & Carpet Cleaning", and the target pages SHALL exist and render valid content.

**Validates: Requirements 2.5, 2.6, 2.7, 2.8, 2.9, 2.10**

Property 3: Preservation - Existing Layout and Navigation Unchanged

_For any_ interaction that does NOT involve the buggy links or removed items, the fixed code SHALL produce exactly the same rendered output and behavior as the original code, preserving section structure, animations, remaining footer links, shared layout, and visual appearance.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `app/components/sections/SupportSection.tsx`

**Changes**:
1. **Update SUPPORT_CHANNELS hrefs**: Change Live Chat href from `#chat` to `https://wa.me/917008410996`, Help Center from `#help` to `/faq`, Email from `mailto:support@clenzey.com` to `mailto:business.clenzey@gmail.com`.
2. **Add target="_blank" and rel="noopener noreferrer"**: For the Live Chat WhatsApp link (external URL).
3. **Replace hover:underline styling**: Remove `hover:underline` class from action link. Replace with `hover:text-primary-container transition-colors` for the text and add a `group` + `group-hover:translate-x-0.5 transition-transform` on the arrow icon for subtle movement.

**File**: `app/components/Footer.tsx`

**Changes**:
1. **Remove "Sofa & Carpet Cleaning"** from `SERVICE_LINKS` array.
2. **Remove "Join as a Cleaner"** from `COMPANY_LINKS` array.
3. **Convert COMPANY_LINKS to objects with href**: Change from a plain string array to an array of `{ label, href }` objects so each link has its correct destination: Terms of Service → `/terms`, Privacy Policy → `/privacy`, Safety Guarantee → `/safety-guarantee`, Contact Support → `/#support`.
4. **Update JSX rendering**: Adjust the Company links `.map()` to use the object structure for label text and href.

**New Files**:
5. **`app/faq/page.tsx`**: Create FAQ page with accordion-style Q&A relevant to a home cleaning service. Use shared layout (fonts, Material Symbols). Include proper headings, navigation back to home.
6. **`app/terms/page.tsx`**: Create Terms of Service page with standard legal sections (acceptance, services, liability, etc.) tailored to home cleaning.
7. **`app/privacy/page.tsx`**: Create Privacy Policy page with data collection, usage, sharing, and rights sections.
8. **`app/safety-guarantee/page.tsx`**: Create Safety Guarantee page explaining Clenzey's safety commitments (background checks, insurance, quality assurance).

**Design Consistency for New Pages**:
- All new pages use the existing root layout (Plus Jakarta Sans, DM Sans, Material Symbols, globals.css)
- Use design tokens from `globals.css` (colors: primary, primary-container, primary-faint, surface, ink, muted, border)
- Include a header with "Clenzey" brand link back to `/` and a consistent max-width container (`max-w-4xl`)
- Use `font-jakarta` for headings and `font-dm` for body text
- Keep styling minimal and professional — no new dependencies

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Inspect rendered DOM of SupportSection and Footer to verify href attributes and visible text content. Attempt navigation to `/faq`, `/terms`, `/privacy`, `/safety-guarantee` and confirm 404 responses.

**Test Cases**:
1. **Support Link Hrefs Test**: Assert that SupportSection renders links with href `#chat`, `#help`, `mailto:support@clenzey.com` (will demonstrate bug on unfixed code)
2. **Footer Company Hrefs Test**: Assert that Footer Company links all render `href="#"` (will demonstrate bug on unfixed code)
3. **Missing Pages Test**: Fetch `/faq`, `/terms`, `/privacy`, `/safety-guarantee` and assert 404 responses (will demonstrate bug on unfixed code)
4. **Unwanted Items Test**: Assert Footer renders "Join as a Cleaner" and "Sofa & Carpet Cleaning" text (will demonstrate bug on unfixed code)
5. **Hover Underline Test**: Assert action links contain `hover:underline` class (will demonstrate bug on unfixed code)

**Expected Counterexamples**:
- Support links navigate to placeholder anchors instead of real destinations
- Footer links have `#` href and target pages return 404
- Possible causes: placeholder data never updated, route files never created

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL link WHERE isBugCondition(link) DO
  result := renderFixedComponent(link)
  ASSERT link.href == expectedHref(link)
  ASSERT link.hoverStyle != 'underline'
  ASSERT targetPage(link.href).status == 200
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL element WHERE NOT isBugCondition(element) DO
  ASSERT renderOriginal(element) == renderFixed(element)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for non-affected elements (remaining footer links, section structure, animations), then write tests capturing that behavior.

**Test Cases**:
1. **Remaining Footer Service Links Preservation**: Verify Bathroom Cleaning, Kitchen Cleaning, Deep Home Cleaning, Express Clean still render and link to `#services`
2. **Section Structure Preservation**: Verify Support section still renders 3 cards with correct icons/titles/descriptions
3. **Animation Preservation**: Verify Framer Motion variants are still applied identically
4. **Layout Preservation**: Verify new pages use shared root layout with correct fonts and Material Symbols

### Unit Tests

- Test that `SupportSection` renders correct href for each card after fix
- Test that `Footer` renders correct href for each Company link after fix
- Test that `Footer` does not render "Join as a Cleaner" or "Sofa & Carpet Cleaning"
- Test that action links do not have `hover:underline` class
- Test that Live Chat link has `target="_blank"` and `rel="noopener noreferrer"`

### Property-Based Tests

- Generate random subsets of support channels and verify all hrefs match expected mapping
- Generate random footer configurations and verify removed items never appear
- Test that all non-buggy link elements preserve their original href and styling across renders

### Integration Tests

- Navigate to `/faq` and verify page renders with FAQ content and shared layout
- Navigate to `/terms` and verify page renders with terms content and shared layout
- Navigate to `/privacy` and verify page renders with privacy content and shared layout
- Navigate to `/safety-guarantee` and verify page renders with safety content and shared layout
- Click "Contact Support" in footer and verify page scrolls to `#support` section
- Click "Start Chat" and verify WhatsApp URL opens in new tab
