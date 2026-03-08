import { useState } from 'react';
import { DiscussionMessage, DiscussionMode, DISCUSSION_MODE_LABELS } from '@/types/expert';
import { cn } from '@/lib/utils';
import { History, X, Trash2, Clock } from 'lucide-react';

export interface DiscussionRecord {
  id: string;
  question: string;
  mode: DiscussionMode;
  messages: DiscussionMessage[];
  expertIds: string[];
  timestamp: number;
}

const HISTORY_KEY = 'ai-debate-history-v1';
const MAX_HISTORY = 20;

export function saveDiscussionToHistory(record: Omit<DiscussionRecord, 'id' | 'timestamp'>) {
  try {
    const existing = getDiscussionHistory();
    const newRecord: DiscussionRecord = {
      ...record,
      id: `hist-${Date.now()}`,
      timestamp: Date.now(),
    };
    const updated = [newRecord, ...existing].slice(0, MAX_HISTORY);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  } catch { /* ignore */ }
}

export function getDiscussionHistory(): DiscussionRecord[] {
  try {
    const saved = localStorage.getItem(HISTORY_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch { return []; }
}

export function deleteDiscussionFromHistory(id: string) {
  try {
    const existing = getDiscussionHistory();
    localStorage.setItem(HISTORY_KEY, JSON.stringify(existing.filter(r => r.id !== id)));
  } catch { /* ignore */ }
}

interface Props {
  onLoad: (record: DiscussionRecord) => void;
}

export function DiscussionHistory({ onLoad }: Props) {
  const [open, setOpen] = useState(false);
  const [records, setRecords] = useState<DiscussionRecord[]>([]);

  const handleOpen = () => {
    setRecords(getDiscussionHistory());
    setOpen(true);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteDiscussionFromHistory(id);
    setRecords(prev => prev.filter(r => r.id !== id));
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return '방금 전';
    if (diffMin < 60) return `${diffMin}분 전`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}시간 전`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 7) return `${diffDay}일 전`;
    return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1.5 rounded-lg hover:bg-secondary/50"
        title="토론 기록"
      >
        <History className="w-4 h-4" />
        <span className="hidden sm:inline">기록</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[70vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="font-display font-bold text-foreground flex items-center gap-2">
                <History className="w-5 h-5 text-primary" />
                토론 기록
              </h2>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-secondary/50">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin">
              {records.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <History className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">아직 토론 기록이 없습니다.</p>
                </div>
              ) : (
                records.map(record => (
                  <button
                    key={record.id}
                    type="button"
                    onClick={() => { onLoad(record); setOpen(false); }}
                    className="w-full text-left p-3 rounded-xl border border-border/50 hover:border-primary/30 hover:bg-secondary/30 transition-all group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{record.question}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                            {DISCUSSION_MODE_LABELS[record.mode]?.icon} {DISCUSSION_MODE_LABELS[record.mode]?.label}
                          </span>
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                            <Clock className="w-3 h-3" /> {formatTime(record.timestamp)}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {record.messages.filter(m => m.expertId !== '__round__' && m.expertId !== '__user__').length}개 발언
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => handleDelete(record.id, e)}
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive p-1 rounded transition-all shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
