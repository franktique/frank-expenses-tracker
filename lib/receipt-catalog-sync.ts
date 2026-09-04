import type { CategorySubgroup } from '@/types/funds';
import {
  normalizeCatalogName,
  type CatalogItemRef,
} from '@/lib/receipt-catalog';

/**
 * Catalog sync helpers shared by the receipt scan flows: create-or-reuse
 * subgroup/item calls against the category catalog endpoints, plus the pure
 * planning of which scanned lines become expense_details rows.
 *
 * Extracted from components/scan-receipt-dialog.tsx so the scan-onto-existing-
 * expense dialog (expense-detail-scan-dialog.tsx) keeps identical semantics.
 */

export interface CreatedItemRef {
  itemId: string;
  subgroupName: string;
}

/** One editable scanned line (mirrors the dialogs' EditableLineItem). */
export interface ScanLine {
  id: string;
  name: string;
  amount: number;
  quantity: number | null;
  unit: string | null;
  matchedItemId?: string;
}

/** Payload row for UpsertExpenseDetailsSchema. */
export interface PlannedDetailRow {
  item_id: string;
  amount: number;
  quantity: number | null;
  unit: string | null;
}

export interface PlanOutcome {
  details: PlannedDetailRow[];
  /** Lines dropped: amount <= 0 or no resolvable catalog item. */
  skippedLineIds: string[];
  /** Lines with amount > 0 that are neither in the catalog nor createdItems. */
  unmatchedLineCount: number;
}

/**
 * Creates a category subgroup, or returns the existing one on 409 (matched by
 * normalized name). `knownSubgroups` avoids a re-fetch when the caller already
 * holds the catalog; `onCatalogRefreshed` hands a re-fetched catalog back.
 */
export async function createOrReuseSubgroup(
  categoryId: string,
  name: string,
  options?: {
    knownSubgroups?: CategorySubgroup[];
    onCatalogRefreshed?: (subgroups: CategorySubgroup[]) => void;
  }
): Promise<CategorySubgroup> {
  const response = await fetch(`/api/categories/${categoryId}/subgroups`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (response.status === 409) {
    const existing = options?.knownSubgroups?.find(
      (sg) => normalizeCatalogName(sg.name) === normalizeCatalogName(name)
    );
    if (existing) return existing;
    // Not in the cached catalog (e.g. created by another device): re-fetch.
    const refreshed = await fetch(`/api/categories/${categoryId}/subgroups`);
    if (refreshed.ok) {
      const subgroups = (await refreshed.json()) as CategorySubgroup[];
      options?.onCatalogRefreshed?.(subgroups);
      const match = subgroups.find(
        (sg) => normalizeCatalogName(sg.name) === normalizeCatalogName(name)
      );
      if (match) return match;
    }
    throw new Error('No se pudo reutilizar la subcategoría existente');
  }
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error ?? 'No se pudo crear la subcategoría');
  }
  return response.json();
}

/**
 * Creates a catalog item, or returns the existing one on 409 (matched by
 * normalized name against the subgroup's item list).
 */
export async function createOrReuseItem(
  categoryId: string,
  subgroupId: string,
  name: string,
  defaultUnit?: string | null
): Promise<{ id: string; name: string }> {
  const itemsUrl = `/api/categories/${categoryId}/subgroups/${subgroupId}/items`;
  const response = await fetch(itemsUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, default_unit: defaultUnit ?? null }),
  });
  if (response.status === 409) {
    // Already exists (race with another device/session): reuse it.
    const refreshed = await fetch(itemsUrl);
    if (refreshed.ok) {
      const items = (await refreshed.json()) as {
        id: string;
        name: string;
      }[];
      const match = items.find(
        (item) => normalizeCatalogName(item.name) === normalizeCatalogName(name)
      );
      if (match) return match;
    }
    throw new Error('No se pudo reutilizar el ítem existente');
  }
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error ?? 'No se pudo crear el ítem');
  }
  return response.json();
}

/**
 * Resolves the catalog item id for a scanned line: the line's own catalog
 * match → the shared catalog index → an item just created in this run.
 */
export function pickItemIdForLine(
  line: Pick<ScanLine, 'name' | 'matchedItemId'>,
  catalogIndex: Map<string, CatalogItemRef>,
  createdItems: Map<string, CreatedItemRef>
): string | undefined {
  if (line.matchedItemId) return line.matchedItemId;
  const key = normalizeCatalogName(line.name);
  return catalogIndex.get(key)?.itemId ?? createdItems.get(key)?.itemId;
}

/**
 * Pure planner: maps scanned lines to expense_details rows. Drops lines with
 * amount <= 0 (UpsertExpenseDetailsSchema requires positive amounts) and lines
 * whose item cannot be resolved; merges lines resolving to the same item by
 * summing amounts (expense_details has UNIQUE(expense_id, item_id)).
 */
export function planExpenseDetailRows(
  lines: ScanLine[],
  catalogIndex: Map<string, CatalogItemRef>,
  createdItems: Map<string, CreatedItemRef>
): PlanOutcome {
  const byItem = new Map<string, PlannedDetailRow>();
  const skippedLineIds: string[] = [];
  let unmatchedLineCount = 0;

  for (const line of lines) {
    if (!(Number(line.amount) > 0)) {
      skippedLineIds.push(line.id);
      continue;
    }
    const itemId = pickItemIdForLine(line, catalogIndex, createdItems);
    if (!itemId) {
      unmatchedLineCount += 1;
      skippedLineIds.push(line.id);
      continue;
    }
    const existing = byItem.get(itemId);
    if (existing) {
      existing.amount += Number(line.amount);
    } else {
      byItem.set(itemId, {
        item_id: itemId,
        amount: Number(line.amount),
        quantity: line.quantity,
        unit: line.unit,
      });
    }
  }

  return {
    details: [...byItem.values()],
    skippedLineIds,
    unmatchedLineCount,
  };
}
