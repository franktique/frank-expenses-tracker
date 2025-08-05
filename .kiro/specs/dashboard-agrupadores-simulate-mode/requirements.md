# Requirements Document

## Introduction

The Dashboard Agrupadores currently displays actual expense data across different views (Vista Actual, Comparación por Períodos, and Acumulado Semanal). Users need the ability to simulate and visualize their budget planning for the current period by viewing charts based on budget data instead of actual expenses. This feature will add a "Simulate" checkbox that allows users to preview how their current period should look according to their budget allocations, helping them better plan and understand their financial goals.

## Requirements

### Requirement 1

**User Story:** As a user, I want to enable a "Simulate" mode on the Vista Actual dashboard, so that I can visualize my current period planning based on budget data instead of actual expenses.

#### Acceptance Criteria

1. WHEN I am on the Dashboard Agrupadores page THEN the system SHALL display a "Simulate" checkbox in the filter controls area
2. WHEN I am viewing the "Vista Actual" tab THEN the "Simulate" checkbox SHALL be visible and enabled
3. WHEN I am viewing the "Comparación por Períodos" or "Acumulado Semanal" tabs THEN the "Simulate" checkbox SHALL be disabled and visually indicated as unavailable
4. WHEN the "Simulate" checkbox is unchecked THEN the charts SHALL display actual expense data as they currently do
5. WHEN the "Simulate" checkbox is checked THEN the charts SHALL display budget data instead of expense data
6. WHEN I check the "Simulate" checkbox THEN the system SHALL immediately update the chart to show budget amounts
7. WHEN I uncheck the "Simulate" checkbox THEN the system SHALL immediately revert to showing actual expense amounts

### Requirement 2

**User Story:** As a user, I want the simulate mode to work with all existing filters (Estudio, Agrupador, Payment Method), so that I can simulate different scenarios based on my filtering preferences.

#### Acceptance Criteria

1. WHEN simulate mode is enabled AND I have Estudio filters applied THEN the chart SHALL show budget data filtered by the selected Estudio
2. WHEN simulate mode is enabled AND I have Agrupador filters applied THEN the chart SHALL show budget data only for the selected Agrupadores
3. WHEN simulate mode is enabled AND I have Payment Method filters applied THEN the chart SHALL show budget data that would correspond to the selected payment method allocation
4. WHEN I change any filter while in simulate mode THEN the chart SHALL update to reflect the new filter criteria using budget data
5. WHEN I switch between simulate and actual mode THEN all current filter selections SHALL be maintained
6. WHEN no budget data exists for a filtered agrupador THEN the system SHALL display zero values for that agrupador in simulate mode

### Requirement 3

**User Story:** As a user, I want clear visual indication when I'm in simulate mode, so that I can easily distinguish between actual and simulated data.

#### Acceptance Criteria

1. WHEN simulate mode is enabled THEN the chart title SHALL include an indicator like "(Simulación)" or similar
2. WHEN simulate mode is enabled THEN the chart bars SHALL use a different visual style (e.g., different opacity, pattern, or color scheme) to distinguish from actual data
3. WHEN simulate mode is enabled THEN tooltips SHALL clearly indicate that the displayed values are budget amounts, not actual expenses
4. WHEN simulate mode is enabled THEN the chart legend SHALL indicate "Presupuesto" instead of "Gastos" or similar actual expense terminology
5. WHEN hovering over chart elements in simulate mode THEN the tooltip SHALL display "Presupuesto: $X" format instead of expense format

### Requirement 4

**User Story:** As a user, I want simulate mode to work seamlessly with the category drill-down functionality, so that I can explore budget allocations at the category level.

#### Acceptance Criteria

1. WHEN simulate mode is enabled AND I click on an agrupador bar THEN the system SHALL show category breakdown using budget data for that agrupador
2. WHEN viewing category breakdown in simulate mode THEN each category SHALL display its budget amount instead of actual expenses
3. WHEN in simulate mode category view THEN the category chart SHALL use the same visual indicators as the main chart to show it's simulated data
4. WHEN I return from category view to agrupador view while in simulate mode THEN the system SHALL maintain simulate mode state
5. WHEN no budget data exists for categories within an agrupador THEN the category breakdown SHALL show zero values with appropriate messaging

### Requirement 5

**User Story:** As a user, I want simulate mode state to be preserved during my session, so that I can navigate and return without losing my simulation preferences.

#### Acceptance Criteria

1. WHEN I enable simulate mode THEN the system SHALL remember this preference for the current browser session
2. WHEN I navigate away from the Dashboard Agrupadores and return THEN the simulate mode state SHALL be restored to my last selection
3. WHEN I refresh the page THEN the simulate mode state SHALL be restored from session storage
4. WHEN I switch between different tabs (Vista Actual, Comparación por Períodos, Acumulado Semanal) THEN the simulate mode preference SHALL be maintained for when I return to Vista Actual
5. WHEN I close the browser and reopen THEN the simulate mode state SHALL reset to default (unchecked) for security and clarity
