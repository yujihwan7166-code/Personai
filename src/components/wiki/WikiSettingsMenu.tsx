import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Settings, Download, Upload, Trash2, HardDrive, FileText } from 'lucide-react';
import { exportAllAsJson, importFromJson, type ImportMode } from '@/lib/wikiBackup';
import { exportAllAsMarkdownZip } from '@/lib/wikiExport';
import { importMarkdownFiles } from '@/lib/wikiMarkdownImport';
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
  const [pendingImportFile, setPendingImportFile] = useState<File | null>(null);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const markdownFileRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  /* 위치 계산 — 트리거 좌표 기준, 화면 안에 들어가도록 자동 클램프.
     사이드바 footer 안이라 보통 *위로* 향해 펴짐. */
  useLayoutEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const menuW = 220, menuH = 232;
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
  const handlePickMarkdownFile = () => markdownFileRef.current?.click();

  const handleMarkdownExport = async () => {
    setBusy(true);
    try {
      await exportAllAsMarkdownZip();
      notify.success('Markdown 묶음 다운로드 완료');
    } catch (e) {
      notify.error(`Markdown 내보내기 실패: ${(e as Error).message}`);
    } finally {
      setBusy(false);
      setOpen(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setOpen(false);
    setPendingImportFile(file);
  };

  const handleMarkdownImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    e.target.value = '';
    if (!files || files.length === 0) return;
    setBusy(true);
    setOpen(false);
    try {
      const result = await importMarkdownFiles(files);
      if (result.imported > 0) {
        notify.success(
          'Markdown 가져오기 완료',
          { description: `${result.imported}개 가져옴${result.failed ? ` · 실패 ${result.failed}개` : ''}` },
        );
        onMutated();
      } else {
        notify.error('Markdown 가져오기 실패', { description: result.errors[0]?.message ?? '가져올 수 있는 파일이 없습니다.' });
      }
    } catch (err) {
      notify.error('Markdown 가져오기 실패', { description: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const runImport = async (file: File, mode: ImportMode) => {
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
      setPendingImportFile(null);
      setOpen(false);
    }
  };

  const handleClearAll = async () => {
    setOpen(false);
    setClearConfirmOpen(true);
  };

  const runClearAll = async () => {
    setBusy(true);
    try {
      await clearAllPages();
      notify.success('모든 페이지 삭제 완료');
      onMutated();
    } finally {
      setBusy(false);
      setClearConfirmOpen(false);
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
          <MenuItem icon={<FileText className="w-3.5 h-3.5" />} onClick={handleMarkdownExport} label="전체 Markdown (.zip)" />
          <MenuItem icon={<Upload className="w-3.5 h-3.5" />} onClick={handlePickFile} label="백업 가져오기" />
          <MenuItem icon={<FileText className="w-3.5 h-3.5" />} onClick={handlePickMarkdownFile} label="Markdown/ZIP 가져오기" />
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
      <input
        ref={markdownFileRef}
        type="file"
        accept=".md,.markdown,.zip,text/markdown,text/plain,application/zip"
        multiple
        className="hidden"
        onChange={handleMarkdownImport}
      />

      {pendingImportFile && createPortal(
        <ImportChoiceDialog
          file={pendingImportFile}
          busy={busy}
          onCancel={() => setPendingImportFile(null)}
          onPick={(mode) => { void runImport(pendingImportFile, mode); }}
        />,
        document.body,
      )}

      {clearConfirmOpen && createPortal(
        <DangerConfirmDialog
          title="전체 위키를 삭제할까요?"
          body="모든 페이지가 삭제됩니다. 백업 파일 없이 진행하면 복구할 수 없어요."
          busy={busy}
          confirmLabel="전체 삭제"
          onCancel={() => setClearConfirmOpen(false)}
          onConfirm={() => { void runClearAll(); }}
        />,
        document.body,
      )}
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

function ImportChoiceDialog({
  file, busy, onCancel, onPick,
}: {
  file: File;
  busy: boolean;
  onCancel: () => void;
  onPick: (mode: ImportMode) => void;
}) {
  return (
    <ModalShell ariaLabel="백업 가져오기 방식 선택" onBackdrop={busy ? undefined : onCancel}>
      <p className="text-[11px] font-semibold text-muted-foreground">백업 가져오기</p>
      <h2 className="mt-1 text-[15px] font-bold truncate">{file.name}</h2>
      <p className="mt-2 text-[12px] leading-5 text-muted-foreground">
        기존 위키를 유지하려면 병합을 선택하세요. 덮어쓰기는 현재 페이지와 히스토리를 지운 뒤 백업 내용으로 교체합니다.
      </p>
      <div className="mt-4 grid grid-cols-1 gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => onPick('merge')}
          className="rounded-lg border border-primary/35 bg-primary/10 px-3 py-2 text-left hover:bg-primary/15 disabled:opacity-50"
        >
          <span className="block text-[12.5px] font-bold text-primary">병합</span>
          <span className="block text-[11px] text-muted-foreground mt-0.5">기존 페이지를 유지하고, 없는 페이지만 가져옵니다.</span>
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => onPick('replace')}
          className="rounded-lg border border-destructive/30 px-3 py-2 text-left text-destructive hover:bg-destructive/10 disabled:opacity-50"
        >
          <span className="block text-[12.5px] font-bold">덮어쓰기</span>
          <span className="block text-[11px] text-destructive/75 mt-0.5">현재 위키를 지우고 백업으로 교체합니다.</span>
        </button>
      </div>
      <div className="mt-4 flex justify-end">
        <button
          type="button"
          disabled={busy}
          onClick={onCancel}
          className="h-8 px-3 rounded-md border border-[hsl(var(--hairline))] text-[12px] font-semibold hover:bg-accent disabled:opacity-50"
        >
          취소
        </button>
      </div>
    </ModalShell>
  );
}

function DangerConfirmDialog({
  title, body, busy, confirmLabel, onCancel, onConfirm,
}: {
  title: string;
  body: string;
  busy: boolean;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <ModalShell ariaLabel={title} onBackdrop={busy ? undefined : onCancel}>
      <p className="text-[11px] font-semibold text-destructive">위험한 작업</p>
      <h2 className="mt-1 text-[15px] font-bold">{title}</h2>
      <p className="mt-2 text-[12px] leading-5 text-muted-foreground">{body}</p>
      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={onCancel}
          className="h-8 px-3 rounded-md border border-[hsl(var(--hairline))] text-[12px] font-semibold hover:bg-accent disabled:opacity-50"
        >
          취소
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onConfirm}
          className="h-8 px-3 rounded-md bg-destructive text-destructive-foreground text-[12px] font-semibold hover:opacity-90 disabled:opacity-50"
        >
          {busy ? '처리 중…' : confirmLabel}
        </button>
      </div>
    </ModalShell>
  );
}

function ModalShell({
  ariaLabel, children, onBackdrop,
}: {
  ariaLabel: string;
  children: React.ReactNode;
  onBackdrop?: () => void;
}) {
  return (
    <div
      className="fixed inset-0 wiki-z-modal-backdrop flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm"
      role="dialog"
      aria-label={ariaLabel}
      onClick={onBackdrop}
    >
      <div
        className="w-full max-w-md rounded-xl border border-[hsl(var(--hairline))] bg-popover p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
