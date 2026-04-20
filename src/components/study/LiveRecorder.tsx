import { useState, useEffect, useRef } from 'react';
import { Square, Pause, Play, Bookmark, X } from 'lucide-react';
import type { StudySource } from '@/types/study';
import { newId } from '@/types/study';
import { StudyBtn } from './ui/primitives';

interface Props {
  onClose: () => void;
  onDone: (source: StudySource) => void;
}

export function LiveRecorder({ onClose, onDone }: Props) {
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const [bookmarks, setBookmarks] = useState<number[]>([]);
  const [transcribing, setTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (!mounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const rec = new MediaRecorder(stream);
        rec.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };
        rec.start(1000);
        recorderRef.current = rec;
        intervalRef.current = window.setInterval(() => setElapsed((e) => e + 1), 1000);
      } catch (e) {
        setError('마이크 권한이 필요해요. 브라우저 설정에서 마이크 접근을 허용해주세요.');
      }
    })();
    return () => {
      mounted = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
      recorderRef.current?.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const togglePause = () => {
    const rec = recorderRef.current;
    if (!rec) return;
    if (paused) {
      rec.resume();
      intervalRef.current = window.setInterval(() => setElapsed((e) => e + 1), 1000);
    } else {
      rec.pause();
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    setPaused(!paused);
  };

  const addBookmark = () => setBookmarks((b) => [...b, elapsed]);

  const finish = async () => {
    const rec = recorderRef.current;
    if (!rec) return;
    if (intervalRef.current) clearInterval(intervalRef.current);

    const stopPromise = new Promise<Blob>((resolve) => {
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' });
        resolve(blob);
      };
    });
    rec.stop();
    const blob = await stopPromise;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setTranscribing(true);

    const title = `강의 녹음 ${new Date().toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    })}`;
    const bookmarkText = bookmarks.length
      ? `\n\n📌 북마크 시점: ${bookmarks.map((s) => formatTime(s)).join(', ')}`
      : '';

    let content = `[녹음 — ${formatTime(elapsed)}]${bookmarkText}\n\n`;
    try {
      const base64 = await blobToBase64(blob);
      const r = await fetch('/api/study-transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioBase64: base64, mimeType: blob.type }),
      });
      const data = await r.json();
      if (r.ok && data.text) {
        content += data.text;
      } else if (r.status === 501) {
        content +=
          '※ 자동 전사가 아직 연결되지 않았어요. 녹음 메모만 저장됐으니 필요한 부분을 직접 적어주세요.';
      } else {
        content += `※ 전사 실패: ${data?.error || '알 수 없는 오류'}`;
      }
    } catch {
      content += '※ 전사 중 네트워크 오류가 발생했어요.';
    }

    const source: StudySource = {
      id: newId('src'),
      kind: 'recording',
      title,
      content,
      addedAt: Date.now(),
      enabled: true,
      status: 'ready',
    };
    setTranscribing(false);
    onDone(source);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/95 text-white flex flex-col items-center justify-center p-6">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white/60 hover:text-white p-2"
        aria-label="닫기"
      >
        <X className="h-5 w-5" />
      </button>

      {error ? (
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-4">🎙️</div>
          <p className="text-sm text-red-300">{error}</p>
          <StudyBtn variant="outline" className="mt-6" onClick={onClose}>
            닫기
          </StudyBtn>
        </div>
      ) : transcribing ? (
        <div className="text-center">
          <div className="study-shimmer mx-auto h-16 w-16 rounded-full mb-4" />
          <p className="text-sm text-white/80 font-semibold">전사 중입니다</p>
          <p className="text-xs text-white/50 mt-1">보통 30초 — 길이에 따라 최대 1분 정도 걸려요</p>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3 mb-8">
            <span className="study-rec-dot h-4 w-4 rounded-full bg-red-500" aria-hidden />
            <span className="text-xs uppercase tracking-widest text-white/70">
              {paused ? '일시 정지' : '녹음 중'}
            </span>
          </div>
          <div className="font-mono tabular-nums text-6xl font-bold mb-2">
            {formatTime(elapsed)}
          </div>
          <p className="text-xs text-white/40 mb-10">
            {bookmarks.length > 0 && `북마크 ${bookmarks.length}개`}
          </p>

          <div className="flex items-center gap-4">
            <button
              onClick={addBookmark}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              title="현재 시점 북마크"
            >
              <Bookmark className="h-5 w-5" />
            </button>
            <button
              onClick={togglePause}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              title={paused ? '재개' : '일시 정지'}
            >
              {paused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
            </button>
            <button
              onClick={finish}
              className="flex h-20 w-20 items-center justify-center rounded-full bg-red-600 hover:bg-red-500 transition-colors shadow-lg shadow-red-900/50"
              title="녹음 종료"
            >
              <Square className="h-7 w-7" fill="currentColor" />
            </button>
          </div>

          <p className="mt-10 text-[11px] text-white/30 text-center max-w-xs leading-relaxed">
            녹음은 본인 기기에서만 처리되며 업로드 전엔 외부로 나가지 않아요.
          </p>
        </>
      )}
    </div>
  );
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => {
      const result = fr.result as string;
      resolve(result.split(',')[1] ?? '');
    };
    fr.onerror = reject;
    fr.readAsDataURL(blob);
  });
}
