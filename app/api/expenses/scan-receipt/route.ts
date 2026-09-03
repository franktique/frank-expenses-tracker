import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getActiveProvider } from '@/lib/assistant/providers';
import { analyzeReceiptImage } from '@/lib/assistant/vision';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Recibos multi-foto le dan al backend hasta 120s (ver SCAN_MULTI_TIMEOUT_MS
// en la app móvil): sin esto, Vercel corta la función con su timeout default,
// que es más corto que eso.
export const maxDuration = 120;

/**
 * POST /api/expenses/scan-receipt
 *
 * Analiza la(s) foto(s) de un recibo con el modelo de visión del proveedor IA
 * activo (campo `vision_model`, o `model` si está vacío) y devuelve los datos
 * estructurados para crear un gasto. La API key del proveedor nunca sale del
 * servidor.
 *
 * Un recibo largo puede enviarse como varias fotos (1..6) del mismo recibo:
 * el modelo las combina en un único resultado (sin duplicar líneas que
 * aparezcan en más de una foto).
 *
 * Body (modo una foto — compatibilidad con builds anteriores):
 *   image_base64: string        — imagen base64 (sin prefijo data:), ≤ 6MB
 *   mime_type: image/jpeg|png|webp
 *   categories?: {id,name}[]    — categorías disponibles para sugerir una
 *   credit_cards_last_four?: string[]
 *
 * Body (modo varias fotos):
 *   images: [{ image_base64: string, mime_type: image/jpeg|png|webp }]  (1..6)
 *   categories?: {id,name}[]
 *   credit_cards_last_four?: string[]
 *
 * Respuesta: { ok: true, result: ReceiptScanResult }
 */

const MAX_IMAGE_BASE64_LENGTH = 6 * 1024 * 1024; // ~6MB raw base64 por imagen
const MAX_RECEIPT_IMAGES = 6;

const MimeTypeSchema = z.enum(['image/jpeg', 'image/png', 'image/webp']);

const ReceiptImageSchema = z.object({
  image_base64: z
    .string()
    .min(100, 'La imagen está vacía o es demasiado pequeña')
    .max(
      MAX_IMAGE_BASE64_LENGTH,
      'La imagen excede el tamaño máximo permitido (6MB)'
    ),
  mime_type: MimeTypeSchema,
});

const ScanReceiptSchema = z
  .object({
    // Modo una foto (legado). Se ignora si viene `images`.
    image_base64: z
      .string()
      .min(100, 'La imagen está vacía o es demasiado pequeña')
      .max(
        MAX_IMAGE_BASE64_LENGTH,
        'La imagen excede el tamaño máximo permitido (6MB)'
      )
      .optional(),
    mime_type: MimeTypeSchema.optional(),
    // Modo varias fotos del mismo recibo.
    images: z
      .array(ReceiptImageSchema)
      .min(1, 'Enviá al menos una foto')
      .max(MAX_RECEIPT_IMAGES, `Máximo ${MAX_RECEIPT_IMAGES} fotos por recibo`)
      .optional(),
    categories: z
      .array(
        z.object({
          id: z.string().min(1),
          name: z.string().min(1),
        })
      )
      .max(500)
      .optional()
      .default([]),
    credit_cards_last_four: z
      .array(z.string().regex(/^\d{4}$/, 'Debe ser de 4 dígitos'))
      .max(50)
      .optional()
      .default([]),
  })
  .refine(
    (data) =>
      data.images !== undefined ||
      (data.image_base64 !== undefined && data.mime_type !== undefined),
    {
      message:
        'Enviá image_base64 + mime_type (una foto) o images (varias fotos)',
    }
  );

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
    }

    const validation = ScanReceiptSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error:
            validation.error.issues[0]?.message ?? 'Datos de escaneo inválidos',
          details: validation.error.issues,
        },
        { status: 400 }
      );
    }

    const {
      image_base64,
      mime_type,
      images,
      categories,
      credit_cards_last_four,
    } = validation.data;

    // Normalizar a la lista de fotos: modo varias fotos (`images`) o, si viene
    // el modo legado de una foto, convertirlo en un array de un elemento.
    const receiptImages =
      images ??
      (image_base64 !== undefined && mime_type !== undefined
        ? [{ image_base64, mime_type }]
        : []);
    if (receiptImages.length === 0) {
      return NextResponse.json(
        { error: 'Enviá image_base64 + mime_type, o images' },
        { status: 400 }
      );
    }

    const config = await getActiveProvider();
    if (!config) {
      return NextResponse.json(
        {
          error:
            'No hay proveedor de IA activo. Configúralo en el desktop (engranaje del asistente).',
        },
        { status: 400 }
      );
    }

    const startedAt = Date.now();
    const outcome = await analyzeReceiptImage(config, {
      images: receiptImages.map((img) => ({
        imageBase64: img.image_base64,
        mimeType: img.mime_type,
      })),
      categories,
      creditCardsLastFour: credit_cards_last_four,
    });
    const providerMs = Date.now() - startedAt;
    const totalBase64Bytes = receiptImages.reduce(
      (sum, img) => sum + img.image_base64.length,
      0
    );
    console.log(
      `[scan-receipt] proveedor: ${config.name ?? config.protocol}, ` +
        `fotos: ${receiptImages.length}, ` +
        `total: ${Math.round(totalBase64Bytes / 1024)}KB base64, ` +
        `provider call: ${providerMs}ms`
    );

    if (!outcome.ok) {
      return NextResponse.json({ error: outcome.error }, { status: 502 });
    }

    return NextResponse.json({
      ok: true,
      result: outcome.result,
      timing: {
        provider_ms: providerMs,
        image_base64_bytes: totalBase64Bytes,
        images_count: receiptImages.length,
      },
    });
  } catch (error) {
    console.error('Error scanning receipt:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
