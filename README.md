# Budget Tracker

A personal finance management application built with Next.js for tracking expenses, managing period-based budgets, and modeling financial scenarios.

## Overview

The Budget Tracker organizes spending into categories and time periods, compares budgeted against actual amounts, and layers on credit-card tracking, debt follow-up, scenario simulators, and a Spanish-language AI assistant. Underneath, transactions are attributed to named funds (e.g. checking, savings, emergency), so balances stay separated by pool.

## Key Features

### 💰 Fund Tracking

- **Multi-Fund Schema**: Expenses and income are attributed to named funds with individual balances
- **Fund Transfers**: An expense carrying both a source and destination fund models a transfer between funds
- **Balance Tracking**: Fund balances are kept up to date as expenses and income are recorded
> **Note**: Funds currently have no dedicated management UI. They are seeded by `/api/migrate-fondos`, the default fund is chosen in application settings, and balances are maintained by the expense and income API routes. Aggregate endpoints exist under `/api/dashboard/funds/` (`balances`, `transfers`) but are not yet wired into any view.

### 📊 Budget Planning & Tracking

- **Period-Based Budgeting**: Create budgets for specific time periods (monthly, quarterly, etc.)
- **Category Budgets**: Set spending limits for different expense categories
- **Budget vs Actual Analysis**: Compare planned vs actual spending with visual indicators
- **Overspend Monitoring**: Track and alert when categories exceed budget limits

### 💳 Expense Management

- **Source Fund Tracking**: Record which fund money comes from for each expense
- **Category Organization**: Organize expenses into customizable categories
- **Expense Detail Tracking**: Break an expense into itemized entries drawn from a per-category catalog
- **CSV Import/Export**: Bulk import expenses and export to CSV or Excel

### 📈 Income Tracking

- **Fund-Specific Income**: Record income directly to specific funds
- **Period Tracking**: Monitor income across different time periods
- **Income vs Expense Analysis**: Compare earnings against spending

### 📋 Advanced Analytics

- **Interactive Charts**: Recharts-powered visualizations for spending patterns
- **Category Analysis**: Detailed breakdowns of spending by category and expense type
- **Period Comparisons**: Compare financial performance across different periods
- **Payment Calendar**: Projected payments grouped by date

### 🎯 Groupers & Studies (Agrupadores & Estudios)

- **Expense Grouping**: Create custom groupings of expenses for analysis
- **Financial Studies**: Conduct detailed financial analysis across different scenarios
- **Performance Tracking**: Monitor financial goals and targets

### 🤖 AI Assistant

- **Natural-Language Q&A**: Ask questions about your financial data in Spanish, answered from real DB state
- **Savings Suggestions**: Get concrete, ranked cut candidates to hit a savings target
- **Configurable Provider**: Uses Claude by default; can be pointed at any Anthropic-Messages-API-compatible provider (e.g. Kimi K3) via `ANTHROPIC_BASE_URL`

## Technology Stack

- **Frontend**: Next.js 15 with App Router, React 18
- **Database**: Neon PostgreSQL with serverless architecture
- **UI Components**: Radix UI with custom Tailwind CSS design system
- **Charts & Visualization**: Recharts for interactive data visualization
- **Form Handling**: React Hook Form with Zod validation
- **State Management**: React Context for global application state
- **Testing**: Jest with React Testing Library
- **Styling**: Tailwind CSS with custom design tokens

## Core Architecture

### Fund-Based Financial System

Money is modeled as living in named funds, with every transaction naming its source:

- **Default Fund**: "Disponible" fund for general spending
- **Multi-Fund Categories**: Categories can be associated with multiple funds via the `category_fund_relationships` table
- **Source & Destination Funds**: Expenses record where money came from, and optionally where it went

### Database Schema

- **Funds**: Financial pools with initial and current balances
- **Categories**: Expense categories with fund associations
- **Periods**: Time-based budgeting periods
- **Expenses**: Transactions with source and destination fund tracking
- **Income**: Money inflows to specific funds
- **Budgets**: Spending limits per category and period

### API Architecture

RESTful API endpoints under `app/api/`:

- CRUD for categories, periods, budgets, expenses, and income
- Dashboard data aggregation, overspend analysis, and payment calendar
- Simulation, study, and grouper endpoints
- Schema migrations exposed as one-off `/api/migrate-*` endpoints

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database (Neon recommended)
- npm or pnpm package manager

### Installation

1. Clone the repository

```bash
git clone <repository-url>
cd budget-tracker
```

2. Install dependencies

```bash
npm install
```

3. Set up environment variables

```bash
# Copy and configure your database connection
cp .env.example .env.local
```

`ANTHROPIC_API_KEY` is required to use the AI Assistant. See `.env.example` for the optional `ANTHROPIC_BASE_URL`/`ANTHROPIC_MODEL` overrides to run it against an alternate Anthropic-compatible provider (e.g. Kimi K3).

4. Initialize the database

```bash
npm run dev
# Navigate to /api/setup-db to initialize schema
```

5. Start the development server

```bash
npm run dev
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run test` - Run Jest tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Generate test coverage report

## Key Pages & Features

### Dashboard (`/dashboard`)

- Overview of all financial data
- Fund balance summaries
- Spending trends and analytics
- Quick access to common actions

### Expenses (`/gastos`)

- Add and categorize expenses
- Assign expenses to source funds
- Import expenses via CSV

### Income (`/ingresos`)

- Record income by fund
- Track income trends over time

### Categories (`/categorias`)

- Manage expense categories and their expense type (Fijo / Variable / Semi Fijo / Eventual)
- Maintain the per-category item catalog used for expense detail tracking

### Budgets (`/presupuestos`)

- Set spending limits by category
- Monitor budget performance
- Compare across periods

### Periods (`/periodos`)

- Manage budgeting time periods
- Open/close periods for data integrity

### Credit Cards (`/tarjetas-credito`)

- Register credit cards and review card-level spending

### Debt Tracking (`/seguimiento-deudas`)

- Track debt obligations and payment progress

### Groupers & Studies (`/agrupadores`, `/estudios`)

- Group categories for aggregate analysis and build comparative studies

### Simulations (`/simular`)

- Model budget scenarios with sub-groups, templates, and Excel export
- Dedicated simulators for loans (`/simular-prestamos`), investments (`/simular-inversiones`), and interest rates (`/simular-tasas`)

### Quotes (`/cotizaciones`)

- Record and compare quotes

### AI Assistant (`/asistente`)

- Ask natural-language questions about your financial data (Spanish)
- Get ranked savings suggestions for a target amount
- Also available as a global floating panel (`Cmd+K` / `Ctrl+K`)

## Database Migrations

There is no migration runner. Each schema change is exposed as a one-off, idempotent API route under `app/api/migrate-*`, with matching `.sql` and rollback scripts in `scripts/`. Some routes expose `GET`, others `POST` — check the route before calling it.

```bash
curl -X POST http://localhost:3000/api/setup-db          # initial schema
curl -X POST http://localhost:3000/api/migrate-fondos     # example feature migration
```

## Contributing

1. Follow the existing code patterns and architecture
2. Include tests for new functionality
3. Follow the component structure in `/components`
4. Use TypeScript for type safety — note that `next.config.mjs` ignores type and lint errors during builds, so run `npm run lint` and `npx tsc --noEmit` yourself
5. See `CLAUDE.md` for architecture details and non-obvious constraints

## License

This project is private and proprietary.
