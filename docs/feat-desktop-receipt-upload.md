# feat: Escanear recibos desde desktop (subida de imagen de escáner)

## Overview

Desktop ya tenía el backend de visión (`POST /api/expenses/scan-receipt`, compartido con la app móvil) y el flujo de auditoría (`is_verified` / "Sin verificar"), pero ninguna UI de captura: el escaneo solo era posible desde el móvil. Esta feature agrega un botón **"Escanear recibo"** en `/gastos` que abre un diálogo para subir **una sola imagen** (típico scan de escáner con el recibo completo), la trocea en el navegador y reutiliza el mismo endpoint + prompt de fusión del flujo multi-foto móvil.

## Requirements

- Aceptar un archivo de imagen (JPG/PNG/WebP) por drag-and-drop o file picker. Sin PDF.
- Recibos largos: conservar legibilidad pese al downscaling de los proveedores de visión (borde largo ~1568px).
- Extraer gasto + líneas y dejar el gasto como `is_verified: false` (flujo de auditoría existente).
- Crear/reutilizar subcategorías e ítems del catálogo y guardar el detalle (`expense_details`).
- Sin dependencias nuevas y sin cambios de backend.

## Decisions

| Decisión           | Elección                                                                   | Razón                                                                                                                                              |
| ------------------ | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Entrada            | Botón en `/gastos`                                                         | El usuario la confirmó; evita página nueva                                                                                                         |
| Formatos           | Solo imágenes                                                              | El backend solo acepta jpeg/png/webp; PDF requeriría rasterizar (fuera de alcance)                                                                 |
| Revisión           | Diálogo dedicado de 4 etapas                                               | Espejo de `revisar-recibo.tsx` del móvil; `ExpenseFormDialog` no soporta prefill ni ítems                                                          |
| Recibo largo       | Slicing client-side con solapamiento                                       | Los proveedores reducen imágenes altas a ~1568px y el texto se vuelve ilegible; 6 franjas de 1024×~1400 legibles ≫ 1 imagen de 1024×12000 ilegible |
| Creación del gasto | Extender `addExpense` (14º param `isVerified`, retorno `Promise<Expense>`) | El flujo necesita `expense.id` para catálogo y detalles; `updateExpense` ya terminaba en `isVerified?` — misma convención                          |

## Current State Analysis (antes de la feature)

- `app/api/expenses/scan-receipt/route.ts`: acepta `images[]` 1..6 (base64 ≤6MB, sin prefijo `data:`) o el formato legacy de 1 imagen; devuelve `ReceiptScanResult` + timing. Sin ningún caller de UI en desktop.
- `lib/assistant/vision.ts`: el prompt agrega reglas de fusión/dedup solo cuando `images.length > 1`; con 1 imagen usa "Analiza la imagen del recibo." — agnóstico al origen de las imágenes.
- `context/budget-context.tsx`: `addExpense` devolvía `Promise<void>` y descartaba la respuesta.
- Sin helpers de imagen en el repo (no había canvas/FileReader en ningún componente).

## Implementation

### 1. `lib/receipt-image.ts`

Constantes en paridad con el móvil (`escanear-recibo.tsx`): `MAX_IMAGE_DIMENSION=1024`, `JPEG_QUALITY=0.55`, `MAX_RECEIPT_IMAGES=6`, `MAX_SLICE_HEIGHT=1568`, `TARGET_SLICE_HEIGHT=1400`, `OVERLAP_FRACTION=0.12`.

- `computeSliceRanges(height, width, opts)` (pura): 1 franja si `height <= 1568`; si no, `count = clamp(ceil(h/(target−overlap)), 2, 6)`, `step = ceil(h/count)`, franjas de `ceil(step×1.12)` con starts crecientes y solape real. Cubre `[0, height]` completo.
- `validateReceiptFile(file)` (pura): mensajes en español para formato/25MB/vacío.
- `prepareReceiptImage(file)` (canvas): `createImageBitmap({imageOrientation:'from-image'})` con fallback `HTMLImageElement` (Safari<15) → escala a 1024 de ancho → **un canvas por franja** (nunca un canvas gigante: evita el techo de área de canvas de Safari) → `toBlob('image/jpeg', 0.55)` → `FileReader` → base64 sin prefijo.

### 2. `lib/receipt-catalog.ts`

`normalizeCatalogName` (lowercase → sin diacríticos NFD → no-alfanuméricos a espacio, paridad móvil), `buildCatalogItemIndex` (nombre normalizado → `{itemId, subgroupName}`, primera ocurrencia gana), `sumLineAmounts`, `hasSumMismatch` (tolerancia 0.5, paridad móvil).

### 3. `components/scan-receipt-dialog.tsx`

Máquina de etapas `upload → analyzing → review → saving`:

- **upload**: drop zone + `<input type="file" accept="image/jpeg,image/png,image/webp">`, preview con object URL (revocado al reemplazar/desmontar), errores de validación en Alert.
- **analyzing**: `Progress` + contador de segundos (paridad móvil); `POST /api/expenses/scan-receipt` con `images[]`, `categories` (máx 500) y `credit_cards_last_four`; `AbortController` con timeout 120s; errores 400/502 vuelven a upload con Alert destructiva.
- **review**: prefill paridad con `revisar-recibo.tsx` (categoría sugerida si existe, fecha, descripción `Compra en {tienda}`, monto, tienda, efectivo forzado si `cash_change_detected`, tarjeta por `card_last_four`); ítems editables con badge de match de catálogo; Alert de descuadre `|Σítems − monto| > 0.5`; Switches de subcategorías sugeridas (default on); nota de que se creará "Sin verificar".
- **saving**: valida → `addExpense(..., false)` → subgrupos confirmados (`POST /api/categories/{id}/subgroups`, **409 → reutilizar**) + ítems (saltando los que ya existen en catálogo; 409 tolerado) → resuelve `item_id` por línea (catálogo → creado → nuevo en el primer subgrupo confirmado) **filtrando `amount > 0`** (`UpsertExpenseDetailsSchema` exige positivo; una línea en 0 haría 400 al PUT con el gasto ya creado) → `PUT /api/expenses/{id}/details` → toast + `onSuccess`. En error vuelve a review advirtiendo que el gasto pudo haberse creado.

Cierre bloqueado durante analyzing/saving (`onInteractOutside`/`onEscapeKeyDown`).

### 4. `context/budget-context.tsx`

`addExpense` gana `isVerified?: boolean` (14º parámetro, simétrico a `updateExpense`), envía `is_verified` y retorna `Promise<Expense>` con `setExpenses` funcional (fix de closure rancia, como `deleteExpense`). Los 3 call sites existentes ignoran el retorno → compatible.

### 5. `components/expenses-view.tsx`

Botón outline `expenses-scan-btn` "Escanear recibo" junto a "Nuevo Gasto" (contenedor con `flex-wrap`) + `<ExpenseScanDialog onSuccess={handleExpenseAdded} />`. La auditoría usa la superficie existente: badge "Sin verificar", filtro `?verification=unverified`, `markVerified`.

## Testing

- `lib/__tests__/receipt-image.test.ts` — validación de archivos y todas las invariantes del slicing (cobertura, solape, starts crecientes, clamp a 6, maxSlices custom, efecto del overlapFraction).
- `lib/__tests__/receipt-catalog.test.ts` — normalización, índice, primera ocurrencia, suma, tolerancia 0.5.
- `components/__tests__/scan-receipt-dialog.test.tsx` — etapa upload: hint, `accept`, botón deshabilitado sin archivo, error con PDF, preview + habilitación con imagen válida. Stubs: `URL.createObjectURL/revokeObjectURL`, `prepareReceiptImage` mockeado con `requireActual` (validadores reales), `Calendar` y `CreditCardSelector` mockeados, y **`addExpense` resuelve `{ id }`** (el diálogo lee `expense.id`).

## E2E manual

`pnpm dev` (password `123`) → `/gastos` → "Escanear recibo": PDF → error; scan alto → barra de progreso/segundos y log `[scan-receipt] … fotos: N`; review con prefill y badges; editar montos → Alert de descuadre; guardar → toast "Sin verificar" + N ítems, fila con badge en `/gastos`, visible en el filtro de auditoría, `markVerified` la limpia; `expense-detail-dialog` muestra los ítems; re-escanear el mismo recibo reutiliza los 409 sin error.

## Known limits / follow-ups

- `max_tokens` (4096 default) + tope de 60 líneas del prompt: un recibo muy largo puede truncar el JSON → 502 legible en la Alert. Seguimiento: subir `ASSISTANT_MAX_TOKENS`.
- Con 6 franjas de scans >12000px, cada franja queda ~2240px (>1568) y el proveedor aún escala ~0.7×; aceptable (4× mejor que una sola imagen).
- El fallback de 409 en ítems corrige un bug latente también presente en `revisar-recibo.tsx` (móvil); candidato a back-port.
