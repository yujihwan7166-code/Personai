import { useState } from 'react';
import { cn } from '@/lib/utils';
import { PREMIUM_DOMAIN_TEMPLATES, type PremiumDomainId, type PremiumDomainTemplate } from '@/types/expert';
import { ChevronRight, Shield, Zap } from 'lucide-react';

interface Props {
  onSelectDomain: (domainId: PremiumDomainId) => void;
}

export function PremiumDomainLanding({ onSelectDomain }: Props) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <div className="min-h-[60vh] flex flex-col">
      {/* Header */}
      <div className="text-center pt-8 pb-6 px-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/50 mb-4">
          <Shield className="w-3 h-3 text-amber-400" />
          <span className="text-[10px] font-semibold text-slate-300 tracking-wider uppercase">실시간 공공 데이터 연동</span>
        </div>
        <h2 className="text-[22px] font-black text-white tracking-tight">AI 자문관</h2>
        <p className="mt-1.5 text-[12px] text-slate-400 max-w-md mx-auto leading-relaxed">
          국가 공공 API를 실시간으로 조회하여 법령·의약품·금융 데이터를 근거로 답변합니다
        </p>
      </div>

      {/* Domain Cards */}
      <div className="flex-1 flex items-start justify-center px-4 pb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-3xl">
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
      </div>

      {/* Disclaimer */}
      <div className="text-center pb-6 px-4">
        <p className="text-[9px] text-slate-600 max-w-lg mx-auto leading-relaxed">
          ⚠️ AI 기반 참고 자문이며 전문가 상담을 대체하지 않습니다 · 법률·의료·투자 결정은 반드시 전문가와 상의하세요
        </p>
      </div>
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
  return (
    <button
      type="button"
      onClick={onSelect}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      className={cn(
        'group relative text-left rounded-2xl border overflow-hidden transition-all duration-300',
        'bg-gradient-to-b',
        domain.color.gradient,
        isHovered ? `${domain.color.border} shadow-2xl -translate-y-1` : 'border-slate-800 shadow-lg',
      )}
    >
      {/* Top accent line */}
      <div className={cn('h-1 w-full', {
        'bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500': domain.id === 'law',
        'bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-500': domain.id === 'drug',
        'bg-gradient-to-r from-blue-500 via-blue-400 to-blue-500': domain.id === 'finance',
      })} />

      <div className="p-5">
        {/* Icon + Name */}
        <div className="flex items-center gap-3 mb-3">
          <div className={cn(
            'w-11 h-11 rounded-xl flex items-center justify-center text-[22px] transition-transform duration-300',
            'bg-slate-800/80 border border-slate-700/50 shadow-inner',
            isHovered && 'scale-110',
          )}>
            {domain.icon}
          </div>
          <div>
            <h3 className="text-[14px] font-bold text-white">{domain.name}</h3>
            <div className="flex items-center gap-1 mt-0.5">
              <Zap className={cn('w-2.5 h-2.5', domain.color.accent)} />
              <span className={cn('text-[9px] font-medium', domain.color.accent)}>{domain.apiSource.name}</span>
            </div>
          </div>
        </div>

        {/* Tagline */}
        <p className="text-[11px] text-slate-400 leading-relaxed mb-4">{domain.tagline}</p>

        {/* Phases */}
        <div className="space-y-1.5 mb-4">
          {domain.phases.map((phase, i) => (
            <div key={phase.id} className="flex items-center gap-2">
              <span className={cn(
                'w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0',
                'bg-slate-800 border border-slate-700',
                domain.color.text,
              )}>
                {i + 1}
              </span>
              <span className="text-[10px] text-slate-500">{phase.role}</span>
            </div>
          ))}
        </div>

        {/* Sample questions */}
        <div className="space-y-1 mb-4">
          {domain.sampleQuestions.slice(0, 2).map((q, i) => (
            <div key={i} className="text-[9px] text-slate-600 truncate">
              "{q}"
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className={cn(
          'flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[11px] font-bold transition-all',
          'bg-slate-800/80 border border-slate-700/50',
          isHovered && domain.color.text,
          !isHovered && 'text-slate-400',
        )}>
          <span>상담 시작</span>
          <ChevronRight className={cn('w-3.5 h-3.5 transition-transform', isHovered && 'translate-x-0.5')} />
        </div>
      </div>
    </button>
  );
}
