# Requirements Document

## Introduction

The "Estudios" feature introduces a new organizational layer for the Budget Tracker application, allowing users to create collections of "Agrupadores" (groupers). This feature will add a new menu option called "Estudios" and integrate mandatory filtering into the existing Agrupadores dashboard. Users will be able to create named estudios, assign multiple agrupadores to them, and use estudios as the primary filter in all agrupadores-related dashboards.

## Requirements

### Requirement 1

**User Story:** As a budget tracker user, I want to create and manage estudios so that I can organize my agrupadores into meaningful collections.

#### Acceptance Criteria

1. WHEN I navigate to the application THEN I SHALL see a new "Estudios" menu option in the main navigation
2. WHEN I click on "Estudios" THEN the system SHALL display a page for managing estudios
3. WHEN I am on the estudios page THEN I SHALL be able to create a new estudio by providing a name
4. WHEN I create an estudio THEN the system SHALL save it to the database with a unique identifier
5. WHEN I view the estudios list THEN I SHALL see all created estudios with their names
6. WHEN I select an estudio THEN I SHALL be able to add or remove agrupadores from that estudio

### Requirement 2

**User Story:** As a user, I want to assign agrupadores to estudios so that I can group related agrupadores together for analysis.

#### Acceptance Criteria

1. WHEN I am managing an estudio THEN I SHALL see a list of available agrupadores
2. WHEN I select agrupadores THEN the system SHALL allow me to add them to the current estudio
3. WHEN an agrupador is added to an estudio THEN it SHALL remain available for assignment to other estudios
4. WHEN I remove an agrupador from an estudio THEN it SHALL no longer be associated with that estudio
5. WHEN I view an estudio THEN I SHALL see all agrupadores currently assigned to it

### Requirement 3

**User Story:** As a user, I want estudios to be the mandatory primary filter in the Agrupadores dashboard so that I can focus my analysis on specific collections of agrupadores.

#### Acceptance Criteria

1. WHEN I navigate to the Agrupadores dashboard THEN I SHALL see an estudio filter as the first filter option
2. WHEN the dashboard loads THEN the system SHALL automatically select the first available estudio as default
3. WHEN I select an estudio THEN the dashboard SHALL only display agrupadores that belong to that estudio
4. WHEN I change the estudio selection THEN all dashboard data SHALL update to reflect only the selected estudio's agrupadores
5. WHEN no estudio is available THEN the system SHALL display an appropriate message prompting to create estudios

### Requirement 4

**User Story:** As a user, I want the estudio filter to be consistent across all agrupadores dashboard tabs so that my analysis context remains the same.

#### Acceptance Criteria

1. WHEN I select an estudio in any agrupadores dashboard tab THEN the same estudio SHALL be selected in all other tabs
2. WHEN I switch between dashboard tabs THEN the estudio filter SHALL maintain the same selection
3. WHEN I navigate away from and back to the agrupadores dashboard THEN the last selected estudio SHALL be remembered
4. WHEN the selected estudio is deleted THEN the system SHALL automatically select the first available estudio

### Requirement 5

**User Story:** As a user, I want to manage estudios (edit, delete) so that I can maintain my organizational structure over time.

#### Acceptance Criteria

1. WHEN I view an estudio THEN I SHALL be able to edit its name
2. WHEN I edit an estudio name THEN the system SHALL update it in the database and reflect changes everywhere
3. WHEN I delete an estudio THEN the system SHALL remove it from the database
4. WHEN I delete an estudio THEN agrupadores previously assigned to it SHALL remain available for other estudios
5. WHEN I attempt to delete the last remaining estudio THEN the system SHALL warn me about potential dashboard access issues
6. WHEN Im trying to delete an estudio THEN the system SHALL warn to ask if IM sure to remove/delete that studio, I mean a confirmation popup
