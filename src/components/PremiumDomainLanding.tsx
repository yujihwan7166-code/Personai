import { useState } from 'react';
import { cn } from '@/lib/utils';
import { PREMIUM_DOMAIN_TEMPLATES, type PremiumDomainId, type PremiumDomainTemplate } from '@/types/expert';
import { ChevronRight, Zap, Brain } from 'lucide-react';

interface Props {
  onSelectDomain: (domainId: PremiumDomainId) => void;
  onSelectWithQuestion?: (domainId: PremiumDomainId, question: string) => void;
}

const ACCENT: Record<string, {
  line: string; badge: string; badgeBg: string;
  cta: string; ctaHover: string;
  bullet: string; qHover: string;
}> = {
  law:        { line: 'bg-amber-400', badge: 'text-amber-700', badgeBg: 'bg-amber-50 border-amber-100', cta: 'bg-amber-500', ctaHover: 'hover:bg-amber-600', bullet: 'text-amber-400', qHover: 'hover:bg-amber-50' },
  drug:       { line: 'bg-emerald-400', badge: 'text-emerald-700', badgeBg: 'bg-emerald-50 border-emerald-100', cta: 'bg-emerald-500', ctaHover: 'hover:bg-emerald-600', bullet: 'text-emerald-400', qHover: 'hover:bg-emerald-50' },
  finance:    { line: 'bg-blue-400', badge: 'text-blue-700', badgeBg: 'bg-blue-50 border-blue-100', cta: 'bg-blue-500', ctaHover: 'hover:bg-blue-600', bullet: 'text-blue-400', qHover: 'hover:bg-blue-50' },
  realestate: { line: 'bg-violet-400', badge: 'text-violet-700', badgeBg: 'bg-violet-50 border-violet-100', cta: 'bg-violet-500', ctaHover: 'hover:bg-violet-600', bullet: 'text-violet-400', qHover: 'hover:bg-violet-50' },
  tax:        { line: 'bg-cyan-400', badge: 'text-cyan-700', badgeBg: 'bg-cyan-50 border-cyan-100', cta: 'bg-cyan-500', ctaHover: 'hover:bg-cyan-600', bullet: 'text-cyan-400', qHover: 'hover:bg-cyan-50' },
  labor:      { line: 'bg-orange-400', badge: 'text-orange-700', badgeBg: 'bg-orange-50 border-orange-100', cta: 'bg-orange-500', ctaHover: 'hover:bg-orange-600', bullet: 'text-orange-400', qHover: 'hover:bg-orange-50' },
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
            onQuestionClick={(q) => onSelectWithQuestion ? onSelectWithQuestion(domain.id, q) : onSelectDomain(domain.id)}
          />
        ))}
      </div>

      <p className="text-center text-[9px] text-slate-400 leading-relaxed px-4">
        AI 기반 참고 자문이며 전문가 상담을 대체하지 않습니다 · 법률·의료·투자 결정은 반드시 전문가와 상의하세요
      </p>
    </div>
  );
}

function DomainCard({ domain, isHovered, onHover, onLeave, onSelect, onQuestionClick }: {
  domain: PremiumDomainTemplate;
  isHovered: boolean;
  onHover: () => void;
  onLeave: () => void;
  onSelect: () => void;
  onQuestionClick: (question: string) => void;
}) {
  const c = ACCENT[domain.id] || ACCENT.law;
  const hasApi = domain.apiSource.url !== '';

  return (
    <div
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      className={cn(
        'group relative text-left rounded-2xl border bg-white overflow-hidden transition-all duration-200',
        isHovered ? 'shadow-lg border-slate-300' : 'shadow-sm border-slate-200',
      )}
    >
      {/* Accent line */}
      <div className={cn('h-[3px] w-full', c.line)} />

      <div className="px-5 pt-5 pb-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-1">
          <span className="text-[26px]">{domain.icon}</span>
          <h3 className="text-[16px] font-bold text-slate-800">{domain.name}</h3>
        </div>
        <p className="text-[12px] text-slate-500 mb-4">{domain.tagline}</p>

        {/* Trust badge */}
        <div className={cn('inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[10px] font-semibold mb-4', c.badgeBg, c.badge)}>
          {hasApi ? <Zap className="w-3 h-3" /> : <Brain className="w-3 h-3" />}
          {domain.apiSource.name}
          <span className="text-slate-400 font-normal">· {domain.trustBadge}</span>
        </div>

        {/* Strengths — clean bullet list */}
        {domain.strengths && domain.strengths.length > 0 && (
          <div className="space-y-1.5 mb-4">
            {domain.strengths.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className={cn('text-[11px]', c.bullet)}>●</span>
                <span className="text-[11px] text-slate-600">{s.title}</span>
                <span className="text-[10px] text-slate-400">— {s.desc}</span>
              </div>
            ))}
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-slate-100 mb-3" />

        {/* Sample questions — clickable rows */}
        <div className="space-y-1 mb-4">
          {domain.sampleQuestions.map((q, i) => (
            <button
              key={i}
              type="button"
              onClick={(e) => { e.stopPropagation(); onQuestionClick(q); }}
              className={cn(
                'w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-all group/q',
                c.qHover,
              )}
            >
              <span className="text-[11px] text-slate-600 group-hover/q:text-slate-800">"{q}"</span>
              <ChevronRight className="w-3 h-3 text-slate-300 group-hover/q:text-slate-500 shrink-0 ml-2" />
            </button>
          ))}
        </div>

        {/* CTA */}
        <button
          type="button"
          onClick={onSelect}
          className={cn(
            'w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[12px] font-bold text-white transition-all',
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
