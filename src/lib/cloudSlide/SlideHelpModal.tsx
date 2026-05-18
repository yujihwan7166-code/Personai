/** 슬라이드 에디터 단축키 도움말 모달 (? 으로 열림). */

import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { HelpRow } from '@/lib/cloudCommon/HelpRow';

export function SlideHelpModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogTitle className="text-base">슬라이드 단축키</DialogTitle>
        <DialogDescription className="text-xs text-muted-foreground">
          슬라이드 에디터에서 쓸 수 있는 단축키.
        </DialogDescription>

        <div className="space-y-4 text-sm">
          <section>
            <h3 className="text-xs font-medium text-muted-foreground mb-1.5">슬라이드</h3>
            <div className="space-y-1">
              <HelpRow keys={['Ctrl', 'M']} label="새 슬라이드 추가" />
              <HelpRow keys={['↑', 'PageUp']} label="이전 슬라이드" />
              <HelpRow keys={['↓', 'PageDown']} label="다음 슬라이드" />
              <HelpRow keys={['F5']} label="발표 모드 시작" />
            </div>
          </section>

          <section>
            <h3 className="text-xs font-medium text-muted-foreground mb-1.5">발표 모드</h3>
            <div className="space-y-1">
              <HelpRow keys={['→', 'Space', 'Enter']} label="다음 슬라이드" />
              <HelpRow keys={['←', 'Backspace']} label="이전 슬라이드" />
              <HelpRow keys={['Home', 'End']} label="처음 / 끝 슬라이드" />
              <HelpRow keys={['Esc']} label="발표 종료" />
              <HelpRow keys={['클릭']} label="화면 좌·우 영역 클릭으로도 이동" />
            </div>
          </section>
          <section>
            <h3 className="text-xs font-medium text-muted-foreground mb-1.5">요소</h3>
            <div className="space-y-1">
              <HelpRow keys={['더블클릭']} label="빈 캔버스: 텍스트 추가 / 요소: 편집" />
              <HelpRow keys={['드래그']} label="요소 이동" />
              <HelpRow keys={['Delete', 'Backspace']} label="선택한 요소 삭제" />
              <HelpRow keys={['Esc']} label="선택 해제 / 편집 종료" />
            </div>
          </section>
          <section>
            <h3 className="text-xs font-medium text-muted-foreground mb-1.5">기타</h3>
            <div className="space-y-1">
              <HelpRow keys={['?']} label="이 도움말" />
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// HelpRow 는 lib/cloudCommon/HelpRow 공용
