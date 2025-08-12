# Requirements Document

## Introduction

The Dashboard Agrupadores currently displays actual expense data across different views (Vista Actual, Comparación por Períodos, and Acumulado Semanal). Users need the ability to projection and visualize their budget planning for the current period by viewing charts based on budget data instead of actual expenses. This feature will add a "Projection" checkbox that allows users to preview how their current period should look according to their budget allocations, helping them better plan and understand their financial goals.

## Requirements

### Requirement 1

**User Story:** As a user, I want to enable a "Projection" mode on the Vista Actual dashboard, so that I can visualize my current period planning based on budget data instead of actual expenses.

#### Acceptance Criteria

1. WHEN I am on the Dashboard Agrupadores page THEN the system SHALL display a "Projection" checkbox in the filter controls area
2. WHEN I am viewing the "Vista Actual" tab THEN the "Projection" checkbox SHALL be visible and enabled
3. WHEN I am viewing the "Comparación por Períodos" or "Acumulado Semanal" tabs THEN the "Projection" checkbox SHALL be disabled and visually indicated as unavailable
4. WHEN the "Projection" checkbox is unchecked THEN the charts SHALL display actual expense data as they currently do
5. WHEN the "Projection" checkbox is checked THEN the charts SHALL display budget data instead of expense data
6. WHEN I check the "Projection" checkbox THEN the system SHALL immediately update the chart to show budget amounts
7. WHEN I uncheck the "Projection" checkbox THEN the system SHALL immediately revert to showing actual expense amounts

### Requirement 2

**User Story:** As a user, I want the projection mode to work with all existing filters (Estudio, Agrupador, Payment Method), so that I can projection different scenarios based on my filtering preferences.

#### Acceptance Criteria

1. WHEN projection mode is enabled AND I have Estudio filters applied THEN the chart SHALL show budget data filtered by the selected Estudio
2. WHEN projection mode is enabled AND I have Agrupador filters applied THEN the chart SHALL show budget data only for the selected Agrupadores
3. WHEN projection mode is enabled AND I have Payment Method filters applied THEN the chart SHALL show budget data that would correspond to the selected payment method allocation
4. WHEN I change any filter while in projection mode THEN the chart SHALL update to reflect the new filter criteria using budget data
5. WHEN I switch between projection and actual mode THEN all current filter selections SHALL be maintained
6. WHEN no budget data exists for a filtered agrupador THEN the system SHALL display zero values for that agrupador in projection mode

### Requirement 3

**User Story:** As a user, I want clear visual indication when I'm in projection mode, so that I can easily distinguish between actual and projectiond data.

#### Acceptance Criteria

1. WHEN projection mode is enabled THEN the chart title SHALL include an indicator like "(Simulación)" or similar
2. WHEN projection mode is enabled THEN the chart bars SHALL use a different visual style (e.g., different opacity, pattern, or color scheme) to distinguish from actual data
3. WHEN projection mode is enabled THEN tooltips SHALL clearly indicate that the displayed values are budget amounts, not actual expenses
4. WHEN projection mode is enabled THEN the chart legend SHALL indicate "Presupuesto" instead of "Gastos" or similar actual expense terminology
5. WHEN hovering over chart elements in projection mode THEN the tooltip SHALL display "Presupuesto: $X" format instead of expense format

### Requirement 4

**User Story:** As a user, I want projection mode to work seamlessly with the category drill-down functionality, so that I can explore budget allocations at the category level.

#### Acceptance Criteria

1. WHEN projection mode is enabled AND I click on an agrupador bar THEN the system SHALL show category breakdown using budget data for that agrupador
2. WHEN viewing category breakdown in projection mode THEN each category SHALL display its budget amount instead of actual expenses
3. WHEN in projection mode category view THEN the category chart SHALL use the same visual indicators as the main chart to show it's projectiond data
4. WHEN I return from category view to agrupador view while in projection mode THEN the system SHALL maintain projection mode state
5. WHEN no budget data exists for categories within an agrupador THEN the category breakdown SHALL show zero values with appropriate messaging

### Requirement 5

**User Story:** As a user, I want projection mode state to be preserved during my session, so that I can navigate and return without losing my projection preferences.

#### Acceptance Criteria

1. WHEN I enable projection mode THEN the system SHALL remember this preference for the current browser session
2. WHEN I navigate away from the Dashboard Agrupadores and return THEN the projection mode state SHALL be restored to my last selection
3. WHEN I refresh the page THEN the projection mode state SHALL be restored from session storage
4. WHEN I switch between different tabs (Vista Actual, Comparación por Períodos, Acumulado Semanal) THEN the projection mode preference SHALL be maintained for when I return to Vista Actual
5. WHEN I close the browser and reopen THEN the projection mode state SHALL reset to default (unchecked) for security and clarity
