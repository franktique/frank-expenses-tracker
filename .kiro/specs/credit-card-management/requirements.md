# Requirements Document

## Introduction

This feature adds credit card management functionality to the budget tracker, allowing users to register their credit cards and optionally link them to expenses. Users can record credit card details including bank name, franchise (Visa, Mastercard, etc.), and last four digits, then associate these cards with expenses during creation or editing.

## Requirements

### Requirement 1

**User Story:** As a user, I want to manage my credit cards in the system, so that I can keep track of which cards I own and their basic information.

#### Acceptance Criteria

1. WHEN I navigate to the credit cards section THEN the system SHALL display a list of all my registered credit cards
2. WHEN I create a new credit card THEN the system SHALL require bank name, franchise, and last four digits
3. WHEN I create a new credit card THEN the system SHALL validate that the last four digits are numeric and exactly 4 characters
4. WHEN I create a new credit card THEN the system SHALL save the card information to the database
5. WHEN I edit an existing credit card THEN the system SHALL allow me to modify bank name, franchise, and last four digits
6. WHEN I delete a credit card THEN the system SHALL remove it from the database
7. IF a credit card is linked to existing expenses THEN the system SHALL warn me before deletion and ask for confirmation

### Requirement 2

**User Story:** As a user, I want to link credit cards to my expenses, so that I can track which card was used for each purchase.

#### Acceptance Criteria

1. WHEN I create a new expense THEN the system SHALL provide an optional credit card dropdown at the end of the form
2. WHEN I view the credit card dropdown THEN the system SHALL display all my registered credit cards in format "Bank - Franchise \*\*\*\*1234"
3. WHEN I select a credit card for an expense THEN the system SHALL save the association between expense and credit card
4. WHEN I edit an existing expense THEN the system SHALL show the currently selected credit card (if any) and allow me to change it
5. WHEN I view an expense with a linked credit card THEN the system SHALL display the credit card information
6. WHEN I leave the credit card field empty THEN the system SHALL save the expense without a credit card association

### Requirement 3

**User Story:** As a user, I want to see credit card information in my expense lists and details, so that I can easily identify which card was used for each transaction.

#### Acceptance Criteria

1. WHEN I view the expenses list THEN the system SHALL display credit card information for expenses that have an associated card
2. WHEN I export expenses to CSV THEN the system SHALL include credit card information in the export
3. WHEN I filter or search expenses THEN the system SHALL allow filtering by credit card
4. WHEN I view expense analytics THEN the system SHALL optionally group expenses by credit card

### Requirement 4

**User Story:** As a user, I want to deactivate credit cards instead of deleting them, so that I can stop using them for new expenses while preserving the history of past transactions.

#### Acceptance Criteria

1. WHEN I view my credit cards list THEN the system SHALL display the active/inactive status for each card
2. WHEN I deactivate a credit card THEN the system SHALL set its status to inactive and preserve all existing expense associations
3. WHEN I create a new expense THEN the system SHALL only show active credit cards in the selection dropdown
4. WHEN I edit an existing expense THEN the system SHALL only show active credit cards in the selection dropdown, except for the currently selected card if it's inactive
5. WHEN I view an expense with an inactive credit card THEN the system SHALL still display the credit card information with an indicator that it's inactive
6. WHEN I reactivate a credit card THEN the system SHALL make it available again for new and edited expenses
7. WHEN I filter expenses by credit card THEN the system SHALL include both active and inactive cards in the filter options
8. WHEN I export expenses to CSV THEN the system SHALL include credit card information regardless of active status

### Requirement 5

**User Story:** As a user, I want the credit card feature to integrate seamlessly with existing functionality, so that it doesn't disrupt my current workflow.

#### Acceptance Criteria

1. WHEN I access the credit cards section THEN the system SHALL provide it through the main navigation menu
2. WHEN credit card data is missing or corrupted THEN the system SHALL handle errors gracefully without breaking expense functionality
3. WHEN I use existing expense features THEN the system SHALL continue to work exactly as before if I don't use credit cards
4. WHEN I migrate existing data THEN the system SHALL preserve all existing expenses without requiring credit card associations
