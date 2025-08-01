# Requirements Document

## Introduction

This feature will automatically load the active period information when users log in to the Budget Tracker application. Currently, users must manually navigate to the "periodos" menu to load the active period before they can see data in other menu options. This creates a poor user experience where other sections appear empty until the period is manually loaded. The solution will automatically fetch and store the active period in session storage upon login, making it immediately available to all other application sections.

## Requirements

### Requirement 1

**User Story:** As a logged-in user, I want the active period to be automatically loaded when I access the application, so that I can immediately see relevant data in all menu sections without manual navigation.

#### Acceptance Criteria

1. WHEN a user successfully logs in THEN the system SHALL automatically fetch the active period information
2. WHEN the active period is fetched THEN the system SHALL store it in session storage for immediate access
3. WHEN the active period is loaded THEN all menu options SHALL display relevant data without requiring manual period selection
4. WHEN a user navigates between different sections THEN the active period SHALL remain available from session storage

### Requirement 2

**User Story:** As a user, I want the application to handle cases where no active period exists, so that I receive clear feedback about the system state.

#### Acceptance Criteria

1. WHEN no active period is found THEN the system SHALL display a clear message indicating no active period exists
2. WHEN no active period exists THEN the system SHALL guide the user to create or activate a period
3. WHEN the active period loading fails THEN the system SHALL provide appropriate error handling and fallback behavior
4. WHEN there are network issues during period loading THEN the system SHALL retry the request with appropriate timeout handling

### Requirement 3

**User Story:** As a user, I want the active period to be refreshed when I make changes to period status, so that the application always reflects the current active period.

#### Acceptance Criteria

1. WHEN a user activates a different period THEN the system SHALL update the session storage with the new active period
2. WHEN a user deactivates the current period THEN the system SHALL clear the active period from session storage
3. WHEN period changes occur THEN other application sections SHALL automatically reflect the updated active period
4. WHEN the user refreshes the page THEN the system SHALL re-fetch the current active period to ensure data consistency

### Requirement 4

**User Story:** As a developer, I want the active period loading to integrate seamlessly with the existing authentication and context systems, so that the implementation is maintainable and consistent.

#### Acceptance Criteria

1. WHEN implementing the feature THEN the system SHALL integrate with the existing auth context
2. WHEN storing period data THEN the system SHALL use session storage to maintain data across page refreshes
3. WHEN the feature is implemented THEN it SHALL not break existing period selection functionality in the periodos menu
4. WHEN users log out THEN the system SHALL clear the active period from session storage
