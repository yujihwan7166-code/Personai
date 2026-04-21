/**
 * 알림 유틸 — #9
 *
 * 기능:
 *  - playDoneSound(): 가벼운 "ding" 알림음 (WebAudio 오실레이터, 의존성 없음).
 *  - flashTitle(text, count): 탭 포커스 없을 때 document.title 을 깜박임.
 *  - notifyDone(): 설정(soundEnabled, notificationsEnabled) 을 읽고 적절한 알림 수행.
 *
 * 설정 읽기: localStorage 'personai-sidebar-settings-v1' 의 JSON.
 */

export interface NotificationPrefs {
  soundEnabled?: boolean;
  notificationsEnabled?: boolean;
}

const SETTINGS_KEY = 'personai-sidebar-settings-v1';

function readPrefs(): NotificationPrefs {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as NotificationPrefs;
  } catch {
    return {};
  }
}

/** WebAudio 로 가벼운 2음 ding. */
export function playDoneSound(volume = 0.12): void {
  try {
    const W = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
    const Ctor = W.AudioContext || W.webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    const now = ctx.currentTime;
    const play = (freq: number, start: number, dur: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + start);
      gain.gain.exponentialRampToValueAtTime(volume, now + start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + start);
      osc.stop(now + start + dur + 0.02);
    };
    play(880, 0, 0.14);   // A5
    play(1320, 0.09, 0.2); // E6
    setTimeout(() => ctx.close(), 600);
  } catch { /* noop */ }
}

let flashTimer: ReturnType<typeof setInterval> | null = null;
let flashOriginalTitle: string | null = null;

/** 탭 비활성일 때 제목을 교대로 깜박임. 포커스 복귀 시 자동 복구. */
export function flashTitle(alertText: string, cycles = 6, intervalMs = 700): void {
  if (typeof document === 'undefined') return;
  if (document.visibilityState === 'visible') return; // 포커스 중이면 스킵
  stopFlashTitle(); // 진행 중이면 초기화
  flashOriginalTitle = document.title;
  let toggled = false;
  let remaining = cycles * 2;
  flashTimer = setInterval(() => {
    if (document.visibilityState === 'visible' || remaining <= 0) {
      stopFlashTitle();
      return;
    }
    document.title = toggled ? (flashOriginalTitle || '') : alertText;
    toggled = !toggled;
    remaining -= 1;
  }, intervalMs);

  // 포커스 복귀 1회 핸들러
  const onVis = () => {
    if (document.visibilityState === 'visible') {
      stopFlashTitle();
      document.removeEventListener('visibilitychange', onVis);
    }
  };
  document.addEventListener('visibilitychange', onVis);
}

export function stopFlashTitle(): void {
  if (flashTimer) {
    clearInterval(flashTimer);
    flashTimer = null;
  }
  if (flashOriginalTitle !== null) {
    document.title = flashOriginalTitle;
    flashOriginalTitle = null;
  }
}

/** 작업 완료 시 호출 — 설정 prefs 에 따라 사운드/타이틀 연출. */
export function notifyDone(opts: { label?: string } = {}): void {
  const prefs = readPrefs();
  const label = opts.label || '답변 완료 ✓ Personai';
  if (prefs.soundEnabled) playDoneSound();
  // 알림 설정이 켜져 있을 때만 타이틀 깜박 (탭 비활성 상태에서만 자동 작동)
  if (prefs.notificationsEnabled !== false) flashTitle(label);
}
