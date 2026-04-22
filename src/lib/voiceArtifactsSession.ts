// 녹음에서 생성한 창조물(블로그/SNS/이메일/슬랙/학습노트/회의록)을 sessionStorage에 보관.
// Supabase 영구 저장은 현재 스코프 밖 — 탭 열린 동안만 유지. 탭 닫히면 휘발.

import type { VoiceArtifact, ArtifactKind, ArtifactTone, ArtifactLength } from '@/types/voiceAnalysis';

const KEY_PREFIX = 'voiceArtifacts:';
const MAX_PER_RECORDING = 20;

function keyOf(recordingId: string) {
  return `${KEY_PREFIX}${recordingId}`;
}

function readRaw(recordingId: string): VoiceArtifact[] {
  if (typeof sessionStorage === 'undefined') return [];
  try {
    const raw = sessionStorage.getItem(keyOf(recordingId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as VoiceArtifact[] : [];
  } catch {
    return [];
  }
}

function writeRaw(recordingId: string, items: VoiceArtifact[]) {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(keyOf(recordingId), JSON.stringify(items.slice(0, MAX_PER_RECORDING)));
  } catch {
    /* quota 초과 등은 무시 */
  }
}

export function listArtifacts(recordingId: string): VoiceArtifact[] {
  return readRaw(recordingId).sort((a, b) => b.createdAt - a.createdAt);
}

export function addArtifact(
  recordingId: string,
  input: { kind: ArtifactKind; tone: ArtifactTone; length: ArtifactLength; content: string },
): VoiceArtifact {
  const artifact: VoiceArtifact = {
    id: `art-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    recordingId,
    kind: input.kind,
    tone: input.tone,
    length: input.length,
    content: input.content,
    createdAt: Date.now(),
  };
  const existing = readRaw(recordingId);
  writeRaw(recordingId, [artifact, ...existing]);
  return artifact;
}

export function updateArtifact(recordingId: string, id: string, patch: Partial<Pick<VoiceArtifact, 'content'>>): void {
  const items = readRaw(recordingId).map((a) => (a.id === id ? { ...a, ...patch } : a));
  writeRaw(recordingId, items);
}

export function removeArtifact(recordingId: string, id: string): void {
  writeRaw(recordingId, readRaw(recordingId).filter((a) => a.id !== id));
}

export function clearArtifacts(recordingId: string): void {
  if (typeof sessionStorage === 'undefined') return;
  try { sessionStorage.removeItem(keyOf(recordingId)); } catch { /* noop */ }
}
