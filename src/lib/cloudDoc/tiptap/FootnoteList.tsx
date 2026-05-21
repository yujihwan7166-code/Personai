/**
 * 본문 안 모든 각주를 모아 문서 끝에 번호 순으로 표시.
 *
 *  - editor.state.doc 순회하며 footnote 노드 수집
 *  - editor 'update' 이벤트로 자동 갱신
 *  - 클릭 시 본문 안 해당 각주 위치로 jump (scrollIntoView)
 *
 * 정책:
 *  - 매 페이지 하단 분리 표시는 v2 (현재 5-A 페이지 분할이 overlay 라
 *    페이지별 위치 계산 정확성 한계). v1 은 문서 끝에 한 번 모음.
 */

import { useEffect, useState } from 'react';
import type { Editor } from '@tiptap/react';

interface FootnoteEntry {
  id: string;
  text: string;
  noteType: 'footnote' | 'endnote';
  pos: number;  // 본문 안 위치 — jump 용
}

export function FootnoteList({ editor }: { editor: Editor | null }) {
  const [entries, setEntries] = useState<FootnoteEntry[]>([]);

  useEffect(() => {
    if (!editor) {
      setEntries([]);
      return;
    }
    const collect = () => {
      const list: FootnoteEntry[] = [];
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === 'footnote') {
          list.push({
            id: String(node.attrs.id ?? ''),
            text: String(node.attrs.text ?? ''),
            noteType: node.attrs.noteType === 'endnote' ? 'endnote' : 'footnote',
            pos,
          });
        }
      });
      setEntries(list);
    };
    collect();
    editor.on('update', collect);
    editor.on('selectionUpdate', collect);
    return () => {
      editor.off('update', collect);
      editor.off('selectionUpdate', collect);
    };
  }, [editor]);

  if (!editor || entries.length === 0) return null;

  const jumpTo = (pos: number) => {
    editor.chain().focus().setTextSelection(pos).scrollIntoView().run();
  };

  return (
    <div className="doc-footnote-list mt-8 pt-3 border-t border-slate-300">
      <div className="text-[10px] text-slate-500 mb-1.5 font-medium tracking-wide">각주</div>
      <ol className="list-decimal pl-5 space-y-0.5 text-xs text-slate-700">
        {entries.map((f) => (
          <li key={f.id} className="leading-relaxed">
            <button
              type="button"
              onClick={() => jumpTo(f.pos)}
              className="text-left hover:bg-blue-50 rounded px-0.5"
              title="본문 위치로 이동"
            >
              {f.text || <span className="text-slate-400 italic">(빈 각주)</span>}
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
