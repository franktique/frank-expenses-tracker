# Requirements Document

## Introduction

The Dashboard Agrupadores currently displays a weekly cumulative chart using a line chart format in the "Acumulado Semanal" tab. This line chart implementation has limitations when displaying data for periods with more than 4 weeks, as it was designed with a fixed assumption of 4-week periods. Users need to be able to visualize all weeks within the current open period, regardless of how many weeks the period contains. Converting the chart from a line chart to a bar chart will provide better visual representation and accommodate variable numbers of weeks per period.

## Requirements

### Requirement 1

**User Story:** As a user viewing the Dashboard Agrupadores, I want the "Acumulado Semanal" chart to display as a bar chart instead of a line chart, so that I can better visualize cumulative expenses across all weeks in the current period.

#### Acceptance Criteria

1. WHEN I navigate to the Dashboard Agrupadores "Acumulado Semanal" tab THEN the system SHALL display a bar chart instead of a line chart
2. WHEN the chart renders THEN each week SHALL be represented as a separate bar group on the x-axis
3. WHEN multiple agrupadores are selected THEN each agrupador SHALL be displayed as a different colored bar within each week group
4. WHEN I hover over a bar THEN the system SHALL display a tooltip with the agrupador name, week range, and cumulative amount
5. WHEN the period contains more than 4 weeks THEN all weeks SHALL be visible and properly spaced on the chart

### Requirement 2

**User Story:** As a user with periods containing varying numbers of weeks, I want the bar chart to automatically adjust to display all weeks in the current period, so that I don't miss any weekly data regardless of period length.

#### Acceptance Criteria

1. WHEN the current period contains 5 or more weeks THEN the chart SHALL display all weeks without truncation
2. WHEN the current period contains fewer than 4 weeks THEN the chart SHALL display only the existing weeks
3. WHEN the chart displays many weeks THEN the x-axis labels SHALL remain readable through appropriate rotation and sizing
4. WHEN the chart width exceeds the container THEN horizontal scrolling SHALL be available if needed
5. WHEN no data exists for a particular week THEN that week SHALL still appear on the x-axis with zero values

### Requirement 3

**User Story:** As a user familiar with the current chart functionality, I want the bar chart to maintain all existing features and behaviors, so that the transition is seamless and no functionality is lost.

#### Acceptance Criteria

1. WHEN I apply payment method filters THEN the bar chart SHALL respect the selected payment methods
2. WHEN I select specific agrupadores THEN only those agrupadores SHALL appear in the chart
3. WHEN I enable budget projection mode THEN the bar chart SHALL display budget data instead of expense data
4. WHEN the chart is loading THEN the same loading skeleton SHALL be displayed
5. WHEN an error occurs THEN the same error handling and retry functionality SHALL be available
6. WHEN no data is available THEN the same empty state message SHALL be displayed
