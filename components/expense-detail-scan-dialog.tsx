'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScanLine, Trash2, UploadCloud } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import {
  prepareReceiptImage,
  validateReceiptFile,
  type PreparedReceiptImageMeta,
  type ScanImagePayload,
} from '@/lib/receipt-image';
import {
  buildCatalogItemIndex,
  hasSumMismatch,
  normalizeCatalogName,
  sumLineAmounts,
} from '@/lib/receipt-catalog';
import {
  createOrReuseItem,
  createOrReuseSubgroup,
  planExpenseDetailRows,
  type CreatedItemRef,
} from '@/lib/receipt-catalog-sync';
import type { ReceiptScanResult } from '@/lib/assistant/vision';
import type { CategorySubgroup, Expense } from '@/types/funds';

type ScanStage = 'upload' | 'analyzing' | 'review' | 'saving';

interface EditableLineItem {
  id: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  amount: number;
}

interface DestinationSubgroup {
  name: string;
  items: { name: string; default_unit?: string | null }[];
  synthetic: boolean;
}

interface ExpenseDetailScanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense: Expense;
  onSaved: (info: { hasDetails: boolean; storeName?: string | null }) => void;
}

const SCAN_TIMEOUT_MS = 120_000;

/**
 * Loads item details onto an EXISTING expense from a receipt image: upload →
 * analyzing (shared vision endpoint) → review (line items + suggested catalog
 * subgroups + store name) → saving (create/reuse catalog, then full-replace
 * PUT /api/expenses/{id}/details). Mirrors ExpenseScanDialog but never creates
 * an expense and never edits its category/date/amount.
 */
export function ExpenseDetailScanDialog({
  open,
  onOpenChange,
  expense,
  onSaved,
}: ExpenseDetailScanDialogProps) {
  const { toast } = useToast();

  const [stage, setStage] = useState<ScanStage>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [imageMeta, setImageMeta] = useState<PreparedReceiptImageMeta | null>(
    null
  );
  const [scanError, setScanError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<ReceiptScanResult | null>(null);

  // Review form
  const [storeName, setStoreName] = useState('');
  const [storeFromReceipt, setStoreFromReceipt] = useState(false);
  const [lineItems, setLineItems] = useState<EditableLineItem[]>([]);
  const [confirmSubgroups, setConfirmSubgroups] = useState<boolean[]>([]);
  const [catalog, setCatalog] = useState<CategorySubgroup[]>([]);
  const [catalogLoadedFor, setCatalogLoadedFor] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const lineItemIdRef = useRef(0);
  const nextLineItemId = () => `line-${++lineItemIdRef.current}`;

  const busy = stage === 'analyzing' || stage === 'saving';

  // ------------------------------------------------------------------
  // Derived
  // ------------------------------------------------------------------
  const catalogIndex = useMemo(() => buildCatalogItemIndex(catalog), [catalog]);

  const resolvedLineItems = useMemo(
    () =>
      lineItems.map((li) => {
        const match = catalogIndex.get(normalizeCatalogName(li.name));
        return {
          ...li,
          matchedItemId: match?.itemId,
          matchedSubgroupName: match?.subgroupName,
        };
      }),
    [lineItems, catalogIndex]
  );

  const detailsTotal = useMemo(
    () => sumLineAmounts(resolvedLineItems),
    [resolvedLineItems]
  );

  const sumMismatch = hasSumMismatch(detailsTotal, expense.amount);

  // Suggested destinations; when the model proposes none, a synthetic
  // "General" subgroup guarantees every new item a catalog destination.
  const destinationSubgroups = useMemo<DestinationSubgroup[]>(() => {
    const suggested = result?.suggested_subgroups ?? [];
    if (suggested.length > 0) {
      return suggested.map((subgroup) => ({
        name: subgroup.name,
        items: subgroup.items,
        synthetic: false,
      }));
    }
    return [{ name: 'General', items: [], synthetic: true }];
  }, [result]);

  const plan = useMemo(
    () => planExpenseDetailRows(resolvedLineItems, catalogIndex, new Map()),
    [resolvedLineItems, catalogIndex]
  );

  const hasDestination = confirmSubgroups.some(Boolean);
  const canSave = plan.unmatchedLineCount === 0 || hasDestination;

  // ------------------------------------------------------------------
  // Reset when the dialog opens
  // ------------------------------------------------------------------
  const resetForm = useCallback(() => {
    setStage('upload');
    setFile(null);
    setPreviewUrl(null);
    setFileError(null);
    setImageMeta(null);
    setScanError(null);
    setSaveError(null);
    setProgress(0);
    setElapsed(0);
    setResult(null);
    setStoreName('');
    setStoreFromReceipt(false);
    setLineItems([]);
    setConfirmSubgroups([]);
    setCatalog([]);
    setCatalogLoadedFor(null);
  }, []);

  useEffect(() => {
    if (open) {
      resetForm();
    }
  }, [open, resetForm]);

  // ------------------------------------------------------------------
  // Preview URL lifecycle
  // ------------------------------------------------------------------
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  // ------------------------------------------------------------------
  // Analyzing progress (mobile parity)
  // ------------------------------------------------------------------
  useEffect(() => {
    if (stage !== 'analyzing') return;
    setElapsed(0);
    setProgress(0);
    const startedAt = Date.now();
    const interval = setInterval(() => {
      const seconds = Math.floor((Date.now() - startedAt) / 1000);
      setElapsed(seconds);
      setProgress(Math.min(90, seconds * 6));
    }, 1000);
    return () => clearInterval(interval);
  }, [stage]);

  // ------------------------------------------------------------------
  // Prefill the review form once the scan result arrives
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!result) return;
    const hadStore = Boolean(expense.store_name?.trim());
    setStoreName(
      hadStore ? (expense.store_name ?? '') : (result.store_name ?? '')
    );
    setStoreFromReceipt(!hadStore && Boolean(result.store_name));
    setLineItems(
      result.line_items.map((li) => ({
        id: nextLineItemId(),
        name: li.name,
        quantity: li.quantity ?? null,
        unit: li.unit ?? null,
        amount: li.amount,
      }))
    );
    const destinationCount =
      result.suggested_subgroups.length > 0
        ? result.suggested_subgroups.length
        : 1;
    setConfirmSubgroups(new Array(destinationCount).fill(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  // ------------------------------------------------------------------
  // Catalog of the expense's category (best effort)
  // ------------------------------------------------------------------
  useEffect(() => {
    if (stage !== 'review' && stage !== 'saving') return;
    if (catalogLoadedFor === expense.category_id) return;
    let cancelled = false;
    setCatalogLoadedFor(expense.category_id);
    (async () => {
      try {
        const res = await fetch(
          `/api/categories/${expense.category_id}/subgroups`
        );
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && Array.isArray(data)) setCatalog(data);
      } catch {
        // The catalog is optional: unmatched lines are created on save.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [stage, expense.category_id, catalogLoadedFor]);

  // ------------------------------------------------------------------
  // Handlers
  // ------------------------------------------------------------------
  const handleFileSelect = (selected: File) => {
    const error = validateReceiptFile(selected);
    if (error) {
      setFileError(error);
      setFile(null);
      return;
    }
    setFileError(null);
    setFile(selected);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(selected));
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setStage('analyzing');
    setScanError(null);
    let images: ScanImagePayload[];
    let meta: PreparedReceiptImageMeta | null = null;
    try {
      const prepared = await prepareReceiptImage(file);
      images = prepared.images;
      meta = prepared.meta;
    } catch (err) {
      setScanError((err as Error).message);
      setStage('upload');
      return;
    }
    setImageMeta(meta);

    const controller = new AbortController();
    abortRef.current = controller;
    const timeout = setTimeout(() => controller.abort(), SCAN_TIMEOUT_MS);
    try {
      const response = await fetch('/api/expenses/scan-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          images,
          // Only the expense's own category: the model suggests subgroups
          // that fit it (suggested_category_id is ignored here).
          categories: [
            { id: expense.category_id, name: expense.category_name ?? '' },
          ],
          credit_cards_last_four: [],
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? 'No se pudo escanear el recibo');
      }
      setResult(data.result as ReceiptScanResult);
      setStage('review');
    } catch (err) {
      setScanError(
        err instanceof DOMException && err.name === 'AbortError'
          ? 'El análisis tardó demasiado. Intentá de nuevo con una imagen más chica.'
          : (err as Error).message || 'No se pudo escanear el recibo'
      );
      setStage('upload');
    } finally {
      clearTimeout(timeout);
      abortRef.current = null;
    }
  };

  const updateLine = (id: string, patch: Partial<EditableLineItem>) => {
    setLineItems((prev) =>
      prev.map((li) => (li.id === id ? { ...li, ...patch } : li))
    );
  };

  const parseAmountInput = (value: string) => {
    const parsed = Number.parseFloat(value.replace(',', '.'));
    return Number.isNaN(parsed) ? 0 : parsed;
  };

  const resetAndClose = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    resetForm();
    onOpenChange(false);
  };

  const handleSave = async () => {
    if (plan.unmatchedLineCount > 0 && !hasDestination) {
      setSaveError(
        'Hay ítems nuevos sin subcategoría destino. Activá al menos una subcategoría sugerida para crearlos.'
      );
      return;
    }

    setStage('saving');
    setSaveError(null);

    try {
      // 1. Create the confirmed subgroups + their items (409 → reuse).
      const createdItems = new Map<string, CreatedItemRef>();
      const confirmedSubgroups: CategorySubgroup[] = [];
      for (let i = 0; i < destinationSubgroups.length; i++) {
        if (!confirmSubgroups[i]) continue;
        const destination = destinationSubgroups[i];
        const subgroup = await createOrReuseSubgroup(
          expense.category_id,
          destination.name,
          {
            knownSubgroups: catalog,
            onCatalogRefreshed: setCatalog,
          }
        );
        confirmedSubgroups.push(subgroup);
        for (const item of destination.items) {
          const key = normalizeCatalogName(item.name);
          if (createdItems.has(key) || catalogIndex.has(key)) continue;
          const created = await createOrReuseItem(
            expense.category_id,
            subgroup.id,
            item.name,
            item.default_unit ?? undefined
          );
          createdItems.set(key, {
            itemId: created.id,
            subgroupName: subgroup.name,
          });
        }
      }

      // 2. Lines still without an item: create one in the first confirmed
      //    subgroup (same fallback as the mobile review screen).
      const firstSubgroup = confirmedSubgroups[0];
      if (plan.unmatchedLineCount > 0 && firstSubgroup) {
        for (const li of resolvedLineItems) {
          const key = normalizeCatalogName(li.name);
          if (createdItems.has(key) || catalogIndex.has(key)) continue;
          if (!(li.amount > 0) || !li.name.trim()) continue;
          const created = await createOrReuseItem(
            expense.category_id,
            firstSubgroup.id,
            li.name.trim()
          );
          createdItems.set(key, {
            itemId: created.id,
            subgroupName: firstSubgroup.name,
          });
        }
      }

      // 3. Plan the final detail rows.
      const finalPlan = planExpenseDetailRows(
        resolvedLineItems,
        catalogIndex,
        createdItems
      );
      if (finalPlan.details.length === 0) {
        throw new Error('El recibo no produjo ítems con monto mayor a cero.');
      }

      // 4. Full-replace details (the expense has no rows yet).
      const response = await fetch(`/api/expenses/${expense.id}/details`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ details: finalPlan.details }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(
          data.error ?? 'No se pudo guardar el detalle del gasto'
        );
      }

      // 5. Fill the store name when it changed. Isolated on purpose: a
      //    failure here must not roll back the saved details.
      let savedStoreName: string | null = null;
      let storeWarning: string | null = null;
      const trimmedStore = storeName.trim();
      if (trimmedStore && trimmedStore !== (expense.store_name ?? '')) {
        try {
          const storeResponse = await fetch(`/api/expenses/${expense.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ store_name: trimmedStore }),
          });
          if (storeResponse.ok) {
            savedStoreName = trimmedStore;
          } else {
            storeWarning =
              'El detalle se guardó pero no se pudo actualizar la tienda.';
          }
        } catch {
          storeWarning =
            'El detalle se guardó pero no se pudo actualizar la tienda.';
        }
      }

      toast({
        title: 'Detalle guardado',
        description: `Se agregaron ${finalPlan.details.length} ítem(s) al detalle del gasto.${
          storeWarning ? ` ${storeWarning}` : ''
        }`,
      });
      onSaved({ hasDetails: true, storeName: savedStoreName });
      resetAndClose();
    } catch (err) {
      setSaveError(
        `${(err as Error).message || 'No se pudo guardar el detalle'} — el detalle pudo haberse guardado; revisá el detalle del gasto antes de reintentar.`
      );
      setStage('review');
    }
  };

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (busy) return;
        onOpenChange(next);
      }}
    >
      <DialogContent
        className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"
        onInteractOutside={(e) => busy && e.preventDefault()}
        onEscapeKeyDown={(e) => busy && e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="h-5 w-5" />
            Cargar detalle desde imagen
          </DialogTitle>
          <DialogDescription>
            Gasto: {expense.description} · {formatCurrency(expense.amount)}
          </DialogDescription>
        </DialogHeader>

        {stage === 'upload' && (
          <div className="space-y-4">
            <div
              className="rounded-lg border-2 border-dashed p-6 text-center"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const dropped = e.dataTransfer.files?.[0];
                if (dropped) handleFileSelect(dropped);
              }}
            >
              <UploadCloud className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                Arrastrá una imagen aquí o
              </p>
              <Input
                componentId="expenses-detail-scan-file-input"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="mx-auto mt-2 max-w-xs cursor-pointer"
                onChange={(e) => {
                  const selected = e.target.files?.[0];
                  if (selected) handleFileSelect(selected);
                  e.target.value = '';
                }}
              />
              <p className="mt-3 text-xs text-muted-foreground">
                Podés subir un escaneo largo: lo cortamos en varias franjas para
                que la IA lea bien cada parte.
              </p>
            </div>

            {fileError && (
              <Alert variant="destructive">
                <AlertDescription>{fileError}</AlertDescription>
              </Alert>
            )}

            {previewUrl && (
              <div className="space-y-1">
                <img
                  src={previewUrl}
                  alt="Vista previa del recibo"
                  className="max-h-64 w-full rounded-lg border object-contain"
                />
                <p className="text-xs text-muted-foreground">{file?.name}</p>
              </div>
            )}

            {scanError && (
              <Alert variant="destructive">
                <AlertDescription>{scanError}</AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {stage === 'analyzing' && (
          <div className="space-y-4 py-6 text-center">
            <Progress value={progress} className="w-full" />
            <p className="text-sm font-medium">Analizando recibo…</p>
            <p className="text-xs text-muted-foreground">
              El modelo de visión está extrayendo los datos del recibo.
            </p>
            <p className="text-sm text-muted-foreground">
              {elapsed}s transcurridos
            </p>
          </div>
        )}

        {(stage === 'review' || stage === 'saving') && result && (
          <div className="space-y-4">
            <Alert>
              <AlertDescription>
                Los ítems se agregarán al detalle de este gasto; su categoría,
                fecha y monto no cambian.
                {imageMeta && imageMeta.sliceCount > 1
                  ? ` El escaneo se leyó en ${imageMeta.sliceCount} franjas combinadas del mismo recibo.`
                  : ''}
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-3 gap-3 rounded-lg border p-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Categoría</p>
                <p className="truncate font-medium">
                  {expense.category_name ?? '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Fecha</p>
                <p className="font-medium">{formatDate(expense.date)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Monto</p>
                <p className="font-medium">{formatCurrency(expense.amount)}</p>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="expenses-detail-scan-store">
                Tienda / Comercio
              </Label>
              <Input
                componentId="expenses-detail-scan-store-input"
                id="expenses-detail-scan-store"
                value={storeName}
                onChange={(e) => {
                  setStoreName(e.target.value);
                  setStoreFromReceipt(false);
                }}
                disabled={busy}
              />
              {storeFromReceipt && storeName && (
                <p className="text-xs text-muted-foreground">
                  Detectada en el recibo.
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Label>Detalle del recibo ({lineItems.length} ítems)</Label>
              {lineItems.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No se detectaron líneas en el recibo.
                </p>
              )}
              <div className="space-y-2">
                {resolvedLineItems.map((li, index) => (
                  <div key={li.id} className="space-y-1 rounded-lg border p-2">
                    <div className="flex items-center gap-2">
                      <span className="w-5 shrink-0 text-xs text-muted-foreground">
                        {index + 1}.
                      </span>
                      <Input
                        value={li.name}
                        onChange={(e) =>
                          updateLine(li.id, { name: e.target.value })
                        }
                        placeholder="Ítem"
                        aria-label={`Ítem ${index + 1}`}
                        className="h-8 flex-1"
                        disabled={busy}
                      />
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={String(li.amount)}
                        onChange={(e) =>
                          updateLine(li.id, {
                            amount: parseAmountInput(e.target.value),
                          })
                        }
                        aria-label={`Monto ítem ${index + 1}`}
                        className="h-8 w-24"
                        disabled={busy}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Quitar ítem ${index + 1}`}
                        onClick={() =>
                          setLineItems((prev) =>
                            prev.filter((row) => row.id !== li.id)
                          )
                        }
                        disabled={busy}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2 pl-7">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={li.quantity === null ? '' : String(li.quantity)}
                        onChange={(e) =>
                          updateLine(li.id, {
                            quantity: e.target.value
                              ? parseAmountInput(e.target.value)
                              : null,
                          })
                        }
                        placeholder="Cant."
                        aria-label={`Cantidad ítem ${index + 1}`}
                        className="h-7 w-20 text-xs"
                        disabled={busy}
                      />
                      <Input
                        value={li.unit ?? ''}
                        onChange={(e) =>
                          updateLine(li.id, {
                            unit: e.target.value || null,
                          })
                        }
                        placeholder="Unidad"
                        aria-label={`Unidad ítem ${index + 1}`}
                        className="h-7 w-24 text-xs"
                        disabled={busy}
                      />
                      {li.matchedItemId ? (
                        <Badge variant="secondary" className="text-xs">
                          Catálogo: {li.matchedSubgroupName}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          Nuevo (se creará)
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total ítems</span>
                <span
                  className={cn(
                    sumMismatch ? 'font-medium text-red-600' : 'font-medium'
                  )}
                >
                  {detailsTotal.toFixed(2)}
                </span>
              </div>
              {sumMismatch && (
                <Alert variant="destructive">
                  <AlertDescription>
                    La suma de los ítems no coincide con el monto del gasto
                    (descuentos/impuestos). El monto del gasto es el total
                    pagado.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <div className="grid gap-2">
              <Label>Subcategorías destino</Label>
              <p className="text-xs text-muted-foreground">
                Se crearán en el catálogo de la categoría para reutilizarlos en
                próximos recibos.
              </p>
              <div className="space-y-2">
                {destinationSubgroups.map((subgroup, index) => (
                  <div
                    key={`${subgroup.name}-${index}`}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">{subgroup.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {subgroup.synthetic
                          ? 'Se creará para guardar los ítems nuevos del recibo.'
                          : subgroup.items.map((item) => item.name).join(', ')}
                      </p>
                    </div>
                    <Switch
                      checked={confirmSubgroups[index] ?? true}
                      onCheckedChange={(checked) =>
                        setConfirmSubgroups((prev) => {
                          const next = [...prev];
                          next[index] = checked;
                          return next;
                        })
                      }
                      disabled={busy}
                    />
                  </div>
                ))}
              </div>
              {!canSave && (
                <Alert variant="destructive">
                  <AlertDescription>
                    Hay ítems nuevos sin subcategoría destino. Activá al menos
                    una subcategoría sugerida para crearlos.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {saveError && (
              <Alert variant="destructive">
                <AlertDescription>{saveError}</AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <DialogFooter>
          {stage === 'upload' && (
            <>
              <Button
                componentId="expenses-detail-scan-cancel"
                variant="outline"
                onClick={resetAndClose}
              >
                Cancelar
              </Button>
              <Button
                componentId="expenses-detail-scan-analyze"
                onClick={handleAnalyze}
                disabled={!file}
              >
                Analizar recibo
              </Button>
            </>
          )}
          {stage === 'analyzing' && (
            <Button
              componentId="expenses-detail-scan-cancel-analysis"
              variant="outline"
              onClick={() => {
                abortRef.current?.abort();
              }}
            >
              Cancelar
            </Button>
          )}
          {(stage === 'review' || stage === 'saving') && (
            <>
              <Button
                componentId="expenses-detail-scan-back"
                variant="outline"
                onClick={() => setStage('upload')}
                disabled={busy}
              >
                Volver
              </Button>
              <Button
                componentId="expenses-detail-scan-save"
                onClick={handleSave}
                disabled={busy || !canSave}
              >
                {stage === 'saving' ? 'Guardando…' : 'Guardar detalle'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
