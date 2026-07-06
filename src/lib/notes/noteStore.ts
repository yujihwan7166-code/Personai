/**
 * 노트 저장소 — 재설계된 "메모+보드/위키"의 공통 substrate (1단계).
 *
 * 한 노트가 글(memo)과 판(board)을 모두 품는다. 이번 단계에선 글(Plate value)만 사용하고
 * board 는 자리만 만들어 둔다(2단계 tldraw). 승격·유형 등은 meta 로 확장.
 *
 * 저장 백엔드는 지금은 localStorage(간단·무의존). 나중에 IndexedDB/Yjs 로 교체하기 쉽게
 * "노트 배열 read/write" 만 이 파일 안에 가둔다.
 */
import { useSyncExternalStore } from 'react';
import type { Value } from 'platejs';

export interface Note {
  id: string;
  title: string;
  /** 글(메모) 본문 — Plate value. */
  memo: Value;
  /** 판(보드) — 2단계 tldraw 자리. 지금은 항상 null. */
  board: null;
  createdAt: number;
  updatedAt: number;
  meta: {
    surface: 'memo';
    tags: string[];
  };
}

const STORAGE_KEY = 'personai.notes.v1';
const CHANGED_EVENT = 'personai:notes-changed';

/** 빈 글 본문 — Plate 최소 문서(문단 1개). */
export function emptyMemoValue(): Value {
  return [{ type: 'p', children: [{ text: '' }] }];
}

function readAll(): Note[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Note[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(notes: Note[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  } catch {
    /* 용량 초과 등 — 조용히 무시(추후 IndexedDB 로 해결). */
  }
  window.dispatchEvent(new CustomEvent(CHANGED_EVENT));
}

export function listNotes(): Note[] {
  return readAll().sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getNote(id: string): Note | undefined {
  return readAll().find((n) => n.id === id);
}

export function createNote(): Note {
  const now = Date.now();
  const note: Note = {
    id: (crypto.randomUUID?.() ?? String(now + Math.random())),
    title: '',
    memo: emptyMemoValue(),
    board: null,
    createdAt: now,
    updatedAt: now,
    meta: { surface: 'memo', tags: [] },
  };
  writeAll([note, ...readAll()]);
  return note;
}

export function updateNote(id: string, patch: Partial<Pick<Note, 'title' | 'memo'>>): void {
  const notes = readAll();
  const idx = notes.findIndex((n) => n.id === id);
  if (idx === -1) return;
  notes[idx] = { ...notes[idx], ...patch, updatedAt: Date.now() };
  writeAll(notes);
}

export function deleteNote(id: string): void {
  writeAll(readAll().filter((n) => n.id !== id));
}

/** 글 본문에서 첫 텍스트를 뽑아 목록 미리보기·제목 폴백에 사용. */
export function notePlainText(memo: Value): string {
  const out: string[] = [];
  const walk = (nodes: unknown[]) => {
    for (const node of nodes) {
      if (node && typeof node === 'object') {
        const n = node as { text?: string; children?: unknown[] };
        if (typeof n.text === 'string') out.push(n.text);
        if (Array.isArray(n.children)) walk(n.children);
      }
    }
  };
  walk(memo as unknown[]);
  return out.join(' ').replace(/\s+/g, ' ').trim();
}

export function noteDisplayTitle(note: Note): string {
  if (note.title.trim()) return note.title.trim();
  const text = notePlainText(note.memo);
  return text ? text.slice(0, 40) : '제목 없음';
}

/* ── React 구독 훅 ── */
function subscribe(cb: () => void): () => void {
  window.addEventListener(CHANGED_EVENT, cb);
  window.addEventListener('storage', cb);
  return () => {
    window.removeEventListener(CHANGED_EVENT, cb);
    window.removeEventListener('storage', cb);
  };
}

let cachedSnapshot: Note[] = [];
let cachedKey = '';
function getSnapshot(): Note[] {
  const notes = listNotes();
  const key = notes.map((n) => `${n.id}:${n.updatedAt}`).join('|');
  if (key !== cachedKey) {
    cachedKey = key;
    cachedSnapshot = notes;
  }
  return cachedSnapshot;
}

export function useNotes(): Note[] {
  return useSyncExternalStore(subscribe, getSnapshot, () => cachedSnapshot);
}
