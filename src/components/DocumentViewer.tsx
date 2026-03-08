import { useState } from 'react';
import { GeneratedDocument, DocumentSlide } from '@/types/expert';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Download, FileText, Presentation, Grid, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ReactMarkdown from 'react-markdown';

interface Props {
  document: GeneratedDocument;
  onClose: () => void;
}

const slideTypeStyles: Record<DocumentSlide['type'], string> = {
  title: 'from-primary/20 to-accent/10',
  content: 'from-card to-secondary/30',
  comparison: 'from-expert-blue/10 to-expert-emerald/10',
  summary: 'from-primary/15 to-primary/5',
  quote: 'from-accent/15 to-accent/5',
};

const slideTypeBorders: Record<DocumentSlide['type'], string> = {
  title: 'border-primary/30',
  content: 'border-border',
  comparison: 'border-expert-blue/30',
  summary: 'border-primary/30',
  quote: 'border-accent/30',
};

export function DocumentViewer({ document: doc, onClose }: Props) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [viewMode, setViewMode] = useState<'slide' | 'grid'>('slide');

  const slide = doc.slides[currentSlide];
  const total = doc.slides.length;

  const goNext = () => setCurrentSlide(prev => Math.min(prev + 1, total - 1));
  const goPrev = () => setCurrentSlide(prev => Math.max(prev - 1, 0));

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === ' ') goNext();
    if (e.key === 'ArrowLeft') goPrev();
    if (e.key === 'Escape') onClose();
    if (e.key === 'g') setViewMode(v => v === 'grid' ? 'slide' : 'grid');
  };

  const exportAsText = () => {
    let text = `# ${doc.title}\n${doc.subtitle}\n\n`;
    doc.slides.forEach((s, i) => {
      text += `---\n## ${i + 1}. ${s.icon || ''} ${s.title}\n\n`;
      s.content.forEach(c => { text += `${c}\n\n`; });
      if (s.notes) text += `> 노트: ${s.notes}\n\n`;
    });
    if (doc.expertInsights?.length) {
      text += `---\n## 전문가 인사이트\n\n`;
      doc.expertInsights.forEach(e => { text += `**${e.expertName}**: ${e.insight}\n\n`; });
    }
    const blob = new Blob([text], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = `${doc.title}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md flex flex-col"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      autoFocus
    >
      {/* Header */}
      <header className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-border bg-card/80">
        <div className="flex items-center gap-3 min-w-0">
          <Presentation className="w-5 h-5 text-primary shrink-0" />
          <div className="min-w-0">
            <h2 className="font-display font-bold text-sm text-foreground truncate">{doc.title}</h2>
            <p className="text-[10px] text-muted-foreground truncate">{doc.subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost" size="sm"
            onClick={() => setViewMode(v => v === 'grid' ? 'slide' : 'grid')}
            className="text-xs gap-1 rounded-xl"
          >
            <Grid className="w-3.5 h-3.5" />
            {viewMode === 'grid' ? '슬라이드' : '전체보기'}
          </Button>
          <Button variant="ghost" size="sm" onClick={exportAsText} className="text-xs gap-1 rounded-xl">
            <Download className="w-3.5 h-3.5" />
            내보내기
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-xl">
            <X className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {viewMode === 'slide' ? (
        <>
          {/* Slide View */}
          <div className="flex-1 flex items-center justify-center p-4 sm:p-8 overflow-hidden">
            <div className="relative w-full max-w-4xl aspect-[16/9]">
              {/* Slide Card */}
              <div className={cn(
                'absolute inset-0 rounded-2xl border-2 bg-gradient-to-br p-8 sm:p-12 flex flex-col overflow-y-auto',
                slideTypeStyles[slide.type],
                slideTypeBorders[slide.type],
              )} style={{ boxShadow: '0 8px 40px hsl(220 20% 14% / 0.1)' }}>
                {/* Slide number */}
                <div className="absolute top-4 right-4 text-xs font-display text-muted-foreground">
                  {currentSlide + 1} / {total}
                </div>

                {slide.type === 'title' ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center gap-4">
                    {slide.icon && <span className="text-5xl sm:text-6xl">{slide.icon}</span>}
                    <h1 className="font-display text-2xl sm:text-4xl font-bold text-foreground leading-tight">{slide.title}</h1>
                    {slide.content.map((c, i) => (
                      <p key={i} className="text-sm sm:text-base text-muted-foreground max-w-xl">{c}</p>
                    ))}
                  </div>
                ) : slide.type === 'quote' ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center gap-6">
                    <span className="text-4xl opacity-30">❝</span>
                    <div className="space-y-4 max-w-2xl">
                      {slide.content.map((c, i) => (
                        <p key={i} className="text-lg sm:text-xl font-medium text-foreground italic leading-relaxed">{c}</p>
                      ))}
                    </div>
                    <h3 className="text-sm font-display font-semibold text-muted-foreground">{slide.title}</h3>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                      {slide.icon && <span className="text-2xl sm:text-3xl">{slide.icon}</span>}
                      <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground">{slide.title}</h2>
                    </div>
                    <div className="flex-1 space-y-3 mt-2">
                      {slide.content.map((c, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <span className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                          <div className="text-sm sm:text-base text-foreground/85 leading-relaxed prose prose-sm max-w-none">
                            <ReactMarkdown>{c}</ReactMarkdown>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {slide.notes && (
                  <div className="mt-4 pt-3 border-t border-border/50">
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <FileText className="w-3 h-3" /> {slide.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-center gap-4 py-4 border-t border-border bg-card/80">
            <Button variant="ghost" size="icon" onClick={goPrev} disabled={currentSlide === 0} className="rounded-xl">
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div className="flex gap-1.5">
              {doc.slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentSlide(i)}
                  className={cn(
                    'w-2 h-2 rounded-full transition-all',
                    i === currentSlide ? 'bg-primary scale-125' : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                  )}
                />
              ))}
            </div>
            <Button variant="ghost" size="icon" onClick={goNext} disabled={currentSlide === total - 1} className="rounded-xl">
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>

          {/* Expert Insights */}
          {doc.expertInsights && doc.expertInsights.length > 0 && currentSlide === total - 1 && (
            <div className="border-t border-border bg-card/60 px-4 sm:px-8 py-4">
              <h3 className="text-xs font-display font-semibold text-muted-foreground mb-2">🧠 전문가 인사이트</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {doc.expertInsights.map((e, i) => (
                  <div key={i} className="bg-secondary/50 rounded-xl p-3 border border-border">
                    <span className="text-[10px] font-display font-semibold text-primary">{e.expertName}</span>
                    <p className="text-xs text-foreground/80 mt-1 leading-relaxed">{e.insight}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        /* Grid View */
        <div className="flex-1 overflow-y-auto p-4 sm:p-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">
            {doc.slides.map((s, i) => (
              <button
                key={i}
                onClick={() => { setCurrentSlide(i); setViewMode('slide'); }}
                className={cn(
                  'aspect-[16/9] rounded-xl border-2 bg-gradient-to-br p-4 text-left transition-all hover:scale-105 hover:shadow-lg',
                  slideTypeStyles[s.type],
                  i === currentSlide ? 'ring-2 ring-primary' : slideTypeBorders[s.type],
                )}
              >
                <div className="flex items-center gap-1.5 mb-2">
                  {s.icon && <span className="text-sm">{s.icon}</span>}
                  <span className="text-[9px] font-display font-bold text-foreground truncate">{s.title}</span>
                </div>
                <div className="space-y-0.5">
                  {s.content.slice(0, 3).map((c, j) => (
                    <p key={j} className="text-[7px] text-muted-foreground truncate">{c}</p>
                  ))}
                </div>
                <span className="absolute bottom-2 right-2 text-[8px] text-muted-foreground font-display">{i + 1}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
