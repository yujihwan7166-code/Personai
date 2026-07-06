import type { Feeling, FeelingGroup } from '@/types/diary';

export const GROUP_LABEL: Record<FeelingGroup, string> = {
  joy: '기쁨', calm: '평온', sad: '슬픔', anxious: '불안', anger: '분노',
};

/** 계열 시그니처 색 (앱 톤 범위 내). */
export const GROUP_COLOR: Record<FeelingGroup, string> = {
  joy: 'hsl(42 95% 55%)',
  calm: 'hsl(160 55% 45%)',
  sad: 'hsl(215 70% 58%)',
  anxious: 'hsl(265 55% 62%)',
  anger: 'hsl(6 78% 60%)',
};

export const FEELINGS: Feeling[] = [
  { id: 'haengbok', label: '행복', emoji: '😊', group: 'joy' },
  { id: 'seollem',  label: '설렘', emoji: '🥰', group: 'joy' },
  { id: 'ppudeut',  label: '뿌듯', emoji: '😌', group: 'joy' },
  { id: 'gamsa',    label: '감사', emoji: '🙏', group: 'joy' },
  { id: 'sinnam',   label: '신남', emoji: '🤩', group: 'joy' },
  { id: 'pyeongon', label: '평온', emoji: '🍃', group: 'calm' },
  { id: 'pyeonan',  label: '편안', emoji: '☺️', group: 'calm' },
  { id: 'yeoyu',    label: '여유', emoji: '🍵', group: 'calm' },
  { id: 'manjok',   label: '만족', emoji: '😋', group: 'calm' },
  { id: 'mudeon',   label: '무던', emoji: '😐', group: 'calm' },
  { id: 'seulpeum', label: '슬픔', emoji: '😢', group: 'sad' },
  { id: 'uul',      label: '우울', emoji: '😞', group: 'sad' },
  { id: 'oeroum',   label: '외로움', emoji: '🥲', group: 'sad' },
  { id: 'geurium',  label: '그리움', emoji: '🌙', group: 'sad' },
  { id: 'heotal',   label: '허탈', emoji: '😔', group: 'sad' },
  { id: 'buran',    label: '불안', emoji: '😰', group: 'anxious' },
  { id: 'chojo',    label: '초조', emoji: '😥', group: 'anxious' },
  { id: 'ginjang',  label: '긴장', emoji: '😬', group: 'anxious' },
  { id: 'duryeoum', label: '두려움', emoji: '😨', group: 'anxious' },
  { id: 'budam',    label: '부담', emoji: '😓', group: 'anxious' },
  { id: 'hwanam',   label: '화남', emoji: '😠', group: 'anger' },
  { id: 'jjajeung', label: '짜증', emoji: '😤', group: 'anger' },
  { id: 'eogul',    label: '억울', emoji: '😣', group: 'anger' },
  { id: 'dabdab',   label: '답답', emoji: '😮‍💨', group: 'anger' },
  { id: 'silmang',  label: '실망', emoji: '🙁', group: 'anger' },
];

const BY_ID = new Map(FEELINGS.map((f) => [f.id, f]));
export const getFeeling = (id?: string): Feeling | undefined => (id ? BY_ID.get(id) : undefined);
export const feelingsByGroup = (g: FeelingGroup): Feeling[] => FEELINGS.filter((f) => f.group === g);
export const GROUPS: FeelingGroup[] = ['joy', 'calm', 'sad', 'anxious', 'anger'];

/** 대표 감정 → 색(없으면 중립). */
export const feelingColor = (id?: string): string => {
  const f = getFeeling(id);
  return f ? GROUP_COLOR[f.group] : 'hsl(var(--muted-foreground))';
};
