/** 도구바 글꼴 크기 + 종류 select. */

import type { Editor } from '@tiptap/react';

const FONT_SIZES = ['10', '12', '14', '16', '18', '20', '24', '28', '32', '40', '48'];

export function FontSizeSelect({ editor }: { editor: Editor }) {
  const current = (editor.getAttributes('textStyle').fontSize as string | undefined) ?? '';
  const numeric = current ? current.replace('px', '') : '';
  return (
    <select
      value={numeric}
      onChange={(e) => {
        const v = e.target.value;
        if (!v) {
          editor.chain().focus().setMark('textStyle', { fontSize: null }).run();
        } else {
          editor.chain().focus().setMark('textStyle', { fontSize: `${v}px` }).run();
        }
      }}
      className="text-xs px-1.5 py-1 rounded border border-border bg-background hover:bg-muted cursor-pointer min-w-[58px]"
      title="글꼴 크기"
      aria-label="글꼴 크기"
    >
      <option value="">크기</option>
      {FONT_SIZES.map((s) => (
        <option key={s} value={s}>{s}px</option>
      ))}
    </select>
  );
}

const FONT_FAMILIES: Array<{ label: string; value: string }> = [
  { label: '기본',  value: '' },
  { label: 'Sans',  value: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", sans-serif' },
  { label: 'Serif', value: 'Georgia, "Times New Roman", serif' },
  { label: 'Mono',  value: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' },
  { label: '돋움',  value: '"Apple SD Gothic Neo", "Malgun Gothic", "맑은 고딕", sans-serif' },
  { label: '바탕',  value: '"Apple Myungjo", "Batang", "바탕", serif' },
];

export function FontFamilySelect({ editor }: { editor: Editor }) {
  const current = (editor.getAttributes('textStyle').fontFamily as string | undefined) ?? '';
  return (
    <select
      value={current}
      onChange={(e) => {
        const v = e.target.value;
        if (!v) {
          editor.chain().focus().setMark('textStyle', { fontFamily: null }).run();
        } else {
          editor.chain().focus().setMark('textStyle', { fontFamily: v }).run();
        }
      }}
      className="text-xs px-1.5 py-1 rounded border border-border bg-background hover:bg-muted cursor-pointer min-w-[64px]"
      title="글꼴 종류"
      aria-label="글꼴 종류"
    >
      {FONT_FAMILIES.map((f) => (
        <option key={f.label} value={f.value}>{f.label}</option>
      ))}
    </select>
  );
}
