/**
 * PodcastPlayer — 대본을 Web Speech TTS 로 재생.
 * - ▶/⏸ · ±15s · 배속 · 자막 토글
 * - 현재 라인 하이라이트 + 자동 스크롤
 * - [p.N] 뱃지 클릭 시 onJumpToPage
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, Rewind, FastForward, FileText, Gauge } from 'lucide-react';
import type { PodcastEpisode } from '@/types/study';
import { createWebSpeechPlayer, computeStartOffsets, isWebSpeechSupported, type PodcastPlayerHandle } from './tts/webSpeech';
import { cn } from '@/lib/utils';

interface Props {
  episode: PodcastEpisode;
  onPlayed?: () => void;
  onJumpToPage?: (page: number) => void;
}

const RATES = [1, 1.25, 1.5, 2] as const;

export function PodcastPlayer({ episode, onPlayed, onJumpToPage }: Props) {
  const [playing, setPlaying] = useState(false);
  const [lineIdx, setLineIdx] = useState(0);
  const [rate, setRate] = useState<number>(1);
  const [showTranscript, setShowTranscript] = useState(true);
  const supported = isWebSpeechSupported();

  const offsets = useMemo(() => computeStartOffsets(episode.script, rate), [episode.script, rate]);
  const totalSec = offsets.length > 0 ? (offsets[offsets.length - 1] + 2) : 0;

  const playerRef = useRef<PodcastPlayerHandle | null>(null);
  const playedOnceRef = useRef(false);

  // player 인스턴스 생성
  useEffect(() => {
    if (!supported) return;
    const p = createWebSpeechPlayer(episode.script);
    playerRef.current = p;
    const unsubLine = p.on('line', () => setLineIdx(p.getCurrentLineIndex()));
    const unsubEnd = p.on('end', () => setPlaying(false));
    const unsubStop = p.on('stop', () => setPlaying(false));
    const unsubPause = p.on('pause', () => setPlaying(false));
    const unsubResume = p.on('resume', () => setPlaying(true));
    return () => {
      unsubLine(); unsubEnd(); unsubStop(); unsubPause(); unsubResume();
      p.stop();
      playerRef.current = null;
    };
  }, [episode.id, supported, episode.script]);

  // 자막 자동 스크롤
  const transcriptRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!showTranscript) return;
    const el = transcriptRef.current?.querySelector(`[data-line-idx="${lineIdx}"]`) as HTMLElement | null;
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [lineIdx, showTranscript]);

  const togglePlay = () => {
    const p = playerRef.current;
    if (!p) return;
    if (playing) {
      p.pause();
    } else {
      if (p.isPlaying()) p.resume(); else p.play();
      setPlaying(true);
      if (!playedOnceRef.current) {
        playedOnceRef.current = true;
        onPlayed?.();
      }
    }
  };

  const seekLine = (i: number) => {
    const p = playerRef.current;
    if (!p) return;
    p.seekLine(i);
    setLineIdx(i);
  };

  const jumpRel = (deltaSec: number) => {
    // 현재 라인의 startAt + deltaSec 위치에 해당하는 라인으로 점프
    const now = offsets[lineIdx] ?? 0;
    const targetSec = Math.max(0, now + deltaSec);
    let i = 0;
    for (let k = 0; k < offsets.length; k++) {
      if (offsets[k] <= targetSec) i = k; else break;
    }
    seekLine(i);
  };

  const cycleRate = () => {
    const cur = RATES.indexOf(rate as typeof RATES[number]);
    const next = RATES[(cur + 1) % RATES.length];
    setRate(next);
    playerRef.current?.setRate(next);
  };

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${String(sec).padStart(2, '0')}`;
  };

  const nowSec = offsets[lineIdx] ?? 0;

  if (!supported) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-[12px] text-amber-800">
        이 브라우저에서는 팟캐스트 재생을 지원하지 않아요. 대본은 아래에서 읽을 수 있습니다.
        <TranscriptView script={episode.script} activeIdx={-1} onClickLine={() => {}} onJumpToPage={onJumpToPage} />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
      {/* 플레이어 바 */}
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => seekLine(0)}
            className="h-8 w-8 flex items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            title="처음으로"
            aria-label="처음으로"
          >
            <SkipBack className="h-4 w-4" />
          </button>
          <button
            onClick={() => jumpRel(-15)}
            className="h-8 w-8 flex items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            title="15초 뒤로"
            aria-label="15초 뒤로"
          >
            <Rewind className="h-4 w-4" />
          </button>
          <button
            onClick={togglePlay}
            className="h-10 w-10 flex items-center justify-center rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm"
            aria-label={playing ? '일시정지' : '재생'}
          >
            {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
          </button>
          <button
            onClick={() => jumpRel(15)}
            className="h-8 w-8 flex items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            title="15초 앞으로"
            aria-label="15초 앞으로"
          >
            <FastForward className="h-4 w-4" />
          </button>
          <button
            onClick={() => seekLine(Math.min(episode.script.length - 1, lineIdx + 1))}
            className="h-8 w-8 flex items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            title="다음 라인"
            aria-label="다음 라인"
          >
            <SkipForward className="h-4 w-4" />
          </button>

          <div className="flex-1" />

          <button
            onClick={cycleRate}
            className="inline-flex items-center gap-1 rounded-full border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:border-indigo-400"
            title="배속"
          >
            <Gauge className="h-3 w-3" /> {rate}x
          </button>
          <button
            onClick={() => setShowTranscript((v) => !v)}
            className={cn(
              'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors',
              showTranscript
                ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300'
                : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-indigo-400',
            )}
            title="대본 보기"
            aria-pressed={showTranscript}
          >
            <FileText className="h-3 w-3" /> 대본
          </button>
        </div>

        {/* 진행바 */}
        <div className="flex items-center gap-2 text-[10.5px] text-slate-500 tabular-nums">
          <span className="w-10 text-right">{fmt(nowSec)}</span>
          <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 transition-all"
              style={{ width: `${totalSec > 0 ? (nowSec / totalSec) * 100 : 0}%` }}
            />
          </div>
          <span className="w-10">{fmt(totalSec)}</span>
        </div>

        <p className="text-[10.5px] text-slate-400">
          라인 {lineIdx + 1} / {episode.script.length} · 시간은 예상치입니다
        </p>
      </div>

      {/* 대본 */}
      {showTranscript && (
        <div ref={transcriptRef} className="border-t border-slate-100 dark:border-slate-800 max-h-80 overflow-y-auto">
          <TranscriptView
            script={episode.script}
            activeIdx={lineIdx}
            onClickLine={(i) => seekLine(i)}
            onJumpToPage={onJumpToPage}
          />
        </div>
      )}
    </div>
  );
}

/* ── 대본 뷰 ── */
function TranscriptView({
  script, activeIdx, onClickLine, onJumpToPage,
}: {
  script: PodcastEpisode['script'];
  activeIdx: number;
  onClickLine: (i: number) => void;
  onJumpToPage?: (page: number) => void;
}) {
  return (
    <ul className="p-2 space-y-1">
      {script.map((line, i) => {
        const active = i === activeIdx;
        const speakerColor = line.speaker === 'A' ? 'text-sky-600 dark:text-sky-400' : 'text-violet-600 dark:text-violet-400';
        const speakerBg = line.speaker === 'A' ? 'bg-sky-100 dark:bg-sky-950/40' : 'bg-violet-100 dark:bg-violet-950/40';
        return (
          <li
            key={i}
            data-line-idx={i}
            onClick={() => onClickLine(i)}
            className={cn(
              'rounded-lg px-3 py-2 cursor-pointer transition-colors',
              active
                ? 'bg-indigo-50 dark:bg-indigo-950/30 ring-1 ring-indigo-400'
                : 'hover:bg-slate-50 dark:hover:bg-slate-800',
            )}
          >
            <div className="flex items-start gap-2">
              <span className={cn('shrink-0 inline-flex items-center justify-center rounded-full h-5 w-5 text-[10px] font-bold', speakerBg, speakerColor)}>
                {line.speaker}
              </span>
              <p className="flex-1 text-[12.5px] leading-relaxed text-slate-700 dark:text-slate-200">
                {renderWithPageTags(line.text, onJumpToPage)}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** [p.N] 뱃지를 클릭 가능한 버튼으로 치환. */
function renderWithPageTags(text: string, onJumpToPage?: (page: number) => void) {
  const parts: React.ReactNode[] = [];
  const re = /\[p\.(\d+)\]/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const page = Number(m[1]);
    parts.push(
      <button
        key={`p-${k++}`}
        onClick={(e) => { e.stopPropagation(); onJumpToPage?.(page); }}
        className="inline-flex items-center rounded bg-slate-100 dark:bg-slate-800 hover:bg-indigo-100 hover:text-indigo-700 px-1 mx-0.5 text-[10.5px] font-semibold tabular-nums align-middle"
      >
        p.{page}
      </button>,
    );
    last = re.lastIndex;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}
