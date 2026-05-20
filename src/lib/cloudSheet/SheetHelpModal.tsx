/** 시트 에디터 단축키 + 수식 함수 도움말 모달 (? 으로 열림). */

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { HelpRow } from '@/lib/cloudCommon/HelpRow';
import { FUNC_HELP } from '@/lib/cloudSheet/formula';
import { toast } from '@/hooks/use-toast';

/** 도움말 모달 함수 카테고리 — FUNC_HELP keys 를 카테고리별 그룹. */
const FUNC_CATEGORIES: Array<{ name: string; funcs: string[] }> = [
  { name: '집계', funcs: ['SUM', 'AVG', 'AVERAGE', 'MIN', 'MAX', 'COUNT', 'COUNTA', 'COUNTBLANK', 'MEDIAN'] },
  { name: '논리/분기', funcs: ['IF', 'IFS', 'SWITCH', 'AND', 'OR', 'NOT'] },
  { name: '에러/타입', funcs: ['IFERROR', 'IFNA', 'ISNUMBER', 'ISBLANK', 'ISTEXT', 'ISERROR', 'ISNA'] },
  { name: '검색', funcs: ['VLOOKUP', 'HLOOKUP', 'XLOOKUP', 'INDEX', 'MATCH'] },
  { name: '조건 집계', funcs: ['SUMIF', 'COUNTIF', 'SUMIFS', 'COUNTIFS'] },
  { name: '수치', funcs: ['ABS', 'ROUND', 'ROUNDUP', 'ROUNDDOWN', 'CEILING', 'FLOOR', 'POWER', 'SQRT', 'MOD', 'INT'] },
  { name: '통계', funcs: ['STDEV', 'VAR', 'RANK'] },
  { name: '문자열', funcs: ['LEFT', 'RIGHT', 'MID', 'LEN', 'UPPER', 'LOWER', 'TRIM', 'CONCAT', 'CONCATENATE', 'TEXTJOIN', 'SUBSTITUTE', 'REPLACE', 'FIND', 'SEARCH', 'HYPERLINK', 'TEXT'] },
  { name: '날짜', funcs: ['TODAY', 'NOW', 'YEAR', 'MONTH', 'DAY', 'WEEKDAY', 'DATE', 'EOMONTH', 'EDATE', 'DATEDIF', 'NETWORKDAYS'] },
  { name: '특수', funcs: ['IMAGE', 'REGEXMATCH', 'REGEXEXTRACT', 'REGEXREPLACE'] },
];

export function SheetHelpModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [funcQuery, setFuncQuery] = useState('');
  useEffect(() => { if (!open) setFuncQuery(''); }, [open]);
  const q = funcQuery.trim().toLowerCase();
  const matchedFuncs = (names: string[]): string[] => {
    if (!q) return names;
    return names.filter((name) => {
      if (name.toLowerCase().includes(q)) return true;
      const h = FUNC_HELP[name];
      return !!h && (h.sig.toLowerCase().includes(q) || h.desc.toLowerCase().includes(q));
    });
  };
  const totalMatched = q
    ? FUNC_CATEGORIES.reduce((acc, c) => acc + matchedFuncs(c.funcs).length, 0)
    : Object.keys(FUNC_HELP).length;
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogTitle className="text-base">시트 도움말</DialogTitle>
        <DialogDescription className="text-xs text-muted-foreground">
          단축키 + 지원 수식 함수 ({Object.keys(FUNC_HELP).length}개).
        </DialogDescription>

        <div className="space-y-4 text-sm">
          <section>
            <h3 className="text-xs font-medium text-muted-foreground mb-1.5">이동</h3>
            <div className="space-y-1">
              <HelpRow keys={['↑', '↓', '←', '→']} label="셀 이동" />
              <HelpRow keys={['Tab']} label="오른쪽 셀 (Shift+Tab = 왼쪽)" />
              <HelpRow keys={['Home']} label="현재 행 첫 셀 (A 열)" />
              <HelpRow keys={['End']} label="현재 행 마지막 데이터 셀" />
              <HelpRow keys={['Ctrl', 'Home']} label="A1 으로 이동" />
              <HelpRow keys={['Ctrl', 'End']} label="콘텐츠 끝 셀 (최우하단)" />
              <HelpRow keys={['Ctrl', 'PageDown']} label="다음 시트 (탭)" />
              <HelpRow keys={['Ctrl', 'PageUp']} label="이전 시트 (탭)" />
              <HelpRow keys={['Ctrl', '↑↓←→']} label="데이터 영역 가장자리로 점프 (Shift = 확장)" />
            </div>
          </section>

          <section>
            <h3 className="text-xs font-medium text-muted-foreground mb-1.5">편집</h3>
            <div className="space-y-1">
              <HelpRow keys={['Enter']} label="편집 진입 / 편집 후 아래 셀" />
              <HelpRow keys={['F2']} label="편집 진입 (현재 값 유지)" />
              <HelpRow keys={['a-z 0-9']} label="편집 진입 + 그 글자로 초기화" />
              <HelpRow keys={['Tab']} label="편집 후 오른쪽 셀" />
              <HelpRow keys={['Esc']} label="편집 취소" />
              <HelpRow keys={['Delete', 'Backspace']} label="셀 내용 지우기" />
            </div>
          </section>

          <section>
            <h3 className="text-xs font-medium text-muted-foreground mb-1.5">되돌리기·다시·저장</h3>
            <div className="space-y-1">
              <HelpRow keys={['Ctrl', 'Z']} label="되돌리기 (Undo)" />
              <HelpRow keys={['Ctrl', 'Y']} label="다시 실행 (Redo)" />
              <HelpRow keys={['Ctrl', 'Shift', 'Z']} label="다시 실행 (대체)" />
              <HelpRow keys={['Ctrl', 'S']} label="즉시 저장 — 자동저장 디바운스 무시" />
            </div>
          </section>

          <section>
            <h3 className="text-xs font-medium text-muted-foreground mb-1.5">검색·치환</h3>
            <div className="space-y-1">
              <HelpRow keys={['Ctrl', 'F']} label="찾기" />
              <HelpRow keys={['Ctrl', 'H']} label="찾아 바꾸기" />
              <HelpRow keys={['Enter']} label="다음 결과" />
              <HelpRow keys={['Shift', 'Enter']} label="이전 결과" />
            </div>
          </section>

          <section>
            <h3 className="text-xs font-medium text-muted-foreground mb-1.5">복사·붙여넣기 (엑셀 호환)</h3>
            <div className="space-y-1">
              <HelpRow keys={['Ctrl', 'C']} label="선택 범위 복사 (TSV)" />
              <HelpRow keys={['Ctrl', 'X']} label="잘라내기" />
              <HelpRow keys={['Ctrl', 'V']} label="붙여넣기 (시작 셀부터)" />
            </div>
          </section>

          <section>
            <h3 className="text-xs font-medium text-muted-foreground mb-1.5">선택·이동</h3>
            <div className="space-y-1">
              <HelpRow keys={['Shift', '↑↓←→']} label="범위 확장" />
              <HelpRow keys={['Shift', '마우스']} label="범위 확장 / 드래그 선택" />
              <HelpRow keys={['Ctrl', 'Space']} label="현재 열 전체 선택" />
              <HelpRow keys={['Shift', 'Space']} label="현재 행 전체 선택" />
              <HelpRow keys={['우클릭']} label="셀 메뉴 — 빠른 색·서식·텍스트 변환·정렬 등" />
            </div>
          </section>

          <section>
            <h3 className="text-xs font-medium text-muted-foreground mb-1.5">서식 (선택 셀/범위에 적용)</h3>
            <div className="space-y-1">
              <HelpRow keys={['Ctrl', 'B']} label="굵게" />
              <HelpRow keys={['Ctrl', 'I']} label="기울임" />
              <HelpRow keys={['Ctrl', 'U']} label="밑줄" />
              <HelpRow keys={['Ctrl', 'Alt', '1']} label="통화 (₩)" />
              <HelpRow keys={['Ctrl', 'Alt', '2']} label="소수 1자리" />
              <HelpRow keys={['Ctrl', 'Alt', '3']} label="날짜" />
              <HelpRow keys={['Ctrl', 'Alt', '4']} label="정수 (천단위 콤마)" />
              <HelpRow keys={['Ctrl', 'Alt', '5']} label="퍼센트 (%)" />
              <HelpRow keys={['Ctrl', '\\']} label="서식 지우기" />
              <HelpRow keys={['Ctrl', '`']} label="수식 보기 토글 — 평가값 대신 수식 그대로" />
            </div>
          </section>

          <section>
            <h3 className="text-xs font-medium text-muted-foreground mb-1.5">날짜·시각 입력</h3>
            <div className="space-y-1">
              <HelpRow keys={['Ctrl', ';']} label="오늘 날짜 (YYYY-MM-DD)" />
              <HelpRow keys={['Ctrl', 'Shift', ';']} label="현재 시각 (HH:MM:SS)" />
            </div>
          </section>

          <section>
            <h3 className="text-xs font-medium text-muted-foreground mb-1.5">행·열 / 코너</h3>
            <div className="space-y-1">
              <HelpRow keys={['헤더 드래그']} label="행/열 크기 조정 — 드래그 중 픽셀 툴팁" />
              <HelpRow keys={['헤더 더블클릭']} label="기본 크기로 리셋" />
              <HelpRow keys={['코너 더블클릭']} label="모든 열 폭 자동 맞춤" />
              <HelpRow keys={['채우기 핸들']} label="범위 우하단 ▢ 드래그 — 시리즈/패턴 자동 채우기" />
            </div>
          </section>

          <section>
            <h3 className="text-xs font-medium text-muted-foreground mb-1.5">기타</h3>
            <div className="space-y-1">
              <HelpRow keys={['?']} label="이 도움말" />
            </div>
          </section>
        </div>

        <div className="pt-3 text-xs border-t border-border space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="font-medium text-foreground">
              수식 ({q ? `${totalMatched} / ${Object.keys(FUNC_HELP).length}` : `${Object.keys(FUNC_HELP).length}개`})
            </div>
            <input
              type="search"
              value={funcQuery}
              onChange={(e) => setFuncQuery(e.target.value)}
              placeholder="함수 검색…  (예: SUM, 날짜, 정규)"
              className="text-xs px-2 py-1 rounded border border-border bg-background outline-none focus:border-foreground/40 w-56"
              aria-label="함수 검색"
            />
          </div>
          {!q && (
            <div className="text-muted-foreground/80 space-y-0.5">
              <div>=A1+B1*2 · =(A1+B1)/2 · =A1^2 · =Sheet2!A1 · =SUM(Data!B1:B10)</div>
              <div>=$A$1 / =A$1 / =$A1 — 절대 참조 · =SUM(월매출) — 명명된 범위</div>
              <div className="text-muted-foreground/60">에러: #CIRCULAR / #ERROR / #DIV/0! / #VALUE! / #REF! / #N/A / #NUM!</div>
            </div>
          )}
          {q && totalMatched === 0 && (
            <div className="text-muted-foreground italic py-4 text-center">
              일치하는 함수 없음 — 함수 이름·시그니처·설명에서 검색됩니다.
            </div>
          )}
          {FUNC_CATEGORIES.map((cat) => {
            const filtered = matchedFuncs(cat.funcs);
            if (filtered.length === 0) return null;
            return (
              <section key={cat.name}>
                <h4 className="text-xs font-medium text-foreground mb-1">
                  {cat.name} {q && <span className="text-muted-foreground font-normal">({filtered.length})</span>}
                </h4>
                <ul className="space-y-0.5">
                  {filtered.map((name) => {
                    const h = FUNC_HELP[name];
                    if (!h) return null;
                    return (
                      <li key={name}>
                        <button
                          type="button"
                          onClick={async () => {
                            const ins = `=${name}(`;
                            try {
                              await navigator.clipboard.writeText(ins);
                              toast({ title: '복사됨', description: `${ins} — 셀에 붙여넣기` });
                            } catch { /* noop */ }
                          }}
                          className="w-full text-left flex items-baseline gap-2 text-muted-foreground hover:bg-muted/50 rounded px-1 -mx-1"
                          title={`클릭으로 ${name}( 클립보드 복사`}
                        >
                          <code className="font-mono text-foreground/90 shrink-0">={h.sig}</code>
                          <span className="text-muted-foreground/80 truncate">{h.desc}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
