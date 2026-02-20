# Split View Feature

## Branch
`feat/split-view`

## Overview

VS Code-style split editor button that divides the content area into 2 or 3 side-by-side panels, available **only on ultrawide monitors (≥ 1800px)**. Enables comparing different dashboard views simultaneously.

## Architecture

- **Primary panel (left)**: normal Next.js `{children}` rendering
- **Extra panels**: `<iframe>` elements loading the app with `?_layout=panel` query parameter, which strips the sidebar/tab bar (embedded mode)
- Authentication flows through automatically since iframes share the same `localStorage` origin

## Task Checklist

- [x] **Task 0** – Create `docs/split-view-feature.md` with implementation plan and task list
- [x] **Task 1** – Add `3xl: '1800px'` screen breakpoint to `tailwind.config.ts`
- [x] **Task 2** – Extend `TabBarProps` in `types/tabs.ts` with optional split view props
- [x] **Task 3** – Create `hooks/use-split-view.ts` (split view state + ultrawide detection)
- [x] **Task 4** – Create `components/split-view-button.tsx` (the split icon button with tooltip)
- [x] **Task 5** – Create `components/split-view-panel.tsx` (iframe panel + route picker header)
- [x] **Task 6** – Modify `components/conditional-layout.tsx` to support embedded panel mode
- [x] **Task 7** – Wrap `ConditionalLayout` in `<Suspense>` inside `app/layout.tsx`
- [x] **Task 8** – Modify `components/tabs/tab-bar.tsx` to render the split view button
- [x] **Task 9** – Modify `components/simple-tab-layout.tsx` to render split panels

## Key Files

| File | Change |
|------|--------|
| `tailwind.config.ts` | Add `3xl` screen breakpoint |
| `types/tabs.ts` | Extend `TabBarProps` with optional split props |
| `hooks/use-split-view.ts` | **NEW** — split view state hook |
| `components/split-view-button.tsx` | **NEW** — button component |
| `components/split-view-panel.tsx` | **NEW** — iframe panel component |
| `components/conditional-layout.tsx` | Add `useSearchParams` + embedded mode |
| `app/layout.tsx` | Add `<Suspense>` around `ConditionalLayout` |
| `components/tabs/tab-bar.tsx` | Render split button when ultrawide |
| `components/simple-tab-layout.tsx` | Integrate split view hook + panel rendering |

## Available Panel Routes

- `/` — Dashboard Principal
- `/categorias` — Categorías
- `/periodos` — Períodos
- `/presupuestos` — Presupuestos
- `/ingresos` — Ingresos
- `/gastos` — Gastos
- `/tarjetas-credito` — Tarjetas de Crédito
- `/agrupadores` — Agrupadores
- `/simular` — Simulación Presupuesto
- `/simular-prestamos` — Simulador de Préstamos
- `/simular-inversiones` — Simulador de Inversiones
- `/simular-tasas` — Simulador de Tasas
- `/dashboard/category-bars` — Barras por Categoría
- `/dashboard/period-bars` — Barras por Período
- `/dashboard/groupers` — Agrupadores Dashboard
- `/dashboard/remainder` — Restante
- `/dashboard/overspend` — Overspend Actual
- `/dashboard/overspend/all-periods` — Overspend Todos los Períodos
- `/dashboard/projected-execution` — Ejecución Proyectada
- `/setup` — Configuración

## localStorage Persistence

- Key: `budget-tracker-split-view`
- 24-hour expiry
- Only restore if `window.innerWidth >= 1800`

## Verification Steps

1. Load `http://localhost:3000/?_layout=panel` while authenticated → no sidebar, no tab bar
2. Set viewport to 1800px → split button appears; 1799px → hidden
3. Click split button → content splits 50/50
4. Click again → 3 equal panels (33% each)
5. Click again → collapses back to single view
6. Change dropdown in extra panel → iframe reloads to new route
7. Refresh page → split state restored
8. Resize below 1800px while split → collapses + shows toast
9. Extra panels show authenticated content without re-login
10. `npm run lint` — no new errors
