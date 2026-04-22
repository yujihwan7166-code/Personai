/**
 * 빈 갤러리에 표시할 샘플 프롬프트 템플릿.
 * 실제 이미지 대신 CSS 그라디언트 + 이모지로 카드 시각화.
 * 클릭 시 입력바에 prefill.
 */

import type { MediaKind, MediaAspectRatio, ImageStylePreset } from '@/types/mediaGen';

export interface MediaSample {
  id: string;
  category: '포트레이트' | '풍경' | '제품' | '일러스트' | '로고' | '동영상';
  kind: MediaKind;
  emoji: string;
  /** Tailwind gradient utility (카드 배경) */
  gradient: string;
  title: string;
  prompt: string;
  style?: ImageStylePreset;
  aspectRatio: MediaAspectRatio;
}

export const MEDIA_SAMPLES: MediaSample[] = [
  // 포트레이트
  {
    id: 'sample-portrait-1',
    category: '포트레이트',
    kind: 'image',
    emoji: '👩‍🎨',
    gradient: 'from-rose-100 via-orange-100 to-amber-100 dark:from-rose-950/40 dark:via-orange-950/40 dark:to-amber-950/40',
    title: '창문 앞 소녀',
    prompt: '창가에 앉아 책을 읽는 소녀, 따뜻한 황금빛 햇살, 먼지 입자가 공기 중에 떠 있는 장면',
    style: 'photo',
    aspectRatio: '9:16',
  },
  // 풍경
  {
    id: 'sample-landscape-1',
    category: '풍경',
    kind: 'image',
    emoji: '🏔',
    gradient: 'from-sky-200 via-indigo-200 to-purple-300 dark:from-sky-950/50 dark:via-indigo-950/50 dark:to-purple-950/50',
    title: '은하수 산장',
    prompt: '눈 덮인 산맥 위로 펼쳐진 은하수, 전경에 작은 나무 산장과 노란 창문 불빛, 장노출 사진',
    style: 'photo',
    aspectRatio: '16:9',
  },
  // 제품
  {
    id: 'sample-product-1',
    category: '제품',
    kind: 'image',
    emoji: '🥃',
    gradient: 'from-amber-100 via-stone-100 to-neutral-200 dark:from-amber-950/30 dark:via-stone-900 dark:to-neutral-900',
    title: '위스키 프로덕트 샷',
    prompt: '어두운 오크 나무 테이블 위 크리스탈 위스키 잔, 드라마틱한 측면 조명, 광고용 프로덕트 사진',
    style: 'photo',
    aspectRatio: '1:1',
  },
  // 일러스트
  {
    id: 'sample-illust-1',
    category: '일러스트',
    kind: 'image',
    emoji: '🐰',
    gradient: 'from-pink-100 via-fuchsia-100 to-purple-100 dark:from-pink-950/40 dark:via-fuchsia-950/40 dark:to-purple-950/40',
    title: '마법 숲 토끼',
    prompt: '보라빛 버섯 숲을 탐험하는 작은 토끼, 반딧불이가 주변을 둥둥 떠다님, 부드러운 스튜디오 지브리풍',
    style: 'illustration',
    aspectRatio: '1:1',
  },
  // 로고
  {
    id: 'sample-logo-1',
    category: '로고',
    kind: 'image',
    emoji: '☕',
    gradient: 'from-stone-100 via-neutral-200 to-stone-200 dark:from-stone-900 dark:via-neutral-900 dark:to-stone-950',
    title: '카페 로고',
    prompt: '미니멀한 카페 로고, 커피콩과 잎사귀가 결합된 심볼, 흑백 벡터, 평면 디자인',
    style: 'logo',
    aspectRatio: '1:1',
  },
  // 동영상
  {
    id: 'sample-video-1',
    category: '동영상',
    kind: 'video',
    emoji: '🌊',
    gradient: 'from-cyan-200 via-blue-300 to-indigo-400 dark:from-cyan-950/50 dark:via-blue-950/50 dark:to-indigo-950/50',
    title: '해변의 석양',
    prompt: '황금빛 석양의 해변, 파도가 모래사장을 부드럽게 덮는 슬로우 모션, 카메라가 천천히 앞으로 이동',
    aspectRatio: '16:9',
  },
];
