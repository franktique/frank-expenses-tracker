# Budget Tracker

A comprehensive personal finance management application built with Next.js that helps users track expenses, manage budgets, and monitor financial goals through an advanced fund-based system.

## Overview

The Budget Tracker is a sophisticated financial management tool that implements a multi-fund accounting system, allowing users to organize their finances across different funds (e.g., checking account, savings, emergency fund) while tracking expenses, income, and budgets across multiple time periods.

## Key Features

### 💰 Fund Management System

- **Multi-Fund Architecture**: Create and manage multiple financial funds with individual balances
- **Fund Transfers**: Transfer money between funds through expense transactions
- **Balance Tracking**: Automatic calculation and tracking of fund balances with transaction history
- **Category-Fund Relationships**: Associate spending categories with specific funds or multiple funds

### 📊 Budget Planning & Tracking

- **Period-Based Budgeting**: Create budgets for specific time periods (monthly, quarterly, etc.)
- **Category Budgets**: Set spending limits for different expense categories
- **Budget vs Actual Analysis**: Compare planned vs actual spending with visual indicators
- **Overspend Monitoring**: Track and alert when categories exceed budget limits

### 💳 Expense Management

- **Source Fund Tracking**: Record which fund money comes from for each expense
- **Category Organization**: Organize expenses into customizable categories
- **Expense Validation**: Ensure expenses are assigned to appropriate funds
- **CSV Import/Export**: Bulk import expenses and export financial data

### 📈 Income Tracking

- **Fund-Specific Income**: Record income directly to specific funds
- **Period Tracking**: Monitor income across different time periods
- **Income vs Expense Analysis**: Compare earnings against spending

### 📋 Advanced Analytics

- **Interactive Charts**: Recharts-powered visualizations for spending patterns
- **Fund Balance Trends**: Track how fund balances change over time
- **Category Analysis**: Detailed breakdowns of spending by category
- **Period Comparisons**: Compare financial performance across different periods

### 🎯 Groupers & Studies (Agrupadores & Estudios)

- **Expense Grouping**: Create custom groupings of expenses for analysis
- **Financial Studies**: Conduct detailed financial analysis across different scenarios
- **Performance Tracking**: Monitor financial goals and targets

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

The application's unique selling point is its sophisticated fund management:

- **Default Fund**: "Disponible" fund for general spending
- **Multi-Fund Categories**: Categories can be associated with multiple funds
- **Smart Fund Selection**: Intelligent fund assignment for expenses
- **Fund Validation**: Ensures financial integrity across all transactions

### Database Schema

- **Funds**: Financial pools with initial and current balances
- **Categories**: Expense categories with fund associations
- **Periods**: Time-based budgeting periods
- **Expenses**: Transactions with source and destination fund tracking
- **Income**: Money inflows to specific funds
- **Budgets**: Spending limits per category and period

### API Architecture

RESTful API endpoints with specialized fund management:

- Category-fund relationship management
- Fund balance recalculation
- Expense validation and fund assignment
- Dashboard data aggregation with fund filtering

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

### Funds (`/fondos`)

- Create and manage financial funds
- View fund balances and transaction history
- Transfer money between funds

### Expenses (`/gastos`)

- Add and categorize expenses
- Assign expenses to source funds
- Import expenses via CSV

### Income (`/ingresos`)

- Record income by fund
- Track income trends over time

### Categories (`/categorias`)

- Manage expense categories
- Configure category-fund relationships

### Budgets (`/presupuestos`)

- Set spending limits by category
- Monitor budget performance
- Compare across periods

### Periods (`/periodos`)

- Manage budgeting time periods
- Open/close periods for data integrity

## Database Migrations

The application includes comprehensive migration system:

- `/api/migrate-fondos` - Initialize fund system
- `/api/migrate-category-fund-relationships` - Set up category-fund mapping
- `/api/migrate-expense-source-funds` - Add source fund tracking to expenses

## Contributing

1. Follow the existing code patterns and architecture
2. Use the established fund-based system for new features
3. Include tests for new functionality
4. Follow the component structure in `/components`
5. Use TypeScript for type safety

## License

This project is private and proprietary.
