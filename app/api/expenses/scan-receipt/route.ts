import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getActiveProvider } from '@/lib/assistant/providers';
import { analyzeReceiptImage } from '@/lib/assistant/vision';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/expenses/scan-receipt
 *
 * Analiza la foto de un recibo con el modelo de visión del proveedor IA activo
 * (campo `vision_model`, o `model` si está vacío) y devuelve los datos
 * estructurados para crear un gasto. La API key del proveedor nunca sale del
 * servidor.
 *
 * Body:
 *   image_base64: string        — imagen base64 (sin prefijo data:), ≤ 6MB
 *   mime_type: image/jpeg|png|webp
 *   categories?: {id,name}[]    — categorías disponibles para sugerir una
 *   credit_cards_last_four?: string[]
 *
 * Respuesta: { ok: true, result: ReceiptScanResult }
 */

const MAX_IMAGE_BASE64_LENGTH = 6 * 1024 * 1024; // ~6MB raw base64

const ScanReceiptSchema = z.object({
  image_base64: z
    .string()
    .min(100, 'La imagen está vacía o es demasiado pequeña')
    .max(
      MAX_IMAGE_BASE64_LENGTH,
      'La imagen excede el tamaño máximo permitido (6MB)'
    ),
  mime_type: z.enum(['image/jpeg', 'image/png', 'image/webp']),
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
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { error: 'JSON inválido' },
        { status: 400 }
      );
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

    const { image_base64, mime_type, categories, credit_cards_last_four } =
      validation.data;

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

    const outcome = await analyzeReceiptImage(config, {
      imageBase64: image_base64,
      mimeType: mime_type,
      categories,
      creditCardsLastFour: credit_cards_last_four,
    });

    if (!outcome.ok) {
      return NextResponse.json({ error: outcome.error }, { status: 502 });
    }

    return NextResponse.json({ ok: true, result: outcome.result });
  } catch (error) {
    console.error('Error scanning receipt:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
