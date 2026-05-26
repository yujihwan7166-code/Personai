/**
 * Page-level PDF text merge: native PDF text + OCR + Vision OCR.
 *
 * The merge has to be conservative. Vision is usually best for tiny text and
 * diagrams, but a short/summary-like Vision response should not overwrite a
 * rich native or OCR result.
 */
import { getAllForBlob } from './studyOcrStore';
import { getAllVisionForBlob } from './studyVisionStore';
import { chooseMergedPageText } from './studyOcrQuality';

export function parsePageMarkers(text: string | undefined): Map<number, string> {
  const map = new Map<number, string>();
  if (!text) return map;
  const re = /\[p\.(\d+)\]\s*([\s\S]*?)(?=\n*\[p\.\d+\]|$)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    const page = parseInt(match[1], 10);
    const body = (match[2] ?? '').trim();
    if (Number.isFinite(page) && body) map.set(page, body);
  }
  return map;
}

export async function buildMergedContent(blobRef: string, nativeText?: string): Promise<string> {
  const [ocrRecs, visionRecs] = await Promise.all([
    getAllForBlob(blobRef),
    getAllVisionForBlob(blobRef),
  ]);

  const nativeMap = parsePageMarkers(nativeText);
  const ocrMap = new Map(ocrRecs.map((record) => [record.page, record] as const));
  const visionMap = new Map(visionRecs.map((record) => [record.page, record.text ?? ''] as const));

  const allPages = new Set<number>([
    ...nativeMap.keys(),
    ...ocrMap.keys(),
    ...visionMap.keys(),
  ]);
  if (allPages.size === 0) return '';

  const lines: string[] = [];
  for (const page of Array.from(allPages).sort((a, b) => a - b)) {
    const chosen = chooseMergedPageText({
      nativeText: nativeMap.get(page),
      ocrRecord: ocrMap.get(page),
      visionText: visionMap.get(page),
    });
    if (chosen) lines.push(`[p.${page}] ${chosen}`);
  }
  return lines.join('\n\n');
}
