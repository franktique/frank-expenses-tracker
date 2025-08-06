# Requirements Document

## Introduction

This feature will enhance the dashboard's budget summary table by splitting the current single "Presupuesto" column into two separate columns: "Presupuesto Crédito" and "Presupuesto Efectivo". This will provide users with better visibility into their budget allocation by payment method, allowing them to see how much they've budgeted for credit card purchases versus cash/debit purchases for each category.

## Requirements

### Requirement 1

**User Story:** As a budget tracker user, I want to see separate budget columns for credit and cash/debit payment methods in the dashboard summary table, so that I can better understand my budget allocation by payment type.

#### Acceptance Criteria

1. WHEN I view the dashboard "Resumen" tab THEN the budget summary table SHALL display two separate budget columns instead of one
2. WHEN I view the budget summary table THEN I SHALL see a "Presupuesto Crédito" column showing the sum of all credit budgets for each category
3. WHEN I view the budget summary table THEN I SHALL see a "Presupuesto Efectivo" column showing the sum of all cash and debit budgets for each category
4. WHEN a category has no credit budget THEN the "Presupuesto Crédito" column SHALL display $0 for that category
5. WHEN a category has no cash/debit budget THEN the "Presupuesto Efectivo" column SHALL display $0 for that category

### Requirement 2

**User Story:** As a budget tracker user, I want the totals row to also show separate credit and cash/debit budget totals, so that I can see the overall budget allocation by payment method.

#### Acceptance Criteria

1. WHEN I view the totals row in the budget summary table THEN it SHALL display the sum of all credit budgets in the "Presupuesto Crédito" column
2. WHEN I view the totals row in the budget summary table THEN it SHALL display the sum of all cash/debit budgets in the "Presupuesto Efectivo" column
3. WHEN I view the totals row THEN the sum of "Presupuesto Crédito" and "Presupuesto Efectivo" SHALL equal the previous total budget amount

### Requirement 3

**User Story:** As a budget tracker user, I want the table layout to remain clean and readable with the additional budget columns, so that I can easily scan and compare budget vs actual spending.

#### Acceptance Criteria

1. WHEN I view the budget summary table THEN the column headers SHALL be clearly labeled and distinguishable
2. WHEN I view the budget summary table THEN the table SHALL maintain proper alignment and spacing
3. WHEN I view the budget summary table on different screen sizes THEN it SHALL remain readable and properly formatted
4. WHEN I view the budget summary table THEN the new columns SHALL be positioned logically in relation to existing columns

### Requirement 4

**User Story:** As a budget tracker user, I want the fund filtering functionality to work correctly with the split budget columns, so that I can see payment-method-specific budgets for individual funds.

#### Acceptance Criteria

1. WHEN I apply a fund filter THEN the "Presupuesto Crédito" column SHALL show only credit budgets for categories in the selected fund
2. WHEN I apply a fund filter THEN the "Presupuesto Efectivo" column SHALL show only cash/debit budgets for categories in the selected fund
3. WHEN I select "Todos los fondos" THEN both budget columns SHALL show combined data from all funds
4. WHEN I change the fund filter THEN both budget columns SHALL update accordingly
