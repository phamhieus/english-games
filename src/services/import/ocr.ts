/** Languages OCR'd from images: English words plus Vietnamese meanings. */
const OCR_LANGS = 'eng+vie';

export interface OcrProgress {
  /** 0-based index of the image being read. */
  index: number;
  total: number;
  /** 0..1 progress of the current image. */
  fraction: number;
}

/**
 * Reads text from one or more images in the browser (tesseract.js, loaded on demand).
 * Language data is downloaded the first time it is used, then cached by the browser.
 * Returns one text block per image, in the same order.
 */
export async function recognizeImages(files: readonly File[], onProgress?: (p: OcrProgress) => void): Promise<string[]> {
  const { createWorker } = await import('tesseract.js');
  let current = 0;
  const worker = await createWorker(OCR_LANGS, 1, {
    logger: (m: { status: string; progress: number }) => {
      if (m.status === 'recognizing text') onProgress?.({ index: current, total: files.length, fraction: m.progress });
    },
  });
  try {
    const out: string[] = [];
    for (const [i, file] of files.entries()) {
      current = i;
      onProgress?.({ index: i, total: files.length, fraction: 0 });
      const { data } = await worker.recognize(file);
      out.push(data.text);
    }
    return out;
  } finally {
    await worker.terminate();
  }
}
