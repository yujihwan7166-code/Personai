import { useState } from 'react';
import { cn } from '@/lib/utils';
import { PREMIUM_DOMAIN_TEMPLATES, type PremiumDomainId, type PremiumDomainTemplate } from '@/types/expert';
import { ArrowRight } from 'lucide-react';

interface Props {
  onSelectDomain: (domainId: PremiumDomainId) => void;
}

const THEME: Record<string, {
  accent: string; accentMuted: string; cta: string; ctaHover: string; tagBg: string; tagText: string;
}> = {
  law:        { accent: 'text-amber-600', accentMuted: 'text-amber-500/60', cta: 'bg-amber-600', ctaHover: 'hover:bg-amber-700', tagBg: 'bg-amber-50', tagText: 'text-amber-600' },
  drug:       { accent: 'text-emerald-600', accentMuted: 'text-emerald-500/60', cta: 'bg-emerald-600', ctaHover: 'hover:bg-emerald-700', tagBg: 'bg-emerald-50', tagText: 'text-emerald-600' },
  finance:    { accent: 'text-blue-600', accentMuted: 'text-blue-500/60', cta: 'bg-blue-600', ctaHover: 'hover:bg-blue-700', tagBg: 'bg-blue-50', tagText: 'text-blue-600' },
  realestate: { accent: 'text-violet-600', accentMuted: 'text-violet-500/60', cta: 'bg-violet-600', ctaHover: 'hover:bg-violet-700', tagBg: 'bg-violet-50', tagText: 'text-violet-600' },
  tax:        { accent: 'text-cyan-600', accentMuted: 'text-cyan-500/60', cta: 'bg-cyan-600', ctaHover: 'hover:bg-cyan-700', tagBg: 'bg-cyan-50', tagText: 'text-cyan-600' },
  labor:      { accent: 'text-orange-600', accentMuted: 'text-orange-500/60', cta: 'bg-orange-600', ctaHover: 'hover:bg-orange-700', tagBg: 'bg-orange-50', tagText: 'text-orange-600' },
};

export function PremiumDomainLanding({ onSelectDomain }: Props) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      {/* 에디토리얼 헤더 — 프로페셔널 톤 */}
      <div className="text-center pt-2 pb-1">
        <div className="flex items-center justify-center gap-2 text-[10px] font-mono uppercase tracking-[0.22em] text-[hsl(var(--mode-premium))] opacity-80 mb-2">
          <span className="inline-block h-px w-6 bg-[hsl(var(--mode-premium))]/60" />
          Professional Consult
          <span className="inline-block h-px w-6 bg-[hsl(var(--mode-premium))]/60" />
        </div>
        <h2 className="font-display font-semibold text-[22px] md:text-[26px] tracking-[-0.02em] leading-tight text-slate-900 dark:text-slate-100">
          전문 분야, <span className="text-[hsl(var(--mode-premium))]">검증된 근거</span>로 자문합니다
        </h2>
        <p className="mt-1.5 text-[12.5px] text-slate-500 dark:text-slate-400 max-w-[520px] mx-auto leading-snug">
          공공 데이터 · 판례 · 통계를 근거로 단계별 추론. 전문가 상담을 대체하지 않는 참고 자문입니다.
        </p>
      </div>

      {/* Tech spec bar */}
      <div className="flex items-center justify-center gap-3 text-[12px] text-slate-900 dark:text-slate-200 font-semibold py-2.5 border-y border-slate-200 dark:border-slate-800">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />공공 API 실시간 연동</span>
        <span className="text-slate-300 dark:text-slate-700">|</span>
        <span>분석 데이터 48만건+</span>
        <span className="text-slate-300 dark:text-slate-700">|</span>
        <span>RAG 기반 근거 추론</span>
        <span className="text-slate-300 dark:text-slate-700">|</span>
        <span>표준 스키마 통합</span>
        <span className="text-slate-300 dark:text-slate-700">|</span>
        <span>멀티스텝 오케스트레이션</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
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
      <p className="text-center text-[9px] text-slate-400 leading-relaxed">
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
        'group relative cursor-pointer rounded-xl border bg-white dark:bg-slate-900/60 transition-all duration-200',
        isHovered
          ? 'shadow-lg border-slate-300 dark:border-slate-700 -translate-y-0.5'
          : 'shadow-sm border-slate-200/80 dark:border-slate-800',
      )}
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <div className={cn('h-[3px] w-full rounded-t-xl', t.cta)} />

      <div className="px-4 pt-4 pb-3.5">
        {/* Header */}
        <div className="text-center mb-3">
          <h3 className="text-[15px] font-bold text-slate-900 dark:text-slate-100 tracking-tight">{domain.name}</h3>
          <p className={cn('text-[10px] mt-1', t.accentMuted)}>{domain.tagline}</p>
        </div>

        {/* Features — compact list */}
        {domain.features && domain.features.length > 0 && (
          <div className="space-y-1.5 mb-3">
            {domain.features.slice(0, 2).map((f, i) => (
              <div key={i} className="flex items-start gap-1.5">
                <span className="text-[11px] shrink-0 mt-0.5">{f.icon}</span>
                <span className="text-[10px] text-slate-600 dark:text-slate-300 leading-snug">{f.title}</span>
              </div>
            ))}
          </div>
        )}

        {/* Strengths — inline tags */}
        {domain.strengths && domain.strengths.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {domain.strengths.map((s, i) => (
              <span key={i} className={cn('px-2 py-0.5 rounded-full text-[8px] font-medium', t.tagBg, t.tagText)}>
                {s.title}
              </span>
            ))}
          </div>
        )}

        {/* Fallback if no features/strengths */}
        {!domain.features && !domain.strengths && (
          <p className="text-[10px] text-slate-400 text-center mb-3 truncate">"{domain.sampleQuestions[0]}"</p>
        )}

        {/* CTA */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onSelect(); }}
          className={cn(
            'w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-medium text-white transition-all',
            t.cta, t.ctaHover,
          )}
        >
          상담 시작
          <ArrowRight className={cn('w-3 h-3 transition-transform', isHovered && 'translate-x-0.5')} />
        </button>
      </div>
    </div>
  );
}
