# Requirements Document

## Introduction

The Fondos (Funds) Management feature introduces a comprehensive fund-based financial tracking system that allows users to organize their finances into separate funds, track fund balances, and manage transfers between funds. This feature extends the existing budget tracker by adding fund-level organization for categories, incomes, and expenses, with automatic balance calculations and dedicated analytics.

## Requirements

### Requirement 1

**User Story:** As a user, I want to create and manage funds so that I can organize my finances into separate pools of money with distinct purposes.

#### Acceptance Criteria

1. WHEN I navigate to the Fondos menu THEN the system SHALL display a list of all created funds
2. WHEN I create a new fund THEN the system SHALL require a name and start date
3. WHEN I create a new fund THEN the system SHALL optionally accept a description and initial balance
4. WHEN I save a new fund THEN the system SHALL store it in the database with a unique identifier
5. WHEN I edit an existing fund THEN the system SHALL allow me to modify name, description, and initial balance but not the start date
6. WHEN I delete a fund THEN the system SHALL prevent deletion if categories or transactions are associated with it
7. use zero as default value for initial balance, if no initial balance value is provided at creatio9n.

### Requirement 2

**User Story:** As a user, I want to assign categories to specific funds so that I can organize my spending categories by fund purpose.

#### Acceptance Criteria

1. WHEN I create or edit a category THEN the system SHALL provide an optional fund selection field
2. WHEN no fund is selected for a category THEN the system SHALL automatically assign it to the default fund called 'Disponible'
3. WHEN I select a fund for a category THEN the system SHALL save this association in the database
4. WHEN I view categories THEN the system SHALL display which fund each category belongs to
5. WHEN I change a category's fund assignment THEN the system SHALL update all related calculations

### Requirement 3

**User Story:** As a user, I want to record incomes with fund assignments so that I can increase the balance of specific funds.

#### Acceptance Criteria

1. WHEN I create or edit an income THEN the system SHALL provide an optional fund selection field
2. WHEN no fund is selected for an income THEN the system SHALL assign it to the default 'Disponible' fund
3. WHEN I save an income with a fund assignment THEN the system SHALL increase that fund's balance by the income amount
4. WHEN I view incomes THEN the system SHALL display which fund each income is assigned to
5. WHEN I delete an income THEN the system SHALL decrease the associated fund's balance accordingly

### Requirement 4

**User Story:** As a user, I want to filter expenses by fund and optionally transfer money between funds through expense destinations so that I can manage fund-to-fund transfers.

#### Acceptance Criteria

1. WHEN I access the Gastos menu THEN the system SHALL display a mandatory fund filter at the top
2. WHEN the Gastos page loads THEN the system SHALL default the fund filter to 'Disponible'
3. WHEN I select a fund filter THEN the system SHALL only show categories associated with that fund for expense recording
4. WHEN I record an expense THEN the system SHALL provide an optional 'destino' field with available funds
5. WHEN I save an expense with a destino fund THEN the system SHALL decrease the source fund balance and increase the destino fund balance by the expense amount
6. WHEN I save an expense without a destino fund THEN the system SHALL only decrease the source fund balance

### Requirement 5

**User Story:** As a user, I want to recalculate fund balances to ensure accuracy so that I can trust the displayed fund balances.

#### Acceptance Criteria

1. WHEN I view the funds list THEN the system SHALL display a recalculate button for each fund
2. WHEN I click the recalculate button THEN the system SHALL recalculate the fund balance from the start date
3. WHEN recalculating THEN the system SHALL include initial balance, assigned incomes, category expenses, and destino transfers
4. WHEN recalculation is complete THEN the system SHALL update the fund balance in the database
5. WHEN recalculation fails THEN the system SHALL display an error message without changing the current balance

### Requirement 6

**User Story:** As a user, I want to filter the main dashboard by fund so that I can view analytics for a specific fund.

#### Acceptance Criteria

1. WHEN I access the Dashboard THEN the system SHALL display a fund filter at the top
2. WHEN I select a fund filter THEN the system SHALL update all charts to show only data related to that fund
3. WHEN I select 'All Funds' THEN the system SHALL display combined data from all funds
4. WHEN the fund filter changes THEN the system SHALL maintain the filter selection during the session
5. WHEN I refresh the page THEN the system SHALL reset the fund filter to 'All Funds'

### Requirement 7

**User Story:** As a user, I want a dedicated funds dashboard so that I can view fund balances and analytics in one place.

#### Acceptance Criteria

1. WHEN I navigate to the Funds Dashboard THEN the system SHALL display current balances for all funds
2. WHEN I view the Funds Dashboard THEN the system SHALL show fund balance trends over time
3. WHEN I view the Funds Dashboard THEN the system SHALL display fund allocation percentages
4. WHEN I view the Funds Dashboard THEN the system SHALL show recent fund transfers and transactions
5. WHEN I view the Funds Dashboard THEN the system SHALL provide fund performance metrics
6. WHEN fund data is unavailable THEN the system SHALL display appropriate empty states with helpful messages

### Requirement

**User Story:** As a user, I want the system to maintain data integrity across fund operations so that my financial data remains accurate and consistent.

#### Acceptance Criteria

1. WHEN I perform any fund-related operation THEN the system SHALL validate all required fields
2. WHEN I delete or modify fund-related data THEN the system SHALL maintain referential integrity
3. WHEN fund calculations are performed THEN the system SHALL handle decimal precision correctly
4. WHEN errors occur during fund operations THEN the system SHALL provide clear error messages
5. WHEN I navigate between fund-related pages THEN the system SHALL maintain consistent data display
