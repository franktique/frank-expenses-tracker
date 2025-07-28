# Requirements Document

## Introduction

The Dashboard Agrupadores currently displays all agrupadores without filtering options and shows only actual expense data. Users need the ability to filter which agrupadores are displayed and compare actual expenses against planned budgets. This enhancement will add multi-select filtering for agrupadores and optional budget comparison overlays in both the current view and period comparison charts, enabling users to analyze spending patterns against their planned budgets and focus on specific agrupadores of interest.

## Requirements

### Requirement 1

**User Story:** As a user, I want to filter which agrupadores are displayed in the dashboard, so that I can focus on specific agrupadores that are relevant to my current analysis.

#### Acceptance Criteria

1. WHEN I navigate to Dashboard Agrupadores THEN the system SHALL display a multi-select filter control for agrupadores
2. WHEN I open the agrupador filter THEN the system SHALL show all available agrupadores with checkboxes in alphabetical order
3. WHEN I select specific agrupadores THEN the system SHALL update all charts to show only the selected agrupadores
4. WHEN I select "All" option THEN the system SHALL display all agrupadores (default behavior)
5. WHEN I deselect all agrupadores THEN the system SHALL show an empty state message
6. WHEN I switch between tabs THEN the system SHALL maintain the same agrupador filter selections
7. WHEN I apply payment method filters THEN the agrupador filter SHALL remain active and both filters SHALL work together
8. WHEN I select/deselect agrupadores THEN the system SHALL update the charts without requiring a page refresh

### Requirement 2

**User Story:** As a user, I want to see budget values alongside actual expenses in the "Vista Actual" view, so that I can compare my planned spending against actual spending for each agrupador.

#### Acceptance Criteria

1. WHEN I am in the "Vista Actual" tab THEN the system SHALL display a checkbox labeled "Mostrar Presupuestos"
2. WHEN I enable the budget display checkbox THEN the system SHALL add budget bars to the chart alongside expense bars
3. WHEN displaying budgets THEN each agrupador SHALL show two bars: one for actual expenses and one for planned budget
4. WHEN budget data is not available for an agrupador THEN the system SHALL show zero budget or hide the budget bar for that agrupador
5. WHEN I hover over budget bars THEN the system SHALL display tooltips showing the budget amount and agrupador name
6. WHEN I disable the budget display checkbox THEN the system SHALL return to showing only expense data
7. WHEN agrupador filters are applied THEN the budget display SHALL respect the same filter selections
8. WHEN payment method filters are applied THEN the budget values SHALL remain unchanged (budgets are not filtered by payment method)

### Requirement 3

**User Story:** As a user, I want to see budget values in the "Comparación por Períodos" view, so that I can compare planned vs actual spending across different time periods.

#### Acceptance Criteria

1. WHEN I am in the "Comparación por Períodos" tab THEN the system SHALL display a checkbox labeled "Mostrar Presupuestos"
2. WHEN I enable the budget display checkbox THEN the system SHALL add budget lines to the chart for each agrupador
3. WHEN displaying budgets THEN each agrupador SHALL have two lines: one for actual expenses and one for planned budgets
4. WHEN budget data is not available for a period/agrupador combination THEN the system SHALL show zero budget value
5. WHEN I hover over budget lines THEN the system SHALL display tooltips indicating it's budget data with the amount and period
6. WHEN I disable the budget display checkbox THEN the system SHALL return to showing only expense data
7. WHEN agrupador filters are applied THEN the budget display SHALL respect the same filter selections
8. WHEN payment method filters are applied THEN the budget values SHALL remain unchanged across all periods

### Requirement 4

**User Story:** As a user, I want the budget data to be calculated correctly by aggregating category budgets within each agrupador, so that the budget comparisons are accurate.

#### Acceptance Criteria

1. WHEN calculating agrupador budgets THEN the system SHALL sum all category budgets that belong to each agrupador
2. WHEN a category has no budget defined THEN the system SHALL treat it as zero contribution to the agrupador budget
3. WHEN an agrupador has no categories with budgets THEN the system SHALL show zero total budget for that agrupador
4. WHEN budget calculations are performed THEN the system SHALL use the same period context as the expense data
5. WHEN multiple periods are involved THEN the system SHALL calculate budgets for each period independently, looking at the exisitng budget data for each period in the database
6. WHEN agrupador filters are applied THEN budget calculations SHALL only include the selected agrupadores

### Requirement 5

**User Story:** As a user, I want the filtering and budget features to work seamlessly with existing functionality, so that I can use all features together without conflicts.

#### Acceptance Criteria

1. WHEN I use agrupador filters THEN the category breakdown view SHALL show only categories from selected agrupadores
2. WHEN I click on a filtered agrupador bar THEN the system SHALL display category breakdown for that specific agrupador
3. WHEN I have budget display enabled and click on an agrupador THEN the category view SHALL also show budget vs actual for individual categories
4. WHEN I switch between tabs THEN both agrupador filter and budget display settings SHALL be maintained
5. WHEN I change payment method filters THEN agrupador filters and budget display settings SHALL remain active
6. WHEN loading states occur THEN the filter controls SHALL remain accessible and show current selections
7. WHEN errors occur THEN the filter and budget display controls SHALL remain functional for retry attempts
