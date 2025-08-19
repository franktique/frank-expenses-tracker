# Requirements Document

## Introduction

This feature enhances the estudios agrupadores administration functionality by adding payment method selection for each agrupador. Users will be able to specify which payment methods should be considered when calculating and displaying agrupador data in the dashboard, providing more granular control over financial analysis and reporting.

## Requirements

### Requirement 1

**User Story:** As a user managing estudios, I want to select specific payment methods for each agrupador in the administration form, so that I can control which transactions are included in the dashboard calculations.

#### Acceptance Criteria

1. WHEN I access the estudios administration form THEN the system SHALL display a payment method selector for each agrupador
2. WHEN I select payment methods for an agrupador THEN the system SHALL save these selections to the database
3. WHEN I view an agrupador that has no payment methods selected THEN the system SHALL include all payment methods by default
4. WHEN I save the estudios administration form THEN the system SHALL validate that at least one payment method is selected per agrupador OR allow empty selection for "all methods"

### Requirement 2

**User Story:** As a user viewing the dashboard agrupadores, I want the displayed data to reflect only the payment methods I configured for each agrupador, so that I can see filtered financial analysis based on my preferences.

#### Acceptance Criteria

1. WHEN the dashboard agrupadores loads data THEN the system SHALL query expenses using only the selected payment methods for each agrupador
2. WHEN an agrupador has specific payment methods configured THEN the system SHALL exclude expenses from other payment methods in calculations
3. WHEN an agrupador has no payment methods configured THEN the system SHALL include expenses from all payment methods
4. WHEN displaying agrupador totals and charts THEN the system SHALL reflect the filtered data based on payment method selections

### Requirement 3

**User Story:** As a user, I want to see which payment methods are configured for each agrupador in the administration interface, so that I can easily review and modify my selections.

#### Acceptance Criteria

1. WHEN I open the estudios administration form THEN the system SHALL display currently selected payment methods for each agrupador
2. WHEN I modify payment method selections THEN the system SHALL provide visual feedback about unsaved changes
3. WHEN I have multiple agrupadores THEN the system SHALL allow different payment method configurations for each one
4. WHEN I clear all payment method selections for an agrupador THEN the system SHALL indicate that all methods will be included
