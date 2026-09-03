import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExpenseScanDialog } from '../scan-receipt-dialog';

// jsdom has neither URL.createObjectURL nor canvas APIs.
if (typeof URL.createObjectURL !== 'function') {
  Object.defineProperty(URL, 'createObjectURL', {
    writable: true,
    value: jest.fn(() => 'blob:mock'),
  });
}
if (typeof URL.revokeObjectURL !== 'function') {
  Object.defineProperty(URL, 'revokeObjectURL', {
    writable: true,
    value: jest.fn(),
  });
}

const mockToast = jest.fn();
jest.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

// Keep the pure helpers real, mock only the canvas pipeline.
jest.mock('@/lib/receipt-image', () => ({
  ...jest.requireActual('@/lib/receipt-image'),
  prepareReceiptImage: jest.fn(),
}));

jest.mock('@/components/ui/calendar', () => ({
  Calendar: () => <div data-testid="calendar" />,
}));

jest.mock('@/components/credit-card-selector', () => ({
  CreditCardSelector: () => <div data-testid="credit-card-selector" />,
}));

let mockBudgetContext: Record<string, unknown> = {};
jest.mock('@/context/budget-context', () => ({
  useBudget: () => mockBudgetContext,
}));

const renderDialog = () =>
  render(<ExpenseScanDialog open onOpenChange={jest.fn()} />);

const getComponentEl = (componentId: string) =>
  document.querySelector(`[data-component-id="${componentId}"]`) as HTMLElement;

const mockContext = () => ({
  categories: [
    { id: 'cat-1', name: 'Mercado' },
    { id: 'cat-2', name: 'Transporte' },
  ],
  activePeriod: { id: 'period-1', name: 'Septiembre 2026' },
  // The dialog reads expense.id after creation: resolve with an id.
  addExpense: jest.fn().mockResolvedValue({ id: 'expense-1' }),
  creditCards: [
    {
      id: 'card-1',
      bank_name: 'Bancolombia',
      franchise: 'VISA',
      last_four_digits: '4321',
      is_active: true,
    },
  ],
});

describe('ExpenseScanDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBudgetContext = mockContext();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ok: true, result: {} }),
    });
  });

  describe('upload stage', () => {
    it('renders the upload stage with the long-receipt hint', () => {
      renderDialog();

      expect(screen.getByText('Escanear recibo')).toBeInTheDocument();
      expect(
        screen.getByText(/lo cortamos en varias franjas/i)
      ).toBeInTheDocument();
      const input = document.querySelector(
        'input[data-component-id="scan-receipt-file-input"]'
      ) as HTMLInputElement;
      expect(input).not.toBeNull();
      expect(input.type).toBe('file');
    });

    it('only accepts jpg, png and webp files', () => {
      renderDialog();

      const input = document.querySelector(
        'input[data-component-id="scan-receipt-file-input"]'
      ) as HTMLInputElement;
      expect(input.getAttribute('accept')).toBe(
        'image/jpeg,image/png,image/webp'
      );
    });

    it('disables Analizar recibo until a file is chosen', () => {
      renderDialog();

      expect(
        getComponentEl('scan-receipt-analyze').hasAttribute('disabled')
      ).toBe(true);
    });

    it('shows a Spanish error and no preview for unsupported files', () => {
      renderDialog();

      const input = document.querySelector(
        'input[data-component-id="scan-receipt-file-input"]'
      ) as HTMLInputElement;
      fireEvent.change(input, {
        target: {
          files: [
            new File([new Uint8Array(10)], 'recibo.pdf', {
              type: 'application/pdf',
            }),
          ],
        },
      });

      expect(
        screen.getByText(
          'Formato no soportado. Usá una imagen JPG, PNG o WEBP.'
        )
      ).toBeInTheDocument();
      expect(
        screen.queryByAltText('Vista previa del recibo')
      ).not.toBeInTheDocument();
      expect(
        getComponentEl('scan-receipt-analyze').hasAttribute('disabled')
      ).toBe(true);
    });

    it('enables Analizar recibo and shows a preview for a valid image', () => {
      renderDialog();

      const input = document.querySelector(
        'input[data-component-id="scan-receipt-file-input"]'
      ) as HTMLInputElement;
      fireEvent.change(input, {
        target: {
          files: [
            new File([new Uint8Array(10)], 'recibo.jpg', {
              type: 'image/jpeg',
            }),
          ],
        },
      });

      expect(
        screen.queryByText(/Formato no soportado/)
      ).not.toBeInTheDocument();
      expect(
        screen.getByAltText('Vista previa del recibo')
      ).toBeInTheDocument();
      expect(
        getComponentEl('scan-receipt-analyze').hasAttribute('disabled')
      ).toBe(false);
    });
  });
});
