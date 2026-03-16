# SKILL: frontend-design

## Trigger
Use this skill whenever the task involves generating or modifying UI — components, pages,
dashboards, layouts, or any visual interface. This applies to React 19 + Vite work, raw HTML/CSS,
or any frontend artifact. If the task touches the browser, this skill is active.

---

## Phase 1: Design Thinking (do this BEFORE writing any code)

Answer these internally before producing a single line of JSX or CSS:

1. **Purpose** — What problem does this UI solve? Who is the user?
2. **Tone** — Commit to ONE direction from the palette below. No hedging.
3. **Differentiator** — What is the ONE thing someone will remember about this UI?
4. **Constraints** — Framework, existing design tokens, UIX primitives in scope, a11y needs.

Output a brief design intent comment at the top of the file:
```
// DESIGN INTENT: [direction] — [one-sentence rationale]
// FONTS: [display font] / [body font]
// PALETTE: [dominant] + [accent]
```

---

## Phase 2: Aesthetic Direction

Pick ONE and commit hard. Do NOT blend directions into mush.

| Direction          | Character                                                      |
|--------------------|----------------------------------------------------------------|
| Brutalist/Raw      | Heavy borders, stark type, zero decoration, intentional ugly   |
| Editorial/Magazine | Asymmetric grids, oversized type, whitespace as a weapon       |
| Retro-Futuristic   | Scanlines, phosphor glows, monospace, terminal energy          |
| Luxury/Refined     | Restraint, kerning, muted palette, nothing wasted              |
| Industrial/Utility | Dense, information-forward, no chrome, function over form      |
| Art Deco/Geometric | Symmetry, gold accents, ornamental borders, structured grids   |
| Organic/Natural    | Soft curves, earthy tones, imperfect textures, breathing space |
| Maximalist         | Layered, loud, every surface doing something, controlled chaos |

Rotate across directions across tasks. Never default to the same one twice in a row.

---

## Phase 3: Implementation Rules

### Typography
- Import from Google Fonts or use system variable fonts — NEVER default to Inter, Roboto, Arial
- Always pair a **display font** (headings, labels) with a **body font** (prose, data)
- Good display candidates: Syne, Playfair Display, Space Mono, DM Serif Display, Bebas Neue, Cormorant
- Good body candidates: Lora, IBM Plex Sans, Literata, Source Serif 4, DM Sans
- Type scale should feel deliberate — use clamp() for fluid sizing where appropriate

### Color
- Define all tokens as CSS custom properties on `:root`
- Pick a **dominant** (60%), **secondary** (30%), **accent** (10%) — don't distribute evenly
- Avoid: purple gradients on white, teal on dark, generic "primary blue"
- Prefer: unexpected dominant colors with a single sharp accent

```css
:root {
  --color-bg: #0e0e0e;
  --color-surface: #1a1a1a;
  --color-text: #f0ece4;
  --color-accent: #d4a853;
  --color-muted: #5a5a5a;
}
```

### Motion
- Prefer CSS transitions/animations over JS where possible
- One orchestrated page-load sequence beats scattered micro-interactions
- Use `animation-delay` for staggered reveals
- In React: use `motion` (Framer Motion) for layout transitions and presence animations
- Hover states should **surprise** — not just opacity shifts

### Layout & Composition
- Break the grid intentionally — overlap, diagonal flow, asymmetry
- Use generous negative space OR controlled density — never the mushy middle
- Grid-breaking elements: full-bleed images, oversized counters, off-axis labels
- Avoid: centered card stacks, uniform padding, predictable column layouts

### Backgrounds & Texture
- Never use flat `background-color` alone on a hero or major surface
- Options: gradient mesh, CSS noise texture, geometric SVG pattern, grain overlay
- CSS grain example:
```css
.surface::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url("data:image/svg+xml,..."); /* noise SVG */
  opacity: 0.04;
  pointer-events: none;
}
```

---

## Phase 4: React 19 + Vite Specific Rules

- Use UIX primitives (`<Stack>`, `<Inline>`, `<PageShell>`, `<AsyncBoundary>`) — do NOT recreate with raw Tailwind divs
- Define design tokens in a co-located `tokens.css` or extend the existing token file — never hardcode hex values in JSX
- Tailwind utilities are fine for spacing/sizing; custom aesthetic work goes in CSS modules or a style block
- For animated presence: wrap with `<AnimatePresence>` from Framer Motion, not CSS display toggling
- Keep component-level styles scoped — aesthetic choices should not leak upward

---

## Hard Prohibitions

```
NEVER:
  - Inter, Roboto, Arial, system-ui as primary font
  - Purple/violet gradient on white or light background
  - Uniform card grid as primary layout
  - Space Grotesk (overused AI default)
  - Flat single-color backgrounds on hero sections
  - Opacity-only hover states
  - Bootstrap or MUI component defaults unstyled
```

---

## Output Checklist

Before handing off any UI output, verify:

- [ ] Design intent comment present at top of file
- [ ] CSS custom properties defined for all color tokens
- [ ] No prohibited fonts used
- [ ] Layout has at least one intentional asymmetric or grid-breaking element
- [ ] Background has depth (gradient, texture, or layered effect)
- [ ] At least one motion/animation present and purposeful
- [ ] Aesthetic direction is legible and consistent throughout
