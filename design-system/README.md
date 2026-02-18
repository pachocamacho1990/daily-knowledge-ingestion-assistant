# Koine Design System

> **"Universal understanding"**

A design system rooted in Pentecost iconography — the moment knowledge became universally accessible. Named after Koine Greek, the common tongue that first made universal understanding possible.

> *Futuristic Pentecost* — candlelight through frosted glass. Sacred motifs rendered with glassmorphism, monospace HUD elements, and data-grid textures.

---

## Quick Start

### 1. Install fonts
Add to your HTML `<head>` or import in CSS:
```html
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400&family=DM+Sans:wght@300;400;500&family=JetBrains+Mono:wght@300;400;500&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">
```

### 2. Include global styles
```html
<link rel="stylesheet" href="styles/global.css">
```

### 3. Set theme
```html
<html data-theme="dark">  <!-- dark (default) | light | liturgical -->
```

### 4. Use Tailwind (optional)
Copy `tailwind.config.js` to your project root. All tokens are mapped.

---

## File Structure

```
koine-design-system/
├── tokens/                    ← Design tokens (JSON)
│   ├── colors.json            ← Full color palette
│   ├── typography.json        ← Fonts, sizes, weights, styles
│   ├── spacing.json           ← Spacing scale, radii, shadows, layout
│   ├── motion.json            ← Durations, easings, keyframes
│   └── themes/
│       ├── dark.json          ← Default: gold on cathedral dark
│       ├── light.json         ← Parchment: dark on warm cream
│       └── liturgical.json    ← Pentecost red: gold on sacred red
│
├── assets/
│   ├── logos/
│   │   ├── full/              ← Dove + 7 flames + 7 people + rays
│   │   ├── reduced/           ← Dove + 7 flames (primary mark)
│   │   ├── minimal/           ← Dove with tail
│   │   └── glyph/             ← Compact dove (favicons, 16px)
│   └── favicons/
│       ├── favicon.ico        ← Multi-size ICO (16/32/48)
│       ├── favicon-{size}.png ← 16, 32, 48, 64, 128, 180, 192, 512
│       └── favicon-integration.html  ← Copy-paste HTML snippet
│
├── styles/
│   └── global.css             ← All tokens as CSS custom properties
│                                 + base reset + typography + animations
│                                 + theme switching + accessibility
│
├── tailwind.config.js         ← Tailwind preset with all tokens
│
└── docs/
    └── components.md          ← Component design guidelines
```

---

## Three Sacred Motifs

Every design decision flows from three visual figures derived from the Pentecost event:

| Motif | Symbol | Meaning | Usage |
|-------|--------|---------|-------|
| **Dove** | 🕊️ | The AI agent — source of knowledge | Logo, app icon, AI indicators, loading |
| **Flame** | 🔥 | Seven Gifts — active capabilities | Buttons, progress, badges, active states |
| **Connected Nodes** | 🔗 | Knowledge graph — community | Data viz, navigation, relationships |

---

## Color Palette

### Brand Gold (primary)
From dove head (#f0e4c0) through wing (#d4c18a) to flame (#c97a20).

| Token | Hex | Use |
|-------|-----|-----|
| gold-50 | `#faf6e8` | Subtle background tint |
| gold-100 | `#f0e4c0` | Dove head, highlights |
| gold-200 | `#e8d5a3` | Dove body |
| gold-300 | `#d4c18a` | Dove wings, wordmark |
| gold-400 | `#c9a84c` | **Core accent**, links, borders |
| gold-500 | `#daa540` | **Interactive default**, buttons |
| gold-600 | `#c97a20` | Flame deep, emphasis |
| gold-700 | `#a06218` | Pressed states |
| gold-800 | `#8a5a10` | Light theme accent |
| gold-900 | `#6b5020` | Deepest gold |

### Themes

**Dark (default):** Gold on `#08080e` — candlelight through frosted glass. Semi-transparent surfaces with `backdrop-filter`.  
**Light:** Dark gold on `#fdf9f0` — ink on parchment.  
**Liturgical Red:** Gold on `#5a0e0e` → `#8b1a1a` — Pentecost vestments.

---

## Typography

| Role | Font | Weight | Tracking |
|------|------|--------|----------|
| **Wordmark** | Cormorant Garamond | Light (300) | 0.30em |
| **Headings** | Cormorant Garamond | Light–Medium | 0.08–0.20em |
| **Tagline** | Libre Baskerville | Regular Italic | 0.08em |
| **Body** | DM Sans | Regular (400) | Normal |
| **Labels** | DM Sans | Medium (500) | 0.15em |
| **Overlines** | Cormorant Garamond | Regular | 0.35em, uppercase |
| **Mono / HUD** | JetBrains Mono | Regular (400) | 0.15em, uppercase |

---

## Motion

Inspired by candlelight — warm, gentle, deliberate — with precise, technological transitions at the edges.

| Token | Duration | Use |
|-------|----------|-----|
| `instant` | 100ms | Micro-interactions |
| `fast` | 150ms | Hover states |
| `normal` | 250ms | Standard transitions |
| `slow` | 400ms | Panel reveals |
| `gentle` | 600ms | Page entrances |
| `meditative` | 1000ms | Background ambience |
| `breath` | 2000ms | Living glow loops |

### Named Animations
- `koine-fade-in` — Eyes adjusting to candlelight
- `koine-fade-in-up` — Content ascending like flames
- `koine-glow-pulse` — Living flame, active knowledge node
- `koine-flame-flicker` — Subtle flame movement for processing states
- `koine-graph-connect` — Knowledge graph edge drawing in

---

## Seven Gifts → Seven Capabilities

| Gift | Capability | Agent Function |
|------|-----------|---------------|
| Wisdom | Synthesis | Cross-domain knowledge fusion |
| Understanding | Processing | Five-level deep summarization |
| Counsel | Recommendation | Goal-weighted suggestions |
| Fortitude | Resilience | Persistent memory, fault tolerance |
| Knowledge | Retrieval | Knowledge graph, search |
| Piety | Personalization | Devotion to user's goals |
| Awe | Discovery | Surfacing the unknown unknowns |

---

## ⚡ Design Rules — Read Before Building

These rules **must** be followed by any developer or AI agent working on features:

### Visual Identity
- **Always use `backdrop-filter: blur(20px) saturate(1.5)`** on panels, cards, and elevated surfaces. Surfaces are semi-transparent — this is what creates the frosted-glass look.
- **Surfaces must use RGBA tokens**, not opaque colors. `--koine-surface-primary` = `rgba(13,11,8,0.7)`, `--koine-surface-elevated` = `rgba(30,25,20,0.55)`.
- **Never use raw hex colors.** Always reference design tokens via `var(--koine-*)`.
- **Never use sharp corners.** Minimum radius is `--koine-radius-sm` (6px). Cards use `--koine-radius-xl` (16px).

### Typography
- **Headers:** Cormorant Garamond — always with `letter-spacing` and `uppercase`.
- **Body text:** DM Sans — the default for paragraphs and UI labels.
- **Technical / HUD metadata:** JetBrains Mono (`--koine-font-mono`) — for status indicators, overline labels on cards, input placeholders, footers, and anything that feels like "system data". Always `uppercase` or `lowercase`, never mixed case.
- **Never use browser default fonts.** Every text element should use one of the four font families.

### Glow & Interaction
- **Default hover glow:** `--koine-glow-sm` for subtle elements.
- **Focus / prominent hover:** `--koine-glow-neon` — the intensified neon gold (`0 0 10px + 0 0 30px`).
- **Borders lighten on hover:** transition `border-color` from `--koine-border-subtle` → `--koine-gold-400`.

### HUD Elements
- **Corner markers** (bracket-style `::before`/`::after`) are used on interactive cards. They fade in on hover. See `components.md` → HUD Elements.
- **The data grid** (`--koine-grid-color`) is a background texture applied to the page body, not to individual components.
- **System status indicators** use mono font + a pulsing green dot.

### What NOT to Do
- ❌ Opaque backgrounds on cards or panels (breaks glassmorphism)
- ❌ Mixed-case text in mono font (always all-uppercase or all-lowercase)
- ❌ Bright white text (use `--koine-text-primary` = cream, not `#fff`)
- ❌ Generic shadows (`box-shadow: 0 2px 4px rgba(0,0,0,0.1)`) — use Koine shadow/glow tokens only
- ❌ Tailwind default colors (`bg-gray-800`, `text-white`) — use Koine tokens
- ❌ Animations faster than `--koine-dur-instant` (100ms) or without easing

---

## Futuristic Pentecost Patterns

### Glassmorphism Panel (the core pattern)

Every card, panel, and elevated surface follows this pattern:

```css
.my-panel {
  /* Semi-transparent surface + frosted glass */
  background: var(--koine-surface-primary);    /* rgba(13,11,8,0.7) */
  backdrop-filter: blur(20px) saturate(1.5);
  -webkit-backdrop-filter: blur(20px) saturate(1.5);

  /* Structure */
  border: 1px solid var(--koine-border-subtle);
  border-radius: var(--koine-radius-xl);       /* 16px */
  padding: var(--koine-space-6);               /* 24px */
  color: var(--koine-text-primary);

  /* Interaction */
  transition: all var(--koine-dur-normal) var(--koine-ease-gentle);
}

.my-panel:hover {
  border-color: var(--koine-gold-400);
  box-shadow: var(--koine-glow-neon);          /* Neon gold glow */
}
```

### HUD Card with Corner Markers

Interactive cards gain bracket-style corner markers on hover:

```css
.my-hud-card {
  position: relative;
  /* ... same glassmorphism base as above ... */
}

/* Top-left bracket */
.my-hud-card::before {
  content: '';
  position: absolute;
  top: -1px; left: -1px;
  width: 12px; height: 12px;
  border-top: 2px solid var(--koine-gold-400);
  border-left: 2px solid var(--koine-gold-400);
  opacity: 0;
  transition: opacity var(--koine-dur-normal) var(--koine-ease-gentle);
}

/* Bottom-right bracket */
.my-hud-card::after {
  content: '';
  position: absolute;
  bottom: -1px; right: -1px;
  width: 12px; height: 12px;
  border-bottom: 2px solid var(--koine-gold-400);
  border-right: 2px solid var(--koine-gold-400);
  opacity: 0;
  transition: opacity var(--koine-dur-normal) var(--koine-ease-gentle);
}

.my-hud-card:hover::before,
.my-hud-card:hover::after {
  opacity: 1;
}
```

### Mono / Technical Text

Use for status labels, card overlines, metadata, and input footers:

```css
.my-status-label {
  font-family: var(--koine-font-mono);
  font-size: var(--koine-fs-xs);               /* 0.75rem */
  font-weight: var(--koine-fw-regular);
  letter-spacing: var(--koine-ls-label);        /* 0.15em */
  text-transform: uppercase;
  color: var(--koine-text-muted);
}
```

```html
<!-- Example: card with mono overline -->
<div class="my-hud-card">
  <span class="my-status-label">Explore</span>
  <p>What's new in my library?</p>
</div>
```

### Button with Neon Focus

```css
.my-button {
  background: var(--koine-interactive);
  color: var(--koine-dark-600);
  border: none;
  border-radius: var(--koine-radius-md);       /* 10px */
  padding: var(--koine-space-3) var(--koine-space-6);
  font-family: var(--koine-font-body);
  font-weight: var(--koine-fw-medium);
  cursor: pointer;
  transition: all var(--koine-dur-fast) var(--koine-ease-default);
}

.my-button:hover {
  background: var(--koine-interactive-hover);
  box-shadow: var(--koine-glow-neon);
}

.my-button:focus-visible {
  outline: none;
  box-shadow: var(--koine-glow-neon);
}
```

### Input with Glassmorphism

```css
.my-input {
  background: var(--koine-surface-primary);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--koine-border-default);
  border-radius: var(--koine-radius-md);
  padding: var(--koine-space-3) var(--koine-space-4);
  font-family: var(--koine-font-body);
  color: var(--koine-text-primary);
  transition: all var(--koine-dur-normal) var(--koine-ease-gentle);
}

.my-input::placeholder {
  font-family: var(--koine-font-mono);         /* Mono for placeholders */
  text-transform: lowercase;
  color: var(--koine-text-muted);
}

.my-input:focus {
  outline: none;
  border-color: var(--koine-gold-400);
  box-shadow: var(--koine-glow-neon);
}
```

---

## Usage in Tailwind

All tokens are mapped in `tailwind.config.js`:

```html
<!-- Glassmorphism card with neon hover -->
<div class="bg-surface-primary backdrop-blur-xl border border-koine-dark-50
            rounded-koine-xl p-6 text-koine-cream-400
            transition-all duration-normal ease-gentle
            hover:border-koine-gold-400 hover:shadow-koine-glow-neon">
  <span class="font-mono text-2xs uppercase tracking-label text-koine-cream-500">
    Explore
  </span>
  <h3 class="font-display text-koine-gold-400 tracking-heading mt-2">
    Card Title
  </h3>
  <p class="font-body text-koine-cream-500">Card content here.</p>
</div>

<!-- Button with neon focus -->
<button class="bg-koine-gold-500 text-koine-dark-600 font-body font-medium
               rounded-koine-md px-6 py-3
               hover:bg-koine-gold-400 hover:shadow-koine-glow-neon
               focus-visible:shadow-koine-glow-neon focus-visible:outline-none
               transition-all duration-fast">
  Get Started
</button>
```

> **📖 Full component specs** — see [components.md](docs/components.md) for detailed Cards, Inputs, Buttons, Navigation, Modals, Notifications, and HUD Elements specifications.

---

## Logo Selection Guide

| Context | Mark | Min Size |
|---------|------|----------|
| Splash screen, hero, about page | **Full** (dove + flames + people + rays) | 200px+ |
| Header, medium contexts, docs | **Reduced** (dove + flames) | 80px+ |
| Nav bar, inline badge, standard mark | **Minimal** (dove with tail) | 40px+ |
| Favicon, app icon, 16px badge | **Glyph** (compact dove) | 16px+ |

---

## License

Koine Design System © 2026. All rights reserved.
