import { Fund, Category } from "@/types/funds";

/**
 * Enhanced fallback logic for categories without specific fund relationships
 */
export class CategoryFundFallback {
  /**
   * Gets available funds for a category with comprehensive fallback logic
   */
  static getAvailableFundsForCategory(
    categoryId: string,
    categories: Category[],
    funds: Fund[]
  ): Fund[] {
    if (!categoryId || !categories || !funds) {
      return funds || [];
    }

    const category = categories.find((cat) => cat.id === categoryId);
    if (!category) {
      return funds || [];
    }

    // Priority 1: Use associated_funds from new relationship system
    if (category.associated_funds && category.associated_funds.length > 0) {
      return category.associated_funds;
    }

    // Priority 2: Use legacy fund_id for backward compatibility
    if (category.fund_id) {
      const fund = funds.find((f) => f.id === category.fund_id);
      if (fund) {
        return [fund];
      }
    }

    // Priority 3: If no specific funds are associated, return all funds
    return funds || [];
  }

  /**
   * Gets default fund for a category with intelligent selection logic
   */
  static getDefaultFundForCategory(
    categoryId: string,
    categories: Category[],
    funds: Fund[],
    currentFilterFund?: Fund | null,
    fundFilter?: string | null,
    configuredDefaultFundId?: string | null
  ): Fund | null {
    const availableFunds = this.getAvailableFundsForCategory(
      categoryId,
      categories,
      funds
    );

    if (availableFunds.length === 0) {
      return null;
    }

    // Priority 1: If current filter fund is available for this category, use it
    if (
      currentFilterFund &&
      availableFunds.some((f) => f.id === currentFilterFund.id)
    ) {
      return currentFilterFund;
    }

    // Priority 2: If fund filter is set and that fund is available, use it
    if (fundFilter && fundFilter !== "all") {
      const filterFund = availableFunds.find((f) => f.id === fundFilter);
      if (filterFund) {
        return filterFund;
      }
    }

    // Priority 3: Use the default fund if available
    const defaultFund = this.getDefaultFund(funds, configuredDefaultFundId);
    if (defaultFund && availableFunds.some((f) => f.id === defaultFund.id)) {
      return defaultFund;
    }

    // Priority 4: Return the first available fund
    return availableFunds[0] || null;
  }

  /**
   * Gets the system default fund
   * @param funds - Available funds
   * @param configuredDefaultFundId - Optional configured default fund ID from settings
   */
  static getDefaultFund(funds: Fund[], configuredDefaultFundId?: string | null): Fund | null {
    if (!funds || funds.length === 0) {
      return null;
    }

    // Priority 1: Use configured default fund if provided and exists
    if (configuredDefaultFundId) {
      const configuredFund = funds.find((fund) => fund.id === configuredDefaultFundId);
      if (configuredFund) {
        return configuredFund;
      }
    }

    // Priority 2: Look for "Disponible" fund (backward compatibility)
    const disponibleFund = funds.find(
      (fund) => fund.name.toLowerCase() === "disponible"
    );
    if (disponibleFund) {
      return disponibleFund;
    }

    // Priority 3: Look for any fund with "disponible" in the name
    const disponibleLikeFund = funds.find((fund) =>
      fund.name.toLowerCase().includes("disponible")
    );
    if (disponibleLikeFund) {
      return disponibleLikeFund;
    }

    // Priority 4: Look for "default" fund
    const defaultFund = funds.find((fund) =>
      fund.name.toLowerCase().includes("default")
    );
    if (defaultFund) {
      return defaultFund;
    }

    // Priority 5: Return the first fund as last resort
    return funds[0] || null;
  }

  /**
   * Validates if a fund is valid for a category
   */
  static isFundValidForCategory(
    fundId: string,
    categoryId: string,
    categories: Category[],
    funds: Fund[]
  ): boolean {
    const availableFunds = this.getAvailableFundsForCategory(
      categoryId,
      categories,
      funds
    );
    return availableFunds.some((fund) => fund.id === fundId);
  }

  /**
   * Gets filtered categories based on selected fund with fallback logic
   */
  static getFilteredCategories(
    categories: Category[],
    fundFilter: Fund | null
  ): Category[] {
    if (!categories) {
      return [];
    }

    if (!fundFilter) {
      return categories;
    }

    return categories.filter((category) => {
      // Check if the fund is in the category's associated_funds
      if (category.associated_funds && category.associated_funds.length > 0) {
        return category.associated_funds.some(
          (fund: Fund) => fund.id === fundFilter.id
        );
      }

      // Fallback to old fund_id for backward compatibility
      if (category.fund_id) {
        return category.fund_id === fundFilter.id;
      }

      // If category has no specific fund relationships, it accepts all funds
      return true;
    });
  }

  /**
   * Checks if a category has specific fund restrictions
   */
  static categoryHasFundRestrictions(
    categoryId: string,
    categories: Category[]
  ): boolean {
    const category = categories.find((cat) => cat.id === categoryId);
    if (!category) {
      return false;
    }

    // Check if category has associated_funds
    if (category.associated_funds && category.associated_funds.length > 0) {
      return true;
    }

    // Check if category has legacy fund_id
    if (category.fund_id) {
      return true;
    }

    return false;
  }

  /**
   * Gets fund selection priority explanation for UI
   */
  static getFundSelectionExplanation(
    categoryId: string,
    categories: Category[],
    funds: Fund[],
    selectedFund: Fund | null
  ): {
    hasRestrictions: boolean;
    availableFunds: Fund[];
    selectedFundReason: string;
    message: string;
  } {
    const category = categories.find((cat) => cat.id === categoryId);
    const availableFunds = this.getAvailableFundsForCategory(
      categoryId,
      categories,
      funds
    );
    const hasRestrictions = this.categoryHasFundRestrictions(
      categoryId,
      categories
    );

    let selectedFundReason = "";
    let message = "";

    if (!category) {
      return {
        hasRestrictions: false,
        availableFunds: [],
        selectedFundReason: "Category not found",
        message: "La categoría no fue encontrada",
      };
    }

    if (hasRestrictions) {
      message = `La categoría "${
        category.name
      }" está asociada con fondos específicos: ${availableFunds
        .map((f) => f.name)
        .join(", ")}`;

      if (selectedFund) {
        if (availableFunds.some((f) => f.id === selectedFund.id)) {
          selectedFundReason = "Fund is allowed for this category";
        } else {
          selectedFundReason = "Fund is not allowed for this category";
        }
      }
    } else {
      message = `La categoría "${category.name}" no tiene fondos específicos asociados, por lo que acepta gastos desde cualquier fondo`;
      selectedFundReason = "Category accepts all funds";
    }

    return {
      hasRestrictions,
      availableFunds,
      selectedFundReason,
      message,
    };
  }

  /**
   * Migrates a category from legacy single fund to new multi-fund system
   */
  static prepareCategoryForMultiFund(category: Category): {
    needsMigration: boolean;
    suggestedFundIds: string[];
    warnings: string[];
  } {
    const warnings: string[] = [];
    let needsMigration = false;
    let suggestedFundIds: string[] = [];

    // Check if category has legacy fund_id but no associated_funds
    if (
      category.fund_id &&
      (!category.associated_funds || category.associated_funds.length === 0)
    ) {
      needsMigration = true;
      suggestedFundIds = [category.fund_id];
      warnings.push(
        `Category "${category.name}" has legacy fund_id but no associated_funds. Consider migrating to multi-fund system.`
      );
    }

    // Check if category has both fund_id and associated_funds (potential conflict)
    if (
      category.fund_id &&
      category.associated_funds &&
      category.associated_funds.length > 0
    ) {
      const hasMatchingFund = category.associated_funds.some(
        (fund) => fund.id === category.fund_id
      );

      if (!hasMatchingFund) {
        warnings.push(
          `Category "${category.name}" has conflicting fund relationships. Legacy fund_id does not match associated_funds.`
        );
      }
    }

    return {
      needsMigration,
      suggestedFundIds,
      warnings,
    };
  }
}
