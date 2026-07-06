/**
 * 보드 탭 — tldraw 무한 캔버스. 노트 안에 내장된 탭.
 * 콘텐츠는 tldraw 가 persistenceKey(=탭 id)로 로컬(IndexedDB) 자체 저장.
 */
import { Tldraw } from 'tldraw';
import 'tldraw/tldraw.css';

export function BoardEditor({ boardId }: { boardId: string }) {
  return (
    <div className="h-full w-full">
      <Tldraw persistenceKey={`note-board-${boardId}`} />
    </div>
  );
}
