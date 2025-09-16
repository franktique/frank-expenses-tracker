# CreditCardSelector Component

A reusable React component for selecting credit cards in forms. This component provides a dropdown interface for users to select from their registered credit cards or choose no card.

## Features

- **Dropdown Selection**: Uses Radix UI Command component for accessible dropdown selection
- **Search Functionality**: Built-in search to filter credit cards by bank name or franchise
- **Optional Selection**: Includes "No card selected" option for optional credit card association
- **Loading States**: Shows loading spinner while fetching credit cards
- **Error Handling**: Displays error messages for network failures or validation errors
- **Responsive Design**: Works on both desktop and mobile devices
- **Accessibility**: Full keyboard navigation and screen reader support

## Props

```typescript
interface CreditCardSelectorProps {
  selectedCreditCard: CreditCard | null;
  onCreditCardChange: (creditCard: CreditCard | null) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  showNoCardOption?: boolean;
}
```

### Prop Details

- `selectedCreditCard`: Currently selected credit card object or null
- `onCreditCardChange`: Callback function called when selection changes
- `placeholder`: Placeholder text when no card is selected (default: "Seleccionar tarjeta de crédito...")
- `className`: Additional CSS classes to apply to the component
- `disabled`: Whether the selector is disabled
- `required`: Whether a credit card selection is required
- `error`: Error message to display below the selector
- `showNoCardOption`: Whether to show the "No card selected" option (default: true)

## Usage Examples

### Basic Usage

```tsx
import { CreditCardSelector } from "@/components/credit-card-selector";
import { CreditCard } from "@/types/credit-cards";

function ExpenseForm() {
  const [selectedCard, setSelectedCard] = useState<CreditCard | null>(null);

  return (
    <CreditCardSelector
      selectedCreditCard={selectedCard}
      onCreditCardChange={setSelectedCard}
    />
  );
}
```

### Required Selection

```tsx
<CreditCardSelector
  selectedCreditCard={selectedCard}
  onCreditCardChange={setSelectedCard}
  required={true}
  error={validationError}
/>
```

### Custom Placeholder

```tsx
<CreditCardSelector
  selectedCreditCard={selectedCard}
  onCreditCardChange={setSelectedCard}
  placeholder="Elegir tarjeta para este gasto..."
/>
```

### Without "No Card" Option

```tsx
<CreditCardSelector
  selectedCreditCard={selectedCard}
  onCreditCardChange={setSelectedCard}
  showNoCardOption={false}
  required={true}
/>
```

### With Form Integration

```tsx
import { useForm } from "react-hook-form";
import { CreditCardSelector } from "@/components/credit-card-selector";

function ExpenseForm() {
  const { control, watch, setValue } = useForm();
  const selectedCard = watch("creditCard");

  return (
    <div className="space-y-4">
      <CreditCardSelector
        selectedCreditCard={selectedCard}
        onCreditCardChange={(card) => setValue("creditCard", card)}
        placeholder="Seleccionar tarjeta (opcional)"
      />
    </div>
  );
}
```

## Display Format

Credit cards are displayed in the format: `Bank - Franchise ****1234`

Examples:

- `Banco de Bogotá - Visa ****1234`
- `Bancolombia - Mastercard ****5678`
- `BBVA - American Express ****9012`

## Validation

The component includes a validation utility function:

```typescript
import { validateCreditCard } from "@/components/credit-card-selector";

const validation = validateCreditCard(selectedCard, required);
if (!validation.isValid) {
  console.log(validation.error);
}
```

## Hook Usage

For more complex scenarios, use the provided hook:

```typescript
import { useCreditCardSelection } from "@/components/credit-card-selector";

function MyComponent() {
  const {
    selectedCreditCard,
    setSelectedCreditCard,
    creditCards,
    isLoading,
    error,
    validation,
  } = useCreditCardSelection();

  return (
    <CreditCardSelector
      selectedCreditCard={selectedCreditCard}
      onCreditCardChange={setSelectedCreditCard}
      error={error}
    />
  );
}
```

## Error States

The component handles several error states:

1. **Network Error**: When the API call to fetch credit cards fails
2. **Validation Error**: When a required selection is missing
3. **No Cards Available**: When no credit cards are registered

## Loading States

- Shows a loading spinner and "Cargando tarjetas..." text while fetching data
- Disables the dropdown during loading to prevent interaction

## Accessibility

- Full keyboard navigation support
- Screen reader compatible with proper ARIA labels
- Focus management for dropdown interactions
- High contrast support for error states

## Dependencies

- `@radix-ui/react-command` - For the dropdown command interface
- `@radix-ui/react-popover` - For the dropdown popover
- `lucide-react` - For icons (CreditCard, Check, etc.)
- Custom UI components from `@/components/ui/`

## Styling

The component uses Tailwind CSS classes and follows the application's design system. It supports:

- Light and dark themes
- Responsive design
- Error state styling (red borders/text)
- Required field styling (amber borders/text)
- Disabled state styling

## Integration Notes

- Automatically fetches credit cards from `/api/credit-cards` endpoint
- Expects the API to return data in the format: `{ credit_cards: CreditCard[] }`
- Works seamlessly with React Hook Form and other form libraries
- Can be used in any form where credit card selection is needed
