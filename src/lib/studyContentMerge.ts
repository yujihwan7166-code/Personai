/**
 * PDF 페이지별 텍스트 병합 — Native + OCR + Vision LLM.
 *
 * 우선순위 (per-page):
 *   1. Vision LLM 결과 (가장 정확, 그림 라벨·관계까지)
 *   2. OCR 결과가 native 보다 길면 OCR (그림 안 라벨 잡음)
 *   3. 그 외에는 Native (텍스트 PDF 의 깨끗한 텍스트)
 *
 * Native 텍스트는 source.nativeText 형식 `[p.1] ...\n\n[p.2] ...` 를 파싱.
 */
import { getAllForBlob } from './studyOcrStore';
import { getAllVisionForBlob } from './studyVisionStore';

/** `[p.N] body` 형식 텍스트를 page → body 맵으로 파싱. */
export function parsePageMarkers(text: string | undefined): Map<number, string> {
  const map = new Map<number, string>();
  if (!text) return map;
  // [p.1] body... [p.2] body... 패턴. lookbehind 없이 split 사용.
  const re = /\[p\.(\d+)\]\s*([\s\S]*?)(?=\n*\[p\.\d+\]|$)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const page = parseInt(m[1], 10);
    const body = (m[2] ?? '').trim();
    if (Number.isFinite(page) && body) map.set(page, body);
  }
  return map;
}

/**
 * blobRef + native 텍스트 → 모든 페이지 통합 결과.
 * 각 페이지에서 vision/ocr/native 중 가장 풍부한 본문 선택.
 */
export async function buildMergedContent(blobRef: string, nativeText?: string): Promise<string> {
  const [ocrRecs, visionRecs] = await Promise.all([
    getAllForBlob(blobRef),
    getAllVisionForBlob(blobRef),
  ]);

  const nativeMap = parsePageMarkers(nativeText);
  const ocrMap = new Map(ocrRecs.map((r) => [r.page, r.text ?? ''] as const));
  const visionMap = new Map(visionRecs.map((r) => [r.page, r.text ?? ''] as const));

  const allPages = new Set<number>([
    ...nativeMap.keys(),
    ...ocrMap.keys(),
    ...visionMap.keys(),
  ]);
  if (allPages.size === 0) return '';

  const sorted = Array.from(allPages).sort((a, b) => a - b);
  const lines: string[] = [];
  for (const p of sorted) {
    const v = (visionMap.get(p) ?? '').trim();
    const o = (ocrMap.get(p) ?? '').trim();
    const n = (nativeMap.get(p) ?? '').trim();

    let chosen = '';
    if (v.length >= 30) {
      // Vision 결과가 의미있는 길이면 우선
      chosen = v;
    } else if (o.length > n.length && o.length >= 20) {
      // OCR 결과가 native 보다 풍부하면 OCR (그림 라벨 등 잡음)
      chosen = o;
    } else if (n) {
      chosen = n;
    } else if (o) {
      chosen = o;
    } else if (v) {
      chosen = v;
    }
    if (chosen) lines.push(`[p.${p}] ${chosen}`);
  }
  return lines.join('\n\n');
}
