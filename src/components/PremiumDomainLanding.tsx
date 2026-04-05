import { useState } from 'react';
import { cn } from '@/lib/utils';
import { PREMIUM_DOMAIN_TEMPLATES, type PremiumDomainId, type PremiumDomainTemplate } from '@/types/expert';
import { ChevronRight, Zap, Brain } from 'lucide-react';

interface Props {
  onSelectDomain: (domainId: PremiumDomainId) => void;
}

const ACCENT_COLORS: Record<string, { line: string; badge: string; badgeText: string; cta: string; ctaHover: string }> = {
  law:        { line: 'bg-amber-400',   badge: 'bg-amber-50 border-amber-200 text-amber-700',     cta: 'bg-amber-500',   ctaHover: 'hover:bg-amber-600' },
  drug:       { line: 'bg-emerald-400', badge: 'bg-emerald-50 border-emerald-200 text-emerald-700', cta: 'bg-emerald-500', ctaHover: 'hover:bg-emerald-600' },
  finance:    { line: 'bg-blue-400',    badge: 'bg-blue-50 border-blue-200 text-blue-700',         cta: 'bg-blue-500',    ctaHover: 'hover:bg-blue-600' },
  realestate: { line: 'bg-violet-400',  badge: 'bg-violet-50 border-violet-200 text-violet-700',   cta: 'bg-violet-500',  ctaHover: 'hover:bg-violet-600' },
  tax:        { line: 'bg-cyan-400',    badge: 'bg-cyan-50 border-cyan-200 text-cyan-700',         cta: 'bg-cyan-500',    ctaHover: 'hover:bg-cyan-600' },
  labor:      { line: 'bg-orange-400',  badge: 'bg-orange-50 border-orange-200 text-orange-700',   cta: 'bg-orange-500',  ctaHover: 'hover:bg-orange-600' },
};

export function PremiumDomainLanding({ onSelectDomain }: Props) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      {/* Domain Cards — 2x3 grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
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

      {/* Disclaimer */}
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
  const colors = ACCENT_COLORS[domain.id] || ACCENT_COLORS.law;
  const hasApi = domain.apiSource.url !== '';

  return (
    <button
      type="button"
      onClick={onSelect}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      className={cn(
        'group relative text-left rounded-xl border bg-white overflow-hidden transition-all duration-200',
        isHovered ? 'shadow-lg border-slate-300' : 'shadow-sm border-slate-200',
      )}
    >
      {/* Top accent line */}
      <div className={cn('h-[3px] w-full transition-all', colors.line, isHovered && 'h-1')} />

      <div className="px-4 pt-3.5 pb-3">
        {/* Icon + Name + Source badge */}
        <div className="flex items-start gap-3 mb-2">
          <span className="text-[24px] shrink-0 mt-0.5">{domain.icon}</span>
          <div className="min-w-0 flex-1">
            <h3 className="text-[14px] font-bold text-slate-800 leading-tight">{domain.name}</h3>
            <div className={cn('inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded-full border text-[8px] font-semibold', colors.badge)}>
              {hasApi ? <Zap className="w-2.5 h-2.5" /> : <Brain className="w-2.5 h-2.5" />}
              {domain.apiSource.name}
            </div>
          </div>
        </div>

        {/* Tagline */}
        <p className="text-[11px] text-slate-500 leading-relaxed mb-3">{domain.tagline}</p>

        {/* Sample question */}
        <div className="text-[10px] text-slate-400 mb-3 truncate">
          "{domain.sampleQuestions[0]}"
        </div>

        {/* CTA */}
        <div className={cn(
          'flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-bold text-white transition-all',
          colors.cta, colors.ctaHover,
        )}>
          <span>상담 시작</span>
          <ChevronRight className={cn('w-3.5 h-3.5 transition-transform', isHovered && 'translate-x-0.5')} />
        </div>
      </div>
    </button>
  );
}
