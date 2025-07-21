# Requirements Document

## Introduction

This feature enhances the periods management interface to provide better visual control over period activation/deactivation. Currently, users can activate periods but cannot deactivate them through the UI, and there's no visual feedback to prevent confusion about having multiple active periods. This enhancement will add a deactivation button for active periods and improve the user experience with better visual constraints.

## Requirements

### Requirement 1

**User Story:** As a budget tracker user, I want to be able to deactivate an active period, so that I can have no active periods when needed or switch between periods more intuitively.

#### Acceptance Criteria

1. WHEN a period is active THEN the system SHALL display a "Desactivar" (Deactivate) button instead of the "Activar" (Activate) button
2. WHEN the user clicks the "Desactivar" button THEN the system SHALL deactivate the period and update the UI to show "Inactivo" status
3. WHEN a period is deactivated THEN the system SHALL show a success toast notification confirming the deactivation
4. IF the deactivation fails THEN the system SHALL show an error toast with the failure reason

### Requirement 2

**User Story:** As a budget tracker user, I want visual feedback about period activation constraints, so that I understand the system behavior and avoid confusion about multiple active periods.

#### Acceptance Criteria

1. WHEN there is already an active period AND the user attempts to activate another period THEN the system SHALL show a confirmation dialog explaining that activating this period will deactivate the currently active one
2. WHEN the user confirms the period switch THEN the system SHALL proceed with the activation and show appropriate feedback
3. WHEN the user cancels the period switch THEN the system SHALL maintain the current state without changes
4. WHEN a period activation is in progress THEN the system SHALL disable all other activation/deactivation buttons to prevent race conditions

### Requirement 3

**User Story:** As a budget tracker user, I want consistent and clear labeling for period status actions, so that I can easily understand what each button will do.

#### Acceptance Criteria

1. WHEN a period is inactive THEN the system SHALL show an "Activar" button
2. WHEN a period is active THEN the system SHALL show a "Desactivar" button
3. WHEN any period operation is in progress THEN the system SHALL show loading state with appropriate text ("Activando...", "Desactivando...")
4. WHEN multiple periods exist THEN the system SHALL ensure only one shows as "Activo" at any given time
5. If more than one period is currently active in the database, it should allow deactivaste any of the using the "Desactivar" button
