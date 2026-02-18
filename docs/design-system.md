# Design System Integration

The project uses the **Koine Design System** as the baseline for all UI development.

## Location

The complete design system package is located at the project root:

- `design-system/`
    - `tokens/` (Color palette, typography, spacing, motion)
    - `assets/` (Logos, favicons)
    - `styles/` (Global CSS tokens)
    - `docs/` (System documentation)
    - `tailwind.config.js` (Tailwind preset)

## Usage

### CSS Variables
Include `design-system/styles/global.css` in your application entry point to access all design tokens as CSS custom properties (e.g., `--koine-gold-400`).

### Tailwind
Extend your local Tailwind configuration using the preset provided in `design-system/tailwind.config.js`.

### Assets
Use SVG and PNG assets from `design-system/assets/` for all branding needs.

## Philosophy

See `design-system/docs/README.md` for the full design philosophy based on the Pentecost iconography ("Universal understanding").
