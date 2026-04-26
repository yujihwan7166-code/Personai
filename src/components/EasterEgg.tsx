import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  open: boolean;
  onClose: () => void;
}

const STATS: Array<{ label: string; value: string }> = [
  { label: 'Built with',     value: '☕ + 🎧 + 🌙' },
  { label: 'Lines of code',  value: '∞' },
  { label: 'AI consulted',   value: 'Claude · Gemini · GPT' },
  { label: 'Coffee/day',     value: '0~12 cups' },
];

const TAGLINES = [
  '> hello, world.',
  '> you found me.',
  '> shipped with care.',
  '> made for fun.',
  '> 잘 자고 일어나면 또 만들어요.',
];

/**
 * 이스터에그 — 일반채팅 즐겨찾기 탭 5번 클릭 시 발동.
 * 풀스크린 오버레이 + 터미널/포트폴리오 톤.
 */
export function EasterEgg({ open, onClose }: Props) {
  const [taglineIdx, setTaglineIdx] = useState(0);

  useEffect(() => {
    if (!open) return;
    setTaglineIdx(0);
    const t = setInterval(() => setTaglineIdx((i) => (i + 1) % TAGLINES.length), 2200);
    return () => clearInterval(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // 부모에 transform/filter 가 걸려 있어도 화면 정중앙에 뜨도록 body 에 portal.
  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="ee-root"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={onClose}
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/85 backdrop-blur-sm cursor-pointer overflow-hidden"
          role="dialog"
          aria-label="개발자 정보"
        >
          {/* 배경 오로라 */}
          <div className="absolute inset-0 pointer-events-none opacity-50">
            <div className="absolute -top-1/4 -left-1/4 w-[60vw] h-[60vw] rounded-full blur-3xl"
              style={{ background: 'radial-gradient(circle, #6366f1 0%, transparent 60%)' }} />
            <div className="absolute -bottom-1/4 -right-1/4 w-[60vw] h-[60vw] rounded-full blur-3xl"
              style={{ background: 'radial-gradient(circle, #ec4899 0%, transparent 60%)' }} />
            <div className="absolute top-1/3 right-1/4 w-[40vw] h-[40vw] rounded-full blur-3xl"
              style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 60%)' }} />
          </div>

          {/* 스캔라인 */}
          <div
            className="absolute inset-0 pointer-events-none opacity-10"
            style={{
              backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.3) 0px, rgba(255,255,255,0.3) 1px, transparent 1px, transparent 3px)',
            }}
          />

          {/* 콘텐츠 카드 */}
          <motion.div
            initial={{ scale: 0.85, opacity: 0, y: 24 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 12 }}
            transition={{ type: 'spring', stiffness: 220, damping: 22 }}
            onClick={(e) => e.stopPropagation()}
            className="relative cursor-default max-w-md w-[88vw] rounded-2xl border border-white/15 bg-[#0a0a0f]/95 shadow-2xl overflow-hidden"
            style={{
              boxShadow: '0 0 60px rgba(99,102,241,0.3), 0 0 120px rgba(236,72,153,0.15)',
            }}
          >
            {/* 헤더 — 가짜 터미널 */}
            <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-white/10 bg-white/[0.03]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
              <span className="ml-2 text-[10px] font-mono text-white/40 tracking-wider">~/personai/about-me.tsx</span>
            </div>

            {/* 본문 */}
            <div className="px-7 py-9 text-center">
              <motion.div
                initial={{ rotateY: -90 }}
                animate={{ rotateY: 0 }}
                transition={{ delay: 0.15, type: 'spring', stiffness: 140 }}
                className="inline-block text-5xl mb-4"
              >
                👨‍💻
              </motion.div>

              <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/40 mb-1">
                made by
              </p>
              <h1 className="text-3xl font-bold text-white mb-1 tracking-tight">
                <span className="bg-gradient-to-r from-indigo-300 via-pink-300 to-cyan-300 bg-clip-text text-transparent">
                  유 지 환
                </span>
              </h1>
              <p className="text-[12px] text-white/50 font-mono mb-7">@yujihwan7166</p>

              {/* 터미널 라인 */}
              <div className="text-left bg-black/40 rounded-lg border border-white/5 px-3 py-2 mb-6 font-mono text-[11px] min-h-[32px] flex items-center">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={taglineIdx}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 6 }}
                    transition={{ duration: 0.25 }}
                    className="text-emerald-300"
                  >
                    {TAGLINES[taglineIdx]}
                    <motion.span
                      animate={{ opacity: [1, 0, 1] }}
                      transition={{ duration: 0.9, repeat: Infinity }}
                      className="ml-0.5"
                    >
                      _
                    </motion.span>
                  </motion.span>
                </AnimatePresence>
              </div>

              {/* 스탯 */}
              <div className="grid grid-cols-2 gap-2 mb-7">
                {STATS.map((s) => (
                  <div
                    key={s.label}
                    className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-2 text-left"
                  >
                    <p className="text-[9px] font-mono uppercase tracking-wider text-white/40 mb-0.5">
                      {s.label}
                    </p>
                    <p className="text-[11px] font-medium text-white/85">{s.value}</p>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 rounded-lg bg-white/10 hover:bg-white/15 transition-colors text-[12px] font-medium text-white/90 border border-white/15"
              >
                닫기 · ESC · 클릭
              </button>

              <p className="mt-4 text-[9.5px] font-mono text-white/25 tracking-wide">
                {'<'} 즐겨찾기 5번 클릭하면 다시 만나요 {'/>'}
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
