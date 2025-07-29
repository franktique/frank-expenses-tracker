# Requirements Document

## Introduction

This feature improves the user experience for adding categories to an agrupador by replacing the current dropdown-based single selection with a checkbox-based multiple selection interface, similar to how agrupadores are added to studies. The improvement also includes adding vertical scroll control for long category lists to enhance usability.

## Requirements

### Requirement 1

**User Story:** As a user managing agrupadores, I want to select multiple categories at once using checkboxes, so that I can efficiently add several categories to an agrupador in a single operation.

#### Acceptance Criteria

1. WHEN the user opens the "Agregar Categoría" dialog THEN the system SHALL display available categories as a list with checkboxes instead of a dropdown
2. WHEN the user selects multiple categories using checkboxes THEN the system SHALL allow multiple selections simultaneously
3. WHEN the user clicks the "Agregar" button THEN the system SHALL add all selected categories to the agrupador in a single API call
4. WHEN categories are successfully added THEN the system SHALL update the UI to reflect the new category assignments
5. WHEN categories are successfully added THEN the system SHALL show a success message indicating how many categories were added

### Requirement 2

**User Story:** As a user working with long category lists, I want the category selection dialog to have proper scroll control, so that I can easily navigate through all available categories without UI layout issues.

#### Acceptance Criteria

1. WHEN the category list exceeds the dialog height THEN the system SHALL display a vertical scrollbar
2. WHEN the user scrolls through the category list THEN the system SHALL maintain smooth scrolling behavior
3. WHEN the dialog is displayed THEN the system SHALL set a maximum height to prevent the dialog from becoming too large
4. WHEN scrolling through categories THEN the system SHALL keep the dialog header and footer visible and fixed

### Requirement 3

**User Story:** As a user adding categories to an agrupador, I want clear visual feedback about my selections, so that I can easily see which categories I have selected before confirming the addition.

#### Acceptance Criteria

1. WHEN the user selects categories THEN the system SHALL visually highlight selected checkboxes
2. WHEN the user has selected categories THEN the system SHALL update the "Agregar" button text to show the count of selected items
3. WHEN no categories are selected THEN the system SHALL disable the "Agregar" button
4. WHEN the user cancels the dialog THEN the system SHALL clear all selections

### Requirement 4

**User Story:** As a user managing agrupador categories, I want the system to handle edge cases gracefully, so that I have a consistent and reliable experience.

#### Acceptance Criteria

1. WHEN there are no available categories to add THEN the system SHALL display an appropriate message
2. WHEN all categories are already assigned THEN the system SHALL disable the "Agregar Categoría" button
3. WHEN an error occurs during category addition THEN the system SHALL display a clear error message
4. WHEN categories are successfully added THEN the system SHALL refresh the available categories list to exclude newly added items
