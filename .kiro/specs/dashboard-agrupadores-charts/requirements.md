# Requirements Document

## Introduction

The Dashboard Agrupadores currently shows basic expense totals for each agrupador. Users need additional chart visualizations to better analyze their spending patterns across different time dimensions. This feature will add two new chart tabs to provide period-based comparisons and weekly cumulative analysis for agrupadores, enabling users to understand spending trends and patterns more effectively.

## Requirements

### Requirement 1

**User Story:** As a user, I want to compare agrupador values across all existing periods in a single chart, so that I can see how my spending patterns change over time for each agrupador.

#### Acceptance Criteria

1. WHEN I navigate to Dashboard Agrupadores THEN the system SHALL display a new tab called "Comparación por Períodos"
2. WHEN I select the period comparison tab THEN the system SHALL show a chart with all existing periods on the x-axis and agrupador totals as different series
3. WHEN there are multiple agrupadores THEN each agrupador SHALL be represented as a different colored line or bar series
4. WHEN I hover over data points THEN the system SHALL display tooltips showing the exact amount, period, and agrupador name
5. WHEN there are no expenses for an agrupador in a period THEN the system SHALL display zero value for that data point
6. WHEN payment method filters are applied THEN the chart SHALL update to show filtered data across all periods

### Requirement 2

**User Story:** As a user, I want to see cumulative weekly results per agrupador with weekly cuts on Sundays, so that I can track my weekly spending accumulation patterns.

#### Acceptance Criteria

1. WHEN I navigate to Dashboard Agrupadores THEN the system SHALL display a new tab called "Acumulado Semanal"
2. WHEN I select the weekly cumulative tab THEN the system SHALL show a chart with weeks on the x-axis and cumulative amounts for each agrupador
3. WHEN calculating weekly periods THEN the system SHALL use Sunday as the week boundary (Sunday to Saturday)
4. WHEN we are in the middle of a week THEN the system SHALL include the current partial week up to the current day
5. WHEN displaying cumulative data THEN each week SHALL show the running total of expenses for each agrupador within that week
6. WHEN there are multiple agrupadores THEN each agrupador SHALL be represented as a different colored line series
7. WHEN I hover over data points THEN the system SHALL display tooltips showing the cumulative amount, week range, and agrupador name
8. WHEN payment method filters are applied THEN the chart SHALL update to show filtered cumulative data

### Requirement 3

**User Story:** As a user, I want to navigate between different chart views seamlessly, so that I can analyze my agrupador data from multiple perspectives.

#### Acceptance Criteria

1. WHEN I am on Dashboard Agrupadores THEN the system SHALL display tabs for "Vista Actual", "Comparación por Períodos", and "Acumulado Semanal"
2. WHEN I switch between tabs THEN the system SHALL maintain the current period and payment method filter selections
3. WHEN I apply filters THEN all chart tabs SHALL respect the same filter settings
4. WHEN loading chart data THEN the system SHALL show appropriate loading states
5. WHEN chart data fails to load THEN the system SHALL display user-friendly error messages
6. WHEN there is no data to display THEN the system SHALL show an appropriate empty state message
