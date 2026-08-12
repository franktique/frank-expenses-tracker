# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Package manager is **pnpm** (see `packageManager` in `package.json`), though `npm run` works too.

```bash
pnpm dev                 # Dev server (localhost:3000)
pnpm build               # Production build
pnpm lint                # ESLint (next/core-web-vitals + prettier-as-error)
pnpm format              # Prettier write across the repo
pnpm test                # Jest
pnpm test:watch
pnpm test:coverage
```

Run a single test file or test:

```bash
pnpm test lib/__tests__/subgroup-calculations.test.ts
pnpm test -- -t "calculates subtotals"
```

### Important build caveat

`next.config.mjs` sets `eslint.ignoreDuringBuilds: true` **and** `typescript.ignoreBuildErrors: true`. A green `pnpm build` does not mean the code typechecks. Run `pnpm lint` and `npx tsc --noEmit` explicitly before considering a change done.

`next.config.mjs` also pins `TZ: 'America/Bogota'` — date arithmetic assumes Colombia time.

### Local dev credentials

Login is password-only. When driving the app with a browser tool locally, the password is `123`.

## Architecture

Next.js 15 App Router + React 18, Neon serverless PostgreSQL, Radix UI + Tailwind (shadcn-style `components/ui/`), Recharts, Zod, Jest + React Testing Library. UI copy is in **Spanish**; code identifiers are English.

### Database access

All DB access goes through `sql` exported from `lib/db.ts` — a Neon tagged-template client wrapped by `createSafeClient()`, which adds exponential-backoff retry on rate-limit errors and degrades to a throwing dummy client when `DATABASE_URL_NEW` is unset (note the `_NEW` suffix; it is not `DATABASE_URL`). API routes import it directly:

```ts
import { sql } from '@/lib/db';
const rows = await sql`SELECT ...`;
```

**Conditional WHERE clauses must use the sentinel pattern**, not composed SQL fragments — Neon's template composition with an empty `` sql`` `` is unreliable:

```ts
WHERE (${fundId}::text IS NULL OR e.source_fund_id = ${fundId})
```

### Migrations run as API routes, not a CLI

There is no migration runner. Each schema change is a `app/api/migrate-*/route.ts` endpoint (31 of them) that you hit once, with matching `.sql` / rollback / README files in `scripts/`. Endpoints are idempotent; some expose `GET`, some `POST` — check the route before calling.

```bash
curl -X POST http://localhost:3000/api/setup-db          # initial schema
curl -X POST http://localhost:3000/api/migrate-fondos     # example feature migration
```

When adding a schema change: write `scripts/create-*-migration.sql` + `scripts/rollback-*.sql`, add the `app/api/migrate-*/route.ts` endpoint, then update the types in `types/`.

### Provider stack

`app/layout.tsx` nests the global providers in this order:

```
ThemeProvider → AuthProvider → ActivePeriodErrorBoundary → BudgetProvider
  → AssistantProvider → TabProvider → SidebarProvider → ConditionalLayout
```

- **`BudgetProvider`** (`context/budget-context.tsx`, ~1400 lines) is the app's data layer: categories, periods, budgets, incomes, expenses, credit cards, settings, plus every CRUD mutation. Most views consume `useBudget()` rather than fetching directly.
- **`AuthProvider`** (`lib/auth-context.tsx`) holds password auth (flag in `localStorage`) *and* active-period loading, which has circuit-breaker and adaptive-retry variants in `lib/active-period-service.ts` with a `sessionStorage` cache in `lib/active-period-storage.ts`.
- **`AssistantProvider`** must stay at the **root layout**, not inside `ConditionalLayout` — `/asistente` needs it to SSR. Moving it back produces `useAssistant debe usarse dentro de AssistantProvider`.
- **`ConditionalLayout`** gates the app: hides chrome on `/login`, strips sidebar/tabs when `?_layout=panel`, and shows the initial loading screen. It uses a `hasLoadedOnce` ref latch so that page-level `refreshData()` calls on mount can't re-trigger the loading gate — that latch exists to prevent an infinite render loop; don't remove it.
- **`TabProvider`** + `SimpleTabLayout` implement an in-app browser-like tab bar with split-view panels (`hooks/use-split-view.ts`). Navigation is tab-scoped, so a route can be mounted more than once.

### Fund-based domain model

The core concept is that money lives in named **funds** and every transaction names its source. `types/funds.ts` is the canonical model file (Zod schemas + constants live there too).

- **Fund** — balance pool; the default is `DEFAULT_FUND_NAME = 'Disponible'`.
- **Category** ↔ **Fund** is many-to-many via `category_fund_relationships`. Categories also carry `tipo_gasto`: `F` Fijo, `V` Variable, `SF` Semi Fijo, `E` Eventual (`TIPO_GASTO_VALUES` / `TIPO_GASTO_LABELS`, plus `TIPO_GASTO_SORT_ORDERS` driving the 3-cycle sort in `components/simulation-budget-form.tsx`). It is optional for backward compatibility — handle `undefined`.
- **Expense** — has `source_fund_id` and optional `destination_fund_id`; an expense with both is how a **fund transfer** is modeled.
- **Period** — month/year budgeting window with a single open "active period"; most queries and assistant tools default to it. Closing a period freezes its data.
- **Budget** — expected amount per category per period, with recurrence support (`lib/budget-recurrence-utils.ts`).

Note the current state of the fund system: the schema and expense/income wiring are fully live, but there is **no `/fondos` page and no fund CRUD or recalculate endpoint**. Funds are seeded by `/api/migrate-fondos`, the default is picked in `/api/settings`, and `funds.current_balance` is mutated inline by `UPDATE funds` statements inside `app/api/expenses/route.ts`, `app/api/expenses/[id]/route.ts`, and `app/api/incomes/route.ts`. Any change to how an expense stores its funds has to keep those balance updates in sync — nothing recomputes them afterwards. Read-only aggregates live under `/api/dashboard/funds/` (`balances`, `transfers`).

Careful with the word *subgroup* — it means two unrelated things. `/api/categories/[id]/subgroups/[subgroupId]/items` is the per-category **item catalog** used by expense detail tracking; `simulation_subgroups` is the category-grouping feature inside simulations.

### Feature areas

Beyond core budgeting, each of these is a page under `app/`, an API group under `app/api/`, a types file, and calculation helpers in `lib/`:

| Area | Route | Types / logic |
|---|---|---|
| Groupers & studies | `/agrupadores`, `/estudios` | `types/estudios.ts` |
| Simulations (with subgroups & templates) | `/simular` | `types/simulation.ts`, `lib/subgroup-*.ts` |
| Loan / investment / interest-rate simulators | `/simular-prestamos`, `/simular-inversiones`, `/simular-tasas` | `lib/loan-calculations.ts`, `lib/invest-calculations.ts`, `lib/interest-rate-calculations.ts` |
| Credit cards | `/tarjetas-credito` | `types/credit-cards.ts` |
| Debt tracking | `/seguimiento-deudas` | `lib/debt-tracking-calculations.ts` |
| Quotes | `/cotizaciones` | `types/cotizaciones.ts` |
| AI assistant | `/asistente` | `lib/assistant/` |

### AI assistant

`lib/assistant/` runs a manual streaming tool-use loop on the base **`@anthropic-ai/sdk`**. `@anthropic-ai/claude-agent-sdk` is in `package.json` but deliberately **unused** — it spawns the Claude Code CLI as a subprocess, which does not work under Next.js serverless.

- `agent.ts` — the loop, streaming, and `shouldRequestThinking()` (extended thinking is requested only against Anthropic's own endpoint unless `ASSISTANT_ENABLE_THINKING` overrides it).
- `tools.ts` — plain async functions returning JSON, registered in a `TOOLS` array at the bottom of the file. Adding an entry there is the only wiring needed. Tools wrap the same SQL the dashboard/overspend routes use, so **all arithmetic stays in deterministic code** and the model only chooses and narrates.
- `system-prompt.ts` — Spanish, domain-aware.

`POST /api/assistant/conversations/[id]/messages` streams **NDJSON** (`application/x-ndjson`), one JSON event per line: `message_start`, `text_delta`, `thinking_delta`, `tool_call`, `tool_result`, `message_end`, `error`. Clients must treat a missing `thinking_delta` as normal. Conversations persist in `assistant_conversations` / `assistant_messages` (created by `POST /api/migrate-assistant`); the "Ver proceso" trace is in-memory only.

Config lives in `.env.local` (`ANTHROPIC_API_KEY`, plus optional `ANTHROPIC_BASE_URL`, `ANTHROPIC_MODEL`, `ASSISTANT_ENABLE_THINKING`, `ASSISTANT_MAX_TOKENS`, `ASSISTANT_MAX_TOOL_CALLS`) — see `.env.example` for the full annotated list.

## Conventions

- Path alias `@/*` maps to the repo root, in both `tsconfig.json` and Jest's `moduleNameMapper`.
- Prettier: single quotes, semicolons, 80 columns, es5 trailing commas, `prettier-plugin-tailwindcss` for class sorting. It's an **ESLint error**, so `pnpm lint` fails on unformatted code.
- Tests live in `__tests__/` directories next to the code (`lib/`, `components/`, `hooks/`, `types/`, and several `app/api/*/`). Coverage is collected from `lib/`, `components/`, `context/`. Files matching `lib/__tests__/verify-*.js` and `integration-test-*.js` are excluded from the run — they are manual scripts, not Jest tests.
- Design docs for individual features are written to `docs/` (60+ `feat-*.md` / `fix-*.md` files). Check there before reverse-engineering a feature's intent.
