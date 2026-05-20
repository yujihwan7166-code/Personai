/** 문서 에디터 단축키 도움말 모달 (Ctrl+? 으로 열림). */

import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { HelpSection, HelpRow } from '@/lib/cloudCommon/HelpRow';

export function KeyboardHelpModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
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
            <HelpRow keys={['Ctrl', 'S']} label="즉시 저장 — 자동저장 디바운스 무시" />
            <HelpRow keys={['?']} label="이 도움말" />
            <HelpRow keys={['Esc']} label="닫기 / 도움말 닫기" />
          </HelpSection>

          <HelpSection title="찾기·바꾸기">
            <HelpRow keys={['Ctrl', 'F']} label="찾기 패널 열기" />
            <HelpRow keys={['Ctrl', 'H']} label="바꾸기 모드 토글" />
            <HelpRow keys={['Enter']} label="다음 결과 (Shift+Enter = 이전)" />
            <HelpRow keys={['Aa']} label="대/소문자 구분 토글" />
            <HelpRow keys={['W']} label="전체 단어 일치 토글" />
            <HelpRow keys={['Esc']} label="패널 닫기" />
          </HelpSection>

          <HelpSection title="AI ✨ (인라인)">
            <HelpRow keys={['빈 줄', 'Space']} label="AI 메뉴 — 14개 빠른 액션 + 자유 입력" />
            <HelpRow keys={['선택', '✨']} label="텍스트 선택 시 떠오르는 bubble — 재작성·요약·번역" />
            <HelpRow keys={['헤더', '✨']} label="언제든 헤더 ✨ 버튼으로 메뉴 열기" />
            <HelpRow keys={['↑', '↓', 'Enter']} label="메뉴 내 항목 이동·선택" />
            <HelpRow keys={['Accept', 'Reject']} label="결과 카드에서 본문 적용 / 버림 / 재시도" />
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
            <HelpRow keys={['Ctrl', '휠']} label="본문 위에서 스크롤로 줌 단계 조절" />
            <HelpRow keys={['머리글']} label="첫 페이지 카드 상단 input — 모든 페이지에 자동 반복" />
            <HelpRow keys={['바닥글']} label="마지막 페이지 카드 하단 input — 모든 페이지 자동 반복" />
            <HelpRow keys={['페이지 ▭']} label="본문이 1056px 넘으면 자동으로 다음 카드 시작" />
            <HelpRow keys={['마진']} label="cm 눈금자 좌우 ▾ 핸들 드래그로 본문 마진 조절" />
            <HelpRow keys={['각주 ✱']} label="도구바 ✱ → 위첨자 [N] + 문서 끝 모음. 클릭으로 편집" />
          </HelpSection>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// HelpSection / HelpRow 는 lib/cloudCommon/HelpRow 공용
