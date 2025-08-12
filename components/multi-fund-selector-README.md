# MultiFundSelector Component

A reusable multi-select component for fund selection with search functionality, visual indicators, and validation.

## Features

- ✅ Multi-select fund selection with badges
- ✅ Search/filter functionality for large fund lists
- ✅ Visual indicators for selected funds (badges with remove buttons)
- ✅ Maximum selection limit support
- ✅ TypeScript interfaces and props validation
- ✅ Loading and error states
- ✅ Disabled state support
- ✅ Accessibility compliant
- ✅ Custom hook for state management

## Basic Usage

```tsx
import { MultiFundSelector } from "@/components/multi-fund-selector";
import { Fund } from "@/types/funds";

function MyComponent() {
  const [selectedFunds, setSelectedFunds] = useState<Fund[]>([]);

  return (
    <MultiFundSelector
      selectedFunds={selectedFunds}
      onFundsChange={setSelectedFunds}
      placeholder="Seleccionar fondos..."
    />
  );
}
```

## Props

| Prop             | Type                      | Default                   | Description                                                      |
| ---------------- | ------------------------- | ------------------------- | ---------------------------------------------------------------- |
| `selectedFunds`  | `Fund[]`                  | -                         | Array of currently selected funds                                |
| `onFundsChange`  | `(funds: Fund[]) => void` | -                         | Callback when selection changes                                  |
| `availableFunds` | `Fund[]`                  | `undefined`               | Optional array of available funds (uses context if not provided) |
| `placeholder`    | `string`                  | `"Seleccionar fondos..."` | Placeholder text for the selector                                |
| `className`      | `string`                  | `undefined`               | Additional CSS classes                                           |
| `disabled`       | `boolean`                 | `false`                   | Whether the selector is disabled                                 |
| `maxSelection`   | `number`                  | `undefined`               | Maximum number of funds that can be selected                     |

## Advanced Usage with Hook

```tsx
import { useMultiFundSelection } from "@/components/multi-fund-selector";

function MyComponent() {
  const {
    selectedFunds,
    setSelectedFunds,
    addFund,
    removeFund,
    clearSelection,
    summary,
    validation,
  } = useMultiFundSelection([], undefined, 3); // max 3 funds

  return (
    <div>
      <MultiFundSelector
        selectedFunds={selectedFunds}
        onFundsChange={setSelectedFunds}
        maxSelection={3}
      />

      <p>Summary: {summary}</p>

      {!validation.isValid && (
        <div className="text-red-500">{validation.errors.join(", ")}</div>
      )}

      <button onClick={clearSelection}>Clear All</button>
    </div>
  );
}
```

## Utility Functions

### `validateFundSelection(selectedFunds, availableFunds, maxSelection?)`

Validates a fund selection against available funds and maximum selection limit.

```tsx
const validation = validateFundSelection(selectedFunds, availableFunds, 3);
if (!validation.isValid) {
  console.log("Errors:", validation.errors);
}
```

### `getFundSelectionSummary(selectedFunds)`

Returns a human-readable summary of the selected funds.

```tsx
const summary = getFundSelectionSummary(selectedFunds);
// Returns: "Fondo Principal" (1 fund)
// Returns: "Fondo Principal, Fondo Emergencia" (2 funds)
// Returns: "Fondo Principal, Fondo Emergencia y 2 más" (4+ funds)
```

## Styling

The component uses Tailwind CSS classes and follows the existing design system. Key styling features:

- Responsive design with proper mobile support
- Dark/light theme compatibility
- Focus states for accessibility
- Hover effects for interactive elements
- Proper spacing and typography

## Accessibility

- Full keyboard navigation support
- Screen reader compatible
- ARIA labels and roles
- Focus management
- High contrast support

## Testing

The component includes comprehensive tests covering:

- Basic rendering and interaction
- Multi-selection functionality
- Search/filter behavior
- Maximum selection limits
- Validation logic
- Utility functions

Run tests with:

```bash
npm test -- --testPathPatterns=multi-fund-selector.test.tsx
```

## Requirements Fulfilled

This component fulfills the following task requirements:

- ✅ **Reusable multi-select component**: Can be used across different parts of the application
- ✅ **Proper TypeScript interfaces**: Full type safety with `MultiFundSelectorProps` interface
- ✅ **Props validation**: TypeScript ensures proper prop types at compile time
- ✅ **Search/filter functionality**: Built-in search with real-time filtering
- ✅ **Visual indicators for selected funds**: Badge components with remove buttons
- ✅ **Requirements 1.1, 5.3**: Supports multiple fund selection and clear visual indicators

## Integration

This component integrates with:

- `@/context/budget-context` for fund data
- `@/types/funds` for type definitions
- `@/components/ui/*` for consistent UI components
- Existing design system and styling patterns
