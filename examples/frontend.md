# SKILL: shadcn-industrial-theme

## When This Applies
Active on any UI task in the React 19 + Vite + shadcn project.
Use when: generating new components, restyling existing ones, adding new data widgets.

---

## Aesthetic Direction: Industrial / Terminal

**In one sentence**: Dense, information-forward, mono-type headings, amber-on-dark accent,
subtle grid texture — every surface is doing work.

**Font pair**
- Display / headings: `IBM Plex Mono` — applied via `font-family: var(--font-display)`
- Body / data: `DM Sans 300/400/500` — applied via `font-family: var(--font-body)`

**Color rules**
- Background: near-black `hsl(220 13% 9%)` in dark, off-white `hsl(0 0% 97%)` in light
- Accent: amber `hsl(38 85% 48%)` — use ONCE per view (CTAs, live indicators, key metrics)
- All other UI: monochrome grays from the token system
- NEVER introduce a second hue — no blues, no greens, no purples unless semantic (error = red only)

**Texture**
- Grid overlay lives on `body` via `background-image` in `globals.css` — do not recreate it in components
- Scan-line effect: add class `card-terminal` to dashboard cards that display live data

**Border radius**
- `--radius: 0.25rem` — everything is sharper than shadcn default
- Inputs and badges: `rounded-none` (square)
- Cards: `rounded` (0.25rem)
- Never use `rounded-lg` or `rounded-xl`

---

## Component Conventions

### Labels and headings
```tsx
// Section labels — mono, uppercase, tracked
<p className="data-label">Active Sessions</p>

// Metric value — mono, large
<span className="font-mono text-3xl font-medium">1,284</span>
```

### Status indicators
```tsx
// Live / online status
<span className="status-dot animate-pulse_amber" />

// Inline badge
<Badge variant="outline" className="font-mono text-xs rounded-none">
  LIVE
</Badge>
```

### Cards
```tsx
// Standard data card
<Card className="card-terminal rounded border-border/60">
  <CardHeader className="pb-2">
    <p className="data-label">Metric Name</p>
  </CardHeader>
  <CardContent>
    <span className="font-mono text-3xl">42.1k</span>
  </CardContent>
</Card>
```

### Tables (AG-Grid or shadcn Table)
- Header cells: `data-label` class + `bg-muted`
- Row height: dense — 36px preferred
- No zebra striping — use `border-b border-border/40` rows only
- Selected row: `bg-accent/10 border-l-2 border-accent`

### Buttons
```tsx
// Primary action
<Button className="rounded-none font-mono text-xs tracking-widest uppercase">
  RUN QUERY
</Button>

// Ghost / secondary
<Button variant="ghost" className="rounded-none font-mono text-xs text-muted-foreground">
  CANCEL
</Button>
```

---

## Hard Rules

```
NEVER:
  - rounded-lg, rounded-xl, rounded-full on interactive elements
  - more than one accent color per view
  - Inter, Roboto, or system-ui as font
  - shadow-md or shadow-lg (no elevation shadows — use borders)
  - gradient backgrounds on cards (grid texture is enough)
  - purple, teal, or blue for non-semantic UI
```

---

## Token Reference Quick-Copy

| Token              | Dark value            | Light value         | Use for              |
|--------------------|-----------------------|---------------------|----------------------|
| `--background`     | `220 13% 9%`          | `0 0% 97%`          | Page bg              |
| `--card`           | `220 13% 11%`         | `0 0% 100%`         | Card surface         |
| `--muted`          | `220 13% 14%`         | `0 0% 92%`          | Subtle fills         |
| `--muted-foreground`| `210 10% 50%`        | `0 0% 46%`          | Labels, captions     |
| `--accent`         | `38 85% 48%`          | `38 92% 50%`        | ONE accent per view  |
| `--border`         | `220 13% 20%`         | `0 0% 82%`          | All borders          |
