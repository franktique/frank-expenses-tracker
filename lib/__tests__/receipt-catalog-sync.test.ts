import {
  pickItemIdForLine,
  planExpenseDetailRows,
  type CreatedItemRef,
  type ScanLine,
} from '../receipt-catalog-sync';
import { buildCatalogItemIndex } from '../receipt-catalog';
import type { CategorySubgroup } from '@/types/funds';

const catalog: CategorySubgroup[] = [
  {
    id: 'sg-1',
    category_id: 'cat-1',
    name: 'Frutas',
    display_order: 0,
    created_at: '',
    updated_at: '',
    items: [
      {
        id: 'item-1',
        subgroup_id: 'sg-1',
        name: 'Manzana',
        display_order: 0,
        created_at: '',
        updated_at: '',
      },
      {
        id: 'item-2',
        subgroup_id: 'sg-1',
        name: 'Pera',
        display_order: 1,
        created_at: '',
        updated_at: '',
      },
    ],
  },
];

const catalogIndex = buildCatalogItemIndex(catalog);

const createdItems = new Map<string, CreatedItemRef>([
  ['leche', { itemId: 'item-new', subgroupName: 'General' }],
]);

const line = (overrides: Partial<ScanLine>): ScanLine => ({
  id: 'line-1',
  name: 'Manzana',
  amount: 1000,
  quantity: null,
  unit: null,
  ...overrides,
});

describe('pickItemIdForLine', () => {
  it('prefers the line own catalog match', () => {
    expect(
      pickItemIdForLine(
        { name: 'Manzana', matchedItemId: 'item-explicit' },
        catalogIndex,
        createdItems
      )
    ).toBe('item-explicit');
  });

  it('resolves from the catalog index (normalizing the name)', () => {
    expect(
      pickItemIdForLine({ name: '  manzana! ' }, catalogIndex, new Map())
    ).toBe('item-1');
  });

  it('resolves from items created during this run', () => {
    expect(
      pickItemIdForLine({ name: 'Leche' }, catalogIndex, createdItems)
    ).toBe('item-new');
  });

  it('returns undefined for unknown names', () => {
    expect(
      pickItemIdForLine({ name: 'Yeguado' }, catalogIndex, createdItems)
    ).toBe(undefined);
  });
});

describe('planExpenseDetailRows', () => {
  it('maps catalog-matched lines to detail rows', () => {
    const outcome = planExpenseDetailRows(
      [
        line({
          id: 'a',
          name: 'Manzana',
          amount: 1500,
          quantity: 2,
          unit: 'kg',
        }),
      ],
      catalogIndex,
      createdItems
    );
    expect(outcome.details).toEqual([
      {
        item_id: 'item-1',
        amount: 1500,
        quantity: 2,
        unit: 'kg',
      },
    ]);
    expect(outcome.skippedLineIds).toEqual([]);
    expect(outcome.unmatchedLineCount).toBe(0);
  });

  it('drops lines with amount <= 0', () => {
    const outcome = planExpenseDetailRows(
      [line({ id: 'a', amount: 0 }), line({ id: 'b', amount: -5 })],
      catalogIndex,
      createdItems
    );
    expect(outcome.details).toEqual([]);
    expect(outcome.skippedLineIds).toEqual(['a', 'b']);
    expect(outcome.unmatchedLineCount).toBe(0);
  });

  it('counts unresolvable positive lines as unmatched and skips them', () => {
    const outcome = planExpenseDetailRows(
      [line({ id: 'a', name: 'Desconocido', amount: 700 })],
      catalogIndex,
      new Map()
    );
    expect(outcome.details).toEqual([]);
    expect(outcome.skippedLineIds).toEqual(['a']);
    expect(outcome.unmatchedLineCount).toBe(1);
  });

  it('merges duplicate lines resolving to the same item by summing amounts', () => {
    const outcome = planExpenseDetailRows(
      [
        line({
          id: 'a',
          name: 'Manzana',
          amount: 1000,
          quantity: 1,
          unit: 'kg',
        }),
        line({ id: 'b', name: 'manzana', amount: 500, quantity: 3, unit: 'g' }),
      ],
      catalogIndex,
      new Map()
    );
    expect(outcome.details).toEqual([
      {
        item_id: 'item-1',
        amount: 1500,
        quantity: 1,
        unit: 'kg',
      },
    ]);
    expect(outcome.unmatchedLineCount).toBe(0);
  });
});
