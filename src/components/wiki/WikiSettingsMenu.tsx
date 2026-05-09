import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Settings, Download, Upload, Trash2, HardDrive } from 'lucide-react';
import { exportAllAsJson, importFromJson, type ImportMode } from '@/lib/wikiBackup';
import { clearAllPages } from '@/lib/wikiStore';
import { notify } from '@/lib/notify';

interface Props {
  /** 가져오기·전체삭제 후 부모가 페이지 다시 로드하도록 */
  onMutated: () => void;
  /** 사용량 패널은 외부에서 제어 (헤더 배지에서도 열 수 있도록). */
  onOpenStorage: () => void;
}

interface MenuPos { left: number; top: number; }

export function WikiSettingsMenu({ onMutated, onOpenStorage }: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pos, setPos] = useState<MenuPos | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  /* 위치 계산 — 트리거 좌표 기준, 화면 안에 들어가도록 자동 클램프.
     사이드바 footer 안이라 보통 *위로* 향해 펴짐. */
  useLayoutEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const menuW = 220, menuH = 200;
    const margin = 8;
    let left = rect.right - menuW;
    if (left < margin) left = margin;
    if (left + menuW > window.innerWidth - margin) left = window.innerWidth - menuW - margin;
    // 위로 띄움 (트리거 위쪽 공간 우선 — 사이드바 footer 라 위가 더 넓음)
    let top = rect.top - menuH - 4;
    if (top < margin) {
      // 위 공간 부족 → 아래로
      top = rect.bottom + 4;
    }
    if (top + menuH > window.innerHeight - margin) {
      top = window.innerHeight - menuH - margin;
    }
    setPos({ left, top });
  }, [open]);

  /* 외부 클릭 / Esc 로 닫기 */
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (menuRef.current?.contains(t)) return;
      if (triggerRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    const onScroll = () => setOpen(false);
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [open]);

  const handleExport = async () => {
    setBusy(true);
    try {
      await exportAllAsJson();
      notify.success('백업 다운로드 완료');
    } catch (e) {
      notify.error(`백업 실패: ${(e as Error).message}`);
    } finally {
      setBusy(false);
      setOpen(false);
    }
  };

  const handlePickFile = () => fileRef.current?.click();

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const choice = confirm(
      `'${file.name}' 가져오기\n\n[확인] = 병합 (기존 유지)\n[취소] = 덮어쓰기 (기존 전체 삭제 후 가져오기)`
    );
    const mode: ImportMode = choice ? 'merge' : 'replace';
    if (!choice && !confirm('정말 기존 페이지를 모두 지우고 덮어쓸까요?')) return;
    setBusy(true);
    try {
      const result = await importFromJson(file, mode);
      notify.success(
        `${result.imported}개 가져옴`,
        { description: `${result.skipped}개 건너뜀${'images' in result ? ` · 이미지 ${result.images}개 · 히스토리 ${result.revisions}개` : ''}` }
      );
      onMutated();
    } catch (err) {
      notify.error('가져오기 실패', { description: (err as Error).message });
    } finally {
      setBusy(false);
      setOpen(false);
    }
  };

  const handleClearAll = async () => {
    if (!confirm('정말 모든 위키 페이지를 삭제할까요? 되돌릴 수 없어요.')) return;
    if (!confirm('한 번 더 확인 — 모든 페이지가 사라집니다.')) return;
    setBusy(true);
    try {
      await clearAllPages();
      notify.success('모든 페이지 삭제 완료');
      onMutated();
    } finally {
      setBusy(false);
      setOpen(false);
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="p-1 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        title="설정"
        aria-label="설정"
        disabled={busy}
      >
        <Settings className="h-3.5 w-3.5" />
      </button>

      {open && pos && createPortal(
        <div
          ref={menuRef}
          className="fixed wiki-z-popover w-[220px] rounded-lg border border-[hsl(var(--hairline))] bg-popover shadow-xl py-1 wiki-ai-panel-enter"
          style={{ left: pos.left, top: pos.top }}
          role="menu"
        >
          <p className="px-3 py-1.5 text-[9.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">
            ⚙ 위키 설정
          </p>
          <MenuItem icon={<Download className="w-3.5 h-3.5" />} onClick={handleExport} label="전체 백업 (.json)" />
          <MenuItem icon={<Upload className="w-3.5 h-3.5" />} onClick={handlePickFile} label="백업 가져오기" />
          <MenuItem
            icon={<HardDrive className="w-3.5 h-3.5" />}
            onClick={() => { setOpen(false); onOpenStorage(); }}
            label="저장소 사용량"
          />
          <div className="my-1 border-t border-[hsl(var(--hairline))]" />
          <MenuItem
            icon={<Trash2 className="w-3.5 h-3.5" />}
            onClick={handleClearAll}
            label="전체 삭제"
            danger
          />
        </div>,
        document.body,
      )}

      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={handleImport}
      />
    </>
  );
}

function MenuItem({
  icon, label, onClick, danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      role="menuitem"
      className={
        'w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-left transition-colors ' +
        (danger
          ? 'text-destructive hover:bg-destructive/10'
          : 'text-foreground/85 hover:bg-accent hover:text-foreground')
      }
    >
      {icon}
      {label}
    </button>
  );
}
