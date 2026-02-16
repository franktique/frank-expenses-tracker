'use client';

import { useState, useEffect } from 'react';
import { Check, ChevronDown, Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

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
  const [tempExcludedCategories, setTempExcludedCategories] =
    useState<string[]>(excludedCategories);

  // Sync temp state with actual excluded categories when popover opens
  useEffect(() => {
    if (isOpen) {
      setTempExcludedCategories(excludedCategories);
    }
  }, [isOpen, excludedCategories]);

  // Sort categories alphabetically by name
  const sortedCategories = [...categories].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  // Check if all categories are excluded (in temp state)
  const isAllExcluded = tempExcludedCategories.length === categories.length;

  // Check if some (but not all) categories are excluded (in temp state)
  const isIndeterminate = tempExcludedCategories.length > 0 && !isAllExcluded;

  // Check if there are unsaved changes
  const hasChanges =
    JSON.stringify(tempExcludedCategories.sort()) !==
    JSON.stringify(excludedCategories.sort());

  // Handle "Exclude All" toggle
  const handleExcludeAll = () => {
    if (isAllExcluded) {
      // Include all (exclude none)
      setTempExcludedCategories([]);
    } else {
      // Exclude all
      setTempExcludedCategories(categories.map((c) => c.id));
    }
  };

  // Handle individual category exclusion (update temp state only)
  const handleCategoryToggle = (categoryId: string) => {
    const isExcluded = tempExcludedCategories.includes(categoryId);

    if (isExcluded) {
      // Include this category (remove from exclusion)
      setTempExcludedCategories(
        tempExcludedCategories.filter((id) => id !== categoryId)
      );
    } else {
      // Exclude this category (add to exclusion)
      setTempExcludedCategories([...tempExcludedCategories, categoryId]);
    }
  };

  // Apply changes and close popover
  const handleApply = () => {
    onExclusionChange(tempExcludedCategories);
    setIsOpen(false);
  };

  // Clear all exclusions (in temp state)
  const handleClearAll = () => {
    setTempExcludedCategories([]);
  };

  // Cancel and revert temp state
  const handleCancel = () => {
    setTempExcludedCategories(excludedCategories);
    setIsOpen(false);
  };

  // Get display text for the trigger button
  const getDisplayText = () => {
    if (excludedCategories.length === 0) {
      return 'Excluir categorías';
    }

    if (isAllExcluded) {
      return 'Todas excluidas';
    }

    if (excludedCategories.length === 1) {
      const excludedCategory = categories.find(
        (c) => c.id === excludedCategories[0]
      );
      return `Excluida: ${excludedCategory?.name || '1 categoría'}`;
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
            'w-[250px] justify-between',
            excludedCategories.length > 0 &&
              'border-orange-300 bg-orange-50 text-orange-900 hover:bg-orange-100 hover:text-orange-900',
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
          <div className="border-b px-2 py-2 text-sm font-medium text-muted-foreground">
            Excluir del cálculo de overspend
          </div>

          {/* Exclude All option */}
          <div className="flex cursor-pointer items-center space-x-2 rounded-sm px-2 py-2 hover:bg-accent hover:text-accent-foreground">
            <Checkbox
              id="exclude-all"
              checked={isAllExcluded}
              ref={(ref) => {
                if (ref) {
                  (ref as any).indeterminate = isIndeterminate;
                }
              }}
              onCheckedChange={handleExcludeAll}
            />
            <label
              htmlFor="exclude-all"
              className="flex-1 cursor-pointer text-sm font-medium"
            >
              Excluir todas
            </label>
          </div>

          {/* Separator */}
          <div className="my-1 h-px bg-border" />

          {/* Individual category options */}
          <div className="max-h-[300px] overflow-y-auto">
            {sortedCategories.length === 0 ? (
              <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                No hay categorías disponibles
              </div>
            ) : (
              sortedCategories.map((category) => {
                const isExcluded = tempExcludedCategories.includes(category.id);

                return (
                  <div
                    key={category.id}
                    className="flex cursor-pointer items-center space-x-2 rounded-sm px-2 py-2 hover:bg-accent hover:text-accent-foreground"
                    onClick={() => handleCategoryToggle(category.id)}
                  >
                    <Checkbox
                      id={`category-${category.id}`}
                      checked={isExcluded}
                      onCheckedChange={() => handleCategoryToggle(category.id)}
                    />
                    <label
                      htmlFor={`category-${category.id}`}
                      className="flex-1 cursor-pointer truncate text-sm"
                      title={category.name}
                    >
                      {category.name}
                    </label>
                    {isExcluded && (
                      <Check className="h-4 w-4 text-orange-600" />
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer with exclusion count and action buttons */}
          {sortedCategories.length > 0 && (
            <>
              <div className="my-1 h-px bg-border" />
              <div className="px-2 py-1 text-xs text-muted-foreground">
                {tempExcludedCategories.length} de {categories.length} excluidas
              </div>
              {tempExcludedCategories.length > 0 && (
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
              {/* Action buttons */}
              <div className="my-1 h-px bg-border" />
              <div className="flex gap-2 px-2 py-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  className="h-7 flex-1 text-xs"
                >
                  Cancelar
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleApply}
                  disabled={!hasChanges}
                  className="h-7 flex-1 text-xs"
                >
                  Aplicar
                </Button>
              </div>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
