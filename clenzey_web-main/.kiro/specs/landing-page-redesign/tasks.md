# Implementation Plan: Landing Page Redesign

## Overview

Rebuild the Clenzey landing page section-by-section from top to bottom, updating the design system tokens first, then implementing each section component in page order. Legacy phone mockup code and unused hooks/stores are removed early to keep the codebase clean. All components use TypeScript, Tailwind CSS v4, and Framer Motion.

## Tasks

- [ ] 1. Update design tokens and clean up globals.css
  - [ ] 1.1 Replace @theme color tokens with new Hydro-Professional palette (#005d90 primary, #0077b6 primary-container, #CAF0F8 surface-ultra-light, #fbf8ff surface, #1a1a2e ink, #4a5568 muted, #e2e8f0 border)
    - Update the `@theme` block in `app/globals.css`
    - Update the `:root` CSS custom properties to match
    - Remove all phone mockup CSS (all classes prefixed with `hp-`, `hw-`, `.phone-frame`, `.how-chip`)
    - Remove `.how-step` and `.step-content` CSS rules
    - Keep scroll-reveal classes, keyframe animations (fadeUp, pulse-dot), and hamburger styles
    - Update `.hero-badge::before` to use new primary color
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 14.7_

- [ ] 2. Remove legacy files and update page.tsx
  - [ ] 2.1 Delete unused components, hooks, and stores
    - Delete `app/components/ui/HeroPhone.tsx`
    - Delete `app/components/ui/HowPhone.tsx`
    - Delete `app/hooks/useCarouselEffect.ts`
    - Delete `app/hooks/useScrollJail.ts`
    - Delete `app/store/carouselStore.ts`
    - Delete `app/store/howStore.ts`
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6_
  - [ ] 2.2 Update app/page.tsx to include new sections
    - Add imports for SafetySection and SupportSection
    - Remove any imports referencing deleted files
    - Arrange sections in correct order: Nav, Drawer, Hero, Why, Services, How, Testimonials, Waitlist(CTA), Safety, Support, Footer
    - _Requirements: 2.1, 2.3, 2.4_

- [ ] 3. Rebuild Nav component
  - [ ] 3.1 Update app/components/Nav.tsx with new design
    - Update NAV_LINKS to: Services, How it Works, Safety, Support
    - Update brand color to primary (#005d90)
    - Update "Book Now" button to use primary-container color (#0077b6)
    - Keep glassmorphism backdrop (bg-white/80 backdrop-blur-xl)
    - Keep scroll hide/show behavior from navStore
    - Keep mobile hamburger menu
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

- [ ] 4. Rebuild Hero section
  - [ ] 4.1 Rewrite app/components/sections/HeroSection.tsx
    - Create two-column layout (content left, image right on desktop; stacked on mobile)
    - Add trusted badge with pulse-dot: "Trusted by 10,000+ homes"
    - Add H1: "Spotless Home, Zero Effort" with font-jakarta font-extrabold
    - Add descriptive subheadline paragraph
    - Add Quick Select buttons row with Material Symbol icons: home (Full Home), bathtub (Bathroom), kitchen (Kitchen), cleaning_services (Deep Clean)
    - Add Stat Badges: "4.8/5 Average Rating", "1M+ Rooms Cleaned"
    - Add hero image using Next.js Image component pointing to `/images/hero-cleaner.jpg` with rounded-2xl
    - Add Framer Motion fadeUp animation on content
    - Remove all references to HeroPhone component
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 3.4_

- [ ] 5. Rebuild Why/Features section
  - [ ] 5.1 Rewrite app/components/sections/WhySection.tsx as feature cards
    - Section heading (optional, or integrate directly below hero)
    - Create 4-column grid (lg:grid-cols-4, md:grid-cols-2, grid-cols-1)
    - Four feature cards with Material Symbol icons: timer ("Arrival in 15m"), verified_user ("Verified Cleaners"), payments ("Transparent Pricing"), location_on ("Real-time Tracking")
    - Each card: icon in primary-faint circle + bold title + muted description
    - Add staggered Framer Motion reveal animation
    - _Requirements: 3.1, 3.2, 4.5_

- [ ] 6. Rebuild Services section
  - [ ] 6.1 Rewrite app/components/sections/ServicesSection.tsx
    - Section heading: "Our Specialized Cleaning"
    - 2×2 grid on desktop (lg:grid-cols-2), single column on mobile
    - Four service cards: Bathroom Cleaning, Kitchen Cleaning, Full Home Cleaning, Deep Cleaning
    - Each card: rounded image (use existing service images from /public/images/services/ or placeholder), title, description, "Book Now →" button
    - White card background, subtle border, hover shadow elevation
    - Add section id="services" for nav link targeting
    - Framer Motion staggered reveal
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ] 7. Rebuild How It Works section
  - [ ] 7.1 Rewrite app/components/sections/HowSection.tsx
    - Section heading: "Book Your Clean in 60 Seconds"
    - Three steps in a horizontal row on desktop, stacked on mobile
    - Each step: numbered circle (bg-primary, white text) + Material Symbol icon + title + description
    - Steps: 1. "Choose Your Service" (cleaning_services), 2. "Get Matched" (person_check), 3. "Enjoy Clean" (verified)
    - Remove all HowPhone references and screen transition logic
    - Add section id="how" for nav link targeting
    - Framer Motion staggered reveal
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ] 8. Checkpoint - Verify top-half sections
  - Ensure the app builds without errors (`next build` or dev mode renders correctly)
  - Verify Nav, Hero, Why, Services, How sections all render
  - Ensure all deleted files are no longer imported anywhere
  - Ask the user if questions arise.

- [ ] 9. Rebuild Testimonials section
  - [ ] 9.1 Rewrite app/components/sections/TestimonialsSection.tsx
    - Section heading: "Loved by Thousands"
    - Two-card layout: left card with aggregate rating (4.8/5 numeric + 5 star icons), right card with quote
    - Quote card: testimonial text, author avatar placeholder, author name, role
    - Glassmorphism card styling (white/80 backdrop-blur, subtle border)
    - Framer Motion reveal animation
    - _Requirements: 7.1, 7.2, 7.3_

- [ ] 10. Rebuild CTA/Waitlist section
  - [ ] 10.1 Rewrite app/components/sections/WaitlistSection.tsx as CTA
    - Full-width section with dark primary background (bg-primary or #005d90)
    - Rounded corners on the section container (rounded-3xl within a max-width wrapper)
    - White heading: "Ready for a Clenzer Home?"
    - Two buttons: "Book Your First Clean" (filled white bg, primary text) and "Partner with Us" (outlined white border, white text)
    - Remove waitlist form and waitlistStore usage
    - _Requirements: 10.1, 10.2, 10.3_

- [ ] 11. Create Safety section
  - [ ] 11.1 Create app/components/sections/SafetySection.tsx
    - Section heading: "Your Safety is Our Priority"
    - Section background: surface-ultra-light (#CAF0F8)
    - Two Safety_Cards side by side (lg:grid-cols-2)
    - Card 1: verified_user icon, "Verified Professionals", description about background checks
    - Card 2: shield icon, "Insured & Protected", description about coverage
    - Each card: large Material Symbol icon + title + description
    - Add section id="safety" for nav link targeting
    - Framer Motion reveal
    - _Requirements: 8.1, 8.2, 8.3_

- [ ] 12. Create Support section
  - [ ] 12.1 Create app/components/sections/SupportSection.tsx
    - Section heading: "Need Help? We're Here"
    - 3-column grid (lg:grid-cols-3, stacked on mobile)
    - Three Support_Cards: Live Chat (chat icon), Help Center (help icon), Email Support (email icon)
    - Each card: Material Symbol icon + title + description + action link/button
    - White card backgrounds with subtle border
    - Add section id="support" for nav link targeting
    - Framer Motion staggered reveal
    - _Requirements: 9.1, 9.2, 9.3_

- [ ] 13. Rebuild Footer
  - [ ] 13.1 Update app/components/Footer.tsx
    - Update colors to new primary (#005d90)
    - Update SERVICE_LINKS to: Bathroom Cleaning, Kitchen Cleaning, Full Home Cleaning, Deep Cleaning
    - Rename column heading to "Cleaning Services"
    - Update COMPANY_LINKS to: About Us, Safety, Partner with Us, Terms of Service, Privacy Policy
    - Keep App Store / Google Play badges
    - Update background color to match new surface palette
    - Keep copyright notice
    - _Requirements: 12.1, 12.2, 12.3, 12.4_

- [ ] 14. Final cleanup and polish
  - [ ] 14.1 Remove unused waitlistStore if no longer needed
    - Check if WaitlistSection still uses waitlistStore
    - If CTA section has no form, remove `app/store/waitlistStore.ts`
    - Remove any unused imports in page.tsx or other files
    - _Requirements: 14.1_
  - [ ] 14.2 Verify all section ids match nav hrefs
    - Ensure sections have ids: services, how, safety, support
    - Verify smooth scroll works for all nav links
    - _Requirements: 2.2, 11.4_

- [ ] 15. Final checkpoint - Full page verification
  - Ensure `next build` passes without errors
  - Verify all 10 sections render in correct order
  - Verify responsive layout at desktop (1440px), tablet (768px), and mobile (375px)
  - Verify no console errors or missing imports
  - Ask the user if questions arise.

- [ ]* 16. Write property tests for section rendering
  - [ ]* 16.1 Write property test for data-driven rendering completeness
    - **Property 5: Data Array Rendering Completeness**
    - **Validates: Requirements 4.4, 5.2, 6.2, 8.2, 9.2**
  - [ ]* 16.2 Write property test for card field completeness
    - **Property 2: Card Data Completeness**
    - **Validates: Requirements 5.3, 8.3, 9.3**
  - [ ]* 16.3 Write property test for icon name fidelity
    - **Property 4: Icon Name Rendering Fidelity**
    - **Validates: Requirements 4.5, 8.2, 9.2**

## Task Dependency Graph

```json
{
  "waves": [
    ["1"],
    ["2"],
    ["3", "4", "5", "6", "7"],
    ["8"],
    ["9", "10", "11", "12", "13"],
    ["14"],
    ["15"],
    ["16"]
  ]
}
```

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- The implementation proceeds top-to-bottom matching the visual page flow
- Each section task is independent after the token/cleanup tasks (1-2) are done
- Service card images may use existing images from `/public/images/services/` or placeholders until final assets are ready
- The hero image `/images/hero-cleaner.jpg` already exists in the public folder
- Framer Motion animations should use `whileInView` with `viewport={{ once: true }}` for scroll reveal
