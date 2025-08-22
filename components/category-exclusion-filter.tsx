"use client";

import { useState } from "react";
import {
  Check,
  ChevronDown,
  Filter,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface Category {
  id: string;
  name: string;
}

interface CategoryExclusionFilterProps {
  categories: Category[];
  excludedCategories: string[];
  onExclusionChange: (excluded: string[]) => void;
  className?: string;
}

export function CategoryExclusionFilter({
  categories,
  excludedCategories,
  onExclusionChange,
  className,
}: CategoryExclusionFilterProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Sort categories alphabetically by name
  const sortedCategories = [...categories].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  // Check if all categories are excluded
  const isAllExcluded = excludedCategories.length === categories.length;

  // Check if some (but not all) categories are excluded
  const isIndeterminate = excludedCategories.length > 0 && !isAllExcluded;

  // Handle "Exclude All" toggle
  const handleExcludeAll = () => {
    if (isAllExcluded) {
      // Include all (exclude none)
      onExclusionChange([]);
    } else {
      // Exclude all
      onExclusionChange(categories.map((c) => c.id));
    }
  };

  // Handle individual category exclusion
  const handleCategoryToggle = (categoryId: string) => {
    const isExcluded = excludedCategories.includes(categoryId);

    if (isExcluded) {
      // Include this category (remove from exclusion)
      onExclusionChange(excludedCategories.filter((id) => id !== categoryId));
    } else {
      // Exclude this category (add to exclusion)
      onExclusionChange([...excludedCategories, categoryId]);
    }
  };

  // Clear all exclusions
  const handleClearAll = () => {
    onExclusionChange([]);
  };

  // Get display text for the trigger button
  const getDisplayText = () => {
    if (excludedCategories.length === 0) {
      return "Excluir categorías";
    }

    if (isAllExcluded) {
      return "Todas excluidas";
    }

    if (excludedCategories.length === 1) {
      const excludedCategory = categories.find(
        (c) => c.id === excludedCategories[0]
      );
      return `Excluida: ${excludedCategory?.name || "1 categoría"}`;
    }

    return `${excludedCategories.length} excluidas`;
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={isOpen}
          className={cn(
            "w-[250px] justify-between",
            excludedCategories.length > 0 && "border-orange-300 bg-orange-50",
            className
          )}
        >
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <span className="truncate">{getDisplayText()}</span>
          </div>
          <div className="flex items-center gap-1">
            {excludedCategories.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 hover:bg-orange-200"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClearAll();
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[250px] p-0" align="start">
        <div className="p-2">
          {/* Header */}
          <div className="px-2 py-2 text-sm font-medium text-muted-foreground border-b">
            Excluir del cálculo de overspend
          </div>

          {/* Exclude All option */}
          <div className="flex items-center space-x-2 px-2 py-2 hover:bg-accent hover:text-accent-foreground rounded-sm cursor-pointer">
            <Checkbox
              id="exclude-all"
              checked={isAllExcluded}
              ref={(ref) => {
                if (ref) {
                  ref.indeterminate = isIndeterminate;
                }
              }}
              onCheckedChange={handleExcludeAll}
            />
            <label
              htmlFor="exclude-all"
              className="text-sm font-medium cursor-pointer flex-1"
            >
              Excluir todas
            </label>
          </div>

          {/* Separator */}
          <div className="h-px bg-border my-1" />

          {/* Individual category options */}
          <div className="max-h-[300px] overflow-y-auto">
            {sortedCategories.length === 0 ? (
              <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                No hay categorías disponibles
              </div>
            ) : (
              sortedCategories.map((category) => {
                const isExcluded = excludedCategories.includes(category.id);

                return (
                  <div
                    key={category.id}
                    className="flex items-center space-x-2 px-2 py-2 hover:bg-accent hover:text-accent-foreground rounded-sm cursor-pointer"
                    onClick={() => handleCategoryToggle(category.id)}
                  >
                    <Checkbox
                      id={`category-${category.id}`}
                      checked={isExcluded}
                      onCheckedChange={() => handleCategoryToggle(category.id)}
                    />
                    <label
                      htmlFor={`category-${category.id}`}
                      className="text-sm cursor-pointer flex-1 truncate"
                      title={category.name}
                    >
                      {category.name}
                    </label>
                    {isExcluded && <Check className="h-4 w-4 text-orange-600" />}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer with exclusion count */}
          {sortedCategories.length > 0 && (
            <>
              <div className="h-px bg-border my-1" />
              <div className="px-2 py-1 text-xs text-muted-foreground">
                {excludedCategories.length} de {categories.length} excluidas
              </div>
              {excludedCategories.length > 0 && (
                <div className="px-2 py-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearAll}
                    className="h-6 w-full text-xs"
                  >
                    Incluir todas
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}