/** 도움말 모달 공용 — 단축키 표시 row + 섹션 wrapper. Mac 자동 변환 포함. */

import React from 'react';

const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);

/** Mac 이면 Ctrl/Alt/Shift 를 기호로 변환 — 데스크탑 단축키 관습 맞춰. */
function macify(k: string): string {
  if (!isMac) return k;
  if (k === 'Ctrl') return '⌘';
  if (k === 'Alt') return '⌥';
  if (k === 'Shift') return '⇧';
  if (k === 'Enter') return '⏎';
  return k;
}

export function HelpSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-xs font-medium text-muted-foreground mb-1.5">{title}</h3>
      <div className="space-y-1">
        {children}
      </div>
    </section>
  );
}

export function HelpRow({ keys, label }: { keys: string[]; label: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm">{label}</span>
      <span className="flex items-center gap-1">
        {keys.map((k, i) => (
          <kbd
            key={`${k}-${i}`}
            className="text-[10px] border border-border rounded px-1.5 py-0.5 bg-muted/40 font-mono"
          >
            {macify(k)}
          </kbd>
        ))}
      </span>
    </div>
  );
}
