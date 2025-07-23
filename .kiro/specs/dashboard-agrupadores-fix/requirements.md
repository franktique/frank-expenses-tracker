# Requirements Document

## Introduction

The Dashboard Agrupadores feature is currently not displaying any data due to a database query inconsistency. The main groupers API endpoint is querying the wrong table name (`transactions` instead of `expenses`), causing the dashboard to show zero amounts for all groupers even when expense data exists. This bug prevents users from viewing their expense totals grouped by agrupadores (groupers), which is essential for analyzing spending patterns by credit cards and other grouping categories.

## Requirements

### Requirement 1

**User Story:** As a user, I want to see the total expenses for each agrupador in the Dashboard Agrupadores, so that I can analyze my spending patterns by grouped categories like credit cards.

#### Acceptance Criteria

1. WHEN I navigate to the Dashboard Agrupadores THEN the system SHALL display the correct total expense amounts for each agrupador
2. WHEN I select a payment method filter (all, cash, credit) THEN the system SHALL show accurate totals based on the selected filter
3. WHEN I click on an agrupador bar THEN the system SHALL display the breakdown of expenses by categories within that agrupador
4. WHEN there are no expenses for an agrupador THEN the system SHALL display zero amount correctly
5. WHEN there are expenses for an agrupador THEN the system SHALL display the sum of all expenses from categories belonging to that agrupador

### Requirement 2

**User Story:** As a user, I want the Dashboard Agrupadores to use consistent database table references, so that the data displayed matches the actual expense records in the system.

#### Acceptance Criteria

1. WHEN the system queries grouper expense totals THEN it SHALL use the same `expenses` table used by all other expense-related APIs
2. WHEN the system calculates totals THEN it SHALL use the correct table relationships between groupers, categories, and expenses
3. WHEN the system filters by payment method THEN it SHALL apply the filter to the correct expense records
4. WHEN the system joins tables THEN it SHALL use the proper foreign key relationships defined in the database schema

### Requirement 3

**User Story:** As a user, I want the category breakdown within agrupadores to work correctly, so that I can see which specific categories contributed to each agrupador's total.

#### Acceptance Criteria

1. WHEN I click on an agrupador THEN the system SHALL fetch and display the correct category totals for that agrupador
2. WHEN categories have expenses THEN the system SHALL show the accurate sum for each category
3. WHEN categories have no expenses THEN the system SHALL either show zero or exclude them from the display
4. WHEN I apply payment method filters THEN the category breakdown SHALL respect the same filter
