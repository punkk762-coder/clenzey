# Bugfix Requirements Document

## Introduction

The Clenzey landing page has multiple issues related to broken/placeholder links, missing pages, unwanted footer items, and poor hyperlink styling. The Support section cards (Live Chat, Help Center, Email Support) point to non-functional placeholder anchors, several legal/informational pages referenced in the footer don't exist, the footer contains items that should be removed, and hyperlinks display underlines that degrade the visual design.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a user clicks "Start Chat" in the Live Chat support card THEN the system navigates to a non-functional `#chat` anchor instead of opening WhatsApp Web

1.2 WHEN a user clicks "Visit Help Center" in the Help Center support card THEN the system navigates to a non-functional `#help` anchor instead of a real FAQ page

1.3 WHEN a user clicks "Send Email" in the Email Support card THEN the system opens a mailto link to `support@clenzey.com` which is not the correct business email

1.4 WHEN a user hovers over action links in the Support section THEN the system shows underline text decoration via `hover:underline` class, and the default link styling lacks visual polish

1.5 WHEN a user clicks "Terms of Service" in the footer Company links THEN the system navigates to `#` because no `/terms` page exists

1.6 WHEN a user clicks "Privacy Policy" in the footer Company links THEN the system navigates to `#` because no `/privacy` page exists

1.7 WHEN a user clicks "Safety Guarantee" in the footer Company links THEN the system navigates to `#` because no `/safety-guarantee` page exists

1.8 WHEN a user views the footer Company links THEN the system displays "Join as a Cleaner" which should not be present

1.9 WHEN a user views the footer Cleaning Services links THEN the system displays "Sofa & Carpet Cleaning" which should not be present

1.10 WHEN a user clicks "Contact Support" in the footer Company links THEN the system navigates to `#` instead of scrolling to the support section

### Expected Behavior (Correct)

2.1 WHEN a user clicks "Start Chat" in the Live Chat support card THEN the system SHALL open WhatsApp Web with the number +91 70084 10996 (URL: `https://wa.me/917008410996`)

2.2 WHEN a user clicks "Visit Help Center" in the Help Center support card THEN the system SHALL navigate to a `/faq` page containing FAQs and guides relevant to the home cleaning service

2.3 WHEN a user clicks "Send Email" in the Email Support card THEN the system SHALL open a mailto link to `business.clenzey@gmail.com`

2.4 WHEN a user views or hovers over action links in the Support section THEN the system SHALL display links without underlines, using color transitions and subtle hover effects (e.g., color shift, slight translate) instead

2.5 WHEN a user clicks "Terms of Service" in the footer Company links THEN the system SHALL navigate to a `/terms` page containing proper terms of service content for a home cleaning service

2.6 WHEN a user clicks "Privacy Policy" in the footer Company links THEN the system SHALL navigate to a `/privacy` page containing proper privacy policy content for a home cleaning service

2.7 WHEN a user clicks "Safety Guarantee" in the footer Company links THEN the system SHALL navigate to a `/safety-guarantee` page containing proper safety guarantee content for a home cleaning service

2.8 WHEN a user views the footer Company links THEN the system SHALL NOT display "Join as a Cleaner" in the list

2.9 WHEN a user views the footer Cleaning Services links THEN the system SHALL NOT display "Sofa & Carpet Cleaning" in the list

2.10 WHEN a user clicks "Contact Support" in the footer Company links THEN the system SHALL navigate to `/#support` which scrolls to the Need Help section on the landing page

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a user views the Support section THEN the system SHALL CONTINUE TO display three cards (Live Chat, Help Center, Email Support) with their icons, titles, and descriptions

3.2 WHEN a user views the footer THEN the system SHALL CONTINUE TO display the Brand section, Cleaning Services column, Company column, and Book on the go section

3.3 WHEN a user clicks any Cleaning Services link in the footer (Bathroom Cleaning, Kitchen Cleaning, Deep Home Cleaning, Express Clean) THEN the system SHALL CONTINUE TO navigate to `#services`

3.4 WHEN a user views the footer Cleaning Services column THEN the system SHALL CONTINUE TO display Bathroom Cleaning, Kitchen Cleaning, Deep Home Cleaning, and Express Clean

3.5 WHEN a user views the footer Company column THEN the system SHALL CONTINUE TO display Terms of Service, Privacy Policy, Safety Guarantee, and Contact Support

3.6 WHEN a user views the Support section cards THEN the system SHALL CONTINUE TO animate with staggered fade-up motion via Framer Motion

3.7 WHEN a user navigates to any existing page THEN the system SHALL CONTINUE TO render the shared layout with fonts, Material Symbols, and global styles

3.8 WHEN a user views the landing page THEN the system SHALL CONTINUE TO display all sections (Hero, Why, Services, How, Testimonials, Waitlist, Safety, Support) in the correct order with the Footer
