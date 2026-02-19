# Koine Component Guidelines

## Three Sacred Motifs

Every component in the Koine system draws from three visual figures derived from Pentecost iconography. These are not decorative — they are structural patterns that inform shape, behavior, and meaning.

---

### 1. THE DOVE — Primary Mark · Intelligence · The Agent

**Where it appears:** Logo, app icon, loading states, AI-sourced content indicators.

**Design principles:**
- Organic curves, never sharp angles
- Warm gold fills with layered opacity (body 0.85, wings 0.75, head 0.9)
- Represents the AI agent — source of knowledge descending to the user
- Used at four scales: full scene → reduced → minimal → glyph
- **Interactive Illumination:** The Dove motif should never be static when interactive. It must "shine" on hover with a smooth transition using `filter: drop-shadow(...) brightness(1.1)` and a subtle `transform: translateY(-2px)` lift.

**Component applications:**
- `<KoineLogo />` — Renders appropriate mark for context (auto-selects by available space)
- AI response indicators — Small glyph dove beside agent-generated content
- Loading spinner — Dove glyph with `koine-glow-pulse` animation
- Empty states — Minimal dove centered with tagline below

---

### 2. THE FLAME — Seven Gifts · Capability · Active Knowledge

**Where it appears:** Active states, processing indicators, capability badges, notifications.

**Design principles:**
- Vertical teardrop shapes with gradient fill (deep → medium → light, bottom to top)
- Always uses `--koine-gradient-flame` or its Tailwind equivalent
- Subtle `koine-flame-flicker` animation for active/processing states
- Seven flames = seven capabilities (retrieval, synthesis, recommendation, storage, resilience, personalization, discovery)

**Component applications:**
- **Buttons (primary):** Flame gradient background on hover/active
- **Progress indicators:** Flame fills from bottom to top as progress increases
- **Capability badges:** Single flame icon + label for each of the seven gifts
- **Toast notifications:** Flame accent on left border
- **Active nav items:** Small flame glow beneath active tab
- **Processing states:** Single flame with `koine-flame-flicker` animation

**Badge mapping (Seven Gifts):**
```
Wisdom        → Synthesis     → flame + brain icon
Understanding → Processing    → flame + layers icon
Counsel       → Recommendation → flame + compass icon
Fortitude     → Resilience    → flame + shield icon
Knowledge     → Retrieval     → flame + search icon
Piety         → Personalization → flame + heart icon
Awe           → Discovery     → flame + spark icon
```

---

### 3. CONNECTED NODES — Knowledge Graph · Community · Understanding

**Where it appears:** Data visualization, relationship displays, navigation patterns, connection states.

**Design principles:**
- Circles (people/nodes) connected by thin lines (edges)
- Node fill: `--koine-dark-50` or themed people color
- Edge stroke: `--koine-gold-400` at low opacity (0.12–0.2)
- `koine-graph-connect` animation for edges drawing in
- Represents knowledge flowing between domains and people

**Component applications:**
- **Knowledge graph visualization:** Primary data display component
- **Tag/category chips:** Small circles with connecting lines between related items
- **Breadcrumbs:** Nodes connected by thin gold lines
- **Multi-select:** Selected items appear as connected nodes
- **Relationship indicators:** Shows connections between content pieces
- **Navigation:** Section dots connected by thin lines (stepper pattern)

---

## Component Library Spec

### Buttons

```
Primary:   bg gold-500 → hover gold-400 → pressed gold-700
           Text: dark-600 (dark on gold)
           Border-radius: koine-md (10px)
           Font: DM Sans medium
           Hover: subtle koine-glow-sm shadow

Secondary: bg transparent, border gold-400
           Text: gold-400 → hover gold-300
           Border-radius: koine-md

Ghost:     bg transparent, no border
           Text: text-muted → hover text-accent
           
Danger:    bg red-500 → hover red-400
           Text: cream-50
```

### Cards

```
Background: surface-primary (rgba, semi-transparent for glassmorphism)
Border:     1px solid border-subtle (#1a1608)
Radius:     koine-xl (16px)
Padding:    space-6 (24px)
Shadow:     none by default, koine-glow-neon on hover
Hover:      transform translateY(-1px) to lift toward the user (Interactive Illumination)
Backdrop:   backdrop-filter: blur(20px) saturate(1.5)
Transition: all normal ease-gentle

HUD variant:      ::before/::after pseudo-elements as corner brackets
                  (top-left + bottom-right, 2px gold, 12px arms)
Elevated variant: surface-elevated with koine-sm shadow
Flame variant:    left border 3px gradient-flame (for notifications/alerts)
```

### Inputs

```
Background: surface-primary (semi-transparent)
Border:     1px solid border-default → focus: border-accent with glow-neon
Radius:     koine-md (10px)
Padding:    space-3 space-4 (12px 16px)
Font:       DM Sans regular, fs-base
Placeholder: JetBrains Mono, lowercase, text-muted
Color:      text-primary
Focus ring: glow-neon (0 0 10px gold 40%, 0 0 30px gold 15%)
Backdrop:   backdrop-filter: blur(20px)
```

### HUD Elements (Futuristic Pentecost)

```
System Status:  JetBrains Mono, xs, uppercase, 0.15em tracking
                Pulsing green dot (6px circle, koine-glow-pulse)
                Text: text-muted → "SYSTEM ONLINE · LOCAL PROCESSING"

Monospace Text: JetBrains Mono for: status bars, input footers,
                technical metadata, card overlines, viz descriptions
                Always lowercase or uppercase — never mixed case

Corner Markers: ::before/::after pseudo-elements on cards
                2px solid gold-400, 12px arm length
                Top-left (border-top + border-left)
                Bottom-right (border-bottom + border-right)
                Opacity: 0 → 1 on hover

Data Grid:      40px repeating linear-gradient squares
                Color: --koine-grid-color (gold at 3.5% opacity)
                Masked with radial-gradient for center-focused fade
```

### Navigation

```
Navbar:     surface-primary, border-bottom border-subtle
Height:     64px
Logo:       Minimal dove (auto-scales to glyph at mobile)
Active tab: text-accent with flame glow-sm below
Inactive:   text-secondary → hover text-primary
```

### Modals

```
Backdrop:   surface-overlay (dark 85% opacity)
Panel:      surface-elevated, radius koine-2xl
Entrance:   koine-scale-in animation
Shadow:     koine-lg
Max-width:  layout.lg (512px) for dialogs, layout.2xl (672px) for complex
```

### Toasts / Notifications

```
Background: surface-elevated
Border-left: 3px solid [status color]
Radius:     koine-lg (14px)
Shadow:     koine-md
Entrance:   koine-fade-in-up from bottom-right
Auto-dismiss: 5s with gentle fade-out

Variants:
  Success: left border koine-success
  Warning: left border flame-medium (with subtle flicker)
  Error:   left border red-400
  Info:    left border info
```

---

## Theme Switching

Apply themes via `data-theme` attribute on `<html>` or any container:

```html
<html data-theme="dark">    <!-- Default -->
<html data-theme="light">   <!-- Parchment -->
<html data-theme="liturgical"> <!-- Pentecost red — special states -->
```

All components automatically inherit the correct semantic colors. No component-level theme logic needed.

---

## Accessibility Checklist

- All interactive elements have `:focus-visible` with `--koine-focus-ring`
- Color contrast: gold-400 on dark-600 = 7.2:1 (AAA) ✓
- Color contrast: gold-800 on cream-50 = 8.1:1 (AAA) ✓
- `prefers-reduced-motion` disables all animations
- Screen reader text via `.sr-only` class
- No color-only indicators — always pair with icon or text
