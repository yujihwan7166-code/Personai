import { useState } from 'react';
import { cn } from '@/lib/utils';
import { PREMIUM_DOMAIN_TEMPLATES, type PremiumDomainId, type PremiumDomainTemplate } from '@/types/expert';
import { ArrowRight } from 'lucide-react';

interface Props {
  onSelectDomain: (domainId: PremiumDomainId) => void;
}

/* ── Per-domain accent tokens ── */
const THEME: Record<string, {
  accent: string; accentMuted: string; accentBorder: string;
  cta: string; ctaHover: string;
  featureIcon: string;
  strengthLabel: string;
}> = {
  law:        { accent: 'text-amber-600', accentMuted: 'text-amber-700/50', accentBorder: 'border-amber-300/60', cta: 'bg-amber-600', ctaHover: 'hover:bg-amber-700', featureIcon: 'text-amber-500', strengthLabel: 'text-amber-400' },
  drug:       { accent: 'text-emerald-600', accentMuted: 'text-emerald-700/50', accentBorder: 'border-emerald-300/60', cta: 'bg-emerald-600', ctaHover: 'hover:bg-emerald-700', featureIcon: 'text-emerald-500', strengthLabel: 'text-emerald-400' },
  finance:    { accent: 'text-blue-600', accentMuted: 'text-blue-700/50', accentBorder: 'border-blue-300/60', cta: 'bg-blue-600', ctaHover: 'hover:bg-blue-700', featureIcon: 'text-blue-500', strengthLabel: 'text-blue-400' },
  realestate: { accent: 'text-violet-600', accentMuted: 'text-violet-700/50', accentBorder: 'border-violet-300/60', cta: 'bg-violet-600', ctaHover: 'hover:bg-violet-700', featureIcon: 'text-violet-500', strengthLabel: 'text-violet-400' },
  tax:        { accent: 'text-cyan-600', accentMuted: 'text-cyan-700/50', accentBorder: 'border-cyan-300/60', cta: 'bg-cyan-600', ctaHover: 'hover:bg-cyan-700', featureIcon: 'text-cyan-500', strengthLabel: 'text-cyan-400' },
  labor:      { accent: 'text-orange-600', accentMuted: 'text-orange-700/50', accentBorder: 'border-orange-300/60', cta: 'bg-orange-600', ctaHover: 'hover:bg-orange-700', featureIcon: 'text-orange-500', strengthLabel: 'text-orange-400' },
};

export function PremiumDomainLanding({ onSelectDomain }: Props) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {PREMIUM_DOMAIN_TEMPLATES.map((domain, idx) => (
          <DomainCard
            key={domain.id}
            domain={domain}
            index={idx}
            isHovered={hoveredId === domain.id}
            onHover={() => setHoveredId(domain.id)}
            onLeave={() => setHoveredId(null)}
            onSelect={() => onSelectDomain(domain.id)}
          />
        ))}
      </div>

      <p className="text-center text-[10px] text-slate-400 leading-relaxed tracking-wide">
        AI 기반 참고 자문이며 전문가 상담을 대체하지 않습니다 · 법률·의료·투자 결정은 반드시 전문가와 상의하세요
      </p>
    </div>
  );
}

function DomainCard({ domain, index, isHovered, onHover, onLeave, onSelect }: {
  domain: PremiumDomainTemplate;
  index: number;
  isHovered: boolean;
  onHover: () => void;
  onLeave: () => void;
  onSelect: () => void;
}) {
  const t = THEME[domain.id] || THEME.law;

  return (
    <div
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onClick={onSelect}
      className={cn(
        'group relative cursor-pointer rounded-2xl border bg-white transition-all duration-300 ease-out',
        isHovered
          ? 'shadow-[0_8px_30px_rgba(0,0,0,0.08)] border-slate-300 -translate-y-1'
          : 'shadow-[0_1px_3px_rgba(0,0,0,0.04)] border-slate-200/80',
      )}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Top accent — confident line */}
      <div className={cn('h-[3px] w-full', t.cta)} />

      <div className="px-7 pt-7 pb-6">

        {/* ── Header ── */}
        <div className="text-center mb-7">
          <h3 className="text-[22px] font-semibold text-slate-900 tracking-[-0.02em] leading-tight">
            {domain.name}
          </h3>
          <p className={cn('text-[11px] mt-2 tracking-wide', t.accentMuted)}>
            {domain.tagline}
          </p>
          {/* Decorative divider */}
          <div className="flex items-center justify-center gap-2.5 mt-4">
            <div className="h-px w-10 bg-slate-200/80" />
            <div className="w-1 h-1 rounded-full bg-slate-300" />
            <div className="h-px w-10 bg-slate-200/80" />
          </div>
        </div>

        {/* ── Features — centered description blocks ── */}
        {domain.features && domain.features.length > 0 && (
          <div className="space-y-5 mb-7">
            {domain.features.map((f, i) => (
              <div key={i} className="text-center">
                <p className="text-[11.5px] font-semibold text-slate-800 leading-snug">
                  <span className={cn('text-[13px] mr-1.5', t.featureIcon)}>{f.icon}</span>
                  {f.title}
                </p>
                <p className="text-[10px] text-slate-600/80 leading-[1.8] mt-1.5 max-w-[88%] mx-auto">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* ── Strengths — 2×2 typographic grid ── */}
        {domain.strengths && domain.strengths.length > 0 && (
          <div className="mb-7">
            <div className="grid grid-cols-2 border border-slate-100/80 rounded-xl overflow-hidden bg-slate-50/30">
              {domain.strengths.map((s, i) => (
                <div
                  key={i}
                  className={cn(
                    'py-4 px-3 text-center',
                    i < 2 && 'border-b border-slate-100/80',
                    i % 2 === 0 && 'border-r border-slate-100/80',
                  )}
                >
                  <p className={cn(
                    'text-[7.5px] font-semibold tracking-[0.18em] uppercase leading-none',
                    t.strengthLabel,
                  )}>
                    {s.titleEn}
                  </p>
                  <p className="text-[11.5px] font-medium text-slate-700 mt-2 leading-tight">
                    {s.title}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── CTA ── */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onSelect(); }}
          className={cn(
            'w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl text-[12px] font-medium text-white tracking-wider transition-all duration-300',
            t.cta, t.ctaHover,
            isHovered && 'shadow-lg',
          )}
        >
          <span>상담 시작</span>
          <ArrowRight className={cn(
            'w-3.5 h-3.5 transition-all duration-300',
            isHovered ? 'translate-x-1.5 opacity-100' : 'opacity-70',
          )} />
        </button>
      </div>
    </div>
  );
}
