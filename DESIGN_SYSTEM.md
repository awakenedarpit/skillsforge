# SkillsForge Design System

> **Surface Profile (Step 1):** Dashboard / Admin / Data. Manufacturing operations command console for plant supervisors tracking operator certifications, machine coverage heatmaps, and shift risk signals. Bilingual (EN/हिं).

---

## 1. Design Concept

**"A plant-floor command console that feels like precision industrial instrumentation — mono numerals everywhere, hairline token borders, warm charcoal field with one signal accent (amber), data animates in like a ticker."**

This concept shows up in every page: sidebar active states, KPI numbers, heatmap, risk scores, alert badges.

---

## 2. Color Palette

Strategy: **Restrained** — tinted warm neutrals dominant, one saturated amber accent at 10%.

### Light Mode

| Role | Token | Approx Value | Usage |
|---|---|---|---|
| Canvas | `--bg` | `#faf9f7` | Page background |
| Card surface | `--surface` | `#ffffff` | Cards, panels |
| Raised surface | `--surface-raised` | `#f8f7f4` | Hover, table header |
| Border | `--border` | `#e2ded7` | All dividers |
| Strong border | `--border-strong` | `#c8c4bc` | Input outlines |
| Text | `--text` | `#171715` | Headings, primary copy |
| Text secondary | `--text-secondary` | `#524f48` | Body, labels (4.6:1) |
| Text muted | `--text-muted` | `#78746b` | Timestamps, hints (4.6:1) |
| Accent 600 | `--accent-600` | `#d97706` | Buttons, active states |
| Accent 500 | `--accent-500` | `#f59e0b` | Focus rings, hover tints |
| Signal red | `--signal-red` | `#dc2626` | Red KPI, overdue |
| Signal green | `--signal-green` | `#16a34a` | Valid certs |
| Signal blue | `--signal-blue` | `#2563eb` | Info states |

### Dark Mode (derived, not inverted)

| Role | Token | Approx Value |
|---|---|---|
| Canvas | `--bg` | `#0e0d0b` |
| Surface | `--surface` | `#161512` |
| Raised | `--surface-raised` | `#1e1d19` |
| Border | `--border` | `#2a2823` |
| Text | `--text` | `#f0ede6` |
| Text muted | `--text-muted` | `#807c74` |
| Accent | `--accent-500` | `#f5bf0b` |

**60/30/10:** Canvas 60% · Surface/raised 30% · Amber accent 10%

---

## 3. Typography

**Personality:** Technical-precision (industrial-clean)

| Role | Family | Size | Weight |
|---|---|---|---|
| Font stack | Geist, Noto Sans Devanagari, system-ui | — | — |
| Mono (data) | Geist Mono, ui-monospace | — | — |
| h1 / page title | Geist | 24px | 700 |
| h2 / section | Geist | 16px | 700 |
| Body | Geist | 16px | 400 |
| Caption | Geist | 12px | 400 |
| Mono eyebrow | Geist Mono | 10px | 600 |
| KPI numerals | Geist Mono | 36px | 700 |

**Rationale:** Geist chosen (not Inter by reflex) — wider apertures feel closer to terminal/instrumentation UI.

---

## 4. Spacing & Radius

| Token | Value | Usage |
|---|---|---|
| `--radius-sm` | 6px | Focus rings, chips |
| `--radius-md` | 10px | Buttons, inputs |
| `--radius-lg` | 14px | Cards, panels |
| `--radius-xl` | 18px | Modal, login card |

Section gaps: 32px (space-y-8). Component internals: 8–12px.

---

## 5. Shadows

Hue-tinted toward amber warm undertone.

| Token | Value |
|---|---|
| `--shadow-sm` | `0 1px 3px rgb(90 80 50 / 0.08)` |
| `--shadow-md` | `0 4px 12px -2px rgb(90 80 50 / 0.10)` |
| `--shadow-lg` | `0 10px 30px -4px rgb(90 80 50 / 0.12)` |

**Elevation principle:** Background contrast + shadow = primary elevation. Borders only for: input outlines, table dividers, focus rings.

---

## 6. Motion

| Token | Value | Usage |
|---|---|---|
| `--duration-micro` | 120ms | Hover, active |
| `--duration-normal` | 220ms | Transitions |
| `--duration-enter` | 300ms | DOM entry |
| `--ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` | Entering |

Named animations: `animate-fade-in`, `animate-slide-up`, `animate-tick-in`, `cell-glow-red`, `cell-glow-amber`.

All respect `prefers-reduced-motion`. Only `transform`/`opacity` animated.

---

## 7. Components

### Button variants
- `primary` — amber fill `#d97706`, near-black text
- `outline` — transparent + border-strong
- `secondary` — surface-raised fill
- `destructive` — red fill
- `ghost` — hover-only fill

States: default / hover / `active:scale-[0.97]` / `focus-visible:ring-2` / `disabled:opacity-40`. Always `:focus-visible`, never `:focus`.

### Card / Panel
`rounded-xl p-5 shadow-token-sm`. No nested elevated surfaces.

### Badge
Alpha-bg (10%) + matching text + hairline border. No opaque backgrounds.

### KPI Cards
Left accent stripe + large mono numeral + hover glow overlay. States: Skeleton loading, animate-tick-in loaded.

### Navigation
Active: amber `bg-accent-500/12` fill + amber text (no decorative border toggle). Letter-avatar for user.

### Popover
`avoidCollisions={true}` + `collisionPadding={8}` — never clips at viewport edge.

---

## 8. Icons

**Library:** `lucide-react` only. No emoji as structural icons.

---

## 9. Accessibility Floor

- All body/supporting text >= 4.5:1 contrast (light and dark)
- `:focus-visible` on every interactive element — never `:focus` alone, never `outline:none`
- `prefers-reduced-motion` respected for all animations
- `aria-hidden="true"` on decorative elements

---

## 10. Performance Targets

Targeted via implementation:
- LCP < 2.5s — Geist via CDN preconnect, display:swap
- CLS < 0.1 — skeletons hold layout dimensions
- INP < 200ms — immediate loading states, active:scale on press

Nine levers: skeleton screens, font preconnect/swap, Tailwind purge, prefetch links, TanStack Query caching, stable layout dimensions.

---

## 11. Anti-Slop Gate

- Palette not guessable from category (warm charcoal + amber, not "manufacturing gray + blue")
- No raw #000/#fff by default
- No purple/blue-purple gradient
- lucide-react only icon family
- All body text >= 4.5:1
- No inline font sizes — type scale only
- Geist chosen via Move A-C, not Inter by reflex
- Elevation = background + shadow, not card borders
- No nested elevated surfaces
- All interactive elements: hover + focus-visible + active + disabled
- Skeleton loading + feedback on every async action
- Only transform/opacity animated
- prefers-reduced-motion on all keyframes
- No decorative eyebrow icons
- PopoverContent: avoidCollisions + collisionPadding
- No gradient text

---

> **Every future page must use the colors, typography, spacing, components, and animation tokens from this file.**
