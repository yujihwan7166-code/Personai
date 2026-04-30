/**
 * 녹음 상세 — Granola 패턴(탭 제거, 단일 수직 플로우).
 * 재생 위치에 따라 요약 배지·챕터 하이라이트·스크립트 자동 스크롤이 함께 움직임.
 * 우측 상단 "✨ 만들기" 버튼으로 GeneratorPanel 호출 → 블로그/SNS/이메일/슬랙/학습노트/회의록 생성.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Trash2, Loader2, Play, Pause, Pencil, Sparkles, Copy, Check, ChevronDown, ChevronUp,
  SkipBack, SkipForward, Search, X, FileText, ListTodo,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  formatDuration,
  VOICE_STATUS_LABEL,
  type VoiceRecording,
  type ArtifactKind,
} from '@/types/voiceAnalysis';
import { getAudioObjectURL } from '@/lib/voiceRecordingStore';
import { notify } from '@/lib/notify';
import { ErrorState } from '@/components/shared/ErrorState';
import { GeneratorPanel } from './GeneratorPanel';
import { addMemo, findMemoFromChapter } from '@/lib/memoStore';
import { taskStore } from '@/services/planner/taskStore';

interface Props {
  recording: VoiceRecording;
  onDelete: () => void;
  onRenameTitle: (title: string) => void;
  /** 생성 결과를 어시스턴트 대화로 이어가기 */
  onContinueChat?: (title: string, content: string) => void;
  /** 생성 결과를 Study 노트로 저장 */
  onSaveAsStudyNote?: (title: string, content: string) => void;
}

const PLAYBACK_SPEEDS = [0.75, 1, 1.25, 1.5, 1.75, 2] as const;
type PlaybackSpeed = typeof PLAYBACK_SPEEDS[number];

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

export function RecordingDetail({
  recording, onDelete, onRenameTitle,
  onContinueChat, onSaveAsStudyNote,
}: Props) {
  const navigate = useNavigate();
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<PlaybackSpeed>(1);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(recording.title);
  // 승격된 자식 추적 (중복 클릭 방지 + UI 토글)
  const [promotedChapters, setPromotedChapters] = useState<Set<number>>(() => new Set());
  const [promotedActions, setPromotedActions] = useState<Set<number>>(() => new Set());
  const [transcriptOpen, setTranscriptOpen] = useState(true);
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [initialKind, setInitialKind] = useState<ArtifactKind | undefined>(undefined);
  const [summaryCopied, setSummaryCopied] = useState(false);
  // 사용자가 스크립트를 직접 스크롤 중이면 자동 스크롤 일시 정지 (3초)
  const [userScrolling, setUserScrolling] = useState(false);
  const userScrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 전사 검색
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [currentMatchIdx, setCurrentMatchIdx] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const audioRef = useRef<HTMLAudioElement>(null);
  const activeSegmentRef = useRef<HTMLLIElement>(null);
  const matchRefs = useRef<Map<number, HTMLLIElement>>(new Map());

  // 녹음 바뀔 때마다 승격 상태 재계산 (메모/할일 store 에서 로드)
  useEffect(() => {
    const ch = new Set<number>();
    recording.chapters.forEach((_, i) => {
      if (findMemoFromChapter(recording.id, i)) ch.add(i);
    });
    setPromotedChapters(ch);

    const ac = new Set<number>();
    recording.actionItems.forEach((_, i) => {
      if (taskStore.findFromRecordingAction(recording.id, i)) ac.add(i);
    });
    setPromotedActions(ac);
  }, [recording.id, recording.chapters, recording.actionItems]);

  // 챕터 → 메모 승격
  const handlePromoteChapter = useCallback((idx: number) => {
    if (promotedChapters.has(idx)) {
      // 이미 만든 메모 → 메모 페이지로 이동
      const existing = findMemoFromChapter(recording.id, idx);
      if (existing) {
        navigate(`/memos?id=${existing.id}`);
      }
      return;
    }
    const ch = recording.chapters[idx];
    if (!ch) return;
    // 챕터 구간의 트랜스크립트 텍스트 묶기
    const body = recording.transcript
      .filter((s) => s.start >= ch.start && s.end <= ch.end)
      .map((s) => s.text)
      .join('\n');
    const tStart = formatDuration(ch.start);
    const tEnd = formatDuration(ch.end);
    const memo = addMemo({
      body: `${ch.title}\n\n${body}\n\n---\n출처: ${recording.title} (${tStart}–${tEnd})`,
      pinned: false,
      sourceRecordingId: recording.id,
      sourceRecordingTitle: recording.title,
      sourceChapterIndex: idx,
    });
    setPromotedChapters((prev) => new Set(prev).add(idx));
    notify.success('메모로 만들었어요', {
      duration: 4000,
      action: { label: '메모 열기', onClick: () => navigate(`/memos?id=${memo.id}`) },
    });
  }, [promotedChapters, recording, navigate]);

  // 액션 아이템 → 할일 승격
  const handlePromoteAction = useCallback((idx: number) => {
    if (promotedActions.has(idx)) {
      const existing = taskStore.findFromRecordingAction(recording.id, idx);
      if (existing) navigate('/planner');
      return;
    }
    const a = recording.actionItems[idx];
    if (!a) return;
    const noteParts: string[] = [];
    if (a.owner) noteParts.push(`담당: ${a.owner}`);
    if (a.due) noteParts.push(`기한: ${a.due}`);
    noteParts.push(`출처: ${recording.title}`);
    taskStore.add({
      title: a.text,
      note: noteParts.join('\n'),
      sourceRecordingId: recording.id,
      sourceRecordingTitle: recording.title,
      sourceActionIndex: idx,
    });
    setPromotedActions((prev) => new Set(prev).add(idx));
    notify.success('할일로 보냈어요', {
      duration: 4000,
      action: { label: '플래너 열기', onClick: () => navigate('/planner') },
    });
  }, [promotedActions, recording, navigate]);

  // 녹음 바뀌면 오디오 URL 재로드
  useEffect(() => {
    setTitleDraft(recording.title);
    setEditingTitle(false);
    let revoked = false;
    let urlToRevoke: string | null = null;
    (async () => {
      if (!recording.audioBlobRef) { setAudioUrl(null); return; }
      try {
        const url = await getAudioObjectURL(recording.audioBlobRef);
        if (revoked) { if (url) URL.revokeObjectURL(url); return; }
        urlToRevoke = url;
        setAudioUrl(url);
      } catch {
        setAudioUrl(null);
      }
    })();
    return () => {
      revoked = true;
      if (urlToRevoke) URL.revokeObjectURL(urlToRevoke);
      setAudioUrl(null);
      setCurrentTime(0);
      setIsPlaying(false);
    };
  }, [recording.id, recording.audioBlobRef, recording.title]);

  const seekTo = useCallback((sec: number) => {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = Math.max(0, sec);
    if (a.paused) a.play().catch(() => {});
  }, []);

  const seekBy = useCallback((delta: number) => {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = Math.max(0, Math.min(a.duration || recording.durationSec, a.currentTime + delta));
  }, [recording.durationSec]);

  const togglePlay = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) a.play().catch(() => {}); else a.pause();
  }, []);

  // 재생 속도 사이클: 0.75 → 1 → 1.25 → 1.5 → 1.75 → 2 → 0.75
  const cycleSpeed = useCallback(() => {
    setSpeed((prev) => {
      const idx = PLAYBACK_SPEEDS.indexOf(prev);
      const next = PLAYBACK_SPEEDS[(idx + 1) % PLAYBACK_SPEEDS.length];
      const a = audioRef.current;
      if (a) a.playbackRate = next;
      return next;
    });
  }, []);

  // 오디오 로드 시마다 현재 속도 재적용
  useEffect(() => {
    const a = audioRef.current;
    if (a) a.playbackRate = speed;
  }, [audioUrl, speed]);

  const busy = recording.status === 'transcribing' || recording.status === 'analyzing' || recording.status === 'uploading';
  const isError = recording.status === 'error';

  const activeChapterIdx = useMemo(() => {
    if (!recording.chapters.length) return -1;
    for (let i = 0; i < recording.chapters.length; i++) {
      const c = recording.chapters[i];
      if (currentTime >= c.start && currentTime < c.end) return i;
    }
    return -1;
  }, [currentTime, recording.chapters]);

  const activeSegmentIdx = useMemo(() => {
    if (!recording.transcript.length) return -1;
    for (let i = 0; i < recording.transcript.length; i++) {
      const s = recording.transcript[i];
      if (currentTime >= s.start && currentTime < s.end) return i;
    }
    return -1;
  }, [currentTime, recording.transcript]);

  // 검색 매치 인덱스 배열 (전사 세그먼트 내 키워드 포함)
  const matchIndices = useMemo(() => {
    const q = normalize(searchQuery);
    if (!q) return [] as number[];
    const out: number[] = [];
    recording.transcript.forEach((s, i) => {
      if (normalize(s.text).includes(q)) out.push(i);
    });
    return out;
  }, [searchQuery, recording.transcript]);

  // 쿼리 바뀌면 첫 매치로
  useEffect(() => {
    setCurrentMatchIdx(0);
  }, [searchQuery]);

  // 현재 매치로 스크롤
  useEffect(() => {
    if (matchIndices.length === 0) return;
    const segIdx = matchIndices[currentMatchIdx];
    const el = matchRefs.current.get(segIdx);
    if (el) {
      const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      el.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' });
    }
  }, [matchIndices, currentMatchIdx]);

  const goToNextMatch = useCallback(() => {
    if (matchIndices.length === 0) return;
    setCurrentMatchIdx((prev) => (prev + 1) % matchIndices.length);
  }, [matchIndices.length]);

  const goToPrevMatch = useCallback(() => {
    if (matchIndices.length === 0) return;
    setCurrentMatchIdx((prev) => (prev - 1 + matchIndices.length) % matchIndices.length);
  }, [matchIndices.length]);

  // 재생 중인 세그먼트로 자동 스크롤 (사용자 수동 스크롤 감지 시 3초 일시 정지)
  useEffect(() => {
    if (userScrolling) return;
    if (activeSegmentIdx < 0 || !transcriptOpen) return;
    const el = activeSegmentRef.current;
    if (!el) return;
    // Reduced motion 존중
    const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' });
  }, [activeSegmentIdx, transcriptOpen, userScrolling]);

  const handleUserScroll = useCallback(() => {
    setUserScrolling(true);
    if (userScrollTimer.current) clearTimeout(userScrollTimer.current);
    userScrollTimer.current = setTimeout(() => setUserScrolling(false), 3000);
  }, []);

  // ── 키보드 단축키 (Space / J / L / K / ↑↓ / Cmd+F / Esc)
  // Dialog 열려 있거나 input/textarea 포커스 중이면 비활성.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tgt = e.target as HTMLElement | null;
      const typing = tgt && (/input|textarea/i.test(tgt.tagName) || tgt.isContentEditable);
      const cmdOrCtrl = e.metaKey || e.ctrlKey;

      // Cmd/Ctrl + F → 검색 열기 (typing 상태여도 허용)
      if (cmdOrCtrl && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setSearchOpen(true);
        setTranscriptOpen(true);
        setTimeout(() => searchInputRef.current?.focus(), 50);
        return;
      }

      if (typing) {
        // 검색창에서 Enter → 다음, Shift+Enter → 이전, Esc → 닫기
        if (tgt === searchInputRef.current) {
          if (e.key === 'Enter') {
            e.preventDefault();
            if (e.shiftKey) goToPrevMatch(); else goToNextMatch();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            setSearchOpen(false);
            setSearchQuery('');
          }
        }
        return;
      }
      if (generatorOpen) return;

      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.key.toLowerCase() === 'j') {
        e.preventDefault();
        seekBy(-15);
      } else if (e.key.toLowerCase() === 'l') {
        e.preventDefault();
        seekBy(15);
      } else if (e.key.toLowerCase() === 'k') {
        e.preventDefault();
        audioRef.current?.pause();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        cycleSpeed();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [togglePlay, seekBy, cycleSpeed, goToNextMatch, goToPrevMatch, generatorOpen]);

  useEffect(() => () => {
    if (userScrollTimer.current) clearTimeout(userScrollTimer.current);
  }, []);

  const saveTitle = () => {
    const next = titleDraft.trim();
    setEditingTitle(false);
    if (next && next !== recording.title) onRenameTitle(next);
    else setTitleDraft(recording.title);
  };

  const openGenerator = (kind?: ArtifactKind) => {
    setInitialKind(kind);
    setGeneratorOpen(true);
  };

  const handleCopySummary = async () => {
    if (!recording.summary) return;
    try {
      await navigator.clipboard.writeText(recording.summary);
      setSummaryCopied(true);
      notify.copied();
      setTimeout(() => setSummaryCopied(false), 1500);
    } catch {
      notify.error('복사 실패');
    }
  };

  const canGenerate = recording.status === 'ready' && recording.transcript.length > 0;

  return (
    <div className="h-full flex flex-col min-h-0 bg-white dark:bg-slate-950">
      {/* 헤더 */}
      <div className="shrink-0 border-b border-slate-200 dark:border-slate-800 px-6 py-3 flex items-start gap-3">
        <div className="flex-1 min-w-0">
          {editingTitle ? (
            <input
              autoFocus
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); saveTitle(); }
                if (e.key === 'Escape') { setEditingTitle(false); setTitleDraft(recording.title); }
              }}
              onBlur={saveTitle}
              className="w-full text-[15px] font-bold text-slate-900 dark:text-slate-100 bg-transparent border-b border-slate-300 dark:border-slate-600 outline-none focus:border-indigo-500 py-0.5"
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditingTitle(true)}
              className="group flex items-center gap-1.5 text-left"
              aria-label="제목 편집"
            >
              <h2 className="text-[15px] font-bold text-slate-900 dark:text-slate-100 truncate">
                {recording.title || '제목 없음'}
              </h2>
              <Pencil className="h-3 w-3 text-slate-300 group-hover:text-slate-600 dark:group-hover:text-slate-300 shrink-0" />
            </button>
          )}
          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
            <span className="tabular-nums">{formatDuration(recording.durationSec)}</span>
            <span>·</span>
            <span>{new Date(recording.createdAt).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
            {busy && (
              <span className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-300 ml-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                {VOICE_STATUS_LABEL[recording.status]}
              </span>
            )}
          </div>
        </div>

        {canGenerate && (
          <button
            type="button"
            onClick={() => openGenerator()}
            className="shrink-0 h-8 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[12px] font-semibold inline-flex items-center gap-1.5 transition-colors"
          >
            <Sparkles className="h-3.5 w-3.5" />
            만들기
          </button>
        )}
        <button
          type="button"
          onClick={onDelete}
          className="shrink-0 text-slate-400 hover:text-red-600 dark:hover:text-red-400 p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30"
          aria-label="삭제"
          title="삭제"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* 에러 상태 */}
      {isError && (
        <div className="mx-6 my-4">
          <ErrorState
            error={recording.errorMessage || '처리 중 오류가 발생했어요.'}
            compact
            showDetails={false}
          />
        </div>
      )}

      {/* 처리 중 — 스크립트가 아직 없을 때만 전체 블로킹 */}
      {busy && recording.transcript.length === 0 && (
        <ProcessingCard status={recording.status} durationSec={recording.durationSec} />
      )}

      {/* 본문 — 단일 스크롤 플로우 */}
      {(!busy || recording.transcript.length > 0) && (
        <div className="flex-1 min-h-0 overflow-y-auto" onScroll={handleUserScroll}>
          <div className="max-w-3xl mx-auto px-6 py-5 space-y-5">
            {/* 요약 카드 */}
            <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[12px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">요약</h3>
                {recording.summary && (
                  <button
                    type="button"
                    onClick={handleCopySummary}
                    className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                    aria-label="요약 복사"
                    title="요약 복사"
                  >
                    {summaryCopied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                )}
              </div>
              {recording.summary ? (
                <p className="text-[13.5px] leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
                  {recording.summary}
                </p>
              ) : busy ? (
                <div className="flex items-center gap-2 text-[12px] text-slate-500 dark:text-slate-400">
                  <Loader2 className="h-3 w-3 animate-spin" /> 생성 중…
                </div>
              ) : (
                <p className="text-[12px] text-slate-400">요약이 없어요.</p>
              )}
            </section>

            {/* 액션아이템 — 있을 때만 */}
            {recording.actionItems.length > 0 && (
              <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                <h3 className="text-[12px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  해야 할 일
                </h3>
                <ul className="space-y-1.5">
                  {recording.actionItems.map((a, i) => {
                    const promoted = promotedActions.has(i);
                    return (
                      <li
                        key={i}
                        className="group flex items-start gap-2.5 rounded-lg px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                      >
                        <span className="inline-flex h-4 w-4 items-center justify-center rounded border border-slate-300 dark:border-slate-600 mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] text-slate-800 dark:text-slate-200 leading-relaxed">{a.text}</p>
                          {(a.owner || a.due) && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2">
                              {a.owner && <span>👤 {a.owner}</span>}
                              {a.due && <span>📅 {a.due}</span>}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handlePromoteAction(i)}
                          className={cn(
                            'shrink-0 inline-flex items-center gap-1 h-7 px-2 rounded-md text-[11px] font-medium transition-all',
                            promoted
                              ? 'text-violet-600 dark:text-violet-300 bg-violet-50 dark:bg-violet-500/10 hover:bg-violet-100 dark:hover:bg-violet-500/20'
                              : 'text-slate-500 dark:text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200',
                          )}
                          title={promoted ? '이미 할일로 보냄 — 플래너 열기' : '할일로 보내기'}
                        >
                          <ListTodo className="h-3.5 w-3.5" />
                          {promoted ? '할일' : '할일로'}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            {/* 챕터 — 있을 때만 */}
            {recording.chapters.length > 0 && (
              <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                <h3 className="text-[12px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  챕터 {recording.chapters.length}개
                </h3>
                <ol className="space-y-0.5">
                  {recording.chapters.map((c, i) => {
                    const active = i === activeChapterIdx;
                    const promoted = promotedChapters.has(i);
                    return (
                      <li key={i} className="group relative">
                        <button
                          type="button"
                          onClick={() => seekTo(c.start)}
                          className={cn(
                            'w-full text-left flex items-start gap-3 rounded-lg px-3 py-2 pr-20 transition-colors',
                            active
                              ? 'bg-indigo-50 dark:bg-indigo-500/10 border-l-2 border-indigo-500'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 border-l-2 border-transparent',
                          )}
                        >
                          <span className={cn(
                            'text-[11px] tabular-nums shrink-0 mt-0.5 font-semibold',
                            active ? 'text-indigo-600 dark:text-indigo-300' : 'text-slate-400',
                          )}>
                            {formatDuration(c.start)}
                          </span>
                          <span className="text-[13px] text-slate-800 dark:text-slate-200 leading-relaxed">
                            {c.title}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handlePromoteChapter(i); }}
                          className={cn(
                            'absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 h-7 px-2 rounded-md text-[11px] font-medium transition-all',
                            promoted
                              ? 'text-violet-600 dark:text-violet-300 bg-violet-50 dark:bg-violet-500/10 hover:bg-violet-100 dark:hover:bg-violet-500/20'
                              : 'text-slate-500 dark:text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200',
                          )}
                          title={promoted ? '이미 메모로 만듦 — 메모 열기' : '메모로 만들기'}
                        >
                          <FileText className="h-3.5 w-3.5" />
                          {promoted ? '메모' : '메모로'}
                        </button>
                      </li>
                    );
                  })}
                </ol>
              </section>
            )}

            {/* 전체 스크립트 — 접이식 + 검색 (Cmd/Ctrl+F) */}
            <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="flex items-center gap-1 px-4 py-3">
                <button
                  type="button"
                  onClick={() => setTranscriptOpen((v) => !v)}
                  className="flex-1 flex items-center gap-2 text-left"
                  aria-expanded={transcriptOpen}
                >
                  <h3 className="text-[12px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex-1">
                    전체 스크립트 {recording.transcript.length > 0 && <span className="text-slate-400 normal-case tracking-normal font-medium">· {recording.transcript.length}개 구간</span>}
                  </h3>
                  {transcriptOpen ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                </button>
                {recording.transcript.length > 0 && transcriptOpen && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchOpen((v) => !v);
                      if (!searchOpen) setTimeout(() => searchInputRef.current?.focus(), 50);
                    }}
                    className="ml-1 p-1.5 rounded-md text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
                    aria-label="스크립트 검색 (Cmd+F)"
                    title="검색 (Cmd+F)"
                  >
                    <Search className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {transcriptOpen && searchOpen && (
                <div className="px-4 pb-2 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800">
                  <Search className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="스크립트에서 찾기…"
                    className="flex-1 bg-transparent text-[13px] text-slate-800 dark:text-slate-200 placeholder:text-slate-400 outline-none py-1"
                    aria-label="스크립트 검색어"
                  />
                  {searchQuery && (
                    <span className="text-[11px] tabular-nums text-slate-500 dark:text-slate-400" aria-live="polite">
                      {matchIndices.length > 0 ? `${currentMatchIdx + 1} / ${matchIndices.length}` : '0'}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={goToPrevMatch}
                    disabled={matchIndices.length === 0}
                    className="p-1 rounded text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
                    aria-label="이전 매치"
                    title="이전 (Shift+Enter)"
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={goToNextMatch}
                    disabled={matchIndices.length === 0}
                    className="p-1 rounded text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
                    aria-label="다음 매치"
                    title="다음 (Enter)"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
                    className="p-1 rounded text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
                    aria-label="검색 닫기"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {transcriptOpen && (
                <div className="px-4 pb-4 pt-2">
                  {recording.transcript.length === 0 ? (
                    <p className="text-[12px] text-slate-400 px-3 py-2">스크립트가 아직 없어요.</p>
                  ) : (
                    <ul className="space-y-0.5">
                      {recording.transcript.map((s, i) => {
                        const active = i === activeSegmentIdx;
                        const matchPos = matchIndices.indexOf(i);
                        const isMatch = matchPos >= 0;
                        const isCurrentMatch = isMatch && matchPos === currentMatchIdx;
                        return (
                          <li
                            key={i}
                            ref={(el) => {
                              if (active) activeSegmentRef.current = el;
                              if (el) matchRefs.current.set(i, el); else matchRefs.current.delete(i);
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => seekTo(s.start)}
                              className={cn(
                                'w-full text-left flex items-start gap-3 rounded-md px-3 py-1.5 transition-colors',
                                isCurrentMatch
                                  ? 'bg-amber-100 dark:bg-amber-500/20 ring-1 ring-amber-400 dark:ring-amber-500/60'
                                  : isMatch
                                    ? 'bg-yellow-50 dark:bg-yellow-500/10'
                                    : active
                                      ? 'bg-indigo-50 dark:bg-indigo-500/10'
                                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/60',
                              )}
                            >
                              <span className={cn(
                                'text-[10.5px] tabular-nums shrink-0 mt-0.5 font-semibold',
                                active ? 'text-indigo-600 dark:text-indigo-300' : 'text-slate-400',
                              )}>
                                {formatDuration(s.start)}
                              </span>
                              <span className={cn(
                                'text-[13px] leading-relaxed',
                                active ? 'text-slate-900 dark:text-slate-100 font-medium' : 'text-slate-700 dark:text-slate-300',
                              )}>
                                {s.text}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              )}
            </section>
          </div>
        </div>
      )}

      {/* 하단 오디오 플레이어 */}
      {audioUrl && (
        <div className="shrink-0 border-t border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-2.5 bg-slate-50 dark:bg-slate-900 flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => seekBy(-15)}
            className="h-8 w-8 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 flex items-center justify-center transition-colors"
            aria-label="15초 뒤로"
            title="15초 뒤로 (J)"
          >
            <SkipBack className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={togglePlay}
            className="h-9 w-9 rounded-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 flex items-center justify-center hover:scale-105 transition-transform"
            aria-label={isPlaying ? '일시정지 (Space)' : '재생 (Space)'}
            title={isPlaying ? '일시정지 (Space)' : '재생 (Space)'}
          >
            {isPlaying ? <Pause className="h-4 w-4" fill="currentColor" /> : <Play className="h-4 w-4 ml-0.5" fill="currentColor" />}
          </button>
          <button
            type="button"
            onClick={() => seekBy(15)}
            className="h-8 w-8 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 flex items-center justify-center transition-colors"
            aria-label="15초 앞으로"
            title="15초 앞으로 (L)"
          >
            <SkipForward className="h-4 w-4" />
          </button>
          <span className="text-[11px] tabular-nums text-slate-600 dark:text-slate-300 shrink-0 w-10">
            {formatDuration(currentTime)}
          </span>
          <input
            type="range"
            min={0}
            max={Math.max(recording.durationSec, 1)}
            step={0.1}
            value={currentTime}
            onChange={(e) => seekTo(Number(e.target.value))}
            className="flex-1 min-w-[120px] accent-indigo-500"
            aria-label="재생 위치"
            aria-valuetext={`${formatDuration(currentTime)} / ${formatDuration(recording.durationSec)}`}
          />
          <span className="text-[11px] tabular-nums text-slate-400 shrink-0 w-10 text-right">
            {formatDuration(recording.durationSec)}
          </span>
          <button
            type="button"
            onClick={cycleSpeed}
            className="h-7 px-2.5 rounded-full bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-200 tabular-nums transition-colors"
            aria-label={`재생 속도 ${speed}배`}
            title={`재생 속도 (↑로도 변경, 현재 ${speed}x)`}
          >
            {speed}x
          </button>
          <audio
            ref={audioRef}
            src={audioUrl}
            preload="metadata"
            onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
            className="hidden"
          />
        </div>
      )}

      <GeneratorPanel
        open={generatorOpen}
        recording={recording}
        initialKind={initialKind}
        onOpenChange={setGeneratorOpen}
        onContinueChat={onContinueChat}
        onSaveAsStudyNote={onSaveAsStudyNote}
      />
    </div>
  );
}

/* ── 처리 중 카드 — 3단 진행 + 예상 시간 ── */
function ProcessingCard({ status, durationSec }: { status: VoiceRecording['status']; durationSec: number }) {
  const steps = [
    { key: 'uploading', label: '업로드' },
    { key: 'transcribing', label: '전사' },
    { key: 'analyzing', label: '분석' },
  ] as const;
  const currentIdx = steps.findIndex((s) => s.key === status);
  const estimateSec = Math.round(Math.max(5, durationSec * 0.3) + 8);

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="max-w-sm w-full text-center space-y-4">
        <div className="flex items-center justify-center gap-3">
          {steps.map((s, i) => {
            const done = i < currentIdx;
            const active = i === currentIdx;
            return (
              <div key={s.key} className="flex items-center gap-2">
                <div
                  className={cn(
                    'flex items-center justify-center rounded-full text-[10px] font-bold transition-all',
                    done && 'h-5 w-5 bg-indigo-500 text-white',
                    active && 'h-6 w-6 bg-indigo-500 text-white ring-4 ring-indigo-100 dark:ring-indigo-500/20',
                    !done && !active && 'h-5 w-5 bg-slate-200 dark:bg-slate-700 text-slate-400',
                  )}
                  aria-current={active ? 'step' : undefined}
                >
                  {done ? '✓' : i + 1}
                </div>
                <span
                  className={cn(
                    'text-[11px] font-medium',
                    active ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400',
                  )}
                >
                  {s.label}
                </span>
                {i < steps.length - 1 && <span className="text-slate-300 dark:text-slate-700">—</span>}
              </div>
            );
          })}
        </div>
        <p className="text-[12.5px] text-slate-600 dark:text-slate-300">
          {status === 'uploading' && '오디오를 서버로 보내는 중…'}
          {status === 'transcribing' && '녹음을 텍스트로 바꾸는 중…'}
          {status === 'analyzing' && '요약·챕터·액션 만드는 중…'}
        </p>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          예상 {estimateSec}초 내외<br />
          녹음 길이가 길수록 더 걸려요.
        </p>
      </div>
    </div>
  );
}
