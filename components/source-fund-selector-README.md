# SourceFundSelector Component

The `SourceFundSelector` component provides a dropdown interface for selecting source funds when creating or editing expenses. It integrates with the category-fund relationship system to show only funds that are associated with the selected category.

## Features

- **Category-based Fund Filtering**: Only shows funds that are related to the selected category
- **Auto-selection Logic**: Automatically selects the fund when a category has only one related fund
- **Smart Defaults**: Uses the current fund filter as default when it's related to the selected category
- **Validation**: Provides real-time validation with error messages
- **Loading States**: Shows appropriate loading indicators during data fetching
- **Error Handling**: Displays user-friendly error messages for various failure scenarios

## Usage

### Basic Usage

```tsx
import { SourceFundSelector } from "@/components/source-fund-selector";

function ExpenseForm() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sourceFund, setSourceFund] = useState<Fund | null>(null);

  return (
    <SourceFundSelector
      selectedCategoryId={selectedCategory}
      selectedSourceFund={sourceFund}
      onSourceFundChange={setSourceFund}
    />
  );
}
```

### With Fund Filter Integration

```tsx
import { SourceFundSelector } from "@/components/source-fund-selector";
import { useBudget } from "@/context/budget-context";

function ExpenseForm() {
  const { selectedFund } = useBudget(); // Current fund filter
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sourceFund, setSourceFund] = useState<Fund | null>(null);

  return (
    <SourceFundSelector
      selectedCategoryId={selectedCategory}
      selectedSourceFund={sourceFund}
      onSourceFundChange={setSourceFund}
      currentFundFilter={selectedFund}
    />
  );
}
```

### With Validation

```tsx
import {
  SourceFundSelector,
  validateSourceFund,
} from "@/components/source-fund-selector";

function ExpenseForm() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sourceFund, setSourceFund] = useState<Fund | null>(null);
  const [categoryFunds, setCategoryFunds] = useState<Fund[]>([]);

  const validation = validateSourceFund(sourceFund, categoryFunds, true);

  return (
    <SourceFundSelector
      selectedCategoryId={selectedCategory}
      selectedSourceFund={sourceFund}
      onSourceFundChange={setSourceFund}
      error={validation.isValid ? undefined : validation.error}
    />
  );
}
```

## Props

| Prop                 | Type                           | Default                         | Description                                 |
| -------------------- | ------------------------------ | ------------------------------- | ------------------------------------------- |
| `selectedCategoryId` | `string \| null`               | -                               | ID of the currently selected category       |
| `selectedSourceFund` | `Fund \| null`                 | -                               | Currently selected source fund              |
| `onSourceFundChange` | `(fund: Fund \| null) => void` | -                               | Callback when source fund selection changes |
| `placeholder`        | `string`                       | `"Seleccionar fondo origen..."` | Placeholder text for the dropdown           |
| `className`          | `string`                       | -                               | Additional CSS classes                      |
| `disabled`           | `boolean`                      | `false`                         | Whether the selector is disabled            |
| `currentFundFilter`  | `Fund \| null`                 | -                               | Current fund filter for smart defaults      |
| `required`           | `boolean`                      | `true`                          | Whether source fund selection is required   |
| `error`              | `string`                       | -                               | Error message to display                    |

## Behavior

### Auto-selection Logic

1. **Single Fund**: When a category has only one related fund, it's automatically selected
2. **Smart Default**: When multiple funds are available and a fund filter is active, the filter fund is selected if it's related to the category
3. **Manual Selection**: When multiple funds are available and no smart default applies, user must manually select

### Validation

The component validates that:

- A source fund is selected when required
- The selected source fund is actually related to the current category
- The category has associated funds before allowing selection

### Error States

- **No Category Selected**: Dropdown is disabled with appropriate message
- **No Funds for Category**: Shows warning that category needs fund relationships configured
- **API Errors**: Displays error messages for network or server failures
- **Validation Errors**: Shows specific validation error messages

## Utility Functions

### `validateSourceFund(selectedSourceFund, categoryFunds, required)`

Validates source fund selection against category funds.

**Parameters:**

- `selectedSourceFund`: Currently selected fund
- `categoryFunds`: Array of funds related to the category
- `required`: Whether selection is required

**Returns:**

```tsx
{
  isValid: boolean;
  error?: string;
}
```

### `useSourceFundSelection(categoryId, currentFundFilter)`

Hook for managing source fund selection state with automatic category fund fetching.

**Parameters:**

- `categoryId`: ID of the selected category
- `currentFundFilter`: Current fund filter for smart defaults

**Returns:**

```tsx
{
  selectedSourceFund: Fund | null;
  setSelectedSourceFund: (fund: Fund | null) => void;
  categoryFunds: Fund[];
  isLoading: boolean;
  error: string | null;
  validation: { isValid: boolean; error?: string };
}
```

## Integration with Requirements

This component fulfills the following requirements from the expense-source-fund-management spec:

- **Requirement 1.1**: Displays source fund dropdown with funds related to selected category
- **Requirement 1.2**: Disables dropdown when no category is selected
- **Requirement 1.3**: Populates dropdown with all related funds for multi-fund categories
- **Requirement 1.4**: Auto-selects fund when category has only one related fund
- **Requirement 4.3**: Integrates with existing fund filter for smart defaults

## Testing

The component includes comprehensive tests covering:

- Rendering in different states (loading, error, disabled)
- Category fund fetching and display
- Auto-selection logic
- Smart default behavior with fund filter
- Validation error display
- User interaction (dropdown opening, selection)

Run tests with:

```bash
npm test -- source-fund-selector.test.tsx
```
