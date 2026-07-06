/**
 * 노트 글 편집기 — Plate 공식 컴포넌트 이식 기반 (재설계 A).
 *
 * 표·수식·슬래시메뉴·목록·코드블록을 Plate 공식 kit(격리 폴더 @/components/plate)에서
 * 그대로 가져와 조립. 노드 컴포넌트가 hsl(var(--*)) 토큰 기반이라 우리 앱 색을 자동 상속.
 * 슬래시(/)로 요소 삽입 — 노션 손맛.
 */
import 'katex/dist/katex.min.css';
import { Plate, usePlateEditor } from 'platejs/react';
import type { Value } from 'platejs';
import { Editor, EditorContainer } from '@/components/plate/ui/editor';
import { BasicNodesKit } from '@/components/plate/editor/plugins/basic-nodes-kit';
import { IndentKit } from '@/components/plate/editor/plugins/indent-kit';
import { ListKit } from '@/components/plate/editor/plugins/list-kit';
import { CodeBlockKit } from '@/components/plate/editor/plugins/code-block-kit';
import { TableKit } from '@/components/plate/editor/plugins/table-kit';
import { MathKit } from '@/components/plate/editor/plugins/math-kit';
import { SlashKit } from '@/components/plate/editor/plugins/slash-kit';

interface Props {
  /** 초기 글 본문. 노트 전환 시 상위에서 key 로 리마운트한다. */
  initialValue: Value;
  onChange: (value: Value) => void;
  placeholder?: string;
}

export function NoteEditor({ initialValue, onChange, placeholder }: Props) {
  const editor = usePlateEditor({
    plugins: [
      ...IndentKit,
      ...BasicNodesKit,
      ...ListKit,
      ...CodeBlockKit,
      ...TableKit,
      ...MathKit,
      ...SlashKit,
    ],
    value: initialValue,
  });

  return (
    <Plate editor={editor} onChange={({ value }) => onChange(value as Value)}>
      <EditorContainer>
        <Editor
          variant="none"
          placeholder={placeholder ?? '무엇이든 적어보세요…  ( "/" 눌러 표·수식·목록 삽입 )'}
          className="min-h-[60vh] px-0"
        />
      </EditorContainer>
    </Plate>
  );
}
