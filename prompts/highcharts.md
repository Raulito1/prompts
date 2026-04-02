# HighCharts Visualization Guardrails

Use this document as the single source of truth for building charts in this repo. Charts live in `client/components/charts/`. The goals are:
- Consistent chart components that integrate with RTK Query
- Theming aligned with the app's design system (Tailwind CSS variables)
- No chart logic leaking into pages or features
- Reuse before creating

---

## Golden Path (Do This First)

### 1) Check `client/components/charts/` first
Before building a new chart:
1. Search for an existing chart wrapper there.
2. If one is **80%** correct, extend it via props instead of duplicating it.
3. If no match exists, follow the patterns below.

**Rule:** No new chart component if an equivalent already exists.

---

## Stack & Dependencies

- **HighCharts**: `highcharts` npm package — the core library
- **React bindings**: `highcharts-react-official` — always use this adapter, never mount HighCharts imperatively
- **Modules**: Import HighCharts modules (e.g., `highcharts/modules/heatmap`) at the chart component file level, not globally
- **Data**: RTK Query — all chart data flows through an RTK Query hook
- **Theming**: Mirror app CSS variables into HighCharts `theme` config

---

## Folder Structure

```
client/
  components/
    charts/
      <ChartName>Chart.tsx       # One file per chart type
      highcharts-theme.ts        # Shared theme config (colors, fonts, grid)
      index.ts                   # Barrel export
```

**Rule:** All chart components export from `client/components/charts/index.ts`.

---

## Component Pattern (Required)

Every chart component must follow this structure:

```tsx
// client/components/charts/RevenueLineChart.tsx
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { useMemo } from 'react';
import { appTheme } from './highcharts-theme';

interface RevenueLineChartProps {
  data: { date: string; value: number }[];
  title?: string;
  className?: string;
}

export function RevenueLineChart({ data, title, className }: RevenueLineChartProps) {
  const options = useMemo<Highcharts.Options>(() => ({
    ...appTheme,
    title: { text: title ?? null },
    xAxis: {
      type: 'datetime',
      categories: data.map((d) => d.date),
    },
    yAxis: { title: { text: null } },
    series: [
      {
        type: 'line',
        name: 'Revenue',
        data: data.map((d) => d.value),
      },
    ],
  }), [data, title]);

  return (
    <div className={className}>
      <HighchartsReact highcharts={Highcharts} options={options} />
    </div>
  );
}
```

**Rules:**
- Always wrap `options` in `useMemo` — prevents unnecessary chart redraws on parent re-render.
- Never put `HighchartsReact` directly in a page component — always use the chart wrapper.
- Pass `className` through to the outer `div` for Tailwind sizing.

---

## RTK Query Integration Pattern

Data fetching stays in the feature/page. The chart component receives plain data props.

```tsx
// In a feature component or page
import { useGetRevenueQuery } from '@/store/api/revenueApi';
import { RevenueLineChart } from '@/components/charts';
import { AsyncBoundary } from '@/components/uix';

export function RevenueDashboard() {
  const { data, isLoading, isError } = useGetRevenueQuery();

  return (
    <AsyncBoundary isLoading={isLoading} isError={isError}>
      <RevenueLineChart data={data?.series ?? []} title="Monthly Revenue" />
    </AsyncBoundary>
  );
}
```

**Rules:**
- Chart components do **not** call RTK Query hooks — they are pure presentation.
- Use `AsyncBoundary` to handle loading/error/empty outside the chart.
- Pass a stable empty array `[]` as default data to prevent chart mount errors.

---

## Theming (Required)

Maintain a single shared theme file to keep charts visually consistent with the app.

```ts
// client/components/charts/highcharts-theme.ts
import type Highcharts from 'highcharts';

export const appTheme: Highcharts.Options = {
  chart: {
    backgroundColor: 'transparent',
    style: { fontFamily: 'inherit' },
  },
  colors: ['#6366f1', '#22d3ee', '#f59e0b', '#10b981', '#f43f5e'],
  title: { style: { color: 'var(--foreground)', fontSize: '14px', fontWeight: '600' } },
  xAxis: {
    lineColor: 'var(--border)',
    tickColor: 'var(--border)',
    labels: { style: { color: 'var(--muted-foreground)' } },
  },
  yAxis: {
    gridLineColor: 'var(--border)',
    labels: { style: { color: 'var(--muted-foreground)' } },
  },
  legend: { itemStyle: { color: 'var(--foreground)' } },
  tooltip: {
    backgroundColor: 'var(--popover)',
    borderColor: 'var(--border)',
    style: { color: 'var(--popover-foreground)' },
  },
  credits: { enabled: false },
};
```

**Rules:**
- Never hardcode hex colors in individual chart components — use the theme palette or CSS variables.
- `credits: { enabled: false }` is always set — no HighCharts watermark.
- `backgroundColor: 'transparent'` is the default — let Tailwind/ShadCN control the card background.

---

## Sizing

HighCharts defaults to 600×400px. Always override via the outer `div`:

```tsx
// Responsive full-width, fixed height
<RevenueLineChart className="w-full h-64" data={data} />
```

Inside the chart wrapper, forward Tailwind sizing to HighCharts:

```tsx
<div className={className}>
  <HighchartsReact
    highcharts={Highcharts}
    options={options}
    containerProps={{ style: { height: '100%', width: '100%' } }}
  />
</div>
```

**Rule:** Never set `chart.height` or `chart.width` in `options` — control dimensions via Tailwind on the wrapper `div`.

---

## Module Loading (Heatmaps, Sankey, etc.)

Load HighCharts modules once at the component file level, not in `main.tsx`:

```ts
// client/components/charts/HeatmapChart.tsx
import Highcharts from 'highcharts';
import Heatmap from 'highcharts/modules/heatmap';
import HighchartsReact from 'highcharts-react-official';

Heatmap(Highcharts); // call once — idempotent
```

**Rule:** Do not import modules in `main.tsx` or `App.tsx`. Keep module side-effects co-located with the chart that needs them.

---

## Chart Types — Quick Reference

| Chart Type | HighCharts `type` | Notes |
|---|---|---|
| Line / trend | `line` | Default for time-series |
| Bar (horizontal) | `bar` | Use for comparisons |
| Column (vertical) | `column` | Use for categorical counts |
| Area | `area` | Use `fillOpacity: 0.15` to stay subtle |
| Pie / donut | `pie` | Donut: set `innerSize: '60%'` |
| Scatter | `scatter` | Needs `marker` config |
| Heatmap | `heatmap` | Requires `highcharts/modules/heatmap` |

---

## Accessibility

```ts
accessibility: {
  enabled: true,
  description: 'Chart description for screen readers',
},
```

**Rule:** Always add `accessibility.description` for data-heavy charts.

---

## Styling Rules

### ✅ Allowed
- Tailwind classes on the outer `div` for sizing and spacing
- CSS variables in `highcharts-theme.ts` for colors
- `useMemo` for `options` to stabilize references

### ❌ Not allowed
- Inline `style={{}}` on chart wrapper divs (use Tailwind)
- Calling HighCharts imperative API (`chart.update()`, `chart.redraw()`) — let `highcharts-react-official` handle updates via `options` changes
- Module imports in `main.tsx` or `App.tsx`
- Hardcoded pixel sizes in `options.chart.width/height`
- Duplicating theme colors in individual chart files

---

## Performance Guardrails

- `useMemo` on `options` is **required** — prevents full chart destroy/recreate on every render
- For large datasets (>10k points), enable `turboThreshold`:
  ```ts
  series: [{ type: 'line', turboThreshold: 0, data: bigArray }]
  ```
- For real-time/streaming charts, prefer `series.addPoint()` via a ref — but only if polling data changes faster than 5s. Otherwise, RTK Query polling + `useMemo` is sufficient.
- Avoid deeply nested derived computations inside `options` — compute outside `useMemo` with a selector or transform function.

---

## Code Review Checklist (PR Must Pass)

- [ ] Chart component lives in `client/components/charts/`
- [ ] `options` wrapped in `useMemo`
- [ ] Component receives data as props — no RTK Query hooks inside chart components
- [ ] `AsyncBoundary` used in the consuming feature/page
- [ ] `appTheme` spread into chart options
- [ ] No hardcoded colors outside `highcharts-theme.ts`
- [ ] `credits: { enabled: false }` set (via theme)
- [ ] Sized via Tailwind on outer `div`, not via `options.chart.width/height`
- [ ] Module imports (heatmap, etc.) are at the chart file level, not global

---

## Definition of Done (Charts)

A chart component is done when:
- It follows the component pattern above (presentation-only, `useMemo` options)
- It uses `appTheme` and respects the design system
- It is sized via Tailwind and works responsively
- It handles an empty `data` array without crashing
- It is exported from `client/components/charts/index.ts`
