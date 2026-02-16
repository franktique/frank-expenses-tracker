/**
 * Simulation Sub-Groups Type Definitions
 * Defines types for managing sub-groups within simulation budgets
 */

/**
 * SubgroupCategory - Junction type for category membership in a subgroup
 */
export type SubgroupCategory = {
  id: string; // UUID
  subgroupId: string; // UUID, FK to simulation_subgroups
  categoryId: string | number; // FK to categories
  orderWithinSubgroup: number; // Order of category within the sub-group
};

/**
 * Subgroup - Represents a sub-group of categories within a simulation
 */
export type Subgroup = {
  id: string; // UUID
  simulationId: number; // FK to simulations
  name: string; // Display name of the sub-group
  categoryIds: (string | number)[]; // Array of category IDs in this sub-group
  displayOrder: number; // Order of sub-group within simulation
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
  isExpanded?: boolean; // UI-only state, not persisted to database
  templateSubgroupId?: string | null; // FK to template_subgroups (if from template)
  customOrder?: number | null; // Per-simulation custom ordering (migrated from localStorage)
  customVisibility?: boolean; // Per-simulation visibility state (migrated from localStorage)
};

/**
 * CreateSubgroupRequest - Request payload for creating a sub-group
 */
export type CreateSubgroupRequest = {
  name: string;
  categoryIds: (string | number)[];
};

/**
 * UpdateSubgroupRequest - Request payload for updating a sub-group
 */
export type UpdateSubgroupRequest = {
  name?: string;
  categoryIds?: (string | number)[];
  displayOrder?: number;
};

/**
 * SubgroupResponse - API response wrapper for sub-group
 */
export type SubgroupResponse = {
  success: boolean;
  data?: Subgroup;
  error?: string;
  statusCode: number;
};

/**
 * SubgroupsListResponse - API response wrapper for list of sub-groups
 */
export type SubgroupsListResponse = {
  success: boolean;
  subgroups?: Subgroup[];
  error?: string;
  statusCode: number;
};

/**
 * DeleteSubgroupResponse - API response wrapper for delete operation
 */
export type DeleteSubgroupResponse = {
  success: boolean;
  message?: string;
  error?: string;
  statusCode: number;
};

/**
 * VisibilityState - Tracks which items are visible (true) or hidden (false)
 * Key format: subgroup ID or category ID (can be string UUID or number)
 */
export type VisibilityState = Record<string, boolean>;

/**
 * VisibilityToggleItem - Represents an item that can be toggled for visibility
 * Used for subgroups and categories within subgroups
 */
export type VisibilityToggleItem = {
  id: string | number; // Item ID (subgroup ID or category ID)
  type: 'subgroup' | 'category'; // Type of item being toggled
  isVisible: boolean; // Current visibility state
};
