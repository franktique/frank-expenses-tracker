/**
 * Subgroup Templates Type Definitions
 * Defines types for the template/scenario system
 */

/**
 * SubgroupTemplate - Represents a reusable template for subgroup configurations
 */
export type SubgroupTemplate = {
  id: string; // UUID
  name: string; // Display name of the template
  description?: string | null; // Optional description
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
  subgroups?: TemplateSubgroup[]; // Subgroups within this template (loaded when needed)
};

/**
 * TemplateSubgroup - Represents a subgroup definition within a template
 */
export type TemplateSubgroup = {
  id: string; // UUID
  templateId: string; // FK to subgroup_templates
  name: string; // Name of the subgroup
  displayOrder: number; // Order within the template
  createdAt: string; // ISO timestamp
  categoryIds?: (string | number)[]; // Category IDs associated with this subgroup
  categories?: TemplateCategory[]; // Full category details (loaded when needed)
};

/**
 * TemplateCategory - Represents a category assigned to a template subgroup
 */
export type TemplateCategory = {
  id: string; // UUID
  templateSubgroupId: string; // FK to template_subgroups
  categoryId: string | number; // FK to categories
  categoryName?: string; // Category name (for easier display)
  orderWithinSubgroup: number; // Order within the subgroup
  createdAt: string; // ISO timestamp
};

/**
 * CreateTemplateRequest - Request payload for creating a new template
 */
export type CreateTemplateRequest = {
  name: string;
  description?: string;
  subgroups: CreateTemplateSubgroupRequest[];
};

/**
 * CreateTemplateSubgroupRequest - Subgroup data for template creation
 */
export type CreateTemplateSubgroupRequest = {
  name: string;
  displayOrder?: number;
  categoryIds?: (string | number)[]; // Category IDs to include in this subgroup
};

/**
 * UpdateTemplateRequest - Request payload for updating a template
 */
export type UpdateTemplateRequest = {
  name?: string;
  description?: string;
};

/**
 * ApplyTemplateRequest - Request payload for applying a template to a simulation
 */
export type ApplyTemplateRequest = {
  templateId: string;
  mode?: "replace"; // Currently only replace mode supported
};

/**
 * TemplateListResponse - API response for listing templates
 */
export type TemplateListResponse = {
  success: boolean;
  templates?: SubgroupTemplate[];
  error?: string;
  statusCode: number;
};

/**
 * TemplateResponse - API response for single template operations
 */
export type TemplateResponse = {
  success: boolean;
  template?: SubgroupTemplate;
  error?: string;
  statusCode: number;
};

/**
 * ApplyTemplateResponse - API response for template application
 */
export type ApplyTemplateResponse = {
  success: boolean;
  message?: string;
  subgroupsCreated?: number;
  categoriesApplied?: number; // Number of category associations created
  categoryMatchResults?: CategoryMatchResult[]; // Detailed match results
  missingCategories?: (string | number)[]; // Categories in template not found in simulation
  error?: string;
  statusCode: number;
};

/**
 * DeleteTemplateResponse - API response for template deletion
 */
export type DeleteTemplateResponse = {
  success: boolean;
  message?: string;
  error?: string;
  statusCode: number;
};

/**
 * AppliedTemplateInfo - Information about the currently applied template
 */
export type AppliedTemplateInfo = {
  templateId: string | null;
  templateName: string | null;
  appliedAt: string | null; // ISO timestamp
};

/**
 * AppliedTemplateResponse - API response for getting applied template info
 */
export type AppliedTemplateResponse = {
  success: boolean;
  appliedTemplate?: AppliedTemplateInfo;
  error?: string;
  statusCode: number;
};

/**
 * SaveAsTemplateRequest - Request payload for saving simulation as template
 */
export type SaveAsTemplateRequest = {
  name: string;
  description?: string;
};

/**
 * RefreshTemplateRequest - Request payload for refreshing a template from a simulation
 */
export type RefreshTemplateRequest = {
  sourceSimulationId: number; // Simulation ID to refresh from
};

/**
 * RefreshTemplateResponse - API response for template refresh
 */
export type RefreshTemplateResponse = {
  success: boolean;
  template?: SubgroupTemplate;
  message?: string;
  categoriesUpdated?: number; // Number of category associations updated
  error?: string;
  statusCode: number;
};

/**
 * CategoryMatchResult - Result of category matching during template application
 */
export type CategoryMatchResult = {
  templateCategoryId: string | number;
  matchedCategoryId: string | number | null; // null if no match found
  matchType: "exact" | "name" | "none"; // How the category was matched
  templateCategoryName?: string; // Category name from template (for reference)
};
