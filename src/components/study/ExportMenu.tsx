import { useState } from 'react';
import { Download, Copy, Check, FileText } from 'lucide-react';
import type { StudyNotebook } from '@/types/study';
import { LENS_META } from '@/types/study';
import { StudyBtn } from './ui/primitives';
import { cn } from '@/lib/utils';
import { fmtFullDate } from '@/lib/dateFormat';

type ExportRange = 'all' | 'lens-only' | 'wrong-only';

interface Props {
  notebook: StudyNotebook;
  onClose: () => void;
}

export function ExportMenu({ notebook, onClose }: Props) {
  const [copied, setCopied] = useState(false);
  const [range, setRange] = useState<ExportRange>('all');

  const buildMarkdown = (r: ExportRange = range) => {
    const lines: string[] = [`# ${notebook.title}`, ''];
    lines.push(`> 원본 ${notebook.sources.length}개 · ${fmtFullDate(notebook.updatedAt)}`);
    lines.push('');
    if (r !== 'wrong-only') {
      for (const [lens, out] of Object.entries(notebook.lensOutputs)) {
        if (!out) continue;
        const meta = LENS_META[lens as keyof typeof LENS_META];
        lines.push(`## ${meta.label}`, '');
        lines.push(out.content);
        lines.push('');
      }
    }
    if ((r === 'all' || r === 'wrong-only') && notebook.wrongAnswers.length > 0) {
      lines.push('## 오답노트', '');
      for (const w of notebook.wrongAnswers) {
        lines.push(`- **${w.question}**`);
        lines.push(`  - 정답: ${w.correct}`);
        lines.push(`  - 해설: ${w.explanation}`);
      }
    }
    return lines.join('\n');
  };

  const lensCount = Object.keys(notebook.lensOutputs).length;
  const stats: Record<ExportRange, { label: string; desc: string; count: number }> = {
    all: {
      label: '전체',
      desc: '모든 렌즈 + 오답노트',
      count: lensCount + (notebook.wrongAnswers.length > 0 ? 1 : 0),
    },
    'lens-only': { label: '렌즈만', desc: '요약·핵심·퀴즈 등', count: lensCount },
    'wrong-only': {
      label: '오답만',
      desc: '틀린 문제만 따로 정리',
      count: notebook.wrongAnswers.length,
    },
  };

  const copyMd = async () => {
    try {
      await navigator.clipboard.writeText(buildMarkdown());
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* noop */
    }
  };

  const download = (ext: 'md' | 'txt') => {
    const md = buildMarkdown();
    const blob = new Blob([md], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${notebook.title.replace(/[/\\?%*:|"<>]/g, '_')}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-[90] bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-md w-full p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-[15px] font-bold text-slate-900 dark:text-slate-100 mb-1">내보내기</h3>
        <p className="text-[11.5px] text-slate-500 dark:text-slate-400 mb-4">
          범위를 고른 뒤 저장 방식을 선택하세요
        </p>

        <div className="grid grid-cols-3 gap-2 mb-4">
          {(Object.keys(stats) as ExportRange[]).map((k) => {
            const s = stats[k];
            const active = range === k;
            return (
              <button
                key={k}
                onClick={() => setRange(k)}
                disabled={s.count === 0}
                className={cn(
                  'rounded-xl border p-2.5 text-left transition-all disabled:opacity-40',
                  active
                    ? 'border-indigo-400 ring-2 ring-indigo-100 bg-indigo-50/60 dark:bg-indigo-950/40'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300',
                )}
              >
                <p className="text-[11.5px] font-bold text-slate-900 dark:text-slate-100">
                  {s.label}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                  {s.desc}
                </p>
                <p className="text-[10px] mt-1 text-indigo-600 font-bold tabular-nums">
                  {s.count}개 항목
                </p>
              </button>
            );
          })}
        </div>

        <div className="mb-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 p-3 max-h-36 overflow-y-auto">
          <p className="text-[9.5px] font-bold uppercase tracking-wide text-slate-400 mb-1">
            미리보기
          </p>
          <pre className="text-[10.5px] leading-relaxed text-slate-600 dark:text-slate-300 whitespace-pre-wrap font-mono">
            {buildMarkdown(range).slice(0, 480) || '(비어 있어요)'}
            {buildMarkdown(range).length > 480 && '\n…'}
          </pre>
        </div>

        <div className="space-y-2">
          <StudyBtn variant="outline" onClick={() => download('md')} className="w-full justify-start">
            <Download className="h-4 w-4" /> Markdown (.md)로 저장
          </StudyBtn>
          <StudyBtn variant="outline" onClick={() => download('txt')} className="w-full justify-start">
            <FileText className="h-4 w-4" /> 텍스트 (.txt)로 저장
          </StudyBtn>
          <StudyBtn variant="outline" onClick={copyMd} className="w-full justify-start">
            {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
            {copied ? '복사됐어요' : '클립보드로 복사'}
          </StudyBtn>
        </div>
        <StudyBtn variant="ghost" onClick={onClose} className="w-full mt-4">
          닫기
        </StudyBtn>
      </div>
    </div>
  );
}
