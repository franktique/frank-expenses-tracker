# PaymentMethodSelector Component

A reusable React component for selecting multiple payment methods with support for "All Methods" selection.

## Features

- **Multiple Selection**: Select specific payment methods (cash, credit, debit)
- **All Methods Option**: Special option that clears specific selections to indicate "all methods"
- **TypeScript Support**: Fully typed with proper interfaces
- **Validation**: Built-in validation for payment method values
- **Accessibility**: Proper ARIA labels and keyboard navigation
- **Disabled State**: Support for disabled state
- **Helper Text**: Dynamic helper text showing current selection

## Usage

### Basic Usage

```tsx
import { PaymentMethodSelector } from "@/components/payment-method-selector";

function MyComponent() {
  const [selectedMethods, setSelectedMethods] = useState<string[]>([]);

  return (
    <PaymentMethodSelector
      selectedMethods={selectedMethods}
      onSelectionChange={setSelectedMethods}
    />
  );
}
```

### With Custom Props

```tsx
<PaymentMethodSelector
  selectedMethods={["cash", "credit"]}
  onSelectionChange={handleMethodChange}
  disabled={false}
  label="Métodos de Pago Permitidos"
  className="my-custom-class"
/>
```

## Props

| Prop                | Type                          | Default             | Description                                 |
| ------------------- | ----------------------------- | ------------------- | ------------------------------------------- |
| `selectedMethods`   | `string[]`                    | -                   | Array of currently selected payment methods |
| `onSelectionChange` | `(methods: string[]) => void` | -                   | Callback when selection changes             |
| `disabled`          | `boolean`                     | `false`             | Whether the component is disabled           |
| `label`             | `string`                      | `"Métodos de Pago"` | Label for the component                     |
| `className`         | `string`                      | `""`                | Additional CSS classes                      |

## Types

```typescript
export type PaymentMethod = "cash" | "credit" | "debit";

export interface PaymentMethodSelectorProps {
  selectedMethods: string[];
  onSelectionChange: (methods: string[]) => void;
  disabled?: boolean;
  label?: string;
  className?: string;
}
```

## Constants

```typescript
export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "cash", label: "Efectivo" },
  { value: "credit", label: "Crédito" },
  { value: "debit", label: "Débito" },
];
```

## Behavior

### All Methods Selection

- When `selectedMethods` is empty (`[]`), the "All Methods" option is checked
- Individual payment method checkboxes are disabled when "All Methods" is selected
- Checking "All Methods" calls `onSelectionChange([])` to clear specific selections
- Unchecking "All Methods" calls `onSelectionChange(["cash", "credit", "debit"])` to select all methods

### Individual Method Selection

- Individual methods can be selected/deselected when "All Methods" is not active
- Adding a method: `onSelectionChange([...selectedMethods, newMethod])`
- Removing a method: `onSelectionChange(selectedMethods.filter(m => m !== removedMethod))`
- Duplicate methods are automatically prevented

### Helper Text

The component displays dynamic helper text:

- "Se incluirán gastos de todos los métodos de pago" when all methods are selected
- "Se incluirán gastos de: Efectivo, Crédito" when specific methods are selected

## Testing

The component includes comprehensive unit tests covering:

- Initial rendering with different props
- All methods selection behavior
- Individual method selection/deselection
- Disabled state handling
- Helper text updates
- TypeScript interface validation
- Edge cases and error handling

Run tests with:

```bash
npm test components/__tests__/payment-method-selector.test.tsx
```

## Integration Example

For integration with estudios agrupadores:

```tsx
// In estudios administration form
const [grouperPaymentMethods, setGrouperPaymentMethods] = useState<
  Record<number, string[]>
>({});

const handlePaymentMethodChange = (grouperId: number, methods: string[]) => {
  setGrouperPaymentMethods((prev) => ({
    ...prev,
    [grouperId]: methods,
  }));
};

// For each agrupador
<PaymentMethodSelector
  selectedMethods={grouperPaymentMethods[grouper.id] || []}
  onSelectionChange={(methods) =>
    handlePaymentMethodChange(grouper.id, methods)
  }
  label={`Métodos para ${grouper.name}`}
/>;
```

## Requirements Satisfied

- ✅ **3.1**: Reusable component for selecting multiple payment methods
- ✅ **3.3**: Checkbox interface for cash, credit, and debit options
- ✅ **3.3**: "All Methods" option that clears specific selections
- ✅ **3.1**: Proper TypeScript interfaces and validation
- ✅ **3.3**: Unit tests for component behavior
