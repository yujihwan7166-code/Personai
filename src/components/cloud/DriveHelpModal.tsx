/** 클라우드 드라이브 단축키 도움말 모달 (? 으로 열림). */

import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { HelpSection, HelpRow } from '@/lib/cloudCommon/HelpRow';

export function DriveHelpModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogTitle className="text-base">드라이브 단축키</DialogTitle>
        <DialogDescription className="text-xs text-muted-foreground">
          클라우드 드라이브에서 쓸 수 있는 단축키.
        </DialogDescription>

        <div className="space-y-4 text-sm">
          <HelpSection title="검색·이동">
            <HelpRow keys={['Ctrl', 'K']} label="파일·폴더 검색 모달 열기" />
            <HelpRow keys={['브레드크럼 클릭']} label="상위 폴더로 이동" />
            <HelpRow keys={['더블클릭']} label="폴더 진입 / 파일 열기" />
            <HelpRow keys={['Enter']} label="선택 파일 열기 (편집기 진입)" />
            <HelpRow keys={['Ctrl', '더블클릭']} label="새 탭에서 열기 (Cmd/Shift 도 동일)" />
          </HelpSection>

          <HelpSection title="선택">
            <HelpRow keys={['클릭']} label="단일 선택" />
            <HelpRow keys={['Shift', '클릭']} label="범위 선택" />
            <HelpRow keys={['Ctrl', '클릭']} label="개별 추가/제거" />
            <HelpRow keys={['Ctrl', 'A']} label="현재 화면의 모든 항목 선택" />
            <HelpRow keys={['Esc']} label="선택 해제" />
          </HelpSection>

          <HelpSection title="파일 동작">
            <HelpRow keys={['F2']} label="이름 변경" />
            <HelpRow keys={['Delete']} label="휴지통으로 이동 (휴지통에선 영구 삭제)" />
            <HelpRow keys={['우클릭']} label="컨텍스트 메뉴 — 별표·복사본·이동·삭제·색상" />
            <HelpRow keys={['드래그']} label="폴더로 끌어 이동" />
          </HelpSection>

          <HelpSection title="파일 가져오기">
            <HelpRow keys={['파일 드래그']} label="본문 영역에 놓으면 자동 변환 + 업로드" />
            <HelpRow keys={['업로드 버튼']} label="여러 파일 선택 가능" />
            <HelpRow keys={['지원 형식']} label=".docx · .xlsx · .pptx · .md · .txt · .html · .csv" />
          </HelpSection>

          <HelpSection title="보기 모드">
            <HelpRow keys={['리스트 / 그리드']} label="우상단 토글 — 한 줄/카드형" />
            <HelpRow keys={['정렬']} label="기준 select + 방향 ↑↓" />
            <HelpRow keys={['사이드바']} label="내 파일 / 최근 / 별표 / 휴지통 전환" />
          </HelpSection>

          <HelpSection title="기타">
            <HelpRow keys={['?']} label="이 도움말" />
            <HelpRow keys={['Esc']} label="모달 닫기" />
          </HelpSection>
        </div>
      </DialogContent>
    </Dialog>
  );
}
