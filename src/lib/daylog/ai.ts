/**
 * 데이로그 AI — 한 줄 조각을 종류(식사·한일·간곳·본것·메모)와 끼니로 분류.
 * 커리어 보드의 "한 줄 입력 → AI 분류" 파이프라인과 같은 quickAi 재사용.
 * AI 실패 시 휴리스틱 폴백 — 입력이 막히는 일은 없다.
 */
import { quickAi } from '@/lib/cloudDoc/ai';
import type { MealSlot, MomentKind } from '@/types/daylog';

export interface ClassifiedMoment {
  kind: MomentKind;
  mealSlot?: MealSlot;
  /** AI가 문장에서 시간을 읽었으면 HH:mm ("아까 점심에" → 12:30). 없으면 undefined. */
  time?: string;
}

const SYSTEM = `너는 하루 기록 분류기다. 사용자가 적은 한 줄을 보고 JSON 하나만 출력한다.
형식: {"kind":"meal|activity|place|media|note","mealSlot":"breakfast|lunch|dinner|snack"|null,"time":"HH:mm"|null}
- meal: 먹거나 마신 것 (mealSlot 필수 추정 — 아침/점심/저녁/간식·야식은 snack)
- activity: 한 일·공부·운동·작업
- place: 간 곳·방문
- media: 본 것·읽은 것 (영화·드라마·유튜브·웹툰·책)
- note: 그 외 생각·메모
- time: 문장에 시간 단서가 있을 때만 (점심→12:30, 아침→08:00, 저녁→19:00, "3시에"→15:00). 없으면 null.
JSON 외 다른 텍스트 금지.`;

const isKind = (v: unknown): v is MomentKind =>
  v === 'meal' || v === 'activity' || v === 'place' || v === 'media' || v === 'note';
const isMealSlot = (v: unknown): v is MealSlot =>
  v === 'breakfast' || v === 'lunch' || v === 'dinner' || v === 'snack';

/** 휴리스틱 폴백 — AI 불가 시에도 그럴듯한 분류. */
export function classifyMomentHeuristic(raw: string): ClassifiedMoment {
  const t = raw.trim();
  const meal = /먹|마셨|마심|식사|밥|점심|아침밥|저녁밥|간식|야식|맛있|배부/.test(t);
  if (meal) {
    const slot: MealSlot = /아침/.test(t) ? 'breakfast' : /점심/.test(t) ? 'lunch' : /저녁|야식/.test(t) ? 'dinner' : /간식/.test(t) ? 'snack' : inferSlotByNow();
    return { kind: 'meal', mealSlot: slot };
  }
  if (/봤|보는 중|정주행|읽었|읽는|영화|드라마|웹툰|유튜브|넷플/.test(t)) return { kind: 'media' };
  if (/갔|왔|도착|들렀|다녀|공원|카페 감|여행/.test(t)) return { kind: 'place' };
  if (/했|공부|운동|숙제|작업|끝냈|만들|연습/.test(t)) return { kind: 'activity' };
  return { kind: 'note' };
}

function inferSlotByNow(): MealSlot {
  const h = new Date().getHours();
  if (h < 10) return 'breakfast';
  if (h < 15) return 'lunch';
  if (h < 21) return 'dinner';
  return 'snack';
}

export async function aiClassifyMoment(raw: string): Promise<ClassifiedMoment> {
  try {
    const text = await quickAi(SYSTEM, raw.trim(), { maxTokens: 120, temperature: 0.1 });
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return classifyMomentHeuristic(raw);
    const parsed: unknown = JSON.parse(match[0]);
    if (typeof parsed !== 'object' || parsed === null) return classifyMomentHeuristic(raw);
    const p = parsed as Record<string, unknown>;
    const kind = isKind(p.kind) ? p.kind : classifyMomentHeuristic(raw).kind;
    const mealSlot = kind === 'meal'
      ? (isMealSlot(p.mealSlot) ? p.mealSlot : classifyMomentHeuristic(raw).mealSlot ?? inferSlotByNow())
      : undefined;
    const time = typeof p.time === 'string' && /^\d{2}:\d{2}$/.test(p.time) ? p.time : undefined;
    return { kind, mealSlot, time };
  } catch {
    return classifyMomentHeuristic(raw);
  }
}
