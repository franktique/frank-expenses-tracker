'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CalendarIcon,
  Check,
  ChevronsUpDown,
  ScanLine,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { useBudget, type PaymentMethod } from '@/context/budget-context';
import { CreditCardSelector } from '@/components/credit-card-selector';
import { cn, formatDate } from '@/lib/utils';
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
import type { ReceiptScanResult } from '@/lib/assistant/vision';
import type { CategorySubgroup } from '@/types/funds';
import type { CreditCard } from '@/types/credit-cards';

type ScanStage = 'upload' | 'analyzing' | 'review' | 'saving';

interface EditableLineItem {
  id: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  amount: number;
}

interface ExpenseDetailPayload {
  item_id: string;
  amount: number;
  quantity: number | null;
  unit: string | null;
}

interface ExpenseScanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const SCAN_TIMEOUT_MS = 120_000;

/**
 * Desktop receipt scanning: upload a single scan of a (long) receipt, slice
 * it in the browser and let the vision endpoint extract the expense. The
 * review stage mirrors the mobile review screen and saves the expense (as
 * "Sin verificar"), the catalog subgroups/items and the expense details.
 */
export function ExpenseScanDialog({
  open,
  onOpenChange,
  onSuccess,
}: ExpenseScanDialogProps) {
  const { categories, activePeriod, addExpense, creditCards } = useBudget();
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
  const [categoryId, setCategoryId] = useState('');
  const [categorySearchValue, setCategorySearchValue] = useState('');
  const [categoryPopoverOpen, setCategoryPopoverOpen] = useState(false);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('debit');
  const [creditCard, setCreditCard] = useState<CreditCard | null>(null);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [storeName, setStoreName] = useState('');
  const [lineItems, setLineItems] = useState<EditableLineItem[]>([]);
  const [confirmSubgroups, setConfirmSubgroups] = useState<boolean[]>([]);
  const [catalog, setCatalog] = useState<CategorySubgroup[]>([]);
  const [catalogLoadedFor, setCatalogLoadedFor] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const lineItemIdRef = useRef(0);
  const nextLineItemId = () => `line-${++lineItemIdRef.current}`;

  const cashLocked = paymentMethod === 'cash';
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

  const parsedAmount = Number.parseFloat(amount.replace(',', '.')) || 0;
  const sumMismatch = hasSumMismatch(detailsTotal, parsedAmount);
  const suggestedCategory = categories.find(
    (c) => c.id === result?.suggested_category_id
  );

  const filteredCategories = useMemo(() => {
    const query = categorySearchValue.trim().toLowerCase();
    const sorted = categories
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name));
    if (!query) return sorted;
    return sorted.filter((c) => c.name.toLowerCase().includes(query));
  }, [categories, categorySearchValue]);

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
    setCategoryId('');
    setCategorySearchValue('');
    setCategoryPopoverOpen(false);
    setDate(new Date());
    setPaymentMethod('debit');
    setCreditCard(null);
    setDescription('');
    setAmount('');
    setStoreName('');
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
    setCategoryId(
      result.suggested_category_id &&
        categories.some((c) => c.id === result.suggested_category_id)
        ? result.suggested_category_id
        : ''
    );
    if (result.date) {
      const parsed = new Date(`${result.date}T00:00:00`);
      setDate(Number.isNaN(parsed.getTime()) ? new Date() : parsed);
    } else {
      setDate(new Date());
    }
    setDescription(
      result.description ??
        (result.store_name ? `Compra en ${result.store_name}` : '')
    );
    setAmount(String(result.amount));
    setStoreName(result.store_name ?? '');
    setPaymentMethod(
      result.cash_change_detected || result.payment_method === 'cash'
        ? 'cash'
        : (result.payment_method ?? 'debit')
    );
    const lastFour = result.card_last_four;
    setCreditCard(
      lastFour
        ? (creditCards.find(
            (c) => c.is_active && c.last_four_digits === lastFour
          ) ?? null)
        : null
    );
    setLineItems(
      result.line_items.map((li) => ({
        id: nextLineItemId(),
        name: li.name,
        quantity: li.quantity ?? null,
        unit: li.unit ?? null,
        amount: li.amount,
      }))
    );
    setConfirmSubgroups(result.suggested_subgroups.map(() => true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  // ------------------------------------------------------------------
  // Catalog of the selected category (best effort)
  // ------------------------------------------------------------------
  useEffect(() => {
    if (stage !== 'review' && stage !== 'saving') return;
    if (!categoryId || catalogLoadedFor === categoryId) return;
    let cancelled = false;
    setCatalogLoadedFor(categoryId);
    (async () => {
      try {
        const res = await fetch(`/api/categories/${categoryId}/subgroups`);
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
  }, [stage, categoryId, catalogLoadedFor]);

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
          categories: categories
            .slice(0, 500)
            .map((c) => ({ id: c.id, name: c.name })),
          credit_cards_last_four: creditCards
            .filter((c) => c.is_active)
            .map((c) => c.last_four_digits),
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

  const createSubgroupSafe = async (
    name: string
  ): Promise<CategorySubgroup> => {
    const response = await fetch(`/api/categories/${categoryId}/subgroups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (response.status === 409) {
      const existing = catalog.find(
        (sg) => normalizeCatalogName(sg.name) === normalizeCatalogName(name)
      );
      if (existing) return existing;
      // Not in the cached catalog (e.g. created by another device): re-fetch.
      const refreshed = await fetch(`/api/categories/${categoryId}/subgroups`);
      if (refreshed.ok) {
        const subgroups = (await refreshed.json()) as CategorySubgroup[];
        setCatalog(subgroups);
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
  };

  const createItemSafe = async (
    subgroupId: string,
    name: string,
    defaultUnit?: string
  ): Promise<{ id: string }> => {
    const response = await fetch(
      `/api/categories/${categoryId}/subgroups/${subgroupId}/items`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, default_unit: defaultUnit ?? null }),
      }
    );
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error ?? 'No se pudo crear el ítem');
    }
    return response.json();
  };

  const handleSave = async () => {
    if (!categoryId || !activePeriod?.id) {
      setSaveError('Categoría y período son obligatorios');
      return;
    }
    if (!description.trim() || !amount) {
      setSaveError('Descripción y monto son obligatorios');
      return;
    }
    if (!(parsedAmount > 0)) {
      setSaveError('El monto debe ser un número positivo');
      return;
    }
    if (paymentMethod === 'credit' && !creditCard) {
      setSaveError('Seleccioná la tarjeta de crédito');
      return;
    }

    setStage('saving');
    setSaveError(null);

    try {
      // 1. Create the expense, unverified (desktop audit flow).
      const expense = await addExpense(
        categoryId,
        activePeriod.id,
        (date ?? new Date()).toISOString(),
        undefined,
        paymentMethod,
        description.trim(),
        parsedAmount,
        undefined,
        undefined,
        creditCard?.id || undefined,
        false,
        undefined,
        storeName.trim() || undefined,
        false
      );

      // 2. Create the confirmed suggested subgroups + their items (409 → reuse).
      const createdItems = new Map<
        string,
        { itemId: string; subgroupName: string }
      >();
      const confirmedSubgroups: CategorySubgroup[] = [];
      const proposed = result?.suggested_subgroups ?? [];
      for (let i = 0; i < proposed.length; i++) {
        if (!confirmSubgroups[i]) continue;
        const subgroup = await createSubgroupSafe(proposed[i].name);
        confirmedSubgroups.push(subgroup);
        for (const item of proposed[i].items) {
          const key = normalizeCatalogName(item.name);
          if (createdItems.has(key) || catalogIndex.has(key)) continue;
          const created = await createItemSafe(
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

      // 3. Resolve the item_id of every scanned line: existing catalog →
      //    just created → new item inside the first confirmed subgroup.
      const details: ExpenseDetailPayload[] = [];
      for (const li of resolvedLineItems) {
        const key = normalizeCatalogName(li.name);
        let itemId = li.matchedItemId ?? createdItems.get(key)?.itemId;
        if (
          !itemId &&
          confirmedSubgroups.length > 0 &&
          li.name.trim() &&
          li.amount > 0
        ) {
          const created = await createItemSafe(
            confirmedSubgroups[0].id,
            li.name.trim()
          );
          createdItems.set(key, {
            itemId: created.id,
            subgroupName: confirmedSubgroups[0].name,
          });
          itemId = created.id;
        }
        // UpsertExpenseDetailsSchema requires amount > 0: drop zero lines.
        if (itemId && li.amount > 0) {
          details.push({
            item_id: itemId,
            amount: li.amount,
            quantity: li.quantity,
            unit: li.unit,
          });
        }
      }

      // 4. Full-replace details.
      if (details.length > 0) {
        const response = await fetch(`/api/expenses/${expense.id}/details`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ details }),
        });
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(
            data.error ?? 'No se pudo guardar el detalle del gasto'
          );
        }
      }

      toast({
        title: 'Gasto creado',
        description: `El gasto quedó marcado como "Sin verificar" con ${details.length} ítem(s) de detalle. Auditalo desde la lista de gastos.`,
      });
      onSuccess?.();
      resetAndClose();
    } catch (err) {
      setSaveError(
        `${(err as Error).message || 'No se pudo crear el gasto'} — el gasto pudo haberse creado; revisá la lista de gastos antes de reintentar.`
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
            Escanear recibo
          </DialogTitle>
          <DialogDescription>
            Subí la imagen de un recibo escaneado y la IA extrae el gasto con su
            detalle.
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
                componentId="scan-receipt-file-input"
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
                Este gasto se creará como &quot;Sin verificar&quot;. Después lo
                auditás y lo marcás como verificado desde la lista de gastos.
                {imageMeta && imageMeta.sliceCount > 1
                  ? ` El escaneo se leyó en ${imageMeta.sliceCount} franjas combinadas del mismo recibo.`
                  : ''}
              </AlertDescription>
            </Alert>

            <div className="grid gap-2">
              <Label>Categoría *</Label>
              <Popover
                open={categoryPopoverOpen}
                onOpenChange={setCategoryPopoverOpen}
              >
                <PopoverTrigger asChild>
                  <Button
                    componentId="scan-receipt-category-btn"
                    variant="outline"
                    className="w-full justify-between"
                    disabled={busy}
                  >
                    <span className="truncate">
                      {categoryId
                        ? (categories.find((c) => c.id === categoryId)?.name ??
                          'Selecciona una categoría')
                        : 'Selecciona una categoría'}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[--radix-popover-trigger-width] p-0"
                  align="start"
                >
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder="Buscar categoría..."
                      value={categorySearchValue}
                      onValueChange={setCategorySearchValue}
                    />
                    <CommandList>
                      <CommandEmpty>No se encontraron categorías.</CommandEmpty>
                      <CommandGroup>
                        {filteredCategories.map((category) => (
                          <CommandItem
                            key={category.id}
                            value={category.id}
                            onSelect={() => {
                              setCategoryId(category.id);
                              setCategoryPopoverOpen(false);
                              setCategorySearchValue('');
                            }}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                categoryId === category.id
                                  ? 'opacity-100'
                                  : 'opacity-0'
                              )}
                            />
                            {category.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {suggestedCategory && (
                <p className="text-xs text-muted-foreground">
                  Sugerida por la IA: {suggestedCategory.name}
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Label>Período</Label>
              <p className="text-sm text-muted-foreground">
                {activePeriod ? activePeriod.name : 'Sin período activo'}
              </p>
            </div>

            <div className="grid gap-2">
              <Label>Fecha *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    componentId="scan-receipt-date-btn"
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !date && 'text-muted-foreground'
                    )}
                    disabled={busy}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? (
                      formatDate(date)
                    ) : (
                      <span>Selecciona una fecha</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid gap-2">
              <Label>Medio de Pago *</Label>
              {cashLocked ? (
                <p className="text-sm text-muted-foreground">
                  Efectivo (la factura muestra entrega y cambio)
                </p>
              ) : (
                <RadioGroup
                  value={paymentMethod}
                  onValueChange={(value) =>
                    setPaymentMethod(value as PaymentMethod)
                  }
                  className="flex space-x-4"
                  disabled={busy}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="debit" id="scan-pay-debit" />
                    <Label htmlFor="scan-pay-debit">Tarjeta de Débito</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="credit" id="scan-pay-credit" />
                    <Label htmlFor="scan-pay-credit">Tarjeta de Crédito</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="cash" id="scan-pay-cash" />
                    <Label htmlFor="scan-pay-cash">Efectivo</Label>
                  </div>
                </RadioGroup>
              )}
            </div>

            {paymentMethod === 'credit' && (
              <div className="grid gap-2">
                <Label>Tarjeta de Crédito *</Label>
                <CreditCardSelector
                  selectedCreditCard={creditCard}
                  onCreditCardChange={setCreditCard}
                  placeholder="Seleccionar tarjeta de crédito..."
                  showNoCardOption={true}
                  showOnlyActive={true}
                  disabled={busy}
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="scan-description">Descripción *</Label>
                <Input
                  componentId="scan-receipt-description-input"
                  id="scan-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={busy}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="scan-amount">Monto *</Label>
                <Input
                  componentId="scan-receipt-amount-input"
                  id="scan-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={busy}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="scan-store">Tienda / Comercio</Label>
              <Input
                componentId="scan-receipt-store-input"
                id="scan-store"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                disabled={busy}
              />
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
                    La suma de los ítems no coincide con el monto total
                    (descuentos/impuestos). El monto del gasto es el total
                    pagado.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {(result.suggested_subgroups ?? []).length > 0 && (
              <div className="grid gap-2">
                <Label>Subcategorías sugeridas</Label>
                <p className="text-xs text-muted-foreground">
                  Se crearán en el catálogo de la categoría para reutilizarlos
                  en próximos recibos.
                </p>
                <div className="space-y-2">
                  {result.suggested_subgroups.map((subgroup, index) => (
                    <div
                      key={`${subgroup.name}-${index}`}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium">{subgroup.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {subgroup.items.map((item) => item.name).join(', ')}
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
              </div>
            )}

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
                componentId="scan-receipt-cancel"
                variant="outline"
                onClick={resetAndClose}
              >
                Cancelar
              </Button>
              <Button
                componentId="scan-receipt-analyze"
                onClick={handleAnalyze}
                disabled={!file}
              >
                Analizar recibo
              </Button>
            </>
          )}
          {stage === 'analyzing' && (
            <Button
              componentId="scan-receipt-cancel-analysis"
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
                componentId="scan-receipt-back"
                variant="outline"
                onClick={() => setStage('upload')}
                disabled={busy}
              >
                Volver
              </Button>
              <Button
                componentId="scan-receipt-save"
                onClick={handleSave}
                disabled={busy}
              >
                {stage === 'saving' ? 'Guardando…' : 'Guardar gasto'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
