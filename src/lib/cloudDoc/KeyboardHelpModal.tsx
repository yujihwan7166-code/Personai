/** 문서 에디터 단축키 도움말 모달 (Ctrl+? 으로 열림). */

import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { HelpSection, HelpRow } from '@/lib/cloudCommon/HelpRow';

export function KeyboardHelpModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogTitle className="text-base">키보드 단축키</DialogTitle>
        <DialogDescription className="text-xs text-muted-foreground">
          문서 에디터에서 쓸 수 있는 단축키.
        </DialogDescription>

        <div className="space-y-4 text-sm">
          <HelpSection title="서식">
            <HelpRow keys={['Ctrl', 'B']} label="굵게" />
            <HelpRow keys={['Ctrl', 'I']} label="기울임" />
            <HelpRow keys={['Ctrl', 'U']} label="밑줄" />
            <HelpRow keys={['Ctrl', 'Shift', 'X']} label="취소선" />
            <HelpRow keys={['Ctrl', 'E']} label="인라인 코드" />
            <HelpRow keys={['🖌']} label="서식 복사 — 선택 후 도구바 🖌 → 다음 선택에 적용" />
          </HelpSection>

          <HelpSection title="구조 (마크다운 입력 가능)">
            <HelpRow keys={['#', 'space']} label="제목 1" />
            <HelpRow keys={['##', 'space']} label="제목 2" />
            <HelpRow keys={['###', 'space']} label="제목 3" />
            <HelpRow keys={['-', 'space']} label="글머리 기호" />
            <HelpRow keys={['1.', 'space']} label="번호 매기기" />
            <HelpRow keys={['>', 'space']} label="인용" />
            <HelpRow keys={['```']} label="코드 블록" />
            <HelpRow keys={['---']} label="구분선" />
          </HelpSection>

          <HelpSection title="정렬">
            <HelpRow keys={['Ctrl', 'Shift', 'L']} label="왼쪽" />
            <HelpRow keys={['Ctrl', 'Shift', 'E']} label="가운데" />
            <HelpRow keys={['Ctrl', 'Shift', 'R']} label="오른쪽" />
            <HelpRow keys={['Ctrl', 'Shift', 'J']} label="양쪽 (justify)" />
          </HelpSection>

          <HelpSection title="동작">
            <HelpRow keys={['Ctrl', 'Z']} label="실행 취소" />
            <HelpRow keys={['Ctrl', 'Shift', 'Z']} label="다시 실행" />
            <HelpRow keys={['?']} label="이 도움말" />
            <HelpRow keys={['Esc']} label="닫기 / 도움말 닫기" />
          </HelpSection>

          <HelpSection title="색·링크">
            <HelpRow keys={['글자색']} label="도구바 색 picker 클릭 → 색 선택. 더블클릭으로 해제." />
            <HelpRow keys={['형광펜']} label="도구바 형광펜 → 색 선택. 더블클릭으로 해제." />
            <HelpRow keys={['🔗']} label="도구바 링크 → URL 입력. 빈 값 입력 시 제거." />
          </HelpSection>

          <HelpSection title="표·이미지">
            <HelpRow keys={['표']} label="도구바 표 버튼 → 3×3 삽입. 표 안에선 +행/+열/−행/−열/표✕ 노출." />
            <HelpRow keys={['이미지']} label="도구바 이미지+ → 파일 선택 → base64 인라인 (2MB 이하 권장)." />
          </HelpSection>

          <HelpSection title="슬래시 커맨드 ✨">
            <HelpRow keys={['/']} label="빈 줄에서 / 입력 → 메뉴 (헤딩·목록·표·AI 등)" />
            <HelpRow keys={['/제목']} label="/ 뒤에 단어 입력으로 필터" />
            <HelpRow keys={['클릭']} label="메뉴 항목 클릭 → 적용 (현재 줄의 / 자동 제거)" />
          </HelpSection>

          <HelpSection title="글꼴·첨자·들여쓰기">
            <HelpRow keys={['크기']} label="도구바 select → 10~48px" />
            <HelpRow keys={['종류']} label="도구바 select → 기본/Sans/Serif/Mono/돋움/바탕" />
            <HelpRow keys={['Ctrl', '.']} label="위 첨자 (x²)" />
            <HelpRow keys={['Ctrl', ',']} label="아래 첨자 (x₂)" />
            <HelpRow keys={['Tab']} label="리스트 들여쓰기" />
            <HelpRow keys={['Shift', 'Tab']} label="리스트 내어쓰기" />
          </HelpSection>

          <HelpSection title="페이지·문서">
            <HelpRow keys={['스타일']} label="도구바 좌측 드롭다운 → 일반/제목 1~3/인용/코드 블록" />
            <HelpRow keys={['줌']} label="도구바 줌 select → 50~200%" />
            <HelpRow keys={['머리글']} label="첫 페이지 카드 상단 input — 모든 페이지에 자동 반복" />
            <HelpRow keys={['바닥글']} label="마지막 페이지 카드 하단 input — 모든 페이지 자동 반복" />
            <HelpRow keys={['페이지 ▭']} label="본문이 1056px 넘으면 자동으로 다음 카드 시작" />
            <HelpRow keys={['마진']} label="cm 눈금자 좌우 ▾ 핸들 드래그로 본문 마진 조절" />
            <HelpRow keys={['각주 ✱']} label="도구바 ✱ → 위첨자 [N] + 문서 끝 모음. 클릭으로 편집" />
          </HelpSection>
        </div>

        <div className="pt-3 text-xs text-muted-foreground border-t border-border">
          Mac: Ctrl → ⌘
        </div>
      </DialogContent>
    </Dialog>
  );
}

// HelpSection / HelpRow 는 lib/cloudCommon/HelpRow 공용
