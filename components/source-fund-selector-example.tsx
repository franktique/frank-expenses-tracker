'use client';

import { useState } from 'react';
import { SourceFundSelector, validateSourceFund } from './source-fund-selector';
import { useBudget } from '@/context/budget-context';
import { Fund } from '@/types/funds';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertCircle } from 'lucide-react';

export function SourceFundSelectorExample() {
  const { categories, selectedFund } = useBudget();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null
  );
  const [selectedSourceFund, setSelectedSourceFund] = useState<Fund | null>(
    null
  );
  const [categoryFunds, setCategoryFunds] = useState<Fund[]>([]);

  // Get validation result
  const validation = validateSourceFund(
    selectedSourceFund,
    categoryFunds,
    true
  );

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    setSelectedSourceFund(null); // Reset source fund when category changes
  };

  const handleSubmit = () => {
    if (validation.isValid && selectedSourceFund) {
      alert(
        `Selected source fund: ${selectedSourceFund.name} for category: ${
          categories?.find((c) => c.id === selectedCategoryId)?.name ||
          'Unknown'
        }`
      );
    }
  };

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle>Source Fund Selector Example</CardTitle>
        <CardDescription>
          Demonstrates the SourceFundSelector component with category
          integration
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Category Selection */}
        <div className="space-y-2">
          <Label htmlFor="category-select">Categoría</Label>
          <Select
            value={selectedCategoryId || ''}
            onValueChange={handleCategoryChange}
          >
            <SelectTrigger id="category-select">
              <SelectValue placeholder="Seleccionar categoría..." />
            </SelectTrigger>
            <SelectContent>
              {categories?.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Source Fund Selection */}
        <div className="space-y-2">
          <Label htmlFor="source-fund-select">Fondo Origen</Label>
          <SourceFundSelector
            selectedCategoryId={selectedCategoryId}
            selectedSourceFund={selectedSourceFund}
            onSourceFundChange={setSelectedSourceFund}
            currentFundFilter={selectedFund}
            error={validation.isValid ? undefined : validation.error}
          />
        </div>

        {/* Current Fund Filter Info */}
        {selectedFund && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Filtro actual: {selectedFund.name}
              {selectedSourceFund?.id === selectedFund.id &&
                ' (seleccionado como origen)'}
            </AlertDescription>
          </Alert>
        )}

        {/* Validation Status */}
        {selectedCategoryId && (
          <Alert variant={validation.isValid ? 'default' : 'destructive'}>
            {validation.isValid ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <AlertDescription>
              {validation.isValid
                ? `Fondo origen válido: ${
                    selectedSourceFund?.name || 'Ninguno'
                  }`
                : validation.error}
            </AlertDescription>
          </Alert>
        )}

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={!validation.isValid}
          className="w-full"
        >
          Crear Gasto
        </Button>

        {/* Debug Info */}
        <div className="space-y-1 text-xs text-muted-foreground">
          <div>Categoría seleccionada: {selectedCategoryId || 'Ninguna'}</div>
          <div>Fondo origen: {selectedSourceFund?.name || 'Ninguno'}</div>
          <div>Filtro actual: {selectedFund?.name || 'Ninguno'}</div>
          <div>Estado: {validation.isValid ? 'Válido' : 'Inválido'}</div>
        </div>
      </CardContent>
    </Card>
  );
}

// Usage example in a form context
export function ExpenseFormWithSourceFund() {
  const { categories, selectedFund } = useBudget();
  const [formData, setFormData] = useState({
    categoryId: '',
    sourceFund: null as Fund | null,
    amount: 0,
    description: '',
  });

  const validation = validateSourceFund(
    formData.sourceFund,
    [], // This would be populated from the category funds API
    true
  );

  const handleSourceFundChange = (fund: Fund | null) => {
    setFormData((prev) => ({ ...prev, sourceFund: fund }));
  };

  const handleCategoryChange = (categoryId: string) => {
    setFormData((prev) => ({
      ...prev,
      categoryId,
      sourceFund: null, // Reset source fund when category changes
    }));
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Categoría</Label>
        <Select
          value={formData.categoryId}
          onValueChange={handleCategoryChange}
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar categoría..." />
          </SelectTrigger>
          <SelectContent>
            {categories?.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Fondo Origen</Label>
        <SourceFundSelector
          selectedCategoryId={formData.categoryId || null}
          selectedSourceFund={formData.sourceFund}
          onSourceFundChange={handleSourceFundChange}
          currentFundFilter={selectedFund}
          error={validation.isValid ? undefined : validation.error}
        />
      </div>

      <Button disabled={!validation.isValid}>Guardar Gasto</Button>
    </div>
  );
}
