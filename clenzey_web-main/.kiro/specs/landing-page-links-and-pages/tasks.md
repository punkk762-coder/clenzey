# Implementation Plan: Landing Page Links and Pages Bugfix

## Overview

Fix broken/placeholder links in the Support section and Footer, remove unwanted footer items, improve link hover styling, and create four new pages (/faq, /terms, /privacy, /safety-guarantee) for the Clenzey landing page.

## Tasks

- [ ] 1. Fix Support section links and styling
  - [ ] 1.1 Update SUPPORT_CHANNELS data and link rendering in SupportSection.tsx
    - Change Live Chat href from `#chat` to `https://wa.me/917008410996`
    - Add `target="_blank"` and `rel="noopener noreferrer"` to Live Chat link
    - Change Help Center href from `#help` to `/faq`
    - Change Email Support href from `mailto:support@clenzey.com` to `mailto:business.clenzey@gmail.com`
    - Replace `hover:underline` with `hover:text-primary-container transition-colors`
    - Add `group` class to link and `group-hover:translate-x-0.5 transition-transform` to arrow icon
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [ ] 2. Fix Footer links and remove items
  - [ ] 2.1 Update Footer.tsx data arrays and rendering
    - Remove "Sofa & Carpet Cleaning" from SERVICE_LINKS array
    - Remove "Join as a Cleaner" from COMPANY_LINKS array
    - Convert COMPANY_LINKS from string array to object array with `{ label, href }` structure
    - Set hrefs: Terms of Service → `/terms`, Privacy Policy → `/privacy`, Safety Guarantee → `/safety-guarantee`, Contact Support → `/#support`
    - Update Company links JSX rendering to use object structure
    - _Requirements: 2.5, 2.6, 2.7, 2.8, 2.9, 2.10_

- [ ] 3. Create FAQ page
  - [ ] 3.1 Create app/faq/page.tsx with FAQ content
    - Create route file at `app/faq/page.tsx`
    - Include page heading "FAQs & Guides"
    - Add relevant FAQ items for home cleaning service (booking, cancellation, pricing, safety, etc.)
    - Use accordion-style or card-based layout
    - Use design tokens (primary, ink, muted, border) for styling
    - Include link back to home page
    - _Requirements: 2.2_

- [ ] 4. Create Terms of Service page
  - [ ] 4.1 Create app/terms/page.tsx with legal content
    - Create route file at `app/terms/page.tsx`
    - Include heading "Terms of Service"
    - Add sections: Acceptance of Terms, Description of Service, User Responsibilities, Booking and Payment, Cancellation Policy, Liability Limitations, Dispute Resolution, Changes to Terms
    - Use max-w-4xl centered container with proper typography
    - _Requirements: 2.5_

- [ ] 5. Create Privacy Policy page
  - [ ] 5.1 Create app/privacy/page.tsx with privacy content
    - Create route file at `app/privacy/page.tsx`
    - Include heading "Privacy Policy"
    - Add sections: Information We Collect, How We Use Information, Data Sharing, Data Security, Your Rights, Cookies, Contact Information
    - Use same layout pattern as Terms page
    - _Requirements: 2.6_

- [ ] 6. Create Safety Guarantee page
  - [ ] 6.1 Create app/safety-guarantee/page.tsx with safety content
    - Create route file at `app/safety-guarantee/page.tsx`
    - Include heading "Safety Guarantee"
    - Add sections: Our Commitment, Background Checks, Insurance Coverage, Quality Assurance, Incident Response, Your Protection
    - Use same layout pattern as Terms page
    - _Requirements: 2.7_

- [ ] 7. Final verification
  - Run `next build` to confirm all pages compile
  - Verify all routes respond with 200
  - Verify no broken imports or missing files

## Task Dependency Graph

```json
{
  "waves": [
    ["1", "2"],
    ["3", "4", "5", "6"],
    ["7"]
  ]
}
```

## Notes

- All new pages inherit the root layout from `app/layout.tsx` (fonts, Material Symbols, globals.css)
- New pages are simple server components — no client-side interactivity needed
- WhatsApp link uses the international format without `+` sign: `917008410996`
- External links (WhatsApp) use `target="_blank"` with `rel="noopener noreferrer"` for security
