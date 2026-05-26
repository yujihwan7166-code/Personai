/**
 * AI 어시스턴트 - 이미지·동영상 생성 모듈 타입.
 * AI 녹음 분석(voiceAnalysis.ts)과 대칭 구조.
 */

export type MediaKind = 'image' | 'video';

export type MediaAspectRatio = '1:1' | '16:9' | '9:16';

export type MediaStatus = 'queued' | 'generating' | 'ready' | 'error';

export type ImageStylePreset =
  | 'none'
  | 'photo'
  | 'cinematic'
  | 'illustration'
  | 'anime'
  | 'ghibli'
  | '3d'
  | 'watercolor'
  | 'oil'
  | 'pixel'
  | 'cyberpunk'
  | 'logo'
  | 'sketch'
  | 'blueprint'
  | 'collage'
  | 'miniature';

export const IMAGE_STYLE_LABELS: Record<
  ImageStylePreset,
  { label: string; suffix: string; emoji: string; gradient: string; description: string }
> = {
  none:       { label: '기본', emoji: '✨', suffix: '',
                gradient: 'from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800',
                description: '모델이 알아서 판단' },
  photo:      { label: '사진', emoji: '📸', suffix: ', photorealistic, DSLR, high detail, sharp focus',
                gradient: 'from-stone-200 to-neutral-300 dark:from-stone-800 dark:to-neutral-900',
                description: '실사 · DSLR 느낌' },
  cinematic:  { label: '시네마틱', emoji: '🎬', suffix: ', cinematic, dramatic lighting, anamorphic, film grain',
                gradient: 'from-amber-200 via-orange-200 to-red-300 dark:from-amber-950/40 dark:via-orange-950/40 dark:to-red-950/40',
                description: '영화 같은 극적 조명' },
  illustration: { label: '일러스트', emoji: '🎨', suffix: ', clean illustration, soft shading, pastel palette',
                gradient: 'from-pink-100 to-purple-200 dark:from-pink-950/40 dark:to-purple-950/40',
                description: '깔끔한 디지털 드로잉' },
  anime:      { label: '애니', emoji: '⛩', suffix: ', anime, manga style, vibrant colors, clean line art',
                gradient: 'from-pink-200 via-rose-200 to-red-200 dark:from-pink-900/40 dark:to-red-900/40',
                description: '일본 애니 스타일' },
  ghibli:     { label: '스튜디오 지브리', emoji: '🌿', suffix: ', Studio Ghibli style, soft watercolor, warm nostalgic atmosphere',
                gradient: 'from-green-200 via-emerald-200 to-teal-200 dark:from-green-900/40 dark:to-teal-900/40',
                description: '따뜻한 수채 톤' },
  '3d':       { label: '3D', emoji: '🧊', suffix: ', 3d render, octane, soft lighting, subsurface scattering',
                gradient: 'from-indigo-200 via-blue-200 to-sky-200 dark:from-indigo-900/40 dark:to-sky-900/40',
                description: '3D 렌더링' },
  watercolor: { label: '수채화', emoji: '🖌', suffix: ', watercolor painting, soft edges, paper texture',
                gradient: 'from-blue-100 via-cyan-100 to-teal-100 dark:from-blue-950/30 dark:to-teal-950/30',
                description: '부드러운 번짐' },
  oil:        { label: '유화', emoji: '🖼', suffix: ', oil painting, impasto texture, thick brush strokes',
                gradient: 'from-amber-100 via-yellow-200 to-orange-200 dark:from-amber-950/40 dark:to-orange-950/40',
                description: '두터운 붓 터치' },
  pixel:      { label: '픽셀아트', emoji: '👾', suffix: ', pixel art, 16-bit game style, limited palette',
                gradient: 'from-purple-200 via-fuchsia-200 to-pink-200 dark:from-purple-900/40 dark:to-pink-900/40',
                description: '16비트 게임 감성' },
  cyberpunk:  { label: '사이버펑크', emoji: '🌆', suffix: ', cyberpunk, neon, rain-soaked streets, moody lighting',
                gradient: 'from-fuchsia-400 via-purple-500 to-blue-600 dark:from-fuchsia-900/50 dark:via-purple-900/50 dark:to-blue-900/50',
                description: '네온 · 느와르' },
  logo:       { label: '로고', emoji: '🔷', suffix: ', minimalist logo, vector, flat design, clean geometry',
                gradient: 'from-slate-100 to-slate-300 dark:from-slate-800 dark:to-slate-950',
                description: '미니멀 브랜딩' },
  sketch:     { label: '스케치', emoji: '✏️', suffix: ', pencil sketch, hatching, monochrome, concept art',
                gradient: 'from-neutral-200 to-stone-300 dark:from-neutral-800 dark:to-stone-900',
                description: '연필 스케치' },
  blueprint:  { label: '블루프린트', emoji: '📐', suffix: ', blueprint style, technical drawing, white lines on blue',
                gradient: 'from-blue-300 via-indigo-400 to-blue-500 dark:from-blue-950 dark:to-indigo-950',
                description: '기술 도면 톤' },
  collage:    { label: '콜라주', emoji: '🧩', suffix: ', mixed media collage, torn paper texture, bold typography',
                gradient: 'from-rose-200 via-amber-200 to-emerald-200 dark:from-rose-900/40 dark:to-emerald-900/40',
                description: '믹스트 미디어' },
  miniature:  { label: '미니어처', emoji: '🏰', suffix: ', tilt-shift miniature, macro lens, hyperreal detail',
                gradient: 'from-lime-200 via-green-200 to-emerald-200 dark:from-lime-900/40 dark:to-emerald-900/40',
                description: '틸트시프트 미니어처' },
};

export interface MediaItem {
  id: string;
  userId: string;
  kind: MediaKind;
  prompt: string;
  style?: ImageStylePreset;
  aspectRatio: MediaAspectRatio;
  /** 'queued' → 'generating' → 'ready' | 'error' */
  status: MediaStatus;
  /** 이미지: IndexedDB blob 키. 동영상은 undefined (원격 URL만 사용) */
  blobRef?: string;
  /** 이미지·동영상 공용. 로컬 blob이 있으면 이 URL은 fallback. */
  resultUrl?: string;
  /** 동영상 썸네일 (원격 URL) */
  thumbnailUrl?: string;
  mimeType?: string;
  /** 동영상 길이(초) */
  durationSec?: number;
  /** 사용한 모델 (추적용) */
  model?: string;
  errorMessage?: string;
  /** 동영상 비동기 job id (status polling 중일 때) */
  jobId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface MediaUsage {
  userId: string;
  yearMonth: string;
  imagesUsed: number;
  videoSecondsUsed: number;
}

/** 월 무료 한도 (4장 기본 생성 고려 상향) */
export const MONTHLY_IMAGE_LIMIT = 60;
export const MONTHLY_VIDEO_SEC_LIMIT = 10;

/** 동영상 1회 생성 길이 (MVP) */
export const VIDEO_CLIP_LENGTH_SEC = 5;

/** 이미지 1회 생성 최대 장수 */
export const IMAGE_MAX_COUNT = 4;

export const MEDIA_STATUS_LABEL: Record<MediaStatus, string> = {
  queued: '대기 중',
  generating: '생성 중',
  ready: '완료',
  error: '오류',
};

/** 현재 KST 기준 yyyy-MM 반환 */
export function currentYearMonthKST(): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const y = kst.getUTCFullYear();
  const m = String(kst.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function relativeTime(ms: number): string {
  const diff = Date.now() - ms;
  const m = Math.floor(diff / 60000);
  if (m < 1) return '방금';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}일 전`;
  const date = new Date(ms);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

/** 시간 그룹 레이블: 오늘 / 어제 / 이번 주 / 지난 주 / YYYY년 N월 */
export type TimeGroupKey =
  | 'today'
  | 'yesterday'
  | 'thisWeek'
  | 'lastWeek'
  | string /* 'ym:2026-04' */;

export function getTimeGroupKey(ms: number): TimeGroupKey {
  const now = new Date();
  const item = new Date(ms);
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const today0 = startOfDay(now);
  const itemDay = startOfDay(item);
  const dayMs = 86400000;

  if (itemDay === today0) return 'today';
  if (itemDay === today0 - dayMs) return 'yesterday';

  // 이번 주: 월요일부터 오늘까지
  const weekday = now.getDay() === 0 ? 6 : now.getDay() - 1; // 월=0
  const thisWeekStart = today0 - weekday * dayMs;
  if (itemDay >= thisWeekStart) return 'thisWeek';

  const lastWeekStart = thisWeekStart - 7 * dayMs;
  if (itemDay >= lastWeekStart) return 'lastWeek';

  // 나머지: 해당 월 기준
  const y = item.getFullYear();
  const m = String(item.getMonth() + 1).padStart(2, '0');
  return `ym:${y}-${m}`;
}

export function timeGroupLabel(key: TimeGroupKey): string {
  if (key === 'today') return '오늘';
  if (key === 'yesterday') return '어제';
  if (key === 'thisWeek') return '이번 주';
  if (key === 'lastWeek') return '지난 주';
  if (typeof key === 'string' && key.startsWith('ym:')) {
    const [, ym] = key.split(':');
    const [y, m] = ym.split('-');
    return `${y}년 ${Number(m)}월`;
  }
  return '';
}

/** 아이템 배열을 시간 그룹 키별로 묶되, 원래 순서(최근순) 유지 */
export function groupByTime<T extends { createdAt: number }>(
  items: T[],
): Array<{ key: TimeGroupKey; label: string; items: T[] }> {
  const map = new Map<TimeGroupKey, T[]>();
  const order: TimeGroupKey[] = [];
  for (const item of items) {
    const k = getTimeGroupKey(item.createdAt);
    if (!map.has(k)) {
      map.set(k, []);
      order.push(k);
    }
    map.get(k)!.push(item);
  }
  return order.map((key) => ({ key, label: timeGroupLabel(key), items: map.get(key)! }));
}
