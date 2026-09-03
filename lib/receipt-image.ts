/**
 * Receipt image preprocessing for desktop scans.
 *
 * The mobile app captures a long receipt as several photos; the desktop flow
 * receives ONE image (typically a scanner export of the whole receipt). Vision
 * providers downscale any image whose long edge exceeds ~1568px, which would
 * make a tall scan illegible — so we slice it in the browser into vertical
 * strips with overlap and send them as `images[]` to
 * `POST /api/expenses/scan-receipt`, reusing the same prompt-level merge the
 * multi-photo mobile flow relies on.
 *
 * The pure math (`computeSliceRanges`, `validateReceiptFile`) lives apart from
 * the canvas code (`prepareReceiptImage`) because jsdom has no canvas.
 */

// Parity with the mobile app (phone-budget-tracker/app/escanear-recibo.tsx).
export const MAX_IMAGE_DIMENSION = 1024;
export const JPEG_QUALITY = 0.55;
// Must match MAX_RECEIPT_IMAGES in app/api/expenses/scan-receipt/route.ts.
export const MAX_RECEIPT_IMAGES = 6;

// Vision providers downscale images with a long edge above ~1568px, so each
// slice stays under that to preserve legibility.
export const MAX_SLICE_HEIGHT = 1568;
export const TARGET_SLICE_HEIGHT = 1400;
export const OVERLAP_FRACTION = 0.12;

export const MAX_FILE_BYTES = 25 * 1024 * 1024;

export const ACCEPTED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export type ScanMimeType = (typeof ACCEPTED_IMAGE_MIME_TYPES)[number];

export interface SliceRange {
  start: number;
  end: number;
}

export interface SlicePlanOptions {
  maxSlices?: number;
  targetSliceHeight?: number;
  overlapFraction?: number;
  maxSliceHeight?: number;
}

/** Una franja lista para enviar al backend (base64 SIN prefijo data:). */
export interface ScanImagePayload {
  image_base64: string;
  mime_type: 'image/jpeg';
}

export interface PreparedReceiptImageMeta {
  originalWidth: number;
  originalHeight: number;
  scaledWidth: number;
  scaledHeight: number;
  sliceCount: number;
}

export interface PreparedReceiptImages {
  images: ScanImagePayload[];
  meta: PreparedReceiptImageMeta;
}

/**
 * Pure. Computes vertical slice ranges (in the pixel space of the dimensions
 * passed in) that cover the whole height with overlap between consecutive
 * slices. Returns a single full-height range when the image is short enough.
 *
 * Invariants: first range starts at 0, the last range ends at `scaledHeight`,
 * starts are strictly increasing, every range has end > start, consecutive
 * ranges overlap, and there are never more than `maxSlices` ranges.
 */
export function computeSliceRanges(
  scaledHeight: number,
  scaledWidth: number,
  options: SlicePlanOptions = {}
): SliceRange[] {
  const maxSlices = options.maxSlices ?? MAX_RECEIPT_IMAGES;
  const targetSliceHeight = options.targetSliceHeight ?? TARGET_SLICE_HEIGHT;
  const overlapFraction = options.overlapFraction ?? OVERLAP_FRACTION;
  const maxSliceHeight = options.maxSliceHeight ?? MAX_SLICE_HEIGHT;

  if (
    !Number.isFinite(scaledHeight) ||
    !Number.isFinite(scaledWidth) ||
    scaledHeight <= 0 ||
    scaledWidth <= 0
  ) {
    return [];
  }

  if (scaledHeight <= maxSliceHeight) {
    return [{ start: 0, end: scaledHeight }];
  }

  const overlap = Math.round(targetSliceHeight * overlapFraction);
  const usable = Math.max(1, targetSliceHeight - overlap);
  const count = Math.min(
    maxSlices,
    Math.max(2, Math.ceil(scaledHeight / usable))
  );
  const step = Math.ceil(scaledHeight / count);
  const sliceHeight = Math.min(
    scaledHeight,
    Math.ceil(step * (1 + overlapFraction))
  );

  const ranges: SliceRange[] = [];
  let prevStart = -1;
  for (let i = 0; i < count; i++) {
    // Never move a slice backwards past its predecessor: keep starts strictly
    // increasing even in the clamped case.
    const start = Math.max(
      Math.min(i * step, scaledHeight - sliceHeight),
      prevStart + 1
    );
    if (start >= scaledHeight) break;
    const end = Math.min(scaledHeight, start + sliceHeight);
    ranges.push({ start, end });
    prevStart = start;
  }
  return ranges;
}

/**
 * Pure. Validates a receipt upload, returning a Spanish error message or null
 * when the file is acceptable.
 */
export function validateReceiptFile(file: File): string | null {
  if (!(ACCEPTED_IMAGE_MIME_TYPES as readonly string[]).includes(file.type)) {
    return 'Formato no soportado. Usá una imagen JPG, PNG o WEBP.';
  }
  if (file.size > MAX_FILE_BYTES) {
    return 'La imagen es demasiado grande (máximo 25 MB).';
  }
  if (file.size === 0) {
    return 'El archivo está vacío.';
  }
  return null;
}

// ---------------------------------------------------------------------------
// Canvas pipeline (not unit tested — jsdom has no canvas)
// ---------------------------------------------------------------------------

type DecodedImage = ImageBitmap | HTMLImageElement;

async function decodeImage(file: File): Promise<DecodedImage> {
  if (typeof createImageBitmap === 'function') {
    return createImageBitmap(file, { imageOrientation: 'from-image' });
  }
  // Safari < 15 fallback.
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    if (typeof img.decode === 'function') {
      await img.decode();
    } else {
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('No se pudo leer la imagen.'));
      });
    }
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function getImageSize(image: DecodedImage): {
  width: number;
  height: number;
} {
  const img = image as HTMLImageElement;
  const width = img.naturalWidth || img.width;
  const height = img.naturalHeight || img.height;
  return { width, height };
}

function canvasToBase64(canvas: HTMLCanvasElement): Promise<string> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('No se pudo comprimir la imagen.'));
          return;
        }
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          const base64 = dataUrl.split(',')[1] ?? '';
          if (!base64) {
            reject(new Error('No se pudo comprimir la imagen.'));
            return;
          }
          resolve(base64);
        };
        reader.onerror = () =>
          reject(new Error('No se pudo comprimir la imagen.'));
        reader.readAsDataURL(blob);
      },
      'image/jpeg',
      JPEG_QUALITY
    );
  });
}

/**
 * Decodes a receipt image, scales it to `MAX_IMAGE_DIMENSION` wide, slices it
 * into overlapping JPEG strips (one small canvas per strip, never one giant
 * canvas) and returns them as base64 payloads for the scan endpoint.
 */
export async function prepareReceiptImage(
  file: File
): Promise<PreparedReceiptImages> {
  const validationError = validateReceiptFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

  const image = await decodeImage(file);
  try {
    const { width: sourceWidth, height: sourceHeight } = getImageSize(image);
    if (!sourceWidth || !sourceHeight) {
      throw new Error('No se pudo leer la imagen.');
    }

    const scale = Math.min(1, MAX_IMAGE_DIMENSION / sourceWidth);
    const scaledWidth = Math.max(1, Math.round(sourceWidth * scale));
    const scaledHeight = Math.max(1, Math.round(sourceHeight * scale));

    const ranges = computeSliceRanges(scaledHeight, scaledWidth);
    // scaled → source coordinate ratio.
    const ratio = sourceHeight / scaledHeight;

    const images: ScanImagePayload[] = [];
    for (const range of ranges) {
      const sourceY = Math.min(
        sourceHeight - 1,
        Math.floor(range.start * ratio)
      );
      const sourceBottom = Math.max(
        sourceY + 1,
        Math.min(sourceHeight, Math.ceil(range.end * ratio))
      );
      const sourceSliceHeight = sourceBottom - sourceY;
      const sliceScaledHeight = Math.max(
        1,
        Math.round(sourceSliceHeight / ratio)
      );

      const canvas = document.createElement('canvas');
      canvas.width = scaledWidth;
      canvas.height = sliceScaledHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error(
          'Tu navegador no soporta el procesamiento de imágenes.'
        );
      }
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(
        image as CanvasImageSource,
        0,
        sourceY,
        sourceWidth,
        sourceSliceHeight,
        0,
        0,
        scaledWidth,
        sliceScaledHeight
      );
      images.push({
        image_base64: await canvasToBase64(canvas),
        mime_type: 'image/jpeg',
      });
    }

    return {
      images,
      meta: {
        originalWidth: sourceWidth,
        originalHeight: sourceHeight,
        scaledWidth,
        scaledHeight,
        sliceCount: images.length,
      },
    };
  } finally {
    if (typeof (image as ImageBitmap).close === 'function') {
      (image as ImageBitmap).close();
    }
  }
}
