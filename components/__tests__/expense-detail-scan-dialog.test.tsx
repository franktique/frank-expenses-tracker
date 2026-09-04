import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ExpenseDetailScanDialog } from '../expense-detail-scan-dialog';
import type { Expense } from '@/types/funds';

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

const { prepareReceiptImage } = jest.requireMock('@/lib/receipt-image') as {
  prepareReceiptImage: jest.Mock;
};

const expense = {
  id: 'expense-1',
  category_id: 'cat-1',
  category_name: 'Mercado',
  period_id: 'period-1',
  date: '2026-07-01',
  payment_method: 'debit',
  description: 'compra mercado',
  amount: 10000,
  store_name: null,
} as unknown as Expense;

interface QueuedResponse {
  status: number;
  body: unknown;
}

/**
 * Routes fetch calls through per-`${method} ${url}` queues, recording every
 * call so tests can assert the request order and bodies.
 */
const setupFetch = (queues: Record<string, QueuedResponse[]>) => {
  const calls: { method: string; url: string; body?: string }[] = [];
  (global.fetch as jest.Mock).mockImplementation(
    async (url: string, init?: { method?: string; body?: string }) => {
      const method = init?.method ?? 'GET';
      calls.push({ method, url, body: init?.body });
      const response = (queues[`${method} ${url}`] ?? []).shift();
      if (!response) {
        throw new Error(`fetch inesperado: ${method} ${url}`);
      }
      return {
        ok: response.status < 400,
        status: response.status,
        json: () => Promise.resolve(response.body),
      };
    }
  );
  return calls;
};

const renderDialog = (
  onSaved = jest.fn(),
  onOpenChange = jest.fn(),
  props: Partial<typeof expense> = {}
) =>
  render(
    <ExpenseDetailScanDialog
      open
      onOpenChange={onOpenChange}
      expense={{ ...expense, ...props }}
      onSaved={onSaved}
    />
  );

const selectFile = () => {
  const input = document.querySelector(
    'input[data-component-id="expenses-detail-scan-file-input"]'
  ) as HTMLInputElement;
  fireEvent.change(input, {
    target: {
      files: [
        new File([new Uint8Array(10)], 'recibo.jpg', { type: 'image/jpeg' }),
      ],
    },
  });
};

const analyze = async () => {
  selectFile();
  fireEvent.click(
    document.querySelector(
      '[data-component-id="expenses-detail-scan-analyze"]'
    ) as HTMLButtonElement
  );
  // Wait for the review stage.
  await screen.findByText(/Detalle del recibo/);
};

const scanResultBody = (overrides: Record<string, unknown> = {}) => ({
  ok: true,
  result: {
    store_name: 'Tienda Ara',
    amount: 10000,
    line_items: [
      { name: 'Arroz', quantity: 1, unit: 'kg', amount: 4000 },
      { name: 'Leche', quantity: 2, unit: 'L', amount: 6000 },
    ],
    suggested_subgroups: [
      { name: 'Abarrotes', items: [{ name: 'Arroz', default_unit: 'kg' }] },
    ],
    ...overrides,
  },
});

const SUBGROUPS_URL = '/api/categories/cat-1/subgroups';
const ITEMS_URL = '/api/categories/cat-1/subgroups/sg-new/items';
const DETAILS_URL = '/api/expenses/expense-1/details';
const EXPENSE_URL = '/api/expenses/expense-1';

describe('ExpenseDetailScanDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prepareReceiptImage.mockResolvedValue({
      images: [{ image_base64: 'abc', mime_type: 'image/jpeg' }],
      meta: {
        originalWidth: 1000,
        originalHeight: 800,
        scaledWidth: 1024,
        scaledHeight: 800,
        sliceCount: 1,
      },
    });
  });

  describe('upload stage', () => {
    it('renders the upload stage for the expense with the long-receipt hint', () => {
      renderDialog();

      expect(
        screen.getByText('Cargar detalle desde imagen')
      ).toBeInTheDocument();
      expect(screen.getByText(/compra mercado/i)).toBeInTheDocument();
      expect(
        screen.getByText(/lo cortamos en varias franjas/i)
      ).toBeInTheDocument();
      const input = document.querySelector(
        'input[data-component-id="expenses-detail-scan-file-input"]'
      ) as HTMLInputElement;
      expect(input.getAttribute('accept')).toBe(
        'image/jpeg,image/png,image/webp'
      );
    });

    it('disables Analizar recibo until a valid image is chosen', () => {
      renderDialog();

      expect(
        (
          document.querySelector(
            '[data-component-id="expenses-detail-scan-analyze"]'
          ) as HTMLButtonElement
        ).hasAttribute('disabled')
      ).toBe(true);

      selectFile();

      expect(
        (
          document.querySelector(
            '[data-component-id="expenses-detail-scan-analyze"]'
          ) as HTMLButtonElement
        ).hasAttribute('disabled')
      ).toBe(false);
    });

    it('shows a Spanish error for unsupported files', () => {
      renderDialog();

      const input = document.querySelector(
        'input[data-component-id="expenses-detail-scan-file-input"]'
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
    });
  });

  describe('review stage', () => {
    it('renders the scanned line items with catalog badges and the store from the receipt', async () => {
      setupFetch({
        [`GET ${SUBGROUPS_URL}`]: [{ status: 200, body: [] }],
        'POST /api/expenses/scan-receipt': [
          { status: 200, body: scanResultBody() },
        ],
      });
      renderDialog();

      await analyze();

      expect(screen.getByDisplayValue('Arroz')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Leche')).toBeInTheDocument();
      // Both lines are new: the (empty) catalog matches neither.
      expect(screen.getAllByText('Nuevo (se creará)')).toHaveLength(2);
      // The expense has no store_name: the receipt detection fills the input.
      const storeInput = document.querySelector(
        'input[data-component-id="expenses-detail-scan-store-input"]'
      ) as HTMLInputElement;
      expect(storeInput.value).toBe('Tienda Ara');
      expect(screen.getByText(/Detectada en el recibo/i)).toBeInTheDocument();
      // Suggested subgroup confirmed by default.
      expect(screen.getByText('Abarrotes')).toBeInTheDocument();
    });

    it('keeps the existing store name and hides the receipt badge', async () => {
      setupFetch({
        [`GET ${SUBGROUPS_URL}`]: [{ status: 200, body: [] }],
        'POST /api/expenses/scan-receipt': [
          { status: 200, body: scanResultBody({ store_name: null }) },
        ],
      });
      renderDialog(jest.fn(), jest.fn(), { store_name: 'Alkosto' });

      await analyze();

      const storeInput = document.querySelector(
        'input[data-component-id="expenses-detail-scan-store-input"]'
      ) as HTMLInputElement;
      expect(storeInput.value).toBe('Alkosto');
      expect(
        screen.queryByText(/Detectada en el recibo/i)
      ).not.toBeInTheDocument();
    });

    it('shows the mismatch alert when items do not sum the expense amount', async () => {
      setupFetch({
        [`GET ${SUBGROUPS_URL}`]: [{ status: 200, body: [] }],
        'POST /api/expenses/scan-receipt': [
          {
            status: 200,
            body: scanResultBody({
              line_items: [
                { name: 'Arroz', quantity: 1, unit: 'kg', amount: 4000 },
                { name: 'Leche', quantity: 2, unit: 'L', amount: 8000 },
              ],
            }),
          },
        ],
      });
      renderDialog();

      await analyze();

      expect(
        screen.getByText(/La suma de los ítems no coincide con el monto/i)
      ).toBeInTheDocument();
    });

    it('synthesizes a General subgroup when the scan suggests none', async () => {
      setupFetch({
        [`GET ${SUBGROUPS_URL}`]: [{ status: 200, body: [] }],
        'POST /api/expenses/scan-receipt': [
          {
            status: 200,
            body: scanResultBody({ suggested_subgroups: [] }),
          },
        ],
      });
      renderDialog();

      await analyze();

      expect(screen.getByText('General')).toBeInTheDocument();
      expect(
        screen.getByText(/Se creará para guardar los ítems nuevos/i)
      ).toBeInTheDocument();
    });

    it('blocks Guardar when unmatched lines exist and every switch is off', async () => {
      setupFetch({
        [`GET ${SUBGROUPS_URL}`]: [{ status: 200, body: [] }],
        'POST /api/expenses/scan-receipt': [
          {
            status: 200,
            body: scanResultBody({ suggested_subgroups: [] }),
          },
        ],
      });
      renderDialog();

      await analyze();

      // Turn the only destination ("General") off: both lines are unmatched.
      fireEvent.click(screen.getByRole('switch'));

      expect(
        screen.getByText(/Hay ítems nuevos sin subcategoría destino/i)
      ).toBeInTheDocument();
      expect(
        (
          document.querySelector(
            '[data-component-id="expenses-detail-scan-save"]'
          ) as HTMLButtonElement
        ).hasAttribute('disabled')
      ).toBe(true);
    });
  });

  describe('saving', () => {
    it('creates the catalog, saves details, updates the store and notifies in order', async () => {
      const onSaved = jest.fn();
      const calls = setupFetch({
        [`GET ${SUBGROUPS_URL}`]: [{ status: 200, body: [] }],
        'POST /api/expenses/scan-receipt': [
          { status: 200, body: scanResultBody() },
        ],
        [`POST ${SUBGROUPS_URL}`]: [
          { status: 201, body: { id: 'sg-new', name: 'Abarrotes' } },
        ],
        [`POST ${ITEMS_URL}`]: [
          { status: 201, body: { id: 'item-arroz', name: 'Arroz' } },
          { status: 201, body: { id: 'item-leche', name: 'Leche' } },
        ],
        [`PUT ${DETAILS_URL}`]: [{ status: 200, body: [] }],
        [`PUT ${EXPENSE_URL}`]: [{ status: 200, body: {} }],
      });
      renderDialog(onSaved);

      await analyze();
      fireEvent.click(
        document.querySelector(
          '[data-component-id="expenses-detail-scan-save"]'
        ) as HTMLButtonElement
      );

      await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
      expect(onSaved).toHaveBeenCalledWith({
        hasDetails: true,
        storeName: 'Tienda Ara',
      });

      const order = calls.map((c) => `${c.method} ${c.url}`);
      expect(order).toEqual([
        'POST /api/expenses/scan-receipt',
        `GET ${SUBGROUPS_URL}`, // catalog load on entering review
        `POST ${SUBGROUPS_URL}`,
        `POST ${ITEMS_URL}`, // Arroz (suggested subgroup item)
        `POST ${ITEMS_URL}`, // Leche (fallback in first confirmed subgroup)
        `PUT ${DETAILS_URL}`,
        `PUT ${EXPENSE_URL}`,
      ]);

      const detailsBody = JSON.parse(
        calls.find((c) => c.url === DETAILS_URL && c.method === 'PUT')?.body ??
          '{}'
      );
      expect(detailsBody.details).toEqual([
        {
          item_id: 'item-arroz',
          amount: 4000,
          quantity: 1,
          unit: 'kg',
        },
        {
          item_id: 'item-leche',
          amount: 6000,
          quantity: 2,
          unit: 'L',
        },
      ]);
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Detalle guardado' })
      );
    });

    it('reuses an existing subgroup on 409 instead of failing', async () => {
      const onSaved = jest.fn();
      const calls = setupFetch({
        [`GET ${SUBGROUPS_URL}`]: [
          { status: 200, body: [] },
          // 409 refresh: the subgroup already exists with the Arroz item.
          {
            status: 200,
            body: [
              {
                id: 'sg-exist',
                name: 'Abarrotes',
                items: [{ id: 'item-arroz', name: 'Arroz' }],
              },
            ],
          },
        ],
        'POST /api/expenses/scan-receipt': [
          { status: 200, body: scanResultBody() },
        ],
        [`POST ${SUBGROUPS_URL}`]: [
          { status: 409, body: { error: 'Ya existe un sub-grupo' } },
        ],
        [`POST /api/categories/cat-1/subgroups/sg-exist/items`]: [
          { status: 201, body: { id: 'item-arroz', name: 'Arroz' } },
          { status: 201, body: { id: 'item-leche', name: 'Leche' } },
        ],
        [`PUT ${DETAILS_URL}`]: [{ status: 200, body: [] }],
        [`PUT ${EXPENSE_URL}`]: [{ status: 200, body: {} }],
      });
      renderDialog(onSaved);

      await analyze();
      // The review-stage catalog load must consume its queued response before
      // the save's 409 refresh re-fetches the same URL.
      await waitFor(() =>
        calls.some((c) => c.method === 'GET' && c.url === SUBGROUPS_URL)
      );
      fireEvent.click(
        document.querySelector(
          '[data-component-id="expenses-detail-scan-save"]'
        ) as HTMLButtonElement
      );

      await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    });

    it('returns to review with an error when the details PUT fails', async () => {
      const onSaved = jest.fn();
      setupFetch({
        [`GET ${SUBGROUPS_URL}`]: [{ status: 200, body: [] }],
        'POST /api/expenses/scan-receipt': [
          { status: 200, body: scanResultBody() },
        ],
        [`POST ${SUBGROUPS_URL}`]: [
          { status: 201, body: { id: 'sg-new', name: 'Abarrotes' } },
        ],
        [`POST ${ITEMS_URL}`]: [
          { status: 201, body: { id: 'item-arroz', name: 'Arroz' } },
          { status: 201, body: { id: 'item-leche', name: 'Leche' } },
        ],
        [`PUT ${DETAILS_URL}`]: [
          { status: 500, body: { error: 'Error de base de datos' } },
        ],
      });
      renderDialog(onSaved);

      await analyze();
      fireEvent.click(
        document.querySelector(
          '[data-component-id="expenses-detail-scan-save"]'
        ) as HTMLButtonElement
      );

      await screen.findByText(/Error de base de datos/i);
      expect(onSaved).not.toHaveBeenCalled();
      expect(mockToast).not.toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Detalle guardado' })
      );
      // Back on review: the save button is available again.
      expect(
        (
          document.querySelector(
            '[data-component-id="expenses-detail-scan-save"]'
          ) as HTMLButtonElement
        ).hasAttribute('disabled')
      ).toBe(false);
    });
  });
});
