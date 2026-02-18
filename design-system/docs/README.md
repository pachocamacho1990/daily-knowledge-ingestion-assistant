# Koine Design System

> **"Universal understanding"**

A design system rooted in Pentecost iconography — the moment knowledge became universally accessible. Named after Koine Greek, the common tongue that first made universal understanding possible.

---

## Quick Start

### 1. Install fonts
Add to your HTML `<head>` or import in CSS:
```html
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400&family=DM+Sans:wght@300;400;500&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">
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
    ├── README.md              ← This file
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

**Dark (default):** Gold on `#08080e` — candlelight in a cathedral.  
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

---

## Motion

Inspired by candlelight — warm, gentle, deliberate. Never sharp or mechanical.

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

## Usage in CSS

All tokens are available as CSS custom properties:

```css
.my-card {
  background: var(--koine-surface-primary);
  border: 1px solid var(--koine-border-subtle);
  border-radius: var(--koine-radius-xl);
  color: var(--koine-text-primary);
  padding: var(--koine-space-6);
  transition: box-shadow var(--koine-dur-normal) var(--koine-ease-gentle);
}

.my-card:hover {
  box-shadow: var(--koine-glow-sm);
}

.my-button {
  background: var(--koine-interactive);
  color: var(--koine-dark-600);
  border-radius: var(--koine-radius-md);
  font-family: var(--koine-font-body);
  font-weight: var(--koine-fw-medium);
  transition: all var(--koine-dur-fast) var(--koine-ease-default);
}

.my-button:hover {
  background: var(--koine-interactive-hover);
  box-shadow: var(--koine-glow-sm);
}
```

## Usage in Tailwind

```html
<div class="bg-koine-dark-400 border border-koine-dark-50 rounded-koine-xl p-6
            text-koine-cream-400 transition-shadow duration-normal ease-gentle
            hover:shadow-koine-glow-sm">
  <h3 class="font-display text-koine-gold-400 tracking-heading">Card Title</h3>
  <p class="font-body text-koine-cream-500">Card content here.</p>
</div>
```

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
