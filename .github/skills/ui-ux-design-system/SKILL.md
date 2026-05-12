---
name: ui-ux-design-system
description: "Use when designing or auditing iZinga application UI/UX, creating a branding guide, or making web, Android, iOS, and desktop interfaces feel visually consistent. Scan the current app first, extract the real iZinga colors, typography, spacing, buttons, cards, icons, and motion, then apply one uniform design system across the product."
---

# UI UX Design System

Use this skill when the task is to make an iZinga app feel consistent across screens, platforms, and feature areas, or when the user asks for a branding guide, design system, or UI polish.

## Goal

Build a cohesive iZinga visual language from the current application before introducing new design choices. Prefer preserving the app's existing identity and strengthening it rather than replacing it.

## Workflow

1. Audit the current application UI first.
   - Inspect global styles, theme variables, shared components, and representative pages.
   - Identify the existing brand palette, typography, spacing, button styles, card styles, shadows, icon usage, and motion patterns.
   - Treat CSS variables and shared assets as the source of truth when they already exist.
   - For iZinga, expect these anchors to matter most: Catamaran body text, Calibri fallback, the logo asset, and the role colors used for shop, driver, and individual experiences.

2. Define the branding system from the audit.
   - Document primary, secondary, accent, success, warning, error, background, surface, border, and text colors.
   - Capture the main and fallback fonts for headings, body text, labels, and numeric content.
   - Note radius, elevation, spacing scale, button sizing, form field styling, and icon treatment.
   - Record any role-based or mode-based variations, such as shop, driver, individual, dark theme, or branded states.
   - In this app, keep the established iZinga token set unless a screen clearly lacks one:
     - shop: sand/gold tones around #be833d
     - driver: teal tones around #00A9A1
     - individual: coral/red tones around #D66247
     - text: dark neutral around #212121
     - background: light neutral around #F8F7F7
     - card/surface: pale neutral around #f3f2f2
     - pill/utility accent: blue around #1083A5
   - For dark theme, invert surfaces and text with the existing dark tokens already used by the app, keep role colors recognizable, and preserve readable contrast on cards, tables, inputs, and buttons.

3. Apply the system consistently.
   - Reuse the same tokens across all screens and components.
   - Keep headings, buttons, cards, alerts, and tables visually aligned.
   - Ensure mobile, tablet, desktop, and native-like layouts share the same visual rhythm.
   - Prefer reusable classes, CSS variables, and shared components over one-off styling.
   - Make buttons feel deliberate: simple shapes, strong contrast, and no conflicting hover language across screens.

4. Tune motion and hierarchy.
   - Use subtle transitions for hover, focus, reveal, and state changes.
   - Keep animations purposeful and lightweight.
   - Make the most important action visually dominant and secondary actions quieter.
   - Motion should support task clarity, not add decoration for its own sake.

5. Check accessibility and consistency.
   - Verify contrast, touch targets, readable type sizes, and focus states.
   - Avoid introducing a new palette unless the current application has no stable brand system.
   - Keep the design coherent across web, Android, iOS, and desktop so the same product feels like one brand.
   - If a screen breaks the system, bring it back to the common tokens rather than creating a new local style language.
   - Dark theme should never feel like a separate brand; it should reuse the same hierarchy, spacing, and role colors with darker surfaces.

## Output Format

When asked to define or apply a UI system, produce:

- A short brand summary
- A token list for colors, fonts, spacing, radius, shadows, and motion
- Component rules for buttons, cards, forms, navigation, tables, and alerts
- Platform-specific notes if the app targets web, Android, iOS, or desktop
- A short implementation checklist for the next edits
- If relevant, call out how the iZinga role colors and logo treatment should stay consistent across shop, driver, and individual flows

## Quality Checks

- The design language should read as one system, not a set of unrelated screens.
- The palette and typography should come from the app's existing patterns when possible.
- Buttons, headings, and cards should feel intentionally related.
- Motion should support clarity, not distract from it.
- The final UI should be easy to reuse across the whole application.

## iZinga Brand Snapshot

- Body font: Catamaran
- Fallback font: Calibri
- Brand palette: teal, gold, and coral role colors anchored to the app theme variables
- Surface style: light neutral cards and tables with minimal borders
- Dark theme: deep neutral backgrounds, lifted card surfaces, and high-contrast text that still matches the same iZinga hierarchy
- Button style: bold, flat, full-width on small screens, role-colored where applicable
- Logo usage: reuse the current iZinga logo assets and keep the mark visually prominent in app chrome
