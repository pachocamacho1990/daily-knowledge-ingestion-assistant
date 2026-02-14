# DKIA Design System

> Version 1.0 — February 2026
> Observatory Theme

## 1. Philosophy

**"Signal in the silence."**

The Observatory design language treats the interface as deep space: a dark void where content glows with purpose. Information hierarchy is achieved through luminance, not decoration. Amber is the sole warm accent — a navigational star among cool-toned data.

Principles:

- **Dark-first** — The void (#0a0e1a) is the canvas. Content surfaces float above it.
- **Content glows** — Text and interactive elements emit light against the dark. Higher importance = more luminance.
- **Amber as signal** — The only warm color. Reserved for primary actions, active states, and the user's attention.
- **Hierarchy through luminance** — Primary text is near-white, secondary is muted blue-gray, tertiary fades further. No bold colors compete for attention.
- **Minimal decoration** — No gratuitous borders, shadows, or gradients. Subtle separators. Space is the primary organizer.

## 2. Color Tokens

All colors are defined as CSS custom properties in `design-system.css` and mirrored in the Tailwind config for utility class usage.

### Backgrounds

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-void` | `#0a0e1a` | Page background, deepest layer |
| `--bg-surface` | `#111827` | Elevated surfaces (nav bar, input areas) |
| `--bg-card` | `#1a2236` | Cards, panels, content containers |
| `--bg-card-hover` | `#1f2a42` | Card hover state |
| `--bg-overlay` | `rgba(0, 0, 0, 0.6)` | Modal/dialog backdrop |

### Text

| Token | Value | Usage |
|-------|-------|-------|
| `--text-primary` | `#e8eaf0` | Headings, important content |
| `--text-secondary` | `#8892a8` | Body text, descriptions |
| `--text-muted` | `#4a5568` | Timestamps, metadata, placeholders |
| `--text-inverse` | `#0a0e1a` | Text on amber buttons |

### Borders

| Token | Value | Usage |
|-------|-------|-------|
| `--border-subtle` | `rgba(255, 255, 255, 0.06)` | Faint separators |
| `--border-default` | `#374151` | Card borders, input borders |
| `--border-hover` | `#4b5563` | Hover state borders |
| `--border-accent` | `rgba(245, 166, 35, 0.3)` | Amber-tinted borders |

### Accent (Amber)

| Token | Value | Usage |
|-------|-------|-------|
| `--amber` | `#f5a623` | Primary accent, buttons, active nav |
| `--amber-hover` | `#fbb543` | Button hover state |
| `--amber-dim` | `#b8801a` | Button active/pressed state |
| `--amber-glow` | `rgba(245, 166, 35, 0.15)` | Background tint (active nav, user messages) |
| `--amber-faint` | `rgba(245, 166, 35, 0.08)` | Subtle background tint |

### Status

| Token | Value | Usage |
|-------|-------|-------|
| `--status-success` | `#22c55e` | Done state, success messages |
| `--status-error` | `#ef4444` | Error indicators |
| `--status-error-text` | `#f87171` | Error message text (lighter for readability) |
| `--status-warning` | `#f5a623` | Warning state (reuses amber) |
| `--status-info` | `#6b8acd` | Informational indicators |

### Categories (Nebula Tones)

Derived from the Observatory concept — each knowledge category gets a distinct nebula-inspired color with glow and fill variants.

| Token | Value | Usage |
|-------|-------|-------|
| `--cat-ai` | `#7c6df0` | AI/ML category |
| `--cat-ai-glow` | `rgba(124, 109, 240, 0.15)` | AI/ML glow background |
| `--cat-ai-fill` | `rgba(124, 109, 240, 0.06)` | AI/ML subtle fill |
| `--cat-systems` | `#3b9bf5` | Systems/Infrastructure |
| `--cat-systems-glow` | `rgba(59, 155, 245, 0.15)` | Systems glow background |
| `--cat-systems-fill` | `rgba(59, 155, 245, 0.06)` | Systems subtle fill |
| `--cat-programming` | `#2dd4a8` | Programming/Languages |
| `--cat-programming-glow` | `rgba(45, 212, 168, 0.15)` | Programming glow background |
| `--cat-programming-fill` | `rgba(45, 212, 168, 0.06)` | Programming subtle fill |
| `--cat-research` | `#f07c6d` | Research/Papers |
| `--cat-research-glow` | `rgba(240, 124, 109, 0.15)` | Research glow background |
| `--cat-research-fill` | `rgba(240, 124, 109, 0.06)` | Research subtle fill |

## 3. Typography

**Font stacks:**
- Sans: `Inter, system-ui, -apple-system, sans-serif`
- Mono: `JetBrains Mono, ui-monospace, monospace`

**Type scale:**

| Class | Size | Weight | Line Height | Usage |
|-------|------|--------|-------------|-------|
| `.text-display` | 28px | 600 | 1.2 | Hero headings |
| `.text-h1` | 24px | 600 | 1.3 | Page titles |
| `.text-h2` | 20px | 500 | 1.3 | Section headings |
| `.text-h3` | 16px | 500 | 1.4 | Card titles, subsections |
| `.text-body` | 14px | 400 | 1.6 | Body text |
| `.text-body-medium` | 14px | 500 | 1.6 | Emphasized body text |
| `.text-small` | 13px | 400 | 1.5 | Secondary content |
| `.text-caption` | 12px | 400 | 1.5 | Captions, labels |
| `.text-tiny` | 11px | 400 | 1.4 | Metadata, timestamps |
| `.text-micro` | 9px | 500 | 1.3 | Badge text, counters |

## 4. Spacing

Aligned with Tailwind's spacing scale. Use these values for margins, paddings, and gaps.

| Token | Value | Tailwind |
|-------|-------|----------|
| `--space-1` | 4px | `1` |
| `--space-2` | 8px | `2` |
| `--space-3` | 12px | `3` |
| `--space-4` | 16px | `4` |
| `--space-5` | 20px | `5` |
| `--space-6` | 24px | `6` |
| `--space-8` | 32px | `8` |
| `--space-10` | 40px | `10` |
| `--space-12` | 48px | `12` |

## 5. Border Radius

Updated scale — `lg` bumped from 8px to 12px to match the Observatory concept's rounder cards.

| Token | Value | Tailwind | Usage |
|-------|-------|----------|-------|
| `--radius-sm` | 6px | `rounded-sm` | Small elements, badges |
| `--radius-default` | 8px | `rounded` | Buttons, inputs |
| `--radius-lg` | 12px | `rounded-lg` | Cards, panels |
| `--radius-xl` | 16px | `rounded-xl` | Large containers |
| `--radius-full` | 9999px | `rounded-full` | Pills, circles |

## 6. Shadows

Observatory uses glow-based shadows rather than traditional drop shadows. Light emanates from content, not from an overhead light source.

| Class | Value | Usage |
|-------|-------|-------|
| `.shadow-subtle` | `0 0 20px rgba(0, 0, 0, 0.3)` | Minimal depth |
| `.shadow-card` | `0 0 30px rgba(0, 0, 0, 0.4)` | Card elevation |
| `.shadow-elevated` | `0 4px 40px rgba(0, 0, 0, 0.5)` | Modals, popovers |
| `.shadow-amber-glow` | `0 0 20px rgba(245, 166, 35, 0.15)` | Amber accent glow |
| `.shadow-cat-ai` | `0 0 20px rgba(124, 109, 240, 0.15)` | AI category glow |
| `.shadow-cat-systems` | `0 0 20px rgba(59, 155, 245, 0.15)` | Systems category glow |
| `.shadow-cat-programming` | `0 0 20px rgba(45, 212, 168, 0.15)` | Programming category glow |
| `.shadow-cat-research` | `0 0 20px rgba(240, 124, 109, 0.15)` | Research category glow |

## 7. Animation Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--duration-fast` | `150ms` | Hover color changes |
| `--duration-base` | `200ms` | General transitions |
| `--duration-slow` | `300ms` | Layout transitions |
| `--duration-pulse` | `2s` | Pulse animations |
| `--duration-blink` | `1s` | Cursor blink |
| `--ease-default` | `ease-in-out` | General easing |
| `--ease-bounce` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Playful interactions |

**Keyframe animations:**
- `pulse-slow` — Opacity 1 → 0.5 → 1 over 2s (status indicators)
- `blink` — Opacity 1 → 0 → 1 over 1s step-end (typing cursor)
- `skeleton-shimmer` — Background position sweep (loading placeholders)
- `fade-in` — Opacity 0 → 1 over 200ms (content appearing)

## 8. Component Patterns

### Buttons

```html
<!-- Primary (amber) -->
<button class="btn-primary">Submit</button>

<!-- Secondary (ghost with border) -->
<button class="btn-secondary">Cancel</button>

<!-- Ghost (text only) -->
<button class="btn-ghost">View more</button>
```

| Class | Background | Text | Border | Hover |
|-------|-----------|------|--------|-------|
| `.btn-primary` | `--amber` | `--text-inverse` | none | `--amber-hover` bg |
| `.btn-secondary` | transparent | `--text-secondary` | `--border-default` | `--border-hover` border |
| `.btn-ghost` | transparent | `--text-secondary` | none | `--text-primary` text |

All buttons: `font-weight: 500`, `font-size: 14px`, `padding: 10px 20px`, `border-radius: var(--radius-default)`, `transition: var(--duration-fast)`, `cursor: pointer`. Disabled state: `opacity: 0.4`, `cursor: not-allowed`.

### Inputs

```html
<input class="input" placeholder="Enter text..." />
<textarea class="textarea" rows="3"></textarea>
<select class="select"><option>Choose...</option></select>
```

All form inputs share: `background: var(--bg-card)`, `border: 1px solid var(--border-default)`, `border-radius: var(--radius-default)`, `padding: 10px 16px`, `font-size: 14px`, `color: var(--text-primary)`. Focus state: `border-color: rgba(245, 166, 35, 0.5)`, `box-shadow: 0 0 0 1px rgba(245, 166, 35, 0.3)`, `outline: none`.

### Cards

```html
<div class="card">Static card content</div>
<div class="card card-hover">Interactive card</div>
```

| Class | Background | Border | Hover |
|-------|-----------|--------|-------|
| `.card` | `--bg-card` | `--border-default` | — |
| `.card-hover` | `--bg-card` | `--border-default` | `--border-hover` border, `--bg-card-hover` bg |

Cards: `border-radius: var(--radius-lg)`, `padding: 16px`.

### Chat Messages

```html
<!-- User message -->
<div class="msg-user">
    <p>User's question here</p>
</div>

<!-- AI response -->
<div class="msg-ai">
    <div class="msg-ai-bar"></div>
    <div class="msg-ai-content chat-content">Response here</div>
</div>
```

| Class | Description |
|-------|-------------|
| `.msg-user` | Amber-glow background, amber border, right-aligned, max-width 70% |
| `.msg-ai` | Flex layout with left amber bar, max-width 80% |
| `.msg-ai-bar` | 4px wide amber bar, full height, rounded |
| `.msg-ai-content` | Secondary text color, relaxed line height |

### Badges

```html
<!-- Citation badge -->
<span class="badge-citation">1</span>

<!-- Status badge -->
<span class="badge-status badge-status--done">Done</span>

<!-- Category badge (default amber) -->
<span class="badge-category">AI/ML</span>
```

| Class | Description |
|-------|-------------|
| `.badge-citation` | 20x20px circle, amber background 20%, amber text, mono font |
| `.badge-status` | Small pill with status-colored dot |
| `.badge-category` | Rounded-full pill, amber tint background, amber text, amber border |

### Status Dots

```html
<span class="status-dot status-dot--pending"></span>
<span class="status-dot status-dot--processing"></span>
<span class="status-dot status-dot--done"></span>
<span class="status-dot status-dot--error"></span>
```

| Modifier | Color | Animation |
|----------|-------|-----------|
| `--pending` | `--text-muted` (#4a5568) | `pulse-slow` |
| `--processing` | `--amber` | `pulse-slow` |
| `--done` | `--status-success` | none |
| `--error` | `--status-error` | none |

All dots: `8px` circle, `display: inline-block`, `border-radius: var(--radius-full)`.

### Navigation

```html
<nav class="nav-bar">
    <a href="/" class="nav-link nav-link--active">Navigator</a>
    <a href="/library" class="nav-link">Library</a>
</nav>
```

| Class | Description |
|-------|-------------|
| `.nav-bar` | Surface background, bottom border, flex layout |
| `.nav-link` | Muted text, rounded padding, transition |
| `.nav-link--active` | Amber text, amber-glow background |

### Loading Skeletons

```html
<div class="skeleton" style="width: 200px; height: 16px;"></div>
<div class="skeleton skeleton-text"></div>
```

| Class | Description |
|-------|-------------|
| `.skeleton` | Card background, rounded, shimmer animation |
| `.skeleton-text` | Full-width, 14px height (simulates a line of text) |

## 9. States

### Focus

All interactive elements use a consistent focus-visible indicator:
```css
*:focus-visible {
    outline: 2px solid var(--amber);
    outline-offset: 2px;
}
```

### Hover

- **Backgrounds**: Lighten one step (card → card-hover)
- **Text**: Muted → primary luminance
- **Borders**: Default → hover

### Active/Pressed

- **Buttons**: Amber → amber-dim (darker)

### Disabled

- `opacity: 0.4`
- `cursor: not-allowed`
- No hover effects

## 10. Responsive Breakpoints

| Name | Min Width | Usage |
|------|-----------|-------|
| Mobile | — | Default (mobile-first) |
| Tablet | 768px | `@media (min-width: 768px)` / Tailwind `md:` |
| Desktop | 1024px | `@media (min-width: 1024px)` / Tailwind `lg:` |
| Wide | 1440px | `@media (min-width: 1440px)` / Tailwind `2xl:` |

## Tailwind + CSS Variables Compatibility

The Tailwind CDN does not support CSS variable opacity modifiers (e.g., `bg-amber/20` won't work with CSS variable-defined colors). The solution:

1. **Tailwind config** — Uses hex values directly for opacity modifier support in utility classes
2. **design-system.css** — Defines the same values as CSS custom properties for component classes

Both are the single source of truth, documented here. When adding a new color, update both locations.

### Tailwind Config Colors

```js
tailwind.config = {
    theme: {
        extend: {
            colors: {
                void: '#0a0e1a',
                surface: '#111827',
                card: '#1a2236',
                'card-hover': '#1f2a42',
                amber: '#f5a623',
                'amber-hover': '#fbb543',
                'amber-dim': '#b8801a',
                'amber-glow': 'rgba(245, 166, 35, 0.15)',
                'cat-ai': '#7c6df0',
                'cat-systems': '#3b9bf5',
                'cat-programming': '#2dd4a8',
                'cat-research': '#f07c6d',
            },
            borderRadius: {
                sm: '6px',
                DEFAULT: '8px',
                lg: '12px',
                xl: '16px',
            },
        }
    }
}
```
