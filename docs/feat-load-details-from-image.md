# feat: Cargar detalle desde imagen para gastos existentes

## Overview

El botón de detalle de la lista de `/gastos` coloreaba naranja/gris según si la **categoría** tenía catálogo (`categoryCatalogMap`), no según el estado real del gasto, y no existía ninguna señal per-expense de "tiene detalles". Esta feature cambia la semántica a **verde = el gasto TIENE detalles** (gris = no tiene), agrega un **pop-up de hover** con la opción **"Cargar detalle desde imagen"** para gastos sin detalles, y reutiliza el pipeline de visión existente para adjuntar detalles a un gasto **ya creado**, creando dinámicamente el catálogo (subgrupos/ítems) cuando la categoría no lo tiene — paridad con el flujo móvil (`phone-budget-tracker/app/escanear-recibo.tsx`).

## Requirements

- Color del botón por gasto: verde (`has_details`) / gris (sin detalles), nunca deshabilitado.
- Hover sobre el botón gris → HoverCard con "Cargar detalle desde imagen" (el click sigue abriendo el editor manual).
- Escanear una imagen del recibo (mismo endpoint `POST /api/expenses/scan-receipt`), revisar y confirmar; al aceptar se hace `PUT /api/expenses/{id}/details` sobre el gasto existente (sin crear gasto nuevo).
- Funciona con categorías **sin catálogo**: la visión sugiere y crea subgrupos/ítems; si no sugiere nada, se sintetiza un destino "General".
- Si el recibo detecta tienda y el gasto no tiene `store_name`, la confirmación la completa (`PUT /api/expenses/{id}`).
- Sin cambios de schema, sin endpoints nuevos.

## Decisions

| Decisión                    | Elección                                                                      | Razón                                                                                                                                                          |
| --------------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Señal "tiene detalles"      | `EXISTS` subselect en el `GET /api/expenses` (+ `has_details: false` en POST) | Una query, siempre consistente con la fila; `idx_expense_details_expense_id` ya existe. Un endpoint batch replicaría el patrón `catalog-status` que se elimina |
| Color del botón             | Verde/gris por `expense.has_details`                                          | Decisión del usuario; reemplaza la semántica por-categoría naranja/gris                                                                                        |
| Pop-up                      | Radix `HoverCard` controlado (`open` + mouse handlers propios)                | Primera vez que se usa `components/ui/hover-card.tsx`; cierre determinístico al elegir la opción y testeable en jsdom                                          |
| Diálogo de escaneo          | Componente nuevo `expense-detail-scan-dialog.tsx`                             | El flujo sobre gasto existente no edita categoría/fecha/medio/monto ni crea gasto; `ExpenseScanDialog` está centrado en `addExpense`                           |
| Create-or-reuse de catálogo | Extraído a `lib/receipt-catalog-sync.ts`                                      | Mismas semánticas para ambos diálogos; `createOrReuseItem` agrega tolerancia 409 que `createItemSafe` no tenía                                                 |
| Refresh tras guardar        | `patchExpense(id, patch)` local en el contexto                                | `refreshData()` hace 6+ requests por un cambio de una fila; `updateExpense` re-ejecuta la lógica de balances de fondos                                         |

## Implementation

### 1. `has_details` en la lista

- `app/api/expenses/route.ts`: `EXISTS (SELECT 1 FROM expense_details ed WHERE ed.expense_id = e.id) AS has_details` en las **3 ramas** del GET (tarjeta/fondo/todas); `has_details: false` explícito en el transform del POST (el re-select usa `e.*`).
- `types/funds.ts`: `Expense.has_details?: boolean`.

### 2. `context/budget-context.tsx`

`patchExpense(id, patch: Partial<Expense>)` — solo `setExpenses` local.

### 3. `lib/receipt-catalog-sync.ts`

- `createOrReuseSubgroup(categoryId, name, { knownSubgroups?, onCatalogRefreshed? })` — 409 → match normalizado o re-fetch.
- `createOrReuseItem(categoryId, subgroupId, name, defaultUnit?)` — 409 → `GET .../items` y reutilizar (fix de carrera).
- `pickItemIdForLine(line, catalogIndex, createdItems)` — match propio → catálogo → creado.
- `planExpenseDetailRows(lines, catalogIndex, createdItems)` — pura; descarta `amount <= 0` y sin ítem; **deduplica por `item_id` sumando montos** (`uq_expense_item`); retorna `{ details, skippedLineIds, unmatchedLineCount }`.

### 4. `components/expense-detail-action.tsx`

Botón `List` por fila (verde/gris según `has_details`, `componentId="expenses-detail-btn-{id}"`, nunca disabled). Sin detalles se envuelve en `HoverCard` (`side="left"`) con: aviso, botón `Camera` "Cargar detalle desde imagen" y hint del click manual. Con detalles no hay HoverCard.

### 5. `components/expense-detail-scan-dialog.tsx`

Máquina `upload → analyzing → review → saving` (paridad con `scan-receipt-dialog.tsx`):

- **analyzing**: `prepareReceiptImage` → `POST /api/expenses/scan-receipt` con `categories: [la del gasto]` y 120s de timeout/abort.
- **review**: resumen de solo lectura (categoría/fecha/monto), tienda prellenada (`expense.store_name` gana; si no, la del recibo con badge "Detectada en el recibo"), ítems editables con badges `Catálogo / Nuevo`, Alert de descuadre (tolerancia 0.5, no bloquea), switches de subcategorías destino (**"General" sintético si el modelo no sugiere ninguna**), y **guarda bloqueado** si hay ítems nuevos sin destino.
- **saving**: create/reuse catálogo → fallback de ítems nuevos en el primer subgrupo confirmado → `planExpenseDetailRows` → `PUT /api/expenses/{id}/details` (replace total; el gasto no tenía filas) → tienda aislada (su fallo no revierte detalles, solo warning en el toast) → toast + `onSaved({ hasDetails: true, storeName })`.

### 6. `components/expenses-view.tsx`

- Se elimina `categoryCatalogMap` y el fetch a `/api/categories/catalog-status` (ruta sin más consumidores; candidata a eliminación en un follow-up).
- `<ExpenseDetailAction>` reemplaza el botón inline; `<ExpenseDetailScanDialog>` junto a `ExpenseDetailDialog`.
- `handleDetailScanSaved` / `handleManualDetailSaved` → `patchExpense` (patch explícito para no borrar `store_name` con `undefined`).

### 7. `components/expense-detail-dialog.tsx`

`onSuccess` ahora recibe `{ hasDetails: boolean }` (`details.length > 0`) para recolorear el botón también en guardados manuales; hint de carga por imagen en el estado de catálogo vacío.

## Edge cases

- `has_details === undefined` (gasto recién creado) → gris con pop-up.
- Touch: sin hover → tap abre el editor manual (el pop-up nunca es puerta).
- Líneas duplicadas al mismo ítem → fusionadas (evita 500 por `uq_expense_item`).
- Todas las líneas `amount <= 0` → error explícito antes del PUT.
- Detalles OK + tienda falla → toast de éxito con advertencia; `onSaved` se emite igual.

## Testing

- `lib/__tests__/receipt-catalog-sync.test.ts` — resolución de ítems y planificación (descartes, dedupe, unmatched).
- `components/__tests__/expense-detail-action.test.tsx` — verde/gris, pop-up solo sin detalles, callbacks.
- `components/__tests__/expense-detail-scan-dialog.test.tsx` — upload/review/saving con fetch enrutado por colas: badges, prefill de tienda, descuadre, "General" sintético, guarda bloqueada, orden de requests del happy path, 409 → reutiliza, fallo del PUT → vuelta a review.
- `app/api/expenses/__tests__/route.test.ts` — EXISTS en las 3 ramas del GET, `has_details` en filas, override `false` del POST.

## E2E manual

`curl -X POST http://localhost:3000/api/migrate-expense-details` (precondición) → `pnpm dev` (password `123`) → `/gastos`: gasto con detalles verde y sin pop-up; gasto gris muestra el pop-up al hover y el click abre el editor manual; gasto de categoría sin catálogo → imagen → confirmación → Guardar → botón verde, tienda completada, catálogo creado; guardado/eliminación manual recolorea sin recargar; PDF o >25MB → error en español.

## Known limits / follow-ups

- `catalog-status` queda sin consumidores (eliminación en follow-up).
- `scan-receipt-dialog.tsx` aún usa sus `createSubgroupSafe`/`createItemSafe` internos; migrar a `lib/receipt-catalog-sync.ts` le heredaría la tolerancia 409 de ítems (candidato a back-port junto al fix del móvil).
