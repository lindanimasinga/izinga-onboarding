---
description: "Apply the iZinga UI system to frontend screens and components."
applyTo: "src/app/**/*.ts,src/app/**/*.html,src/app/**/*.css,src/app/**/*.scss,src/styles.css"
---

# iZinga UI System Instructions

When editing frontend files in this repo, keep the UI aligned with the existing iZinga brand system.

## Rules

- Reuse the existing theme variables before introducing new colors.
- Keep Catamaran as the primary body font and Calibri as the fallback.
- Preserve the current role colors: gold for shop, teal for driver, coral for individual.
- Respect the app's dark theme variables and keep contrast readable in both light and dark modes.
- Keep buttons bold, simple, and consistent across screens.
- Prefer light neutral cards, table surfaces, and restrained borders.
- Keep hover and reveal motion subtle and purposeful.
- Make the layout feel consistent on web, Android, iOS, and desktop form factors.
- Use shared components and CSS variables instead of one-off local styling where possible.
- In dark theme, use darker surfaces and lighter text without changing the role-color identity.

## Review Checklist

- Does the screen match the current iZinga palette and typography?
- Are headings, cards, buttons, and alerts visually related?
- Are the role-based colors used consistently?
- Does the dark theme remain readable and visually tied to the light theme?
- Does the screen stay readable and usable on small screens?
- Does any new styling improve the shared system instead of fragmenting it?