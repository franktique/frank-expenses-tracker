"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  CreditCardSelector,
  useCreditCardSelection,
} from "@/components/credit-card-selector";
import { CreditCard } from "@/types/credit-cards";

// Example usage of CreditCardSelector component
export function CreditCardSelectorExample() {
  const [selectedCard, setSelectedCard] = useState<CreditCard | null>(null);
  const [isRequired, setIsRequired] = useState(false);
  const [showNoCardOption, setShowNoCardOption] = useState(true);
  const [customError, setCustomError] = useState<string | null>(null);

  // Example using the hook
  const {
    selectedCreditCard: hookSelectedCard,
    setSelectedCreditCard: setHookSelectedCard,
    creditCards,
    isLoading,
    error: hookError,
    validation,
  } = useCreditCardSelection();

  const handleSubmit = () => {
    if (isRequired && !selectedCard) {
      setCustomError("Debe seleccionar una tarjeta de crédito");
      return;
    }
    setCustomError(null);

    console.log("Selected credit card:", selectedCard);
    alert(
      `Tarjeta seleccionada: ${
        selectedCard
          ? `${selectedCard.bank_name} - ${selectedCard.franchise} ****${selectedCard.last_four_digits}`
          : "Ninguna"
      }`
    );
  };

  const resetSelection = () => {
    setSelectedCard(null);
    setHookSelectedCard(null);
    setCustomError(null);
  };

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Credit Card Selector Example</CardTitle>
          <CardDescription>
            Demonstrates the CreditCardSelector component with different
            configurations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Example */}
          <div className="space-y-2">
            <Label htmlFor="basic-selector">Basic Credit Card Selector</Label>
            <CreditCardSelector
              selectedCreditCard={selectedCard}
              onCreditCardChange={setSelectedCard}
              error={customError}
            />
          </div>

          {/* Configuration Options */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Configuration Options</h3>

            <div className="flex flex-wrap gap-4">
              <Button
                variant={isRequired ? "default" : "outline"}
                size="sm"
                onClick={() => setIsRequired(!isRequired)}
              >
                {isRequired ? "Required: ON" : "Required: OFF"}
              </Button>

              <Button
                variant={showNoCardOption ? "default" : "outline"}
                size="sm"
                onClick={() => setShowNoCardOption(!showNoCardOption)}
              >
                {showNoCardOption
                  ? "No Card Option: ON"
                  : "No Card Option: OFF"}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setCustomError(
                    customError ? null : "Example validation error"
                  )
                }
              >
                {customError ? "Clear Error" : "Show Error"}
              </Button>
            </div>
          </div>

          {/* Configured Example */}
          <div className="space-y-2">
            <Label htmlFor="configured-selector">Configured Selector</Label>
            <CreditCardSelector
              selectedCreditCard={selectedCard}
              onCreditCardChange={setSelectedCard}
              required={isRequired}
              showNoCardOption={showNoCardOption}
              error={customError}
              placeholder="Elegir tarjeta para este ejemplo..."
            />
          </div>

          {/* Hook Example */}
          <div className="space-y-2">
            <Label htmlFor="hook-selector">
              Using Hook (useCreditCardSelection)
            </Label>
            <CreditCardSelector
              selectedCreditCard={hookSelectedCard}
              onCreditCardChange={setHookSelectedCard}
              error={hookError}
            />
            {!validation.isValid && (
              <p className="text-sm text-destructive">{validation.error}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button onClick={handleSubmit}>Submit Form</Button>
            <Button variant="outline" onClick={resetSelection}>
              Reset Selection
            </Button>
          </div>

          {/* Debug Information */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Debug Information</h3>
            <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
              <div>
                <strong>Basic Selector:</strong>{" "}
                {selectedCard
                  ? `${selectedCard.bank_name} - ${selectedCard.franchise} ****${selectedCard.last_four_digits}`
                  : "None selected"}
              </div>
              <div>
                <strong>Hook Selector:</strong>{" "}
                {hookSelectedCard
                  ? `${hookSelectedCard.bank_name} - ${hookSelectedCard.franchise} ****${hookSelectedCard.last_four_digits}`
                  : "None selected"}
              </div>
              <div>
                <strong>Available Cards:</strong> {creditCards.length}
              </div>
              <div>
                <strong>Loading:</strong> {isLoading ? "Yes" : "No"}
              </div>
              <div>
                <strong>Hook Error:</strong> {hookError || "None"}
              </div>
              <div>
                <strong>Custom Error:</strong> {customError || "None"}
              </div>
              <div>
                <strong>Validation:</strong>{" "}
                {validation.isValid ? "Valid" : `Invalid - ${validation.error}`}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usage Examples */}
      <Card>
        <CardHeader>
          <CardTitle>Usage Examples</CardTitle>
          <CardDescription>
            Code examples for different use cases
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Basic Usage</h4>
            <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
              {`<CreditCardSelector
  selectedCreditCard={selectedCard}
  onCreditCardChange={setSelectedCard}
/>`}
            </pre>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Required Selection</h4>
            <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
              {`<CreditCardSelector
  selectedCreditCard={selectedCard}
  onCreditCardChange={setSelectedCard}
  required={true}
  error={validationError}
/>`}
            </pre>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Using Hook</h4>
            <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
              {`const {
  selectedCreditCard,
  setSelectedCreditCard,
  creditCards,
  isLoading,
  error,
  validation,
} = useCreditCardSelection();`}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
