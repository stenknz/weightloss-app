# Premium Wellness Redesign

## Overview

Redesign the weight-loss app from a business-dashboard aesthetic to a premium
wellness experience — think Apple Health meets Notion. Soft gradients, elegant
glassmorphism cards, motivating visuals, and a focus on personal progress.

## Design System

### Color Palette

- **Primary gradient**: Teal (`#0EA5A0`) → Blue (`#3B82F6`)
- **Dark mode**: Same gradient on near-black background (`#090B0F`)
- **Glass surfaces**: Semi-transparent backgrounds with `backdrop-filter: blur(12px)`
  and subtle border
- **Accent glow**: Teal-tinted shadows on active/hover states

### Typography

- System font stack (`-apple-system`, `SF Pro`, `Segoe UI`, `Roboto`)
- No external font loading — zero network cost, native Apple feel

### Surface Style

- **Glassmorphism cards**: `background: rgba(var(--panel-rgb), 0.6)` with
  `backdrop-filter: blur(12px)` and `border: 1px solid rgba(var(--border-rgb), 0.3)`
- **Elevated elements**: Drop shadow with teal tint for interactive components
- **Rounded corners**: 16px for cards, 10px for inputs, 8px for badges

## Navigation

Replace the current horizontal top bar with an **icon-only sidebar**.

- **Desktop**: Fixed left sidebar (64px wide) with icon buttons, tooltip on hover
- **Mobile**: Bottom tab bar with the same icons
- **Icons**: Lucide icons, teal accent for active section
- **Logo/brand**: At top of sidebar, small teal dot + "WL" wordmark

## Dashboard Layout

Top-to-bottom on the homepage:

### 1. Hero Section
- Greeting: "Good morning, [Name]" with a subtle wave icon
- **Weight ring**: Circular progress ring showing current weight toward target.
  Center text: current kg. Caption: "X kg lost · Y kg to go"
- Ring uses teal→blue gradient arc, gray track

### 2. Quick Stats (2x2 Grid)
Four compact glass cards with icon, value, and mini progress bar:
- **Energy in** (Utensils icon) — today's kcal / target kcal
- **Energy out** (Flame icon) — today's burned / target burned  
- **Water** (Droplet icon) — today's L / 2L
- **Steps** (Footprints icon) — today's steps / 10k

### 3. Weight Trend Chart
- Gradient area chart (teal fill fading to transparent)
- 30-day view by default, toggle for 60/90 days
- Target weight reference line (dashed, warm amber)
- Recharts with custom theme matching the color system

### 4. Today's Quick Log
- Condensed log of today's food, exercise, water entries
- Compact timeline style, not a full table
- "Add entry" button expands inline

### 5. Additional Charts Section (new)

All charts use consistent glassmorphism cards and the teal→blue palette.

| Chart | Type | Data | Location |
|-------|------|------|----------|
| Water intake | Vertical bars, 7/30 day | Daily ml vs 2L goal line | Dashboard or /water page |
| Steps | Vertical bars, 7/30 day | Daily count vs 10k goal line | Dashboard or /steps page |
| Macro split | Donut | Today's P/C/F grams + % of target | /food page & dashboard |
| Calorie balance | Grouped/stacked bars | Consumed vs burned, net overlay | Dashboard |
| Measurements | Multi-line | Waist, chest, hips over time | /progress page |

### Chart Implementation Notes
- All charts use **Recharts** (already a dependency)
- Custom chart theme: teal gridlines, white text on dark, teal gradients
- Water/steps bars: single bar per day, goal line rendered as `ReferenceLine`
- Macro donut: `PieChart` with `Cell` components for each macro color
- Calorie bars: `BarChart` with two `Bar` series (in/out), optional third for net
- Measurements: `LineChart` with multiple `Line` series, colored by body part
- All charts: consistent margins, label sizes, tooltip style matching glass theme

## Component Changes

### New/Modified Components

| Component | Change |
|-----------|--------|
| `Sidebar.tsx` | New: icon-only sidebar with tooltips (desktop), bottom tabs (mobile) |
| `Navbar.tsx` | Remove horizontal nav, keep only user avatar + theme toggle (in sidebar) |
| `WeightChart.tsx` | Gradient area fill, target line, redesigned tooltip |
| `WaterChart.tsx` | New: bar chart with goal line |
| `StepsChart.tsx` | New: bar chart with goal line |
| `MacroChart.tsx` | Replace stacked bar with donut chart |
| `CalorieChart.tsx` | New: grouped bar for in/out |
| `MeasureChart.tsx` | New: multi-line chart for body measurements |
| `WeightRing.tsx` | New: circular progress ring for hero metric |
| `GlassCard.tsx` | New: shared glassmorphism card wrapper |
| `StatCard.tsx` | Redesign: glass style with mini progress bar |
| `QuickLog.tsx` | Redesign: timeline style, glass card |

### CSS Variables to Add (globals.css)

```css
:root {
  --panel-rgb: 255 255 255 / 0.6;
  --glass-border: rgba(226, 232, 240, 0.3);
  --teal: 14 165 160;
  --blue: 59 130 246;
  --gradient: linear-gradient(135deg, rgb(var(--teal)), rgb(var(--blue)));
}
.dark {
  --panel-rgb: 17 20 28 / 0.7;
  --glass-border: rgba(38, 43, 56, 0.4);
}
```

## Migration Strategy

In-place redesign — no new routes or API changes needed. The redesign is purely
CSS + component swaps. All existing functionality, API routes, and data remain.

1. Update `globals.css` — new glassmorphism variables and class utilities
2. Create `Sidebar.tsx` — the new navigation
3. Rewrite `Navbar.tsx` — slimmed down for sidebar integration
4. Create chart components (WaterChart, StepsChart, CalorieChart, MeasureChart)
5. Update `MacroChart.tsx` — donut instead of stacked bar
6. Create `WeightRing.tsx` — hero progress ring
7. Create `GlassCard.tsx` — shared card wrapper
8. Rewrite dashboard `page.tsx` — new layout with hero, stats, charts
9. Update `StatCard.tsx`, `QuickLog.tsx` — glass styling
10. Tidy up all other pages for consistent glass aesthetic

## Verification

- Build passes with `npm run build`
- Dashboard renders all sections: hero ring, 2x2 stats, weight chart, logs, charts
- All 5 new chart types render with test data
- Dark mode toggle applies glassmorphism correctly
- Sidebar navigation works on desktop (tooltips) and mobile (bottom tabs)
- No visual regression on existing functionality (login, forms, data entry)
