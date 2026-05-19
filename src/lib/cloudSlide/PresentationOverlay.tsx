/** 슬라이드 발표 모드 풀스크린 오버레이 (F5 시작 / Esc 종료). */

import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight as ChevronRightIcon, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Slide } from './types';
import type { SlideTheme } from './themes';
import { resolveSlideBackground, resolveTextColor, resolveTextFontFamily } from './themes';
import { ShapeRender } from './ShapeRender';

/** 경과 시간 mm:ss / hh:mm:ss 포맷. */
function formatElapsed(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const ss = s % 60;
  const mm = Math.floor(s / 60) % 60;
  const hh = Math.floor(s / 3600);
  const pad = (n: number) => String(n).padStart(2, '0');
  return hh > 0 ? `${hh}:${pad(mm)}:${pad(ss)}` : `${pad(mm)}:${pad(ss)}`;
}

interface PresentationOverlayProps {
  slides: Slide[];
  idx: number;
  /** B (black) / W (white) 화면 가림 상태. null = 정상. */
  blank?: 'black' | 'white' | null;
  /** 적용 테마 — 슬라이드 배경/텍스트 폴백. */
  theme?: SlideTheme;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
}

export function PresentationOverlay({ slides, idx, blank, theme, onPrev, onNext, onClose }: PresentationOverlayProps) {
  const slide = slides[idx];
  const [notesOpen, setNotesOpen] = useState(false);
  const hasNotes = !!slide?.notes?.trim();
  // 진행률 % — 마지막 슬라이드 = 100%. 1장이면 100%.
  const progressPct = slides.length <= 1 ? 100 : Math.round(((idx + 1) / slides.length) * 100);
  /** 발표 시작 시각 — 컴포넌트 mount 시 1회 결정. */
  const [startedAt] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setElapsed(Date.now() - startedAt), 1000);
    return () => window.clearInterval(id);
  }, [startedAt]);
  return (
    <div className="fixed inset-0 z-50 bg-black flex items-center justify-center select-none">
      {/* 진행률 바 — 상단 2px */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-white/10 z-10">
        <div
          className="h-full bg-white/60 transition-all duration-200"
          style={{ width: `${progressPct}%` }}
          aria-hidden
        />
      </div>
      {/* B/W 가림막 */}
      {blank && (
        <div
          className={cn(
            'absolute inset-0 z-40 pointer-events-none',
            blank === 'black' ? 'bg-black' : 'bg-white',
          )}
          aria-label={blank === 'black' ? '화면 가림 (검정)' : '화면 가림 (흰색)'}
        />
      )}
      {/* 슬라이드 — 16:9 비율 최대 */}
      <div
        className="bg-white shadow-2xl relative overflow-hidden"
        style={{
          aspectRatio: '16 / 9',
          width: 'min(95vw, calc(95vh * 16 / 9))',
          background: theme ? resolveSlideBackground(slide?.background, theme) : (slide?.background ?? '#fff'),
        }}
      >
        {slide?.elements.map((el) => {
          const pos: React.CSSProperties = {
            position: 'absolute',
            left: `${el.xPct}%`,
            top: `${el.yPct}%`,
            width: `${el.wPct}%`,
            height: `${el.hPct}%`,
            transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
            transformOrigin: 'center center',
          };
          if (el.type === 'text') {
            return (
              <div
                key={el.id}
                style={{
                  ...pos,
                  fontSize: `${el.fontSizeRem}rem`,
                  fontWeight: el.bold ? 600 : 400,
                  fontStyle: el.italic ? 'italic' : undefined,
                  textDecoration: el.underline ? 'underline' : undefined,
                  color: theme ? resolveTextColor(el.textColor, theme) : (el.textColor ?? 'rgba(0,0,0,0.85)'),
                  fontFamily: theme ? resolveTextFontFamily(theme) : undefined,
                  backgroundColor: el.bgColor,
                  padding: '4px 8px',
                  lineHeight: el.lineHeight ?? 1.25,
                  textAlign: el.align ?? 'left',
                  whiteSpace: 'pre-wrap',
                }}
                className="break-words overflow-hidden"
              >
                {el.content}
              </div>
            );
          }
          if (el.type === 'image') {
            return (
              <img
                key={el.id}
                src={el.src}
                alt=""
                style={pos}
                className="object-contain pointer-events-none"
                draggable={false}
                onError={(e) => {
                  // 깨진 이미지 → 회색 placeholder (img → transparent + bg)
                  const img = e.currentTarget;
                  img.style.background = '#e5e7eb';
                  img.style.opacity = '0.3';
                  img.removeAttribute('src');
                }}
              />
            );
          }
          return (
            <div key={el.id} style={pos}>
              <ShapeRender el={el} />
            </div>
          );
        })}
      </div>

      {/* 좌우 클릭 영역 (보이지 않음) */}
      <button
        type="button"
        onClick={onPrev}
        disabled={idx === 0}
        className="absolute left-0 top-0 bottom-0 w-1/4 cursor-w-resize disabled:cursor-default group"
        aria-label="이전 슬라이드"
      >
        <ChevronLeft className="w-8 h-8 text-white/0 group-hover:text-white/40 absolute left-4 top-1/2 -translate-y-1/2 transition-colors" />
      </button>
      <button
        type="button"
        onClick={onNext}
        disabled={idx === slides.length - 1}
        className="absolute right-0 top-0 bottom-0 w-1/4 cursor-e-resize disabled:cursor-default group"
        aria-label="다음 슬라이드"
      >
        <ChevronRightIcon className="w-8 h-8 text-white/0 group-hover:text-white/40 absolute right-4 top-1/2 -translate-y-1/2 transition-colors" />
      </button>

      {/* 발표자 노트 패널 (토글) — 우측 하단 */}
      {notesOpen && hasNotes && (
        <div className="absolute bottom-14 right-5 max-w-md max-h-[40vh] overflow-y-auto rounded-lg bg-white/95 text-foreground p-3 shadow-2xl text-sm whitespace-pre-wrap leading-relaxed">
          <div className="flex items-center gap-2 mb-1.5 text-xs text-muted-foreground border-b border-border pb-1">
            <span aria-hidden>📝</span>
            <span>발표자 노트 — 슬라이드 {idx + 1}</span>
          </div>
          {slide?.notes}
        </div>
      )}

      {/* 하단 정보 + 노트 토글 + 닫기 */}
      <div className="absolute bottom-3 left-0 right-0 flex items-center justify-between px-5 text-white/60 text-xs">
        <span>← → 이동 · Esc 종료 · Home/End 처음/끝 · B/W 가림</span>
        <span className="font-mono flex items-center gap-3">
          <span title="발표 경과 시간">⏱ {formatElapsed(elapsed)}</span>
          <span className="text-white/30">·</span>
          <span>{idx + 1} / {slides.length}</span>
        </span>
        <div className="flex items-center gap-1">
          {hasNotes && (
            <button
              type="button"
              onClick={() => setNotesOpen((v) => !v)}
              className={cn(
                'px-2 py-1 rounded text-xs flex items-center gap-1 transition-colors',
                notesOpen ? 'bg-white/20 text-white' : 'hover:bg-white/10',
              )}
              aria-pressed={notesOpen}
              title="발표자 노트"
            >
              <span aria-hidden>📝</span>
              <span>노트</span>
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded hover:bg-white/10"
            aria-label="발표 종료"
            title="발표 종료 (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
