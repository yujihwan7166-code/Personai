/**
 * 브라우저 내장 SpeechSynthesis 기반 TTS 래퍼.
 * - Phase A 구현: 서버 TTS 없이 즉시 재생 가능
 * - 라인 단위 순차 재생, 화자별 다른 목소리 매핑
 * - pause/resume/stop 지원, 배속 조절, 라인 인덱스 콜백
 *
 * 한계:
 * - 모바일 백그라운드에서 끊길 수 있음
 * - 목소리 감정·자연스러움은 로봇 수준
 * - 정확한 duration 을 사전에 알 수 없음 (대략 추정)
 */

import type { PodcastLine } from '@/types/study';

export interface PodcastPlayerHandle {
  play: () => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  seekLine: (idx: number) => void;
  setRate: (rate: number) => void;
  getCurrentLineIndex: () => number;
  isPlaying: () => boolean;
  on: (ev: PlayerEvent, cb: () => void) => () => void;
}

export type PlayerEvent = 'line' | 'end' | 'pause' | 'resume' | 'stop';

/** 한국어 단어는 약 3글자/초(친근 톤 기준), 영어는 5자/초 정도 추정. */
export function estimateLineDurationSec(text: string, rate = 1): number {
  let units = 0;
  for (const ch of text) {
    const code = ch.charCodeAt(0);
    if (code > 127) units += 1;
    else units += 0.5;
  }
  // rate 1.0 기준 3 units/sec (한국어 기준)
  const base = units / 3;
  return Math.max(0.8, base / rate);
}

/** 라인별 누적 startAt 초를 계산. */
export function computeStartOffsets(lines: PodcastLine[], rate = 1): number[] {
  const offsets: number[] = [];
  let acc = 0;
  for (const l of lines) {
    offsets.push(acc);
    acc += estimateLineDurationSec(l.text, rate) + 0.15; // 라인 간 150ms 여유
  }
  return offsets;
}

function pickVoices(): { a: SpeechSynthesisVoice | null; b: SpeechSynthesisVoice | null } {
  if (typeof window === 'undefined' || !window.speechSynthesis) return { a: null, b: null };
  const voices = window.speechSynthesis.getVoices();
  const ko = voices.filter((v) => /ko/i.test(v.lang));
  const pick = (preferFemale: boolean): SpeechSynthesisVoice | null => {
    if (ko.length === 0) return voices[0] ?? null;
    // 이름 기반 성별 힌트 (완벽하진 않지만 대부분 맞음)
    const femaleHints = /female|여자|Yuna|Sora|Seoyeon|Heami|Nayeon/i;
    const maleHints = /male|남자|Minjun|Sangho|InJoon|Jihun/i;
    const byHint = preferFemale
      ? ko.find((v) => femaleHints.test(v.name))
      : ko.find((v) => maleHints.test(v.name));
    if (byHint) return byHint;
    // 보조 대안: 2명 이상이면 서로 다르게
    return preferFemale ? ko[0] : (ko[1] ?? ko[0]);
  };
  return { a: pick(true), b: pick(false) };
}

/** 브라우저 TTS로 대본을 라인 단위로 순차 재생. */
export function createWebSpeechPlayer(lines: PodcastLine[]): PodcastPlayerHandle {
  const synth = (typeof window !== 'undefined') ? window.speechSynthesis : null;
  let idx = 0;
  let rate = 1;
  let playing = false;
  let stopped = false;
  const listeners = new Map<PlayerEvent, Set<() => void>>();
  let currentUtter: SpeechSynthesisUtterance | null = null;
  let voices = pickVoices();

  // iOS/Chrome: 초기 getVoices() 는 빈 배열이 흔함 → 이벤트로 재시도
  if (synth && (!voices.a || !voices.b)) {
    const retry = () => { voices = pickVoices(); };
    synth.addEventListener?.('voiceschanged', retry, { once: true });
  }

  const emit = (ev: PlayerEvent) => {
    const set = listeners.get(ev);
    if (set) set.forEach((cb) => cb());
  };

  const speakAt = (i: number) => {
    if (!synth || stopped) return;
    if (i >= lines.length) { playing = false; emit('end'); return; }
    idx = i;
    const line = lines[i];
    const u = new SpeechSynthesisUtterance(line.text);
    u.rate = rate;
    u.pitch = line.speaker === 'A' ? 1.05 : 0.95;
    u.volume = 1;
    const v = line.speaker === 'A' ? voices.a : voices.b;
    if (v) u.voice = v;
    u.lang = v?.lang ?? 'ko-KR';
    u.onend = () => {
      if (stopped) return;
      if (playing) speakAt(i + 1);
    };
    u.onerror = () => {
      if (stopped) return;
      if (playing) speakAt(i + 1);
    };
    currentUtter = u;
    emit('line');
    synth.speak(u);
  };

  return {
    play: () => {
      if (!synth) return;
      stopped = false;
      playing = true;
      synth.cancel(); // 이전 큐 비움
      speakAt(idx);
    },
    pause: () => {
      if (!synth) return;
      if (playing) {
        synth.pause();
        playing = false;
        emit('pause');
      }
    },
    resume: () => {
      if (!synth) return;
      if (!playing) {
        // Chrome 에서 일시정지 후 resume 불안정 → utter 가 살아있으면 resume, 아니면 다음 라인부터 재시작
        if (synth.paused) {
          synth.resume();
          playing = true;
          emit('resume');
        } else {
          playing = true;
          speakAt(idx);
          emit('resume');
        }
      }
    },
    stop: () => {
      if (!synth) return;
      stopped = true;
      playing = false;
      synth.cancel();
      currentUtter = null;
      emit('stop');
    },
    seekLine: (i: number) => {
      if (!synth) return;
      const next = Math.max(0, Math.min(lines.length - 1, i));
      idx = next;
      synth.cancel();
      if (playing) speakAt(next);
      else emit('line');
    },
    setRate: (r: number) => {
      rate = Math.max(0.5, Math.min(3, r));
      // 진행 중 라인 갱신: 현재 라인부터 다시 (Speech API 는 rate 실시간 변경 불가)
      if (playing && currentUtter && synth) {
        synth.cancel();
        speakAt(idx);
      }
    },
    getCurrentLineIndex: () => idx,
    isPlaying: () => playing,
    on: (ev, cb) => {
      let set = listeners.get(ev);
      if (!set) { set = new Set(); listeners.set(ev, set); }
      set.add(cb);
      return () => { set!.delete(cb); };
    },
  };
}

/** 브라우저가 Web Speech API 를 지원하는지 */
export function isWebSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}
