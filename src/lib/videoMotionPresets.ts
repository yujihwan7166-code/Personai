/**
 * 동영상 생성 시 카메라 움직임 프리셋 (Higgsfield · Kling · Runway 패턴).
 * 선택 시 프롬프트 끝에 영문 키워드 자동 추가.
 */

export interface VideoMotionPreset {
  id: string;
  label: string;
  emoji: string;
  /** 프롬프트 접미사에 들어갈 영문 키워드 */
  promptSuffix: string;
  /** 미니 설명 */
  description: string;
  /** 카드 배경 그라디언트 (Tailwind) */
  gradient: string;
}

export const VIDEO_MOTION_PRESETS: VideoMotionPreset[] = [
  {
    id: 'static',
    label: '고정',
    emoji: '📷',
    promptSuffix: ', static camera, no movement',
    description: '움직임 없는 고정 샷',
    gradient: 'from-slate-200 to-slate-300 dark:from-slate-800 dark:to-slate-900',
  },
  {
    id: 'dolly_in',
    label: '돌리 인',
    emoji: '▶️',
    promptSuffix: ', slow dolly-in shot, camera moving forward',
    description: '피사체로 서서히 전진',
    gradient: 'from-indigo-200 to-blue-300 dark:from-indigo-900/40 dark:to-blue-900/40',
  },
  {
    id: 'dolly_out',
    label: '돌리 아웃',
    emoji: '◀️',
    promptSuffix: ', slow dolly-out shot, camera pulling back',
    description: '피사체에서 서서히 후퇴',
    gradient: 'from-blue-200 to-indigo-300 dark:from-blue-900/40 dark:to-indigo-900/40',
  },
  {
    id: 'orbit',
    label: '오빗',
    emoji: '🔄',
    promptSuffix: ', orbiting camera around the subject, 360 degree sweep',
    description: '피사체 주위 회전',
    gradient: 'from-purple-200 to-fuchsia-300 dark:from-purple-900/40 dark:to-fuchsia-900/40',
  },
  {
    id: 'pan_left',
    label: '팬 좌',
    emoji: '⬅️',
    promptSuffix: ', smooth pan left, horizontal camera movement',
    description: '왼쪽으로 수평 이동',
    gradient: 'from-teal-200 to-cyan-300 dark:from-teal-900/40 dark:to-cyan-900/40',
  },
  {
    id: 'pan_right',
    label: '팬 우',
    emoji: '➡️',
    promptSuffix: ', smooth pan right, horizontal camera movement',
    description: '오른쪽으로 수평 이동',
    gradient: 'from-cyan-200 to-teal-300 dark:from-cyan-900/40 dark:to-teal-900/40',
  },
  {
    id: 'tilt_up',
    label: '틸트 업',
    emoji: '⬆️',
    promptSuffix: ', smooth tilt up, vertical camera movement',
    description: '위로 기울이며 이동',
    gradient: 'from-sky-200 to-blue-300 dark:from-sky-900/40 dark:to-blue-900/40',
  },
  {
    id: 'tilt_down',
    label: '틸트 다운',
    emoji: '⬇️',
    promptSuffix: ', smooth tilt down, vertical camera movement',
    description: '아래로 기울이며 이동',
    gradient: 'from-blue-200 to-sky-300 dark:from-blue-900/40 dark:to-sky-900/40',
  },
  {
    id: 'crane_up',
    label: '크레인 업',
    emoji: '🆙',
    promptSuffix: ', crane shot rising up, camera elevating while framing subject',
    description: '상승하며 위에서 내려다봄',
    gradient: 'from-emerald-200 to-green-300 dark:from-emerald-900/40 dark:to-green-900/40',
  },
  {
    id: 'fpv_drone',
    label: 'FPV 드론',
    emoji: '🚁',
    promptSuffix: ', FPV drone sweep, fast aerial movement, immersive POV',
    description: '몰입감 있는 드론 시점',
    gradient: 'from-amber-200 to-orange-300 dark:from-amber-900/40 dark:to-orange-900/40',
  },
  {
    id: 'crash_zoom',
    label: '크래시 줌',
    emoji: '⚡',
    promptSuffix: ', sudden crash zoom, rapid focal length change',
    description: '갑작스러운 급 줌',
    gradient: 'from-red-300 to-orange-400 dark:from-red-900/50 dark:to-orange-900/50',
  },
  {
    id: 'dutch_angle',
    label: '더치 앵글',
    emoji: '📐',
    promptSuffix: ', dutch angle, tilted horizon, dramatic tension',
    description: '기울어진 수평선 · 긴장감',
    gradient: 'from-rose-200 to-pink-300 dark:from-rose-900/40 dark:to-pink-900/40',
  },
  {
    id: 'arc_shot',
    label: '아크 샷',
    emoji: '🌈',
    promptSuffix: ', arc shot, curved camera path around subject',
    description: '곡선 경로 이동',
    gradient: 'from-violet-200 to-purple-300 dark:from-violet-900/40 dark:to-purple-900/40',
  },
  {
    id: 'handheld',
    label: '핸드헬드',
    emoji: '👐',
    promptSuffix: ', handheld camera, subtle natural shake, documentary feel',
    description: '자연스러운 흔들림',
    gradient: 'from-stone-200 to-neutral-300 dark:from-stone-800 dark:to-neutral-900',
  },
  {
    id: 'slow_motion',
    label: '슬로우 모션',
    emoji: '🐢',
    promptSuffix: ', slow motion, everything moving at half speed, dramatic pace',
    description: '절반 속도 시간 확장',
    gradient: 'from-lime-200 to-emerald-300 dark:from-lime-900/40 dark:to-emerald-900/40',
  },
  {
    id: 'timelapse',
    label: '타임랩스',
    emoji: '⏱',
    promptSuffix: ', timelapse, fast-forward passage of time',
    description: '시간 빠르게 흐름',
    gradient: 'from-yellow-200 to-amber-300 dark:from-yellow-900/40 dark:to-amber-900/40',
  },
];

export function findMotionPreset(id: string | undefined): VideoMotionPreset | null {
  if (!id) return null;
  return VIDEO_MOTION_PRESETS.find((p) => p.id === id) ?? null;
}
