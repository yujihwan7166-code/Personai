/**
 * 커스텀 AI 목록 관리 훅 — CRUD + localStorage 동기화.
 *
 * key: `personai.hero.custom_ais` → CustomAi[] JSON.
 * 커스텀 이벤트 로 다른 컴포넌트도 재로드.
 */
import { useCallback, useEffect, useState } from 'react';
import { CUSTOM_AIS_KEY, type CustomAi } from '@/lib/customAi';

const CHANGED_EVENT = 'personai:custom-ais-changed';

function readStored(): CustomAi[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(CUSTOM_AIS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CustomAi[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function makeId(): string {
  return `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function useCustomAis(): {
  customAis: CustomAi[];
  createCustomAi: (
    input: Omit<CustomAi, 'id' | 'createdAt' | 'updatedAt'>,
  ) => CustomAi;
  updateCustomAi: (id: string, patch: Partial<CustomAi>) => void;
  deleteCustomAi: (id: string) => void;
} {
  const [customAis, setCustomAis] = useState<CustomAi[]>(readStored);

  useEffect(() => {
    const handler = () => setCustomAis(readStored());
    window.addEventListener(CHANGED_EVENT, handler);
    return () => window.removeEventListener(CHANGED_EVENT, handler);
  }, []);

  const persist = useCallback((next: CustomAi[]) => {
    try {
      window.localStorage.setItem(CUSTOM_AIS_KEY, JSON.stringify(next));
    } catch {
      /* noop */
    }
    setCustomAis(next);
    window.dispatchEvent(new CustomEvent(CHANGED_EVENT));
  }, []);

  const createCustomAi = useCallback(
    (input: Omit<CustomAi, 'id' | 'createdAt' | 'updatedAt'>): CustomAi => {
      const now = Date.now();
      const created: CustomAi = {
        ...input,
        id: makeId(),
        createdAt: now,
        updatedAt: now,
      };
      persist([...readStored(), created]);
      return created;
    },
    [persist],
  );

  const updateCustomAi = useCallback(
    (id: string, patch: Partial<CustomAi>) => {
      const current = readStored();
      const next = current.map((c) =>
        c.id === id ? { ...c, ...patch, id: c.id, updatedAt: Date.now() } : c,
      );
      persist(next);
    },
    [persist],
  );

  const deleteCustomAi = useCallback(
    (id: string) => {
      const next = readStored().filter((c) => c.id !== id);
      persist(next);
    },
    [persist],
  );

  return { customAis, createCustomAi, updateCustomAi, deleteCustomAi };
}
