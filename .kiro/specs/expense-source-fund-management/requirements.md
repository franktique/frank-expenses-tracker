# Requirements Document

## Introduction

This feature adds source fund tracking to the expense management system, allowing users to specify and edit both source and destination funds for expenses. Currently, expenses only track a destination fund, but users need the ability to track where money comes from (source fund) and where it goes (destination fund), with the ability to edit both during expense modification.

## Requirements

### Requirement 1

**User Story:** As a user, I want to specify a source fund when creating an expense, so that I can track which fund the money is coming from.

#### Acceptance Criteria

1. WHEN creating a new expense THEN the system SHALL display a source fund dropdown containing only funds related to the selected category
2. WHEN no category is selected THEN the system SHALL disable the source fund dropdown
3. WHEN a category with multiple related funds is selected THEN the system SHALL populate the source fund dropdown with all related funds
4. WHEN a category with only one related fund is selected THEN the system SHALL auto-select that fund as the source fund
5. IF a source fund is not selected THEN the system SHALL prevent expense creation and display a validation error
6. For the dropmdown, always the current fund from the filter on the expenses view should be taken as the default value for the drop down, and should be selected alreayd as default when opennig the form for expense creation.

### Requirement 2

**User Story:** As a user, I want to edit the source fund of an existing expense, so that I can correct mistakes or update fund allocations.

#### Acceptance Criteria

1. WHEN editing an existing expense THEN the system SHALL display the current source fund as selected in the dropdown
2. WHEN the category of an existing expense is changed THEN the system SHALL update the source fund dropdown to show only funds related to the new category
3. WHEN changing the source fund during editing THEN the system SHALL validate that the selected fund is related to the current category
4. IF the current source fund becomes invalid after category change THEN the system SHALL clear the source fund selection and require user to select a valid one

### Requirement 3

**User Story:** As a user, I want the system to migrate existing expense data to include source fund information, so that historical data remains consistent and accessible.

#### Acceptance Criteria

1. WHEN the migration runs THEN the system SHALL add a new 'source_fund_id' column to the expenses table
2. WHEN migrating existing expenses THEN the system SHALL populate the source_fund_id with the fund currently related to each expense's category
3. IF an expense's category has multiple related funds THEN the system SHALL use the first available fund as the source fund
4. IF an expense's category has no related funds THEN the system SHALL log an error and skip that expense
5. WHEN migration completes THEN the system SHALL ensure all valid expenses have both source_fund_id and destination_fund_id populated

### Requirement 4

**User Story:** As a user, I want the expense form to maintain the existing fund filter functionality while adding source fund selection, so that the interface remains intuitive and efficient.

#### Acceptance Criteria

1. WHEN using the fund filter THEN the system SHALL continue to filter categories based on the selected fund
2. WHEN a fund filter is active AND a category is selected THEN the source fund dropdown SHALL show all funds related to the category (not just the filtered fund)
3. WHEN creating an expense with an active fund filter THEN the system SHALL default the source fund to the filtered fund if it's related to the selected category
4. WHEN the fund filter changes THEN the system SHALL preserve the selected source fund if it remains valid for the current category

### Requirement 5

**User Story:** As a user, I want clear visual distinction between source and destination funds in the expense form, so that I can easily understand and manage fund transfers.

#### Acceptance Criteria

1. WHEN viewing the expense form THEN the system SHALL clearly label the source fund dropdown as "Fondo Origen" or similar
2. WHEN viewing the expense form THEN the system SHALL clearly label the destination fund dropdown as "Fondo Destino" or similar
3. WHEN both source and destination funds are selected THEN the system SHALL visually indicate if they are the same fund
4. WHEN source and destination funds are different THEN the system SHALL clearly show this represents a fund transfer
