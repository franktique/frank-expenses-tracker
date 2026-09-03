import {
  ACCEPTED_IMAGE_MIME_TYPES,
  MAX_FILE_BYTES,
  MAX_RECEIPT_IMAGES,
  MAX_SLICE_HEIGHT,
  computeSliceRanges,
  validateReceiptFile,
} from '../receipt-image';

const makeFile = (
  parts: BlobPart[],
  name: string,
  options: FilePropertyBag
): File => new File(parts, name, options);

describe('validateReceiptFile', () => {
  it('accepts a JPEG file', () => {
    const file = makeFile([new Uint8Array(10)], 'recibo.jpg', {
      type: 'image/jpeg',
    });
    expect(validateReceiptFile(file)).toBeNull();
  });

  it('accepts PNG and WEBP files', () => {
    for (const type of ['image/png', 'image/webp'] as const) {
      const file = makeFile([new Uint8Array(10)], 'recibo', { type });
      expect(validateReceiptFile(file)).toBeNull();
    }
    expect(ACCEPTED_IMAGE_MIME_TYPES).toContain('image/webp');
  });

  it('rejects a PDF with a Spanish message', () => {
    const file = makeFile([new Uint8Array(10)], 'recibo.pdf', {
      type: 'application/pdf',
    });
    expect(validateReceiptFile(file)).toBe(
      'Formato no soportado. Usá una imagen JPG, PNG o WEBP.'
    );
  });

  it('rejects a file without a mime type', () => {
    const file = makeFile([new Uint8Array(10)], 'recibo', { type: '' });
    expect(validateReceiptFile(file)).toBe(
      'Formato no soportado. Usá una imagen JPG, PNG o WEBP.'
    );
  });

  it('rejects a file above the size limit', () => {
    const file = {
      type: 'image/jpeg',
      size: MAX_FILE_BYTES + 1,
    } as unknown as File;
    expect(validateReceiptFile(file)).toBe(
      'La imagen es demasiado grande (máximo 25 MB).'
    );
  });

  it('rejects an empty file', () => {
    const file = makeFile([new Uint8Array(0)], 'recibo.jpg', {
      type: 'image/jpeg',
    });
    expect(validateReceiptFile(file)).toBe('El archivo está vacío.');
  });
});

describe('computeSliceRanges', () => {
  it('returns no ranges for invalid dimensions', () => {
    expect(computeSliceRanges(0, 1024)).toEqual([]);
    expect(computeSliceRanges(-5, 1024)).toEqual([]);
    expect(computeSliceRanges(100, 0)).toEqual([]);
    expect(computeSliceRanges(NaN, 1024)).toEqual([]);
    expect(computeSliceRanges(Infinity, 1024)).toEqual([]);
  });

  it('returns a single full-height range for short images', () => {
    expect(computeSliceRanges(1500, 1024)).toEqual([{ start: 0, end: 1500 }]);
  });

  it('returns a single range at the exact height boundary', () => {
    expect(computeSliceRanges(MAX_SLICE_HEIGHT, 1024)).toEqual([
      { start: 0, end: MAX_SLICE_HEIGHT },
    ]);
  });

  it('splits just over the boundary into two overlapping ranges', () => {
    const ranges = computeSliceRanges(MAX_SLICE_HEIGHT + 1, 1024);
    expect(ranges).toHaveLength(2);
    expect(ranges[0].start).toBe(0);
    expect(ranges[1].end).toBe(MAX_SLICE_HEIGHT + 1);
    expect(ranges[1].start).toBeLessThan(ranges[0].end);
  });

  it('keeps starts strictly increasing and ranges non-empty', () => {
    const ranges = computeSliceRanges(6000, 1024);
    expect(ranges.length).toBeGreaterThan(1);
    for (let i = 0; i < ranges.length; i++) {
      expect(ranges[i].end).toBeGreaterThan(ranges[i].start);
      if (i > 0) {
        expect(ranges[i].start).toBeGreaterThan(ranges[i - 1].start);
      }
    }
  });

  it('overlaps consecutive ranges and covers the whole height', () => {
    const ranges = computeSliceRanges(6000, 1024);
    expect(ranges[0].start).toBe(0);
    expect(ranges[ranges.length - 1].end).toBe(6000);
    for (let i = 0; i < ranges.length - 1; i++) {
      expect(ranges[i + 1].start).toBeLessThan(ranges[i].end);
    }
  });

  it(`clamps to ${MAX_RECEIPT_IMAGES} slices for very tall images`, () => {
    const ranges = computeSliceRanges(20000, 1024);
    expect(ranges).toHaveLength(MAX_RECEIPT_IMAGES);
    expect(ranges[0].start).toBe(0);
    expect(ranges[ranges.length - 1].end).toBe(20000);
    for (let i = 0; i < ranges.length - 1; i++) {
      expect(ranges[i + 1].start).toBeLessThan(ranges[i].end);
    }
  });

  it('respects a custom maxSlices option', () => {
    const ranges = computeSliceRanges(12000, 1024, { maxSlices: 3 });
    expect(ranges).toHaveLength(3);
    expect(ranges[0].start).toBe(0);
    expect(ranges[2].end).toBe(12000);
  });

  it('never exceeds the cap even with a tiny target slice height', () => {
    const ranges = computeSliceRanges(20000, 1024, { targetSliceHeight: 200 });
    expect(ranges.length).toBeLessThanOrEqual(MAX_RECEIPT_IMAGES);
    expect(ranges[ranges.length - 1].end).toBe(20000);
  });

  it('overlaps more when overlapFraction grows', () => {
    const base = computeSliceRanges(4000, 1024);
    const more = computeSliceRanges(4000, 1024, { overlapFraction: 0.25 });
    const baseOverlap = base[0].end - base[1].start;
    const moreOverlap = more[0].end - more[1].start;
    expect(moreOverlap).toBeGreaterThan(baseOverlap);
  });
});
