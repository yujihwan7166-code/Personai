/**
 * 마이위키 읽기 뷰 본문 — 편집기와 같은 Plate 엔진을 읽기 전용으로.
 * 같은 엔진이라 표·수식·콜아웃 등 모든 블록이 편집 때와 똑같이 보인다.
 * wiki:// 링크 클릭 → 그 문서로 이동. 목차 스크롤을 위해 컨테이너 ref 를 밖에 내준다.
 */
import 'katex/dist/katex.min.css';
import type { RefObject } from 'react';
import { Plate, usePlateEditor } from 'platejs/react';
import type { Value } from 'platejs';
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

interface Props {
  value: Value;
  onOpenDoc: (docId: string) => void;
  containerRef?: RefObject<HTMLDivElement>;
}

export function WikiDocReader({ value, onOpenDoc, containerRef }: Props) {
  const editor = usePlateEditor({
    plugins: [
      ...IndentKit, ...BasicNodesKit, ...ListKit, ...ToggleKit, ...CodeBlockKit,
      ...TableKit, ...MathKit, ...CalloutKit, ...ColumnKit, ...TocKit,
      ...MediaKit, ...LinkKit, ...EmojiKit,
    ],
    value,
  });

  return (
    <div
      ref={containerRef}
      onClickCapture={(e) => {
        const a = (e.target as HTMLElement).closest?.('a[href^="wiki://"]') as HTMLAnchorElement | null;
        if (a) {
          e.preventDefault();
          e.stopPropagation();
          onOpenDoc(a.getAttribute('href')!.slice(7));
        }
      }}
    >
      <Plate editor={editor} readOnly>
        <EditorContainer>
          <Editor variant="none" className="px-0" readOnly />
        </EditorContainer>
      </Plate>
    </div>
  );
}
