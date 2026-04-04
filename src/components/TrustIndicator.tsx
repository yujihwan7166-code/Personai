import { cn } from '@/lib/utils';
import type { ApiSourceCitation, PremiumDomainId } from '@/types/expert';

interface Props {
  domain: PremiumDomainId;
  citations: ApiSourceCitation[];
  error?: string;
  trustHeader?: string;
}

const SOURCE_MAP: Record<PremiumDomainId, string> = {
  law: '국가법령정보센터',
  drug: '식약처 의약품안전나라',
  finance: '한국은행 ECOS · 금감원',
};

export function TrustIndicator({ domain, citations, error, trustHeader }: Props) {
  const hasData = citations.length > 0;
  const dateStr = new Date().toISOString().split('T')[0];

  if (trustHeader) {
    return (
      <div className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-medium',
        hasData ? 'bg-emerald-950/50 text-emerald-300 border border-emerald-800/50' : 'bg-amber-950/50 text-amber-300 border border-amber-800/50'
      )}>
        <span>{trustHeader}</span>
      </div>
    );
  }

  return (
    <div className={cn(
      'flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-medium',
      hasData
        ? 'bg-emerald-950/50 text-emerald-300 border border-emerald-800/50'
        : error
          ? 'bg-amber-950/50 text-amber-300 border border-amber-800/50'
          : 'bg-slate-800/50 text-slate-400 border border-slate-700/50'
    )}>
      {hasData ? '\u2705' : error ? '\u26A0\uFE0F' : '\uD83D\uDD0D'}
      <span>
        {hasData
          ? `${SOURCE_MAP[domain]} 데이터 기반 · ${dateStr} 기준 · ${citations.length}건 참조`
          : error || 'API 연결 대기 중...'}
      </span>
    </div>
  );
}
