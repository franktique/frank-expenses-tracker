// Type definitions for the enhanced batch category API

export interface BatchCategoryRequest {
  // For backward compatibility - single category
  categoryId?: string;
  // For batch operations - multiple categories
  categoryIds?: string[];
}

export interface BatchCategoryResponse {
  added: number;
  skipped: number;
  errors: string[];
  addedCategories: AddedCategory[];
}

export interface AddedCategory {
  id: string;
  name: string;
  grouper_id: number;
  category_id: string;
}

// Legacy single category response (for backward compatibility)
export interface SingleCategoryResponse {
  id?: string;
  name?: string;
  grouper_id?: number;
  category_id?: string;
  error?: string;
}
