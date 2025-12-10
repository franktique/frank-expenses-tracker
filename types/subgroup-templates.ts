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
