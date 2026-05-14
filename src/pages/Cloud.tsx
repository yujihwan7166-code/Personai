/** /cloud — 드라이브형 파일 관리 + 인플레이스 에디터. 1단계: 빈 골격(데이터·동작 없음). */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Plus, Upload, Search, Settings, Eye,
  FileText, FileSpreadsheet, Presentation,
  Clock, Star, Share2, Folder, Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

export default function Cloud() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  const notReady = () => {
    toast({
      title: '곧 활성화돼요',
      description: '다음 단계에서 파일 업로드·편집이 추가됩니다.',
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-background sticky top-0 z-10">
        <div className="flex items-center gap-2 px-4 py-2">
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded hover:bg-muted"
            aria-label="홈으로"
            type="button"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="text-base font-medium flex items-center gap-1.5">
            <span className="text-lg" aria-hidden>☁️</span>
            <span>클라우드</span>
          </div>
          <span className="text-xs text-muted-foreground hidden sm:inline">
            문서·시트·슬라이드 편집
          </span>

          <div className="ml-auto flex items-center gap-1">
            <button
              onClick={notReady}
              className="px-3 py-1.5 rounded text-sm hover:bg-muted flex items-center gap-1.5"
              type="button"
            >
              <Plus className="w-4 h-4" />
              새로 만들기
            </button>
            <button
              onClick={notReady}
              className="px-3 py-1.5 rounded text-sm hover:bg-muted flex items-center gap-1.5"
              type="button"
            >
              <Upload className="w-4 h-4" />
              업로드
            </button>
            <button
              onClick={notReady}
              className="p-2 rounded hover:bg-muted"
              aria-label="검색"
              type="button"
            >
              <Search className="w-4 h-4" />
            </button>
            <button
              onClick={notReady}
              className="p-2 rounded hover:bg-muted"
              aria-label="설정"
              type="button"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-56 shrink-0 border-r border-border bg-background overflow-y-auto p-3 text-sm hidden md:block">
          <SidebarItem icon={<Clock className="w-4 h-4" />} label="최근" />
          <SidebarItem icon={<Star className="w-4 h-4" />} label="별표" count={0} />
          <SidebarItem
            icon={<Share2 className="w-4 h-4" />}
            label="공유받음"
            disabled
            hint="추후 활성화"
          />

          <div className="my-3 border-t border-border" />

          <SidebarItem icon={<Folder className="w-4 h-4" />} label="내 파일" />

          <div className="my-3 border-t border-border" />

          <SidebarItem icon={<Trash2 className="w-4 h-4" />} label="휴지통" count={0} />
        </aside>

        <main className="flex-1 overflow-y-auto">
          <section className="p-6 border-b border-border">
            <h2 className="text-sm font-medium text-muted-foreground mb-3">
              ✨ 새로 만들기
            </h2>
            <div className="grid grid-cols-3 gap-3 max-w-2xl">
              <NewCard
                icon={<FileText className="w-6 h-6" />}
                label="문서"
                color="hsl(200 75% 55%)"
                onClick={notReady}
              />
              <NewCard
                icon={<FileSpreadsheet className="w-6 h-6" />}
                label="시트"
                color="hsl(140 50% 50%)"
                onClick={notReady}
              />
              <NewCard
                icon={<Presentation className="w-6 h-6" />}
                label="슬라이드"
                color="hsl(25 85% 55%)"
                onClick={notReady}
              />
            </div>
          </section>

          <section className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium flex items-center gap-1.5">
                <Folder className="w-4 h-4 text-muted-foreground" />
                내 파일
              </h2>
              <div className="flex items-center gap-1 text-xs">
                <button
                  onClick={() => setViewMode('list')}
                  className={cn(
                    'px-2 py-1 rounded',
                    viewMode === 'list'
                      ? 'bg-muted text-foreground'
                      : 'text-muted-foreground hover:bg-muted/50',
                  )}
                  type="button"
                  aria-pressed={viewMode === 'list'}
                >
                  ≡ 리스트
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    'px-2 py-1 rounded',
                    viewMode === 'grid'
                      ? 'bg-muted text-foreground'
                      : 'text-muted-foreground hover:bg-muted/50',
                  )}
                  type="button"
                  aria-pressed={viewMode === 'grid'}
                >
                  ▦ 그리드
                </button>
              </div>
            </div>

            <div
              className="border-2 border-dashed border-border rounded-lg py-16 px-4 text-center"
              role="region"
              aria-label="빈 파일 영역"
            >
              <div className="text-5xl mb-3" aria-hidden>📂</div>
              <div className="text-base font-medium mb-1">아직 파일이 없어요</div>
              <div className="text-sm text-muted-foreground mb-4">
                위 카드를 누르거나 ⬆️ 파일을 끌어다 놓아보세요
              </div>
              <div className="text-xs text-muted-foreground/70">
                (다음 단계에서 업로드·편집이 활성화됩니다)
              </div>
            </div>
          </section>
        </main>

        <aside className="w-72 shrink-0 border-l border-border bg-background overflow-y-auto p-4 hidden lg:block">
          <div className="text-sm font-medium mb-3 flex items-center gap-1.5">
            <Eye className="w-4 h-4 text-muted-foreground" />
            <span>미리보기</span>
          </div>
          <div className="text-xs text-muted-foreground py-12 text-center">
            파일을 선택하면 여기에 미리보기가 표시됩니다.
          </div>
        </aside>
      </div>
    </div>
  );
}

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  count?: number;
  disabled?: boolean;
  hint?: string;
}

function SidebarItem({ icon, label, count, disabled, hint }: SidebarItemProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 px-2 py-1.5 rounded',
        disabled
          ? 'opacity-40 cursor-not-allowed'
          : 'hover:bg-muted cursor-pointer',
      )}
      title={hint}
      aria-disabled={disabled}
    >
      <span className="text-muted-foreground">{icon}</span>
      <span className="flex-1">{label}</span>
      {typeof count === 'number' && (
        <span className="text-xs text-muted-foreground">{count}</span>
      )}
    </div>
  );
}

interface NewCardProps {
  icon: React.ReactNode;
  label: string;
  color: string;
  onClick: () => void;
}

function NewCard({ icon, label, color, onClick }: NewCardProps) {
  return (
    <button
      onClick={onClick}
      className="border border-border rounded-lg p-4 hover:border-foreground/30 hover:bg-muted/30 transition-colors flex flex-col items-center gap-2 text-sm"
      type="button"
    >
      <div
        className="w-10 h-10 rounded flex items-center justify-center text-white"
        style={{ backgroundColor: color }}
        aria-hidden
      >
        {icon}
      </div>
      <span>{label}</span>
    </button>
  );
}
