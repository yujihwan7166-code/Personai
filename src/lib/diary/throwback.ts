import type { DiaryEntry } from '@/types/diary';

/** 오늘과 같은 MM-DD 이면서 과거 연도인 엔트리(최근 연도순). */
export function throwbackEntries(all: DiaryEntry[], today = new Date()): DiaryEntry[] {
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const y = today.getFullYear();
  return all
    .filter((e) => {
      const [ey, em, ed] = e.date.split('-');
      return em === mm && ed === dd && Number(ey) < y;
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}
