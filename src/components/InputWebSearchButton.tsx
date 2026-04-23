/**
 * 채팅 입력창 우상단 "웹 검색" 토글 버튼.
 *
 * 팝오버를 띄우지 않고, 부모(QuestionInput)가 open 상태를 관리해 채팅 입력 컨테이너 내부에
 * 인라인 검색바를 펼침. 이 버튼은 **토글만** 담당.
 *
 * 시각 차별화: AI 탭의 "전문가 필터 🔍"과 구분되도록 🌐 (globe) 아이콘 사용.
 */
import { Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onToggle: () => void;
  className?: string;
}

export function InputWebSearchButton({ open, onToggle, className }: Props) {
  return (
    <button
      type="button"
      onClick={(e) => {
        // 버튼 클릭이 textarea focus 를 빼앗지 않도록
        e.stopPropagation();
        onToggle();
      }}
      aria-label="웹 검색"
      aria-pressed={open}
      title={open ? '웹 검색 닫기' : '웹 검색 (Google·네이버·다음…)'}
      className={cn(
        'flex h-6 w-6 items-center justify-center rounded-lg transition-colors',
        open
          ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-300 dark:hover:bg-indigo-500/30'
          : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-500 dark:hover:text-slate-200 dark:hover:bg-slate-800',
        className,
      )}
    >
      <Globe className="h-3.5 w-3.5" strokeWidth={2} />
    </button>
  );
}
