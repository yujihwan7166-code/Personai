import { useCallback, useEffect, useRef, useState } from 'react';
import type { StudyNotebook, StudyStreak, StudyFolder } from '@/types/study';
import { newId, todayKey } from '@/types/study';
import { deleteBlob, pruneOrphans } from '@/lib/studyBlobStore';
import { deleteOcrForBlob } from '@/lib/studyOcrStore';
import { SAMPLE_NOTEBOOKS, SAMPLE_FOLDER, isSeeded, markSeeded, isSampleNotebook } from '@/lib/studySamples';

const KEY_NOTEBOOKS = 'study_notebooks_v1';
const KEY_STREAK = 'study_streak_v1';
const KEY_FOLDERS = 'study_folders_v1';
const KEY_MIGRATION_V2 = 'study_migration_v2_done';

const LEGACY_SAMPLE_ICON_MAP: Record<string, string> = {
  '🧠': 'Brain',
  '🤖': 'Bot',
  '📚': 'GraduationCap',
  '🌌': 'Sparkles',
};

/**
 * v2 마이그레이션: 다중 소스 노트북을 "파일 = 1소스" 모델로 분할.
 * - 소스 0개 → 그대로
 * - 소스 1개 → 그대로
 * - 소스 2개+ → 각 소스를 개별 노트북으로 분리. 같은 이름의 폴더 생성해 묶음.
 *   채팅·렌즈·플래시카드·퀴즈·하이라이트는 첫 번째 파일에 귀속.
 */
function migrateToFileModel(notebooks: StudyNotebook[], folders: StudyFolder[]): { notebooks: StudyNotebook[]; folders: StudyFolder[] } {
  if (typeof window !== 'undefined' && localStorage.getItem(KEY_MIGRATION_V2) === '1') {
    return { notebooks, folders };
  }

  const outNotebooks: StudyNotebook[] = [];
  const outFolders: StudyFolder[] = [...folders];

  for (const nb of notebooks) {
    if (!nb.sources || nb.sources.length <= 1) {
      outNotebooks.push(nb);
      continue;
    }
    // Multi-source split
    let folderId = nb.folderId;
    if (!folderId) {
      const folderName = nb.title;
      let existing = outFolders.find((f) => f.name === folderName);
      if (!existing) {
        existing = { id: newId('fld'), name: folderName, createdAt: Date.now(), color: nb.color };
        outFolders.push(existing);
      }
      folderId = existing.id;
    }
    nb.sources.forEach((src, idx) => {
      const isFirst = idx === 0;
      const splitNb: StudyNotebook = {
        ...nb,
        id: isFirst ? nb.id : newId('nb'),
        title: src.title || `${nb.title} - ${idx + 1}`,
        sources: [src],
        folderId,
        // 첫 파일에만 학습 아티팩트 귀속
        chat: isFirst ? nb.chat : [],
        lensOutputs: isFirst ? nb.lensOutputs : {},
        quizItems: isFirst ? nb.quizItems : [],
        flashcards: isFirst ? nb.flashcards : [],
        wrongAnswers: isFirst ? nb.wrongAnswers : [],
        highlights: isFirst ? nb.highlights : [],
        updatedAt: Date.now(),
      };
      outNotebooks.push(splitNb);
    });
  }

  if (typeof window !== 'undefined') {
    localStorage.setItem(KEY_MIGRATION_V2, '1');
  }
  return { notebooks: outNotebooks, folders: outFolders };
}

function loadNotebooks(): StudyNotebook[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY_NOTEBOOKS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function loadFolders(): StudyFolder[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY_FOLDERS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveNotebooks(notebooks: StudyNotebook[]) {
  try {
    localStorage.setItem(KEY_NOTEBOOKS, JSON.stringify(notebooks));
  } catch (e) {
    console.warn('[study] persist failed', e);
  }
}

function saveFolders(folders: StudyFolder[]) {
  try {
    localStorage.setItem(KEY_FOLDERS, JSON.stringify(folders));
  } catch {
    /* noop */
  }
}

function loadStreak(): StudyStreak {
  if (typeof window === 'undefined') return { lastStudyDate: '', streakDays: 0 };
  try {
    const raw = localStorage.getItem(KEY_STREAK);
    if (!raw) return { lastStudyDate: '', streakDays: 0 };
    return JSON.parse(raw);
  } catch {
    return { lastStudyDate: '', streakDays: 0 };
  }
}

// 첫 방문 시 샘플 시드: 노트북이 비어있고 시드 플래그도 없으면 체험용 4 노트북 + 1 폴더 주입.
function seedIfFirstVisit(notebooks: StudyNotebook[], folders: StudyFolder[]): { notebooks: StudyNotebook[]; folders: StudyFolder[]; seeded: boolean } {
  if (notebooks.length > 0) return { notebooks, folders, seeded: false };
  if (isSeeded()) return { notebooks, folders, seeded: false };
  const seededNotebooks = [...SAMPLE_NOTEBOOKS];
  const seededFolders = folders.some((f) => f.id === SAMPLE_FOLDER.id) ? folders : [...folders, SAMPLE_FOLDER];
  return { notebooks: seededNotebooks, folders: seededFolders, seeded: true };
}

function sanitizeSampleVisuals(notebooks: StudyNotebook[], folders: StudyFolder[]) {
  let notebookChanged = false;
  let folderChanged = false;
  const nextNotebooks = notebooks.map((nb) => {
    if (!isSampleNotebook(nb)) return nb;
    const nextIcon = LEGACY_SAMPLE_ICON_MAP[nb.icon] ?? nb.icon;
    if (nextIcon === nb.icon) return nb;
    notebookChanged = true;
    return { ...nb, icon: nextIcon };
  });
  const nextFolders = folders.map((folder) => {
    const looksLikeLegacySampleFolder = folder.name.includes('둘러보기') || (folder.name.includes('📚') && folder.color === SAMPLE_FOLDER.color);
    if (!looksLikeLegacySampleFolder) return folder;
    if (folder.name === SAMPLE_FOLDER.name) return folder;
    folderChanged = true;
    return { ...folder, name: SAMPLE_FOLDER.name };
  });
  return {
    notebooks: nextNotebooks,
    folders: nextFolders,
    notebookChanged,
    folderChanged,
  };
}

export function usePersistedStudyNotebooks() {
  const [notebooks, setNotebooks] = useState<StudyNotebook[]>(() => {
    const nbs = loadNotebooks();
    const fds = loadFolders();
    const migrated = migrateToFileModel(nbs, fds);
    if (migrated.notebooks !== nbs) {
      try { localStorage.setItem(KEY_NOTEBOOKS, JSON.stringify(migrated.notebooks)); } catch { /* noop */ }
    }
    if (migrated.folders !== fds) {
      try { localStorage.setItem(KEY_FOLDERS, JSON.stringify(migrated.folders)); } catch { /* noop */ }
    }
    const sanitized = sanitizeSampleVisuals(migrated.notebooks, migrated.folders);
    if (sanitized.notebookChanged) {
      try { localStorage.setItem(KEY_NOTEBOOKS, JSON.stringify(sanitized.notebooks)); } catch { /* noop */ }
    }
    if (sanitized.folderChanged) {
      try { localStorage.setItem(KEY_FOLDERS, JSON.stringify(sanitized.folders)); } catch { /* noop */ }
    }
    const seeded = seedIfFirstVisit(sanitized.notebooks, sanitized.folders);
    if (seeded.seeded) {
      try {
        localStorage.setItem(KEY_NOTEBOOKS, JSON.stringify(seeded.notebooks));
        localStorage.setItem(KEY_FOLDERS, JSON.stringify(seeded.folders));
      } catch { /* noop */ }
      markSeeded();
    }
    return seeded.notebooks;
  });
  const [folders, setFolders] = useState<StudyFolder[]>(() => {
    const fds = loadFolders();
    const nbs = loadNotebooks();
    const sanitized = sanitizeSampleVisuals(nbs, fds);
    const seeded = seedIfFirstVisit(sanitized.notebooks, sanitized.folders);
    return seeded.folders;
  });
  const [streak, setStreak] = useState<StudyStreak>(() => loadStreak());
  const firstRender = useRef(true);
  const firstFolderRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      // 최초 마운트 시 — 현재 사용 중인 blobRef 외 IDB 에 남은 고아 blob 제거.
      const active: string[] = [];
      for (const nb of notebooks) {
        for (const s of nb.sources) {
          if (s.blobRef) active.push(s.blobRef);
        }
      }
      // idle 시점에 비동기 실행 (블로킹 없음).
      const idle = (cb: () => void) =>
        (typeof window !== 'undefined' && 'requestIdleCallback' in window)
          ? (window as unknown as { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(cb)
          : setTimeout(cb, 2000);
      idle(() => { void pruneOrphans(active); });
      return;
    }
    saveNotebooks(notebooks);
  }, [notebooks]);

  useEffect(() => {
    if (firstFolderRender.current) {
      firstFolderRender.current = false;
      return;
    }
    saveFolders(folders);
  }, [folders]);

  useEffect(() => {
    try {
      localStorage.setItem(KEY_STREAK, JSON.stringify(streak));
    } catch {
      /* noop */
    }
  }, [streak]);

  const upsertNotebook = useCallback((nb: StudyNotebook) => {
    setNotebooks((prev) => {
      const i = prev.findIndex((x) => x.id === nb.id);
      const next = { ...nb, updatedAt: Date.now() };
      if (i === -1) return [next, ...prev];
      const copy = prev.slice();
      copy[i] = next;
      return copy;
    });
  }, []);

  const deleteNotebook = useCallback((id: string) => {
    setNotebooks((prev) => {
      // 이 노트북이 소유한 blobRef 들을 IDB 에서 제거 (누수 방지).
      const target = prev.find((n) => n.id === id);
      if (target) {
        for (const s of target.sources) {
          if (s.blobRef) {
            void deleteBlob(s.blobRef);
            void deleteOcrForBlob(s.blobRef);
          }
        }
      }
      return prev.filter((n) => n.id !== id);
    });
  }, []);

  const moveNotebook = useCallback((id: string, folderId?: string) => {
    setNotebooks((prev) => prev.map((n) => (n.id === id ? { ...n, folderId, updatedAt: Date.now() } : n)));
  }, []);

  const togglePin = useCallback((id: string) => {
    setNotebooks((prev) => prev.map((n) => {
      if (n.id !== id) return n;
      return { ...n, pinned: n.pinned ? undefined : Date.now() };
    }));
  }, []);

  const createFolder = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setFolders((prev) => {
      if (prev.some((f) => f.name === trimmed)) return prev;
      return [...prev, { id: newId('fld'), name: trimmed, createdAt: Date.now() }];
    });
  }, []);

  const renameFolder = useCallback((id: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setFolders((prev) => {
      if (prev.some((f) => f.name === trimmed && f.id !== id)) return prev;
      return prev.map((f) => (f.id === id ? { ...f, name: trimmed } : f));
    });
  }, []);

  const setFolderColor = useCallback((id: string, color?: string) => {
    setFolders((prev) => prev.map((f) => (f.id === id ? { ...f, color } : f)));
  }, []);

  const deleteFolder = useCallback((id: string) => {
    setFolders((prev) => prev.filter((f) => f.id !== id));
    setNotebooks((prev) => prev.map((n) => (n.folderId === id ? { ...n, folderId: undefined } : n)));
  }, []);

  const markStudiedToday = useCallback(() => {
    const today = todayKey();
    setStreak((prev) => {
      if (prev.lastStudyDate === today) return prev;
      const yesterday = todayKey(new Date(Date.now() - 86400000));
      const days = prev.lastStudyDate === yesterday ? prev.streakDays + 1 : 1;
      return { lastStudyDate: today, streakDays: days };
    });
  }, []);

  return {
    notebooks, setNotebooks, upsertNotebook, deleteNotebook, moveNotebook, togglePin,
    folders, createFolder, renameFolder, deleteFolder, setFolderColor,
    streak, markStudiedToday,
  };
}
