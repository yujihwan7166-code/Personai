import { useCallback, useEffect, useRef, useState } from 'react';
import type { StudyLayoutPrefs, StudyLayoutMode, StudyPaneKind } from '@/types/study';
import { DEFAULT_LAYOUT_PREFS } from '@/types/study';

const KEY = 'study_layout_v1';
const ALL_KINDS: StudyPaneKind[] = ['sources', 'chat', 'studio'];

function load(): StudyLayoutPrefs {
  if (typeof window === 'undefined') return { ...DEFAULT_LAYOUT_PREFS };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_LAYOUT_PREFS };
    const parsed = JSON.parse(raw) as Partial<StudyLayoutPrefs>;
    const mode = (parsed.mode === 1 || parsed.mode === 2 || parsed.mode === 3 ? parsed.mode : 3) as StudyLayoutMode;
    const slots = Array.isArray(parsed.slots)
      ? (parsed.slots.filter((s): s is StudyPaneKind => ALL_KINDS.includes(s as StudyPaneKind))).slice(0, mode)
      : DEFAULT_LAYOUT_PREFS.slots.slice(0, mode);
    const rawWeights = Array.isArray(parsed.weights)
      ? parsed.weights.filter((n): n is number => typeof n === 'number' && Number.isFinite(n) && n > 0)
      : null;
    const weights = rawWeights && rawWeights.length === mode ? rawWeights : DEFAULT_LAYOUT_PREFS.weights!.slice(0, mode);
    return {
      mode,
      slots: padSlots(slots, mode),
      lockSourceLeft: !!parsed.lockSourceLeft,
      weights,
    };
  } catch {
    return { ...DEFAULT_LAYOUT_PREFS };
  }
}

/**
 * 슬롯 개수를 mode에 맞추되, 중복 허용.
 * 빈 자리는 ALL_KINDS 중 아직 안 쓰인 것 → 없으면 sources로 채움.
 */
function padSlots(slots: StudyPaneKind[], mode: StudyLayoutMode): StudyPaneKind[] {
  const result = slots.slice(0, mode);
  while (result.length < mode) {
    const next = ALL_KINDS.find((k) => !result.includes(k)) ?? ALL_KINDS[0];
    result.push(next);
  }
  return result;
}

function normalize(prefs: StudyLayoutPrefs): StudyLayoutPrefs {
  let slots = padSlots(prefs.slots, prefs.mode);
  if (prefs.lockSourceLeft && slots.includes('sources') && slots[0] !== 'sources') {
    // 첫 번째 sources를 맨 앞으로 (다른 중복 sources는 보존)
    const idx = slots.indexOf('sources');
    slots = ['sources', ...slots.slice(0, idx), ...slots.slice(idx + 1)];
  }
  return { ...prefs, slots };
}

export function usePersistedStudyLayout() {
  const [prefs, setPrefs] = useState<StudyLayoutPrefs>(() => load());
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    try {
      localStorage.setItem(KEY, JSON.stringify(prefs));
    } catch {
      /* noop */
    }
  }, [prefs]);

  const setMode = useCallback((mode: StudyLayoutMode) => {
    setPrefs((p) => {
      const defaultW = DEFAULT_LAYOUT_PREFS.weights ?? [];
      return normalize({
        ...p,
        mode,
        slots: p.slots.slice(0, mode),
        weights: defaultW.slice(0, mode),
      });
    });
  }, []);

  const setWeights = useCallback((weights: number[]) => {
    setPrefs((p) => normalize({ ...p, weights: weights.slice(0, p.mode) }));
  }, []);

  const setSlot = useCallback((index: number, kind: StudyPaneKind) => {
    setPrefs((p) => {
      const slots = p.slots.slice();
      slots[index] = kind; // 중복 허용 — swap 없이 직접 할당
      return normalize({ ...p, slots });
    });
  }, []);

  const toggleLockSource = useCallback(() => {
    setPrefs((p) => normalize({ ...p, lockSourceLeft: !p.lockSourceLeft }));
  }, []);

  return { prefs, setMode, setSlot, toggleLockSource, setWeights };
}
