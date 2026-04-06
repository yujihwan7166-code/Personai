import { useState } from 'react';
import { cn } from '@/lib/utils';
import { PREMIUM_DOMAIN_TEMPLATES, type PremiumDomainId, type PremiumDomainTemplate } from '@/types/expert';
import { ChevronRight } from 'lucide-react';

interface Props {
  onSelectDomain: (domainId: PremiumDomainId) => void;
  onSelectWithQuestion?: (domainId: PremiumDomainId, question: string) => void;
}

const ACCENT: Record<string, {
  line: string; cta: string; ctaHover: string;
  badgeBg: string; badgeBorder: string;
}> = {
  law:        { line: 'bg-amber-400', cta: 'bg-amber-500', ctaHover: 'hover:bg-amber-600', badgeBg: 'bg-amber-50', badgeBorder: 'border-amber-200' },
  drug:       { line: 'bg-emerald-400', cta: 'bg-emerald-500', ctaHover: 'hover:bg-emerald-600', badgeBg: 'bg-emerald-50', badgeBorder: 'border-emerald-200' },
  finance:    { line: 'bg-blue-400', cta: 'bg-blue-500', ctaHover: 'hover:bg-blue-600', badgeBg: 'bg-blue-50', badgeBorder: 'border-blue-200' },
  realestate: { line: 'bg-violet-400', cta: 'bg-violet-500', ctaHover: 'hover:bg-violet-600', badgeBg: 'bg-violet-50', badgeBorder: 'border-violet-200' },
  tax:        { line: 'bg-cyan-400', cta: 'bg-cyan-500', ctaHover: 'hover:bg-cyan-600', badgeBg: 'bg-cyan-50', badgeBorder: 'border-cyan-200' },
  labor:      { line: 'bg-orange-400', cta: 'bg-orange-500', ctaHover: 'hover:bg-orange-600', badgeBg: 'bg-orange-50', badgeBorder: 'border-orange-200' },
};

export function PremiumDomainLanding({ onSelectDomain, onSelectWithQuestion }: Props) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {PREMIUM_DOMAIN_TEMPLATES.map((domain) => (
          <DomainCard
            key={domain.id}
            domain={domain}
            isHovered={hoveredId === domain.id}
            onHover={() => setHoveredId(domain.id)}
            onLeave={() => setHoveredId(null)}
            onSelect={() => onSelectDomain(domain.id)}
          />
        ))}
      </div>

      <p className="text-center text-[9px] text-slate-400 leading-relaxed px-4">
        AI 기반 참고 자문이며 전문가 상담을 대체하지 않습니다 · 법률·의료·투자 결정은 반드시 전문가와 상의하세요
      </p>
    </div>
  );
}

function DomainCard({ domain, isHovered, onHover, onLeave, onSelect }: {
  domain: PremiumDomainTemplate;
  isHovered: boolean;
  onHover: () => void;
  onLeave: () => void;
  onSelect: () => void;
}) {
  const c = ACCENT[domain.id] || ACCENT.law;

  return (
    <div
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      className={cn(
        'group relative text-left rounded-2xl border bg-white overflow-hidden transition-all duration-200',
        isHovered ? 'shadow-xl border-slate-300 -translate-y-0.5' : 'shadow-sm border-slate-200',
      )}
    >
      {/* Accent line */}
      <div className={cn('h-1 w-full', c.line)} />

      <div className="px-6 pt-6 pb-5">
        {/* Header — centered */}
        <div className="text-center mb-6">
          <h3 className="text-[20px] font-semibold text-slate-800 tracking-tight">{domain.name}</h3>
          <p className="text-[11px] text-slate-500 mt-1.5">{domain.tagline}</p>
        </div>

        {/* Features — centered descriptions */}
        {domain.features && domain.features.length > 0 && (
          <div className="space-y-4 mb-6">
            {domain.features.map((f, i) => (
              <div key={i} className="text-center">
                <p className="text-[12px] font-bold text-slate-700 flex items-center justify-center gap-1.5">
                  <span className="text-[14px]">{f.icon}</span>
                  {f.title}
                </p>
                <p className="text-[10px] text-slate-500 leading-relaxed mt-1 max-w-[90%] mx-auto">{f.desc}</p>
              </div>
            ))}
          </div>
        )}

        {/* Strengths — 2x2 grid, centered */}
        {domain.strengths && domain.strengths.length > 0 && (
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="absolute left-1/2 top-3 bottom-3 w-px bg-slate-100" />
              <div className="absolute top-1/2 left-6 right-6 h-px bg-slate-100" />
            </div>
            <div className="grid grid-cols-2 gap-y-5 gap-x-4 py-2">
              {domain.strengths.map((s, i) => (
                <div key={i} className="text-center relative z-10">
                  <p className="text-[8px] font-bold text-slate-400 tracking-[0.15em] uppercase leading-none">{s.titleEn}</p>
                  <p className="text-[12px] font-semibold text-slate-700 mt-1.5">{s.title}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <button
          type="button"
          onClick={onSelect}
          className={cn(
            'w-full flex items-center justify-center gap-1.5 py-3 rounded-xl text-[13px] font-bold text-white transition-all shadow-sm',
            c.cta, c.ctaHover,
          )}
        >
          상담 시작
          <ChevronRight className={cn('w-4 h-4 transition-transform', isHovered && 'translate-x-0.5')} />
        </button>
      </div>
    </div>
  );
}
