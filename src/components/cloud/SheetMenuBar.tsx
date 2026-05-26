/**
 * 시트 메뉴 바 — Google Sheets 9개 메뉴 매칭.
 *
 * 발견성을 위해 toolbar 외에 메뉴로도 동일 기능 접근 가능하게 한다.
 * 핸들러는 CloudSheetEditor 에서 prop 주입 — 새 로직 도입 없이 wiring 만.
 */

import {
  Menubar, MenubarMenu, MenubarTrigger, MenubarContent, MenubarItem,
  MenubarSeparator, MenubarShortcut, MenubarSub, MenubarSubTrigger, MenubarSubContent,
} from '@/components/ui/menubar';
import {
  FileUp, FileDown, FileText, Printer, Undo2, Redo2, Search, Replace,
  Plus, Trash2, Image as ImageIcon, BarChart3, Link as LinkIcon, MessageSquare,
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Filter, ArrowUpDown, Table2, Sparkles, Keyboard, BookOpen, CheckSquare,
} from 'lucide-react';

export interface SheetMenuActions {
  // 파일
  importXlsx: () => void;
  exportXlsx: () => void;
  exportPdf: () => void;
  print: () => void;
  // 수정
  undo: () => void;
  redo: () => void;
  find: () => void;
  replace: () => void;
  // 삽입
  insertRowAbove: () => void;
  insertRowBelow: () => void;
  insertColLeft: () => void;
  insertColRight: () => void;
  insertChart: () => void;
  insertLink: () => void;
  insertComment: () => void;
  insertImage: () => void;
  insertCheckbox: () => void;
  // 서식 — toolbar 와 동일 토글
  toggleBold: () => void;
  toggleItalic: () => void;
  toggleUnderline: () => void;
  toggleStrikethrough: () => void;
  clearFormat: () => void;
  // 데이터
  toggleFilter: () => void;
  toggleFilter: () => void;
  createTable: () => void;
  sortSelectionAsc: () => void;
  sortSelectionDesc: () => void;
  // 보기 — 줌
  setZoom: (percent: number) => void;
  // 도구 + AI + 도움말
  toggleAiPanel: () => void;
  openShortcutHelp: () => void;
  openFunctionList: () => void;
}

export interface SheetMenuBarProps extends SheetMenuActions {
  /** 컴팩트 모드 — 좁은 폭에서 일부 메뉴 숨김 (현재 미구현 — v2 대비 prop). */
  compact?: boolean;
}

/**
 * Sheets 와 동일한 9 메뉴: 파일 / 수정 / 보기 / 삽입 / 서식 / 데이터 / 도구 / AI / 도움말
 * (보기 메뉴는 토글류 — 현 시점에 컨트롤이 toolbar 에 분산돼있어 placeholder.)
 */
export function SheetMenuBar(p: SheetMenuBarProps) {
  return (
    <Menubar className="h-9 rounded-none border-0 border-b bg-background px-2 py-0 gap-0">
      {/* 파일 */}
      <MenubarMenu>
        <MenubarTrigger className="text-[13px] px-2 py-1 h-7">파일</MenubarTrigger>
        <MenubarContent className="min-w-[220px]">
          <MenubarItem onSelect={p.importXlsx}>
            <FileUp className="w-4 h-4 mr-2" /> .xlsx 가져오기
          </MenubarItem>
          <MenubarSub>
            <MenubarSubTrigger>
              <FileDown className="w-4 h-4 mr-2" /> 내보내기
            </MenubarSubTrigger>
            <MenubarSubContent>
              <MenubarItem onSelect={p.exportXlsx}>Excel (.xlsx)</MenubarItem>
              <MenubarItem onSelect={p.exportPdf}>PDF</MenubarItem>
            </MenubarSubContent>
          </MenubarSub>
          <MenubarSeparator />
          <MenubarItem onSelect={p.print}>
            <Printer className="w-4 h-4 mr-2" /> 인쇄
            <MenubarShortcut>⌘P</MenubarShortcut>
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>

      {/* 수정 */}
      <MenubarMenu>
        <MenubarTrigger className="text-[13px] px-2 py-1 h-7">수정</MenubarTrigger>
        <MenubarContent className="min-w-[200px]">
          <MenubarItem onSelect={p.undo}>
            <Undo2 className="w-4 h-4 mr-2" /> 실행 취소
            <MenubarShortcut>⌘Z</MenubarShortcut>
          </MenubarItem>
          <MenubarItem onSelect={p.redo}>
            <Redo2 className="w-4 h-4 mr-2" /> 다시 실행
            <MenubarShortcut>⌘Y</MenubarShortcut>
          </MenubarItem>
          <MenubarSeparator />
          <MenubarItem onSelect={p.find}>
            <Search className="w-4 h-4 mr-2" /> 찾기
            <MenubarShortcut>⌘F</MenubarShortcut>
          </MenubarItem>
          <MenubarItem onSelect={p.replace}>
            <Replace className="w-4 h-4 mr-2" /> 찾기 및 바꾸기
            <MenubarShortcut>⌘H</MenubarShortcut>
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>

      {/* 보기 — 줌 */}
      <MenubarMenu>
        <MenubarTrigger className="text-[13px] px-2 py-1 h-7">보기</MenubarTrigger>
        <MenubarContent className="min-w-[180px]">
          <MenubarSub>
            <MenubarSubTrigger>
              <FileText className="w-4 h-4 mr-2" /> 줌
            </MenubarSubTrigger>
            <MenubarSubContent>
              {[50, 75, 100, 125, 150, 200].map((z) => (
                <MenubarItem key={z} onSelect={() => p.setZoom(z)}>{z}%</MenubarItem>
              ))}
            </MenubarSubContent>
          </MenubarSub>
        </MenubarContent>
      </MenubarMenu>

      {/* 삽입 */}
      <MenubarMenu>
        <MenubarTrigger className="text-[13px] px-2 py-1 h-7">삽입</MenubarTrigger>
        <MenubarContent className="min-w-[200px]">
          <MenubarSub>
            <MenubarSubTrigger>
              <Plus className="w-4 h-4 mr-2" /> 행
            </MenubarSubTrigger>
            <MenubarSubContent>
              <MenubarItem onSelect={p.insertRowAbove}>위에 행 삽입</MenubarItem>
              <MenubarItem onSelect={p.insertRowBelow}>아래에 행 삽입</MenubarItem>
            </MenubarSubContent>
          </MenubarSub>
          <MenubarSub>
            <MenubarSubTrigger>
              <Plus className="w-4 h-4 mr-2" /> 열
            </MenubarSubTrigger>
            <MenubarSubContent>
              <MenubarItem onSelect={p.insertColLeft}>왼쪽에 열 삽입</MenubarItem>
              <MenubarItem onSelect={p.insertColRight}>오른쪽에 열 삽입</MenubarItem>
            </MenubarSubContent>
          </MenubarSub>
          <MenubarSeparator />
          <MenubarItem onSelect={p.insertChart}>
            <BarChart3 className="w-4 h-4 mr-2" /> 차트
          </MenubarItem>
          <MenubarItem onSelect={p.insertImage}>
            <ImageIcon className="w-4 h-4 mr-2" /> 이미지 (IMAGE 함수)
          </MenubarItem>
          <MenubarItem onSelect={p.insertLink}>
            <LinkIcon className="w-4 h-4 mr-2" /> 링크
            <MenubarShortcut>⌘K</MenubarShortcut>
          </MenubarItem>
          <MenubarItem onSelect={p.insertComment}>
            <MessageSquare className="w-4 h-4 mr-2" /> 댓글
          </MenubarItem>
          <MenubarItem onSelect={p.insertCheckbox}>
            <CheckSquare className="w-4 h-4 mr-2" /> 체크박스
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>

      {/* 서식 */}
      <MenubarMenu>
        <MenubarTrigger className="text-[13px] px-2 py-1 h-7">서식</MenubarTrigger>
        <MenubarContent className="min-w-[220px]">
          <MenubarItem onSelect={p.toggleBold}>
            <Bold className="w-4 h-4 mr-2" /> 굵게
            <MenubarShortcut>⌘B</MenubarShortcut>
          </MenubarItem>
          <MenubarItem onSelect={p.toggleItalic}>
            <Italic className="w-4 h-4 mr-2" /> 기울임
            <MenubarShortcut>⌘I</MenubarShortcut>
          </MenubarItem>
          <MenubarItem onSelect={p.toggleUnderline}>
            <UnderlineIcon className="w-4 h-4 mr-2" /> 밑줄
            <MenubarShortcut>⌘U</MenubarShortcut>
          </MenubarItem>
          <MenubarItem onSelect={p.toggleStrikethrough}>
            <Strikethrough className="w-4 h-4 mr-2" /> 취소선
          </MenubarItem>
          <MenubarSeparator />
          <MenubarItem onSelect={p.clearFormat}>
            서식 지우기
            <MenubarShortcut>⌘\</MenubarShortcut>
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>

      {/* 데이터 */}
      <MenubarMenu>
        <MenubarTrigger className="text-[13px] px-2 py-1 h-7">데이터</MenubarTrigger>
        <MenubarContent className="min-w-[200px]">
          <MenubarItem onSelect={p.toggleFilter}>
            <Filter className="w-4 h-4 mr-2" /> 필터 켜기/끄기
          </MenubarItem>
          <MenubarSub>
            <MenubarSubTrigger>
              <ArrowUpDown className="w-4 h-4 mr-2" /> 선택 영역 정렬
            </MenubarSubTrigger>
            <MenubarSubContent>
              <MenubarItem onSelect={p.sortSelectionAsc}>오름차순 (A→Z, 1→9)</MenubarItem>
              <MenubarItem onSelect={p.sortSelectionDesc}>내림차순 (Z→A, 9→1)</MenubarItem>
            </MenubarSubContent>
          </MenubarSub>
          <MenubarSeparator />
          <MenubarItem onSelect={p.createTable}>
            <Table2 className="w-4 h-4 mr-2" /> 선택 영역을 표로 만들기
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>

      {/* 도구 */}
      <MenubarMenu>
        <MenubarTrigger className="text-[13px] px-2 py-1 h-7">도구</MenubarTrigger>
        <MenubarContent className="min-w-[200px]">
          <MenubarItem onSelect={p.openShortcutHelp}>
            <Keyboard className="w-4 h-4 mr-2" /> 단축키 도움말
            <MenubarShortcut>?</MenubarShortcut>
          </MenubarItem>
          <MenubarItem onSelect={p.openFunctionList}>
            <BookOpen className="w-4 h-4 mr-2" /> 함수 목록
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>

      {/* AI (Gemini 대응) */}
      <MenubarMenu>
        <MenubarTrigger className="text-[13px] px-2 py-1 h-7">
          <Sparkles className="w-3.5 h-3.5 mr-1 text-violet-500" /> AI
        </MenubarTrigger>
        <MenubarContent className="min-w-[200px]">
          <MenubarItem onSelect={p.toggleAiPanel}>
            <Sparkles className="w-4 h-4 mr-2 text-violet-500" /> AI 패널 열기/닫기
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>

      {/* 도움말 */}
      <MenubarMenu>
        <MenubarTrigger className="text-[13px] px-2 py-1 h-7">도움말</MenubarTrigger>
        <MenubarContent className="min-w-[200px]">
          <MenubarItem onSelect={p.openShortcutHelp}>
            <Keyboard className="w-4 h-4 mr-2" /> 단축키
          </MenubarItem>
          <MenubarItem onSelect={p.openFunctionList}>
            <BookOpen className="w-4 h-4 mr-2" /> 함수 목록
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>
  );
}
