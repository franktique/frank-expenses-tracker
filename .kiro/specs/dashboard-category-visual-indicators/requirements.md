# Requirements Document

## Introduction

This feature enhances the dashboard's resumen (summary) view by providing visual indicators for categories that have no expenses registered in the current period. By graying out category names that lack expense data, users can quickly identify which budget categories are unused and focus their attention on active spending areas.

## Requirements

### Requirement 1

**User Story:** As a budget tracker user, I want to see category names grayed out in the dashboard table when they have no expenses for the current period, so that I can quickly identify which categories are unused and focus on active spending areas.

#### Acceptance Criteria

1. WHEN viewing the dashboard resumen table THEN category names SHALL be displayed in gray color IF no expenses exist for that category in the current period
2. WHEN viewing the dashboard resumen table THEN category names SHALL be displayed in normal color IF expenses exist for that category in the current period
3. WHEN the current period changes THEN the visual indicators SHALL update automatically to reflect the new period's expense data
4. WHEN expenses are added or removed for a category THEN the visual indicator SHALL update immediately without requiring a page refresh

### Requirement 2

**User Story:** As a budget tracker user, I want the grayed-out styling to be subtle and accessible, so that the information remains readable while clearly indicating the status difference.

#### Acceptance Criteria

1. WHEN a category name is grayed out THEN it SHALL use a muted text color that maintains sufficient contrast for accessibility
2. WHEN a category name is grayed out THEN it SHALL remain fully readable and not appear disabled
3. WHEN using dark theme THEN the grayed-out styling SHALL adapt appropriately to maintain visibility
4. WHEN using light theme THEN the grayed-out styling SHALL provide clear visual distinction from active categories

### Requirement 3

**User Story:** As a budget tracker user, I want the visual indicators to work consistently across all dashboard table views, so that I have a uniform experience when analyzing my budget data.

#### Acceptance Criteria

1. WHEN viewing any dashboard table that displays categories THEN the graying logic SHALL apply consistently
2. WHEN the dashboard data refreshes THEN the visual indicators SHALL update to reflect the current expense state
3. WHEN filtering or sorting the table THEN the visual indicators SHALL remain accurate for each displayed category
4. WHEN the table loads initially THEN the visual indicators SHALL be applied based on the current period's expense data
