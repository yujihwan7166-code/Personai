/**
 * 전문 > AI 녹음 분석 — 루트 패널.
 * 좌측 리스트 + 우측 상세 (없으면 빈 상태).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Mic, Upload, Loader2, LogIn } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { notify } from '@/lib/notify';
import { confirmDialog } from '@/lib/confirmDialog';
import {
  listRecordings,
  deleteRecording,
  updateRecording,
} from '@/lib/voiceRecordingStore';
import { runVoicePipeline } from '@/lib/voiceRecordingPipeline';
import {
  type VoiceRecording,
} from '@/types/voiceAnalysis';
import { RecordingListItem } from './RecordingListItem';
import { RecordingDetail } from './RecordingDetail';
import { RecorderDialog } from './RecorderDialog';
import { FileUploadDropzone } from './FileUploadDropzone';
import { cn } from '@/lib/utils';

interface Props {
  onClose: () => void;
  /** 생성 결과를 어시스턴트 대화로 이어가기 */
  onContinueChat?: (title: string, content: string) => void;
  /** 생성 결과를 Study 노트로 저장 */
  onSaveAsStudyNote?: (title: string, content: string) => void;
}

export function VoiceAnalysisPanel({ onClose, onContinueChat, onSaveAsStudyNote }: Props) {
  const { user } = useAuth();
  const userId = user?.id;
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  const [recordings, setRecordings] = useState<VoiceRecording[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRecorder, setShowRecorder] = useState(false);
  const [showUpload, setShowUpload] = useState(false);

  const selected = useMemo(
    () => (selectedId ? recordings.find((r) => r.id === selectedId) ?? null : null),
    [recordings, selectedId],
  );

  const refresh = useCallback(async () => {
    if (!userId) return;
    try {
      const list = await listRecordings(userId);
      setRecordings(list);
    } catch (err) {
      notify.error('불러오지 못했어요', {
        description: err instanceof Error ? err.message : '잠시 후 다시 시도해 주세요.',
      });
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    refresh();
  }, [userId, refresh]);

  const handleUpsert = useCallback((rec: VoiceRecording) => {
    setRecordings((prev) => {
      const idx = prev.findIndex((r) => r.id === rec.id);
      if (idx === -1) return [rec, ...prev];
      const next = [...prev];
      next[idx] = rec;
      return next;
    });
    setSelectedId(rec.id);
  }, []);

  const startPipeline = useCallback(
    async (blob: Blob, duration: number, provisionalTitle?: string) => {
      if (!userId) return;
      try {
        await runVoicePipeline({
          userId,
          audioBlob: blob,
          estimatedDurationSec: duration,
          provisionalTitle,
          onProgress: handleUpsert,
        });
        await refresh();
      } catch (err) {
        notify.error('처리에 실패했어요', {
          description: err instanceof Error ? err.message : '잠시 후 다시 시도해 주세요.',
        });
      }
    },
    [userId, handleUpsert, refresh],
  );

  const handleRenameTitleError = useCallback((err: unknown) => {
    notify.error('제목 저장 실패', {
      description: err instanceof Error ? err.message : '잠시 후 다시 시도해 주세요.',
    });
  }, []);

  // 소프트 삭제 — 5초 내 되돌릴 수 있도록 Undo 토스트 제공
  const pendingDeleteTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const handleDelete = useCallback(
    async (id: string) => {
      const target = recordings.find((r) => r.id === id);
      const ok = await confirmDialog({
        title: '이 녹음을 삭제할까요?',
        description: target?.title
          ? `"${target.title}" — 5초 내에 되돌릴 수 있어요.`
          : '5초 내에 되돌릴 수 있어요.',
        confirmLabel: '삭제',
        tone: 'danger',
      });
      if (!ok) return;

      // 낙관적 UI — 리스트에서 즉시 제거
      setRecordings((prev) => prev.filter((r) => r.id !== id));
      if (selectedId === id) setSelectedId(null);

      // 5초 지연 삭제
      const timer = setTimeout(async () => {
        pendingDeleteTimers.current.delete(id);
        try {
          await deleteRecording(id);
        } catch (err) {
          notify.error('삭제 실패', {
            description: err instanceof Error ? err.message : '잠시 후 다시 시도해 주세요.',
          });
          // 실패 시 리스트 복구
          if (target) setRecordings((prev) => [target, ...prev]);
        }
      }, 5000);
      pendingDeleteTimers.current.set(id, timer);

      notify.success('녹음이 삭제됐어요', {
        duration: 5000,
        action: {
          label: '되돌리기',
          onClick: () => {
            const t = pendingDeleteTimers.current.get(id);
            if (t) {
              clearTimeout(t);
              pendingDeleteTimers.current.delete(id);
            }
            if (target) {
              setRecordings((prev) => [target, ...prev]);
              setSelectedId(id);
            }
          },
        },
      });
    },
    [recordings, selectedId],
  );

  // 페이지 언로드 시 대기 중인 삭제 플러시
  useEffect(() => {
    const timers = pendingDeleteTimers.current;
    return () => {
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
    };
  }, []);

  const handleRenameTitle = useCallback(
    async (id: string, title: string) => {
      try {
        const updated = await updateRecording(id, { title });
        handleUpsert(updated);
      } catch (err) {
        handleRenameTitleError(err);
      }
    },
    [handleUpsert, handleRenameTitleError],
  );

  // 비로그인 — 풍부한 프리뷰 + 로그인 유도 (실제 녹음/전사는 Supabase 사용량 트래킹 때문에 로그인 필요)
  if (!userId) {
    return (
      <div className="flex h-full flex-col bg-white dark:bg-slate-950">
        {/* 헤더 — 로그인 상태와 동일한 프레임 */}
        <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 px-6 py-3">
          <button
            onClick={onClose}
            className="inline-flex items-center gap-1 text-[12px] text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
            aria-label="돌아가기"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> 뒤로
          </button>
          <span className="text-slate-300">/</span>
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-base">🎙️</span>
            <h1 className="text-[15px] font-bold text-slate-900 dark:text-slate-100 tracking-tight truncate">
              AI 녹음 분석
            </h1>
          </div>
          <div className="flex-1" />
          <span className="text-[10.5px] text-slate-400 hidden sm:inline">
            로그인 필요 · 녹음 분석
          </span>
        </div>

        {/* 프리뷰 본문 — 기능 소개 + CTA */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="mx-auto max-w-xl px-6 py-12 text-center">
            <div className="text-6xl mb-5" aria-hidden="true">🎙️</div>
            <h2 className="text-[22px] font-bold text-slate-900 dark:text-slate-100 mb-2">
              녹음 한 번이면<br />회의·인터뷰가 노트가 돼요
            </h2>
            <p className="text-[13px] text-slate-500 dark:text-slate-400 mb-7 leading-relaxed">
              녹음을 올리면 AI 가 자동으로 요약·챕터·할 일을 정리해줘요.<br />
              한 클릭으로 메모와 플래너 할 일까지 보내요.
            </p>

            {/* 사용 예시 카드 — 시각적 풍성 */}
            <ul className="grid sm:grid-cols-3 gap-2.5 mb-8 text-left">
              <li className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                <div className="text-2xl mb-2" aria-hidden="true">📚</div>
                <p className="text-[13px] font-bold text-slate-900 dark:text-slate-100">강의</p>
                <p className="text-[11.5px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  요약 · 챕터 · 복습 카드
                </p>
              </li>
              <li className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                <div className="text-2xl mb-2" aria-hidden="true">👥</div>
                <p className="text-[13px] font-bold text-slate-900 dark:text-slate-100">회의·인터뷰</p>
                <p className="text-[11.5px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  결정사항 · 액션 · 담당자
                </p>
              </li>
              <li className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
                <div className="text-2xl mb-2" aria-hidden="true">💭</div>
                <p className="text-[13px] font-bold text-slate-900 dark:text-slate-100">아이디어</p>
                <p className="text-[11.5px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  음성 메모 → 글 초안
                </p>
              </li>
            </ul>

            {/* 핵심 시너지 — 다른 PKM 도구와 연결 */}
            <div className="rounded-xl border border-violet-200 dark:border-violet-500/30 bg-violet-50/50 dark:bg-violet-500/5 p-4 mb-8 text-left">
              <p className="text-[11px] font-mono uppercase tracking-[0.16em] text-violet-600 dark:text-violet-300 mb-2">
                ✨ PKM 시너지
              </p>
              <ul className="space-y-1.5 text-[12.5px] text-slate-700 dark:text-slate-300">
                <li>• 챕터 → <strong className="font-semibold">메모로</strong> 한 클릭 보내기</li>
                <li>• 액션 아이템 → <strong className="font-semibold">플래너 할일로</strong> 자동</li>
                <li>• 출처 라벨 자동 박힘 (어디서 왔는지 추적 가능)</li>
              </ul>
            </div>

            {/* CTA 버튼 — 로그인 */}
            <div className="flex gap-2 justify-center">
              <button
                type="button"
                onClick={() => navigate('/auth')}
                className="h-11 px-6 rounded-lg inline-flex items-center justify-center gap-1.5 text-[13.5px] font-semibold bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white transition-colors"
              >
                <LogIn className="h-4 w-4" />
                로그인하고 시작
              </button>
              <button
                type="button"
                onClick={onClose}
                className="h-11 px-5 rounded-lg inline-flex items-center justify-center gap-1.5 text-[13px] font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
              >
                나중에
              </button>
            </div>

            <p className="text-[10.5px] text-slate-400 mt-5 leading-relaxed">
              MP3 · M4A · WAV · WebM · 최대 25MB
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-white dark:bg-slate-950">
      {/* 헤더 */}
      <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 px-6 py-3">
        <button
          onClick={onClose}
          className="inline-flex items-center gap-1 text-[12px] text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
          aria-label="어시스턴트로 돌아가기"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> 어시스턴트
        </button>
        <span className="text-slate-300">/</span>
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-base">🎙️</span>
          <h1 className="text-[15px] font-bold text-slate-900 dark:text-slate-100 tracking-tight truncate">
            AI 녹음 분석
          </h1>
          <span className="text-[11px] text-slate-400 tabular-nums">{recordings.length}개</span>
        </div>
        <div className="flex-1" />
      </div>

      {/* 본문: 데스크톱은 좌 리스트 + 우 상세, 모바일은 1뷰(리스트 ↔ 상세 토글) */}
      <div className={cn(
        'flex-1 min-h-0',
        isMobile ? 'flex' : 'grid grid-cols-[320px_1fr]',
      )}>
        {/* 좌측 리스트 — 모바일에서는 상세가 선택됐을 때 숨김 */}
        <aside className={cn(
          'flex flex-col min-h-0',
          isMobile
            ? (selected ? 'hidden' : 'flex-1')
            : 'border-r border-slate-200 dark:border-slate-800',
        )}>
          <div className="p-3 border-b border-slate-200 dark:border-slate-800 space-y-2">
            <button
              onClick={() => setShowRecorder(true)}
              className="w-full rounded-lg bg-slate-900 px-3 py-2 text-[12.5px] font-semibold text-white transition-colors flex items-center justify-center gap-1.5 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
            >
              <Mic className="h-3.5 w-3.5" /> 새 녹음
            </button>
            <button
              onClick={() => setShowUpload(true)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[12px] font-medium text-slate-700 transition-colors flex items-center justify-center gap-1.5 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
            >
              <Upload className="h-3.5 w-3.5" /> 파일 업로드
            </button>
          </div>

          {/* 리스트 */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center p-6">
                <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
              </div>
            ) : recordings.length === 0 ? (
              <div className="p-6 text-center">
                <div className="text-3xl mb-2" aria-hidden="true">🎙️</div>
                <p className="text-[12.5px] font-semibold text-slate-700 dark:text-slate-300">
                  아직 녹음이 없어요
                </p>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  상단 버튼으로<br />첫 녹음을 시작해 보세요.
                </p>
              </div>
            ) : (
              <ul className="py-1">
                {recordings.map((r) => (
                  <li key={r.id}>
                    <RecordingListItem
                      recording={r}
                      selected={r.id === selectedId}
                      onSelect={() => setSelectedId(r.id)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>

        {/* 우측 상세 — 모바일에선 상세가 선택되면 화면 전체, 아니면 숨김 */}
        <main className={cn(
          'min-h-0 overflow-hidden',
          isMobile ? (selected ? 'flex-1 flex flex-col' : 'hidden') : '',
        )}>
          {selected ? (
            <div className="flex-1 flex flex-col min-h-0">
              {isMobile && (
                <div className="shrink-0 flex items-center gap-1 px-3 py-2 border-b border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setSelectedId(null)}
                    className="inline-flex items-center gap-1 text-[12px] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 px-2 py-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
                    aria-label="목록으로"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    목록
                  </button>
                </div>
              )}
              <div className="flex-1 min-h-0">
                <RecordingDetail
                  recording={selected}
                  onDelete={() => handleDelete(selected.id)}
                  onRenameTitle={(title) => handleRenameTitle(selected.id, title)}
                  onContinueChat={onContinueChat}
                  onSaveAsStudyNote={onSaveAsStudyNote}
                />
              </div>
            </div>
          ) : recordings.length === 0 ? (
            /* 첫 방문 빈 상태 — 튜토리얼형 CTA + 사용 예시 (AudioPen/Voicenotes 패턴) */
            <div className="flex h-full items-center justify-center px-6 py-10">
              <div className="w-full max-w-md text-center">
                <div className="text-5xl mb-4" aria-hidden="true">🎙️</div>
                <h2 className="text-[18px] font-bold text-slate-900 dark:text-slate-100 mb-1.5">
                  첫 녹음을 시작해보세요
                </h2>
                <p className="text-[12.5px] text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">
                  녹음만 올리면 요약·챕터·할 일을 자동 정리하고,<br />
                  원하는 형식의 글까지 만들어드려요.
                </p>

                <ul className="text-left space-y-2 mb-6">
                  <li className="flex items-start gap-2.5 text-[12.5px] text-slate-700 dark:text-slate-300">
                    <span className="text-base shrink-0" aria-hidden="true">📚</span>
                    <span><strong className="font-semibold">강의 녹음</strong> → 요약·복습 카드</span>
                  </li>
                  <li className="flex items-start gap-2.5 text-[12.5px] text-slate-700 dark:text-slate-300">
                    <span className="text-base shrink-0" aria-hidden="true">👥</span>
                    <span><strong className="font-semibold">회의 녹음</strong> → 결정사항·할 일·슬랙 요약</span>
                  </li>
                  <li className="flex items-start gap-2.5 text-[12.5px] text-slate-700 dark:text-slate-300">
                    <span className="text-base shrink-0" aria-hidden="true">💭</span>
                    <span><strong className="font-semibold">아이디어 메모</strong> → 블로그 글·SNS 초안</span>
                  </li>
                </ul>

                <div className="flex gap-2 justify-center">
                  <button
                    type="button"
                    onClick={() => setShowRecorder(true)}
                    className="h-10 rounded-lg bg-slate-900 px-5 text-[13px] font-semibold text-white transition-colors inline-flex items-center justify-center gap-1.5 hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
                  >
                    <Mic className="h-4 w-4" />
                    녹음 시작
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowUpload(true)}
                    className="h-10 rounded-lg border border-slate-200 px-5 text-[13px] font-medium text-slate-700 transition-colors inline-flex items-center justify-center gap-1.5 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
                  >
                    <Upload className="h-4 w-4" />
                    파일 업로드
                  </button>
                </div>

                <p className="text-[10.5px] text-slate-400 mt-4">
                  MP3 · M4A · WAV · WebM · 최대 25MB
                </p>
              </div>
            </div>
          ) : (
            /* 녹음은 있는데 아무것도 선택하지 않은 상태 */
            <div className="flex h-full items-center justify-center p-8">
              <div className="text-center">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 mb-3">
                  <Mic className="h-5 w-5 text-slate-400" strokeWidth={1.75} />
                </div>
                <p className="text-[13px] font-medium text-slate-700 dark:text-slate-300">
                  녹음을 선택해 주세요
                </p>
                <p className="text-[11.5px] text-slate-400 mt-1">
                  왼쪽 목록에서 녹음을 고르면 분석 결과가 보여요.
                </p>
              </div>
            </div>
          )}
        </main>
      </div>

      {showRecorder && (
        <RecorderDialog
          onClose={() => setShowRecorder(false)}
          onComplete={(blob, duration) => {
            setShowRecorder(false);
            startPipeline(blob, duration);
          }}
        />
      )}
      {showUpload && (
        <FileUploadDropzone
          onClose={() => setShowUpload(false)}
          onAccept={(blob, duration, name) => {
            setShowUpload(false);
            startPipeline(blob, duration, name);
          }}
        />
      )}
    </div>
  );
}
