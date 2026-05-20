/** 슬라이드 에디터 단축키 도움말 모달 (? 으로 열림). */

import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { HelpRow } from '@/lib/cloudCommon/HelpRow';

export function SlideHelpModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
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
              <HelpRow keys={['Home']} label="첫 슬라이드로" />
              <HelpRow keys={['End']} label="마지막 슬라이드로" />
              <HelpRow keys={['F5']} label="발표 모드 시작" />
              <HelpRow keys={['썸네일 우클릭']} label="복제 · 이동 · 삭제 · 새 슬라이드" />
            </div>
          </section>

          <section>
            <h3 className="text-xs font-medium text-muted-foreground mb-1.5">발표 모드</h3>
            <div className="space-y-1">
              <HelpRow keys={['→', 'Space', 'Enter']} label="다음 슬라이드" />
              <HelpRow keys={['←', 'Backspace']} label="이전 슬라이드" />
              <HelpRow keys={['Home', 'End']} label="처음 / 끝 슬라이드" />
              <HelpRow keys={['B']} label="화면 검정 가림 (토글) — 시선 유도" />
              <HelpRow keys={['W']} label="화면 흰 가림 (토글)" />
              <HelpRow keys={['Esc']} label="발표 종료" />
              <HelpRow keys={['클릭']} label="화면 좌·우 영역 클릭으로도 이동" />
            </div>
          </section>

          <section>
            <h3 className="text-xs font-medium text-muted-foreground mb-1.5">요소</h3>
            <div className="space-y-1">
              <HelpRow keys={['더블클릭']} label="빈 캔버스: 텍스트 추가 / 요소: 편집" />
              <HelpRow keys={['드래그']} label="요소 이동 (Shift = 스냅 끄기)" />
              <HelpRow keys={['↑↓←→']} label="선택 요소 미세 이동 (1%)" />
              <HelpRow keys={['Shift', '↑↓←→']} label="선택 요소 큰 이동 (5%)" />
              <HelpRow keys={['Ctrl', 'A']} label="현재 슬라이드 모든 요소 선택" />
              <HelpRow keys={['Ctrl', 'D']} label="선택 요소 복제" />
              <HelpRow keys={['Delete', 'Backspace']} label="선택 요소 삭제" />
              <HelpRow keys={['우클릭']} label="요소 메뉴 — 복제·삭제·앞뒤로·그룹" />
              <HelpRow keys={['Esc']} label="선택 해제 / 편집 종료" />
            </div>
          </section>

          <section>
            <h3 className="text-xs font-medium text-muted-foreground mb-1.5">그룹 / 정렬</h3>
            <div className="space-y-1">
              <HelpRow keys={['Ctrl', 'G']} label="선택 요소 그룹화 (2개 이상)" />
              <HelpRow keys={['Ctrl', 'Shift', 'G']} label="그룹 해제" />
              <HelpRow keys={['Shift', '클릭']} label="다중 선택 추가/제거" />
            </div>
          </section>

          <section>
            <h3 className="text-xs font-medium text-muted-foreground mb-1.5">편집 일반</h3>
            <div className="space-y-1">
              <HelpRow keys={['Ctrl', 'Z']} label="되돌리기" />
              <HelpRow keys={['Ctrl', 'Y']} label="다시 실행 (Ctrl+Shift+Z 도)" />
              <HelpRow keys={['Ctrl', 'C']} label="요소 복사" />
              <HelpRow keys={['Ctrl', 'V']} label="요소 붙여넣기" />
              <HelpRow keys={['Ctrl', 'S']} label="즉시 저장 — 자동저장 디바운스 무시" />
            </div>
          </section>

          <section>
            <h3 className="text-xs font-medium text-muted-foreground mb-1.5">보기 / 기타</h3>
            <div className="space-y-1">
              <HelpRow keys={['# 격자']} label="격자 표시 토글 (10% 간격) — 도구바 우측" />
              <HelpRow keys={['줌 select']} label="50~200% 캔버스 줌 — 도구바 우측" />
              <HelpRow keys={['Ctrl', '휠']} label="캔버스 위에서 스크롤로 줌 단계 조절" />
              <HelpRow keys={['?']} label="이 도움말" />
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// HelpRow 는 lib/cloudCommon/HelpRow 공용
