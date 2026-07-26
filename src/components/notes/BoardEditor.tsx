/**
 * 보드 탭 — tldraw 무한 캔버스. 노트 안에 내장된 탭.
 * 콘텐츠는 tldraw 가 persistenceKey(=탭 id)로 로컬(IndexedDB) 자체 저장.
 *
 * 글 기능은 우리가 만들지 않고 이미 있는 것을 꽂았다. tldraw 5 의 글 편집기는
 * TipTap 이고 `textOptions.tipTapConfig` 로 확장을 더할 수 있다. 마침 이 저장소엔
 * 올인원 노트(Plate)가 쓰는 TipTap 확장이 전부 깔려 있어 새로 받을 것도 없었다.
 *
 * 더한 것 — 표 · 체크리스트 · 밑줄 · 형광펜 · 위아래첨자 · 정렬.
 * 표는 붙여넣기가 바로 먹는다: 엑셀·구글시트·웹페이지의 표를 복사해 캔버스에
 * 붙이면 ProseMirror 가 HTML 표를 그대로 읽어 표로 앉는다.
 */
import { useCallback, useMemo } from 'react';
import {
  Tldraw,
  DefaultToolbar,
  DefaultToolbarContent,
  TldrawUiMenuItem,
  DefaultRichTextToolbar,
  DefaultRichTextToolbarContent,
  tipTapDefaultExtensions,
  createShapeId,
  useEditor,
  useValue,
  type TLUiOverrides,
  type TLComponents,
  type Editor as TldrawEditor,
} from 'tldraw';
import { TableKit } from '@tiptap/extension-table';
import { TaskList } from '@tiptap/extension-task-list';
import { TaskItem } from '@tiptap/extension-task-item';
import { Underline } from '@tiptap/extension-underline';
import { Subscript } from '@tiptap/extension-subscript';
import { Superscript } from '@tiptap/extension-superscript';
import { TextAlign } from '@tiptap/extension-text-align';
import 'tldraw/tldraw.css';
import './board-editor.css';

const textOptions = {
  tipTapConfig: {
    extensions: [
      ...tipTapDefaultExtensions,
      /* 표 — 열 너비를 끌어서 조절할 수 있게. 셀 사이 이동은 Tab / Shift+Tab. */
      TableKit.configure({ table: { resizable: true } }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Underline,
      Subscript,
      Superscript,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
  },
};

/** 지금 글을 고치고 있는 중이면 그 TipTap 편집기. 아니면 null. */
function useTextEditor() {
  const editor = useEditor();
  return useValue('board text editor', () => editor.getRichTextEditor(), [editor]);
}

/**
 * 표를 넣는다. 글을 고치는 중이면 그 자리에, 아니면 화면 한가운데 글상자를
 * 하나 세우고 그 안에 넣는다 — '표를 넣으려면 먼저 글상자를 만드세요' 라고
 * 시키지 않으려고.
 */
function insertTable(editor: TldrawEditor) {
  const put = () => {
    const text = editor.getRichTextEditor();
    if (!text) return;
    text.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };
  if (editor.getRichTextEditor()) { put(); return; }

  const { x, y } = editor.getViewportPageBounds().center;
  const id = createShapeId();
  editor.createShape({ id, type: 'text', x: x - 160, y: y - 60, props: { w: 320, autoSize: false } });
  editor.select(id);
  editor.setEditingShape(id);
  /* 편집 진입 직후엔 TipTap 인스턴스가 아직 없다 — 다음 프레임에 넣는다 */
  requestAnimationFrame(put);
}

const overrides: TLUiOverrides = {
  actions(editor, actions) {
    actions['insert-table'] = {
      id: 'insert-table',
      label: '표 넣기' as never,
      kbd: 'alt+t',
      onSelect() { insertTable(editor); },
    };
    return actions;
  },
};

function BoardToolbar() {
  const editor = useEditor();
  const onSelect = useCallback(() => insertTable(editor), [editor]);
  return (
    <DefaultToolbar>
      <DefaultToolbarContent />
      <TldrawUiMenuItem
        id="insert-table"
        label={'표 넣기' as never}
        icon="menu"
        kbd="alt+t"
        onSelect={onSelect}
      />
    </DefaultToolbar>
  );
}

/** 글 선택 중 뜨는 도구줄 — 기본 항목 + 표 편집(행·열 넣기/빼기). */
function BoardRichTextToolbar() {
  const text = useTextEditor();
  const inTable = !!text?.isActive('table');
  return (
    <DefaultRichTextToolbar>
      {text && <DefaultRichTextToolbarContent textEditor={text} />}
      {text && inTable && (
        <>
          <button type="button" className="tlui-button tlui-button__icon" title="행 추가"
            onClick={() => text.chain().focus().addRowAfter().run()}>＋행</button>
          <button type="button" className="tlui-button tlui-button__icon" title="열 추가"
            onClick={() => text.chain().focus().addColumnAfter().run()}>＋열</button>
          <button type="button" className="tlui-button tlui-button__icon" title="행 삭제"
            onClick={() => text.chain().focus().deleteRow().run()}>−행</button>
          <button type="button" className="tlui-button tlui-button__icon" title="열 삭제"
            onClick={() => text.chain().focus().deleteColumn().run()}>−열</button>
          <button type="button" className="tlui-button tlui-button__icon" title="표 삭제"
            onClick={() => text.chain().focus().deleteTable().run()}>표 삭제</button>
        </>
      )}
    </DefaultRichTextToolbar>
  );
}

const components: TLComponents = {
  Toolbar: BoardToolbar,
  RichTextToolbar: BoardRichTextToolbar,
};

export function BoardEditor({ boardId }: { boardId: string }) {
  const opts = useMemo(() => textOptions, []);
  return (
    <div className="h-full w-full">
      <Tldraw
        persistenceKey={`note-board-${boardId}`}
        textOptions={opts}
        overrides={overrides}
        components={components}
      />
    </div>
  );
}
