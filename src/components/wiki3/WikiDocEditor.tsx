/**
 * 마이위키 본문 에디터 — 올인원 노트와 같은 Plate 엔진("/" 슬래시 삽입 포함).
 *
 * 위키 전용 추가:
 *  - 본문 속 문서 링크 = url "wiki://<docId>" 인 링크 노드. 클릭하면 그 문서로 이동.
 *  - 텍스트를 드래그하면 "문서로 연결" 버블이 떠서 초보도 문법 없이 링크를 건다.
 *  - apiRef.applyLink(docId, text) — 페이지(피커)가 고른 문서를 현재 선택에 연결.
 */
import 'katex/dist/katex.min.css';
import { useRef, useState, type MutableRefObject } from 'react';
import { Plate, usePlateEditor } from 'platejs/react';
import type { Value } from 'platejs';
import { upsertLink } from '@platejs/link';
import { Link2 } from 'lucide-react';
import { Editor, EditorContainer } from '@/components/plate/ui/editor';
import { BasicNodesKit } from '@/components/plate/editor/plugins/basic-nodes-kit';
import { IndentKit } from '@/components/plate/editor/plugins/indent-kit';
import { ListKit } from '@/components/plate/editor/plugins/list-kit';
import { ToggleKit } from '@/components/plate/editor/plugins/toggle-kit';
import { CodeBlockKit } from '@/components/plate/editor/plugins/code-block-kit';
import { TableKit } from '@/components/plate/editor/plugins/table-kit';
import { MathKit } from '@/components/plate/editor/plugins/math-kit';
import { CalloutKit } from '@/components/plate/editor/plugins/callout-kit';
import { ColumnKit } from '@/components/plate/editor/plugins/column-kit';
import { TocKit } from '@/components/plate/editor/plugins/toc-kit';
import { MediaKit } from '@/components/plate/editor/plugins/media-kit';
import { LinkKit } from '@/components/plate/editor/plugins/link-kit';
import { EmojiKit } from '@/components/plate/editor/plugins/emoji-kit';
import { SlashKit } from '@/components/plate/editor/plugins/slash-kit';

export interface WikiEditorApi {
  /** 현재 선택(드래그한 텍스트)에 문서 링크를 건다. 선택이 없으면 제목 텍스트로 삽입. */
  applyLink: (docId: string, text: string) => void;
}

interface Props {
  initialValue: Value;
  onChange: (value: Value) => void;
  /** 본문 속 wiki:// 링크 클릭 → 그 문서 열기. */
  onOpenDoc: (docId: string) => void;
  /** 드래그 버블 "문서로 연결" 클릭 → 페이지가 피커를 연다(선택 텍스트 전달). */
  onLinkRequest: (selectedText: string) => void;
  apiRef: MutableRefObject<WikiEditorApi | null>;
  placeholder?: string;
}

export function WikiDocEditor({ initialValue, onChange, onOpenDoc, onLinkRequest, apiRef, placeholder }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [bubble, setBubble] = useState<{ x: number; y: number; text: string } | null>(null);

  const editor = usePlateEditor({
    plugins: [
      ...IndentKit, ...BasicNodesKit, ...ListKit, ...ToggleKit, ...CodeBlockKit,
      ...TableKit, ...MathKit, ...CalloutKit, ...ColumnKit, ...TocKit,
      ...MediaKit, ...LinkKit, ...EmojiKit, ...SlashKit,
    ],
    value: initialValue,
  });

  apiRef.current = {
    applyLink: (docId, text) => {
      upsertLink(editor, { url: `wiki://${docId}`, text, skipValidation: true });
      setBubble(null);
    },
  };

  /** 드래그(선택) 감지 → 버블 위치 계산. 컨테이너 기준 좌표. */
  const refreshBubble = () => {
    window.setTimeout(() => {
      const sel = window.getSelection();
      const host = containerRef.current;
      if (!sel || sel.isCollapsed || !host || !sel.rangeCount) { setBubble(null); return; }
      const text = sel.toString().trim();
      if (!text || text.length > 80) { setBubble(null); return; }
      const range = sel.getRangeAt(0);
      if (!host.contains(range.commonAncestorContainer)) { setBubble(null); return; }
      const r = range.getBoundingClientRect();
      const h = host.getBoundingClientRect();
      setBubble({ x: r.left - h.left + r.width / 2, y: r.top - h.top, text });
    }, 0);
  };

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseUp={refreshBubble}
      onKeyUp={(e) => { if (e.shiftKey || e.key === 'Escape') refreshBubble(); }}
      onClickCapture={(e) => {
        // 본문 속 위키 링크 — 클릭 즉시 그 문서로 (수정키 없이)
        const a = (e.target as HTMLElement).closest?.('a[href^="wiki://"]') as HTMLAnchorElement | null;
        if (a) {
          e.preventDefault();
          e.stopPropagation();
          onOpenDoc(a.getAttribute('href')!.slice(7));
        }
      }}
    >
      <Plate editor={editor} onChange={({ value }) => onChange(value as Value)}>
        <EditorContainer>
          <Editor
            variant="none"
            placeholder={placeholder ?? '무엇이든 적어보세요…  ( "/" 눌러 표·이미지·목록 삽입 · 텍스트 드래그로 문서 연결 )'}
            className="min-h-[46vh] px-0"
          />
        </EditorContainer>
      </Plate>

      {/* 드래그 → 문서 연결 버블 */}
      {bubble && (
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); onLinkRequest(bubble.text); setBubble(null); }}
          className="absolute z-30 flex -translate-x-1/2 -translate-y-full items-center gap-1.5 rounded-full bg-[#23262b] px-3 py-1.5 text-[12px] font-bold text-white shadow-[0_8px_20px_-6px_rgba(0,0,0,0.4)] transition-transform hover:scale-105"
          style={{ left: bubble.x, top: bubble.y - 8 }}
        >
          <Link2 className="h-3 w-3" /> 문서로 연결
        </button>
      )}
    </div>
  );
}
