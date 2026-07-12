/**
 * 여행기 초안 — 기간 내 조각(먹은것·간곳·본것 등)을 모아 따뜻한 여행 회고 글로.
 * 커리어·데이로그와 같은 quickAi 파이프라인. 실패하면 조각을 날짜별로 엮은 담백한 초안으로 폴백.
 */
import { quickAi } from '@/lib/cloudDoc/ai';
import { MEAL_SLOT_LABEL, MOMENT_KIND_META, type DayMoment } from '@/types/daylog';

const SYSTEM = `너는 여행 회고 글쓰기 도우미다. 사용자가 여행 중 남긴 조각(시간순 기록)을 받아,
1인칭의 담백하고 따뜻한 여행기 초안을 쓴다.
- 과장·이모지 남발 금지. 실제 남긴 기록에 없는 사실을 지어내지 말 것.
- 날짜가 여러 날이면 하루씩 문단을 나눈다.
- 3~6문단, 각 문단 2~4문장. 자연스러운 한국어 구어체.
- 제목 없이 본문만.`;

const oneLine = (m: DayMoment): string => {
  const meta = MOMENT_KIND_META[m.kind];
  const label = m.kind === 'meal' && m.mealSlot ? MEAL_SLOT_LABEL[m.mealSlot] : meta.label;
  const where = m.place ? ` @${m.place}` : '';
  return `${m.date} ${m.time} [${label}]${where} ${m.text}`;
};

/** 조각을 날짜별로 엮은 폴백 초안 (AI 불가 시). */
export function fallbackRecap(name: string, moments: DayMoment[]): string {
  const byDate = new Map<string, DayMoment[]>();
  for (const m of moments) {
    const list = byDate.get(m.date) ?? [];
    list.push(m);
    byDate.set(m.date, list);
  }
  const days = [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, list]) => {
      const lines = list
        .map((m) => {
          const meta = MOMENT_KIND_META[m.kind];
          const label = m.kind === 'meal' && m.mealSlot ? MEAL_SLOT_LABEL[m.mealSlot] : meta.label;
          const where = m.place ? `${m.place} — ` : '';
          return `· ${m.time} ${meta.emoji} ${label} · ${where}${m.text}`;
        })
        .join('\n');
      return `[${date}]\n${lines}`;
    })
    .join('\n\n');
  return `${name}\n\n${days}`;
}

export async function draftTripRecap(name: string, moments: DayMoment[]): Promise<string> {
  if (moments.length === 0) return `${name}\n\n(기록된 조각이 없어요. 여행 기간에 조각을 남기면 초안을 만들 수 있어요.)`;
  const user = `여행 이름: ${name}\n조각 기록:\n${moments.map(oneLine).join('\n')}`;
  try {
    const text = await quickAi(SYSTEM, user, { maxTokens: 900, temperature: 0.6 });
    const trimmed = text.trim();
    return trimmed || fallbackRecap(name, moments);
  } catch {
    return fallbackRecap(name, moments);
  }
}
