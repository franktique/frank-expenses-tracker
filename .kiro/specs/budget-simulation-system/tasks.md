# Implementation Plan

- [x] 1. Create database schema and API foundation

  - Create database migration scripts for simulations and simulation_budgets tables
  - Implement basic CRUD API endpoints for simulations management
  - Add database indexes for optimal query performance
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2. Implement simulation management API endpoints

  - [x] 2.1 Create simulations CRUD API endpoints

    - Implement GET /api/simulations for listing all simulations
    - Implement POST /api/simulations for creating new simulations
    - Implement GET /api/simulations/[id] for individual simulation details
    - Implement PUT /api/simulations/[id] for updating simulation metadata
    - Implement DELETE /api/simulations/[id] for simulation deletion
    - Add proper error handling and validation for all endpoints
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 5.1, 5.2, 5.3, 5.4_

  - [x] 2.2 Create simulation budgets API endpoints
    - Implement GET /api/simulations/[id]/budgets for retrieving simulation budgets
    - Implement PUT /api/simulations/[id]/budgets for batch updating simulation budgets
    - Add validation for Efectivo and Credito amounts (positive numbers)
    - Implement category existence validation
    - Add proper error responses for invalid data
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

- [x] 3. Create simulation management UI components

  - [x] 3.1 Implement simulation list component

    - Create SimulationList component with create, edit, delete, duplicate actions
    - Add empty state handling for when no simulations exist
    - Implement confirmation dialogs for destructive actions
    - Add loading states and error handling
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 3.2 Implement simulation creation and editing forms
    - Create simulation creation modal with name and description fields
    - Add form validation for required fields and length limits
    - Implement edit functionality for simulation metadata
    - Add success/error toast notifications
    - _Requirements: 1.1, 1.2, 1.3, 5.1, 5.2_

- [x] 4. Build simulation budget configuration interface

  - [x] 4.1 Create simulation budget form component

    - Build form displaying all categories with Efectivo and Credito input fields
    - Implement real-time validation for positive number inputs
    - Add category totals calculation (Efectivo + Credito per category)
    - Show overall simulation budget totals
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

  - [x] 4.2 Implement budget form persistence and navigation
    - Add save functionality with batch API calls
    - Implement auto-save or draft functionality
    - Add navigation between simulation list and budget configuration
    - Handle loading states during save operations
    - _Requirements: 2.4, 2.5_

- [x] 5. Create main simulation pages and routing

  - [x] 5.1 Implement main simulation page

    - Create /app/simular/page.tsx with simulation list interface
    - Add navigation integration with existing sidebar
    - Implement responsive design for mobile and desktop
    - _Requirements: 1.1, 1.4, 1.5_

  - [x] 5.2 Create individual simulation configuration page
    - Implement /app/simular/[id]/page.tsx for budget configuration
    - Add tab navigation between budget configuration and analytics
    - Implement breadcrumb navigation
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

- [x] 6. Implement simulation analytics API

  - [x] 6.1 Create simulation analytics data endpoint

    - Implement GET /api/simulations/[id]/analytics endpoint
    - Add logic to aggregate simulation budgets by grouper
    - Implement payment method filtering for simulation data
    - Add integration with existing estudio and grouper filtering
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5, 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 6.2 Implement historical data integration
    - Extend analytics endpoint to include historical period data
    - Add logic to combine historical and simulation data for comparison
    - Implement variance calculation between historical averages and simulation
    - Add period comparison functionality treating simulation as newest period
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 7. Build simulation analytics UI components

  - [x] 7.1 Create simulation chart components

    - Extend existing chart components to handle simulation data
    - Implement visual distinction between historical and simulation data
    - Add simulation-specific tooltips and legends
    - Ensure compatibility with existing chart optimization patterns
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 7.2 Implement period comparison charts
    - Create enhanced period comparison charts including simulation data
    - Add variance indicators and trend analysis
    - Implement highlighting for significant differences from historical data
    - Add interactive features for drilling down into specific groupers
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 8. Integrate simulation with existing filter system

  - [x] 8.1 Extend existing filter components for simulation context

    - Modify AgrupadorFilter to work with simulation data
    - Update EstudioFilter to apply to simulation analytics
    - Extend PaymentMethodFilter to handle simulation budget filtering
    - Ensure filter state persistence across simulation navigation
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 8.2 Implement simulation-specific filter behaviors
    - Add simulation selection filter for analytics views
    - Implement filter combinations (estudio + grouper + payment method + simulation)
    - Add filter reset functionality specific to simulation context
    - Ensure filter state synchronization between tabs
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 9. Create simulation analytics page

  - [x] 9.1 Implement simulation analytics interface

    - Create /app/simular/[id]/analytics/page.tsx with chart dashboard
    - Integrate all filter components in simulation context
    - Add tab navigation between different chart types
    - Implement responsive layout for analytics dashboard
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 9.2 Add simulation comparison features
    - Implement side-by-side simulation comparison
    - Add export functionality for simulation analytics data
    - Create summary cards showing key simulation metrics
    - Add quick actions for simulation management from analytics view
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4_

- [x] 10. Implement error handling and validation

  - [x] 10.1 Add comprehensive error handling

    - Implement error boundaries for simulation components
    - Add graceful fallbacks for missing simulation data
    - Create user-friendly error messages for common scenarios
    - Add retry mechanisms for failed API calls
    - _Requirements: 1.5, 2.6, 3.5, 5.5_

  - [x] 10.2 Implement data validation and consistency checks
    - Add client-side validation for simulation budget forms
    - Implement server-side validation for all simulation APIs
    - Add data consistency checks between simulations and categories
    - Create validation feedback for users during data entry
    - _Requirements: 2.3, 2.6, 2.7_

- [x] 11. Add navigation and menu integration

  - [x] 11.1 Integrate simulation menu with existing navigation

    - Add "Simular" option to existing sidebar navigation
    - Implement proper active state handling for simulation routes
    - Add breadcrumb navigation for simulation sub-pages
    - Ensure navigation consistency with existing app patterns
    - _Requirements: 1.1_

  - [x] 11.2 Implement simulation-specific navigation features
    - Add quick navigation between simulations
    - Implement recent simulations list
    - Add navigation shortcuts from analytics back to configuration
    - Create contextual navigation based on user workflow
    - _Requirements: 1.4, 5.1, 5.2, 5.3, 5.4_
