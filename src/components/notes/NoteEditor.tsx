/**
 * 노트 글 편집기 — Plate 기반 (재설계 1단계).
 *
 * 지금은 코어 세트(마크·헤딩·인용·구분선)로 "동작하는 기반"을 확보.
 * 슬래시 메뉴·표·수식·목록/코드블록은 다음 스텝에서 검증된 방식으로 얹는다.
 * 스타일은 전부 우리 디자인 토큰(.note-prose, index.css) — 앱과 한 몸.
 */
import { Plate, PlateContent, usePlateEditor } from 'platejs/react';
import type { Value } from 'platejs';
import { BasicBlocksPlugin, BasicMarksPlugin } from '@platejs/basic-nodes/react';
import { cn } from '@/lib/utils';

interface Props {
  /** 초기 글 본문. 노트 전환 시 상위에서 key 로 리마운트한다. */
  initialValue: Value;
  onChange: (value: Value) => void;
  placeholder?: string;
  className?: string;
}

export function NoteEditor({ initialValue, onChange, placeholder, className }: Props) {
  const editor = usePlateEditor({
    plugins: [BasicBlocksPlugin, BasicMarksPlugin],
    value: initialValue,
  });

  return (
    <Plate editor={editor} onChange={({ value }) => onChange(value as Value)}>
      <PlateContent
        placeholder={placeholder ?? '무엇이든 적어보세요…  ( "# " 제목 · "> " 인용 · **굵게** )'}
        className={cn(
          'note-prose w-full max-w-none outline-none focus:outline-none',
          className,
        )}
      />
    </Plate>
  );
}
