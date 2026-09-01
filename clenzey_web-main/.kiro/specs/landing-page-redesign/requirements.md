# Requirements Document

## Introduction

This document specifies the requirements for redesigning the Clenzey landing page from the current deep-navy phone-mockup aesthetic to a Material Design 3-inspired "Hydro-Professional" design system. The redesign introduces a monochromatic blue palette, cleaner card-based layouts, static hero imagery, and simplified interactions while maintaining the existing Next.js/Tailwind/Framer Motion tech stack.

## Glossary

- **Page**: The Clenzey landing page rendered at the root route (/)
- **Section**: A distinct visual block of the page (Hero, Services, etc.)
- **Nav**: The fixed top navigation bar component
- **Design_Token**: A CSS custom property defined in the Tailwind @theme block
- **Material_Symbol**: An icon from the Material Symbols Outlined icon font
- **Feature_Card**: A card displaying an icon, title, and description in the Why section
- **Service_Card**: A card displaying an image, title, description, and CTA in the Services section
- **Quick_Select_Button**: A service category button in the hero section
- **Stat_Badge**: A metric display element in the hero section
- **CTA_Section**: The call-to-action section with dark primary background
- **Safety_Card**: A card displaying safety features with icon and text
- **Support_Card**: A card displaying a help channel with icon, text, and action
- **Scroll_Reveal**: An animation triggered when an element enters the viewport
- **Glassmorphism**: A UI effect combining transparency, blur, and subtle borders

## Requirements

### Requirement 1: Design Token Update

**User Story:** As a developer, I want the Tailwind theme tokens updated to the Hydro-Professional palette, so that all components use consistent colors matching the new design system.

#### Acceptance Criteria

1. THE Page SHALL use `#005d90` as the primary color token
2. THE Page SHALL use `#0077b6` as the primary-container color token
3. THE Page SHALL use `#CAF0F8` as the surface-ultra-light color token
4. THE Page SHALL use `#fbf8ff` as the surface/page background color token
5. THE Page SHALL use `#1a1a2e` as the primary text (ink) color token
6. THE Page SHALL use Plus Jakarta Sans as the heading font with weights 400–800
7. THE Page SHALL use DM Sans as the body text font

### Requirement 2: Page Structure and Section Ordering

**User Story:** As a user, I want to see all information sections in a logical flow, so that I can understand Clenzey's value proposition progressively.

#### Acceptance Criteria

1. THE Page SHALL render sections in this exact order: Nav, Hero, Why, Services, How It Works, Testimonials, CTA, Safety, Support, Footer
2. WHEN a user clicks a navigation link, THE Nav SHALL smooth-scroll to the corresponding section
3. THE Page SHALL remove the phone mockup components (HeroPhone, HowPhone) from the rendered output
4. THE Page SHALL remove carousel and scroll-jail interactions from the rendered output

### Requirement 3: Responsive Layout

**User Story:** As a user, I want the page to work well on any device, so that I get a good experience on desktop, tablet, and mobile.

#### Acceptance Criteria

1. WHEN the viewport width is 1024px or greater, THE Page SHALL display multi-column grid layouts for card sections
2. WHEN the viewport width is less than 768px, THE Page SHALL stack all card sections into a single column
3. THE Nav SHALL display horizontal links on desktop (≥1024px) and a hamburger menu on mobile (<1024px)
4. THE Hero section SHALL display a two-column layout on desktop and stack vertically on mobile

### Requirement 4: Hero Section

**User Story:** As a visitor, I want to immediately understand what Clenzey offers, so that I can decide whether to use the service.

#### Acceptance Criteria

1. THE Hero section SHALL display a "Trusted by 10,000+ homes" badge with a pulse-dot animation
2. THE Hero section SHALL display the headline "Spotless Home, Zero Effort" using Plus Jakarta Sans at font-weight 800
3. THE Hero section SHALL display a descriptive subheadline below the main headline
4. THE Hero section SHALL display four Quick_Select_Buttons labeled: Full Home, Bathroom, Kitchen, Deep Clean
5. WHEN a Quick_Select_Button uses a Material_Symbol icon, THE button SHALL render the correct icon alongside the label
6. THE Hero section SHALL display two Stat_Badges: "4.8/5 Average Rating" and "1M+ Rooms Cleaned"
7. THE Hero section SHALL display the hero image (`/images/hero-cleaner.jpg`) with rounded corners on the right side (desktop)

### Requirement 5: Services Section

**User Story:** As a visitor, I want to see what cleaning services are available, so that I can choose the right one for my needs.

#### Acceptance Criteria

1. THE Services section SHALL display the heading "Our Specialized Cleaning"
2. THE Services section SHALL display four Service_Cards in a 2×2 grid on desktop
3. WHEN a Service_Card is rendered, THE card SHALL include an image, title, description, and "Book Now" button
4. WHEN a viewport is less than 768px, THE Services section SHALL display cards in a single column

### Requirement 6: How It Works Section

**User Story:** As a visitor, I want to understand the booking process, so that I feel confident it's quick and easy.

#### Acceptance Criteria

1. THE How section SHALL display the heading "Book Your Clean in 60 Seconds"
2. THE How section SHALL display exactly three steps with numbered circles
3. WHEN each step is rendered, THE step SHALL include a number, icon, title, and description
4. THE three steps SHALL be: "Choose Your Service", "Get Matched", "Enjoy Clean"

### Requirement 7: Testimonials Section

**User Story:** As a visitor, I want to see social proof from other customers, so that I trust the service quality.

#### Acceptance Criteria

1. THE Testimonials section SHALL display the heading "Loved by Thousands"
2. THE Testimonials section SHALL display an aggregate rating card with numeric rating and star icons
3. THE Testimonials section SHALL display a quote card with customer testimonial text, author name, and role

### Requirement 8: Safety Section

**User Story:** As a visitor, I want to know my home and family are safe, so that I feel comfortable letting cleaners in.

#### Acceptance Criteria

1. THE Safety section SHALL display the heading "Your Safety is Our Priority"
2. THE Safety section SHALL display at least two Safety_Cards with icons `verified_user` and `shield`
3. WHEN a Safety_Card is rendered, THE card SHALL include an icon, title, and description

### Requirement 9: Support Section

**User Story:** As a user, I want to know how to get help, so that I can resolve issues quickly.

#### Acceptance Criteria

1. THE Support section SHALL display the heading "Need Help? We're Here"
2. THE Support section SHALL display three Support_Cards: Live Chat, Help Center, Email Support
3. WHEN a Support_Card is rendered, THE card SHALL include an icon, title, description, and action link

### Requirement 10: CTA Section

**User Story:** As a visitor who's interested, I want a clear call to action, so that I can easily start using Clenzey.

#### Acceptance Criteria

1. THE CTA section SHALL display the heading "Ready for a Clenzer Home?" on a dark primary background
2. THE CTA section SHALL display two buttons: "Book Your First Clean" (filled) and "Partner with Us" (outlined)
3. THE CTA section buttons SHALL have white text on the dark primary background

### Requirement 11: Navigation Component

**User Story:** As a user, I want persistent navigation, so that I can easily move between sections.

#### Acceptance Criteria

1. THE Nav SHALL be fixed to the top of the viewport with a glassmorphism background (bg-white/80 backdrop-blur)
2. WHEN the user scrolls down, THE Nav SHALL hide with a translateY transition
3. WHEN the user scrolls up, THE Nav SHALL reappear
4. THE Nav SHALL display links: Services, How it Works, Safety, Support
5. THE Nav SHALL display a "Book Now" button using the primary-container color

### Requirement 12: Footer Component

**User Story:** As a user, I want to find additional links and app downloads, so that I can access all Clenzey resources.

#### Acceptance Criteria

1. THE Footer SHALL display the Clenzey brand name and tagline
2. THE Footer SHALL display two link columns: "Cleaning Services" and "Company"
3. THE Footer SHALL display Apple App Store and Google Play download badges
4. THE Footer SHALL display a copyright notice

### Requirement 13: Scroll Reveal Animations

**User Story:** As a user, I want subtle entrance animations, so that the page feels polished and engaging.

#### Acceptance Criteria

1. WHEN a section enters the viewport, THE section content SHALL animate from opacity 0 to 1 with a vertical translate
2. THE animation duration SHALL be approximately 600ms with an ease-out curve
3. WHEN multiple cards are in a section, THE cards SHALL animate with staggered delays

### Requirement 14: Legacy Code Removal

**User Story:** As a developer, I want unused code removed, so that the bundle is smaller and the codebase is cleaner.

#### Acceptance Criteria

1. THE codebase SHALL NOT contain the HeroPhone component file
2. THE codebase SHALL NOT contain the HowPhone component file
3. THE codebase SHALL NOT contain the useCarouselEffect hook
4. THE codebase SHALL NOT contain the useScrollJail hook
5. THE codebase SHALL NOT contain the carouselStore
6. THE codebase SHALL NOT contain the howStore
7. THE globals.css SHALL NOT contain phone mockup CSS (classes prefixed with `hp-` or `hw-`)
