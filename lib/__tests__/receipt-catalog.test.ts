import type { CategorySubgroup } from '@/types/funds';
import {
  buildCatalogItemIndex,
  hasSumMismatch,
  normalizeCatalogName,
  sumLineAmounts,
} from '../receipt-catalog';

const makeSubgroup = (
  id: string,
  name: string,
  items: { id: string; name: string }[]
): CategorySubgroup =>
  ({
    id,
    category_id: 'cat-1',
    name,
    display_order: 0,
    created_at: '',
    updated_at: '',
    items: items.map((item) => ({
      id: item.id,
      subgroup_id: id,
      name: item.name,
      display_order: 0,
      created_at: '',
      updated_at: '',
    })),
  }) as CategorySubgroup;

describe('normalizeCatalogName', () => {
  it('lowercases and keeps alphanumerics', () => {
    expect(normalizeCatalogName('Leche Entera 1L')).toBe('leche entera 1l');
  });

  it('strips diacritics', () => {
    expect(normalizeCatalogName('Papel Higiénico')).toBe('papel higienico');
    expect(normalizeCatalogName('Café molido')).toBe('cafe molido');
  });

  it('maps non-alphanumerics to spaces', () => {
    expect(normalizeCatalogName('Arroz-2kg')).toBe('arroz 2kg');
  });

  it('trims surrounding whitespace', () => {
    expect(normalizeCatalogName('  AXE  ')).toBe('axe');
  });
});

describe('buildCatalogItemIndex', () => {
  it('indexes items by normalized name with their subgroup name', () => {
    const index = buildCatalogItemIndex([
      makeSubgroup('sg-1', 'Abarrotes', [
        { id: 'item-1', name: 'Leche Entera' },
        { id: 'item-2', name: 'Arroz 500g' },
      ]),
      makeSubgroup('sg-2', 'Aseo', [{ id: 'item-3', name: 'Jabón REY' }]),
    ]);

    expect(index.get(normalizeCatalogName('leche entera'))).toEqual({
      itemId: 'item-1',
      subgroupName: 'Abarrotes',
    });
    expect(index.get(normalizeCatalogName('jabon rey'))).toEqual({
      itemId: 'item-3',
      subgroupName: 'Aseo',
    });
    expect(index.get(normalizeCatalogName('no existe'))).toBeUndefined();
  });

  it('keeps the first occurrence on duplicate normalized names', () => {
    const index = buildCatalogItemIndex([
      makeSubgroup('sg-1', 'Uno', [{ id: 'item-1', name: 'Leche' }]),
      makeSubgroup('sg-2', 'Dos', [{ id: 'item-2', name: 'LECHE' }]),
    ]);

    expect(index.get('leche')?.itemId).toBe('item-1');
  });
});

describe('sumLineAmounts', () => {
  it('sums the amounts', () => {
    expect(sumLineAmounts([{ amount: 10 }, { amount: 2.5 }])).toBe(12.5);
  });

  it('ignores NaN amounts', () => {
    expect(sumLineAmounts([{ amount: NaN }, { amount: 5 }])).toBe(5);
  });

  it('returns 0 for an empty list', () => {
    expect(sumLineAmounts([])).toBe(0);
  });
});

describe('hasSumMismatch', () => {
  it('flags differences above the 0.5 tolerance', () => {
    expect(hasSumMismatch(100.51, 100)).toBe(true);
  });

  it('accepts differences at or below the tolerance', () => {
    expect(hasSumMismatch(100.5, 100)).toBe(false);
    expect(hasSumMismatch(100.49, 100)).toBe(false);
  });
});
