import { useEffect, useRef, useState } from 'react';
import { Settings, Download, Upload, Trash2, HardDrive } from 'lucide-react';
import { exportAllAsJson, importFromJson, type ImportMode } from '@/lib/wikiBackup';
import { clearAllPages } from '@/lib/wikiStore';
import { WikiStoragePanel } from './WikiStoragePanel';

interface Props {
  /** 가져오기·전체삭제 후 부모가 페이지 다시 로드하도록 */
  onMutated: () => void;
}

export function WikiSettingsMenu({ onMutated }: Props) {
  const [open, setOpen] = useState(false);
  const [storageOpen, setStorageOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', onClick);
    return () => window.removeEventListener('mousedown', onClick);
  }, [open]);

  const flash = (text: string) => {
    setMsg(text);
    setTimeout(() => setMsg(null), 3500);
  };

  const handleExport = async () => {
    setBusy(true);
    try {
      await exportAllAsJson();
      flash('백업 다운로드 완료');
    } catch (e) {
      flash(`실패: ${(e as Error).message}`);
    } finally {
      setBusy(false);
      setOpen(false);
    }
  };

  const handlePickFile = () => fileRef.current?.click();

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // 같은 파일 재선택 가능하게
    if (!file) return;
    const choice = confirm(
      `'${file.name}' 가져오기\n\n[확인] = 병합 (기존 유지)\n[취소] = 덮어쓰기 (기존 전체 삭제 후 가져오기)`
    );
    const mode: ImportMode = choice ? 'merge' : 'replace';
    if (!choice && !confirm('정말 기존 페이지를 모두 지우고 덮어쓸까요?')) return;
    setBusy(true);
    try {
      const result = await importFromJson(file, mode);
      flash(`${result.imported}개 가져옴, ${result.skipped}개 건너뜀`);
      onMutated();
    } catch (err) {
      alert(`가져오기 실패: ${(err as Error).message}`);
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
      flash('모든 페이지 삭제 완료');
      onMutated();
    } finally {
      setBusy(false);
      setOpen(false);
    }
  };

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="p-1 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        title="설정"
        aria-label="설정"
        disabled={busy}
      >
        <Settings className="h-3.5 w-3.5" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-40 min-w-[200px] rounded-lg border border-[hsl(var(--hairline))] bg-popover shadow-xl py-1">
          <MenuItem icon={<Download className="w-3.5 h-3.5" />} onClick={handleExport} label="전체 백업 (.json)" />
          <MenuItem icon={<Upload className="w-3.5 h-3.5" />} onClick={handlePickFile} label="백업 가져오기" />
          <MenuItem
            icon={<HardDrive className="w-3.5 h-3.5" />}
            onClick={() => { setOpen(false); setStorageOpen(true); }}
            label="저장소 사용량"
          />
          <div className="my-1 border-t border-[hsl(var(--hairline))]" />
          <MenuItem
            icon={<Trash2 className="w-3.5 h-3.5" />}
            onClick={handleClearAll}
            label="전체 삭제"
            danger
          />
        </div>
      )}

      {msg && (
        <span className="absolute right-0 top-full mt-9 z-50 px-2.5 py-1.5 rounded-md bg-foreground text-background text-[11px] whitespace-nowrap shadow-lg">
          {msg}
        </span>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={handleImport}
      />

      <WikiStoragePanel open={storageOpen} onClose={() => setStorageOpen(false)} />
    </div>
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
