/**
 * 커스텀 포탈 CRUD 훅 — localStorage 동기화.
 *
 * key: personai.hero.custom_portals → CustomPortal[] JSON.
 * 커스텀 이벤트로 다른 컴포넌트 재로드.
 */
import { useCallback, useEffect, useState } from 'react';
import { CUSTOM_PORTAL_KEY, type CustomPortal } from '@/lib/customPortal';

const CHANGED_EVENT = 'personai:custom-portals-changed';

function readStored(): CustomPortal[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(CUSTOM_PORTAL_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CustomPortal[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function makeId(): string {
  return `custom-portal-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function useCustomPortals(): {
  customPortals: CustomPortal[];
  createCustomPortal: (
    input: Omit<CustomPortal, 'id' | 'createdAt' | 'updatedAt'>,
  ) => CustomPortal;
  updateCustomPortal: (id: string, patch: Partial<CustomPortal>) => void;
  deleteCustomPortal: (id: string) => void;
} {
  const [customPortals, setCustomPortals] = useState<CustomPortal[]>(readStored);

  useEffect(() => {
    const handler = () => setCustomPortals(readStored());
    window.addEventListener(CHANGED_EVENT, handler);
    return () => window.removeEventListener(CHANGED_EVENT, handler);
  }, []);

  const persist = useCallback((next: CustomPortal[]) => {
    try {
      window.localStorage.setItem(CUSTOM_PORTAL_KEY, JSON.stringify(next));
    } catch {
      /* noop */
    }
    setCustomPortals(next);
    window.dispatchEvent(new CustomEvent(CHANGED_EVENT));
  }, []);

  const createCustomPortal = useCallback(
    (input: Omit<CustomPortal, 'id' | 'createdAt' | 'updatedAt'>): CustomPortal => {
      const now = Date.now();
      const created: CustomPortal = {
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

  const updateCustomPortal = useCallback(
    (id: string, patch: Partial<CustomPortal>) => {
      const current = readStored();
      const next = current.map((c) =>
        c.id === id ? { ...c, ...patch, id: c.id, updatedAt: Date.now() } : c,
      );
      persist(next);
    },
    [persist],
  );

  const deleteCustomPortal = useCallback(
    (id: string) => {
      const next = readStored().filter((c) => c.id !== id);
      persist(next);
    },
    [persist],
  );

  return { customPortals, createCustomPortal, updateCustomPortal, deleteCustomPortal };
}
