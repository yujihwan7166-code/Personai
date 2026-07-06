/**
 * 시트 탭 — Fortune-sheet(엑셀형 스프레드시트). 노트 안에 내장된 탭.
 * 데이터는 노트(noteStore)에 저장 — onChange 로 상위에 전달.
 */
import { Workbook } from '@fortune-sheet/react';
import '@fortune-sheet/react/dist/index.css';

type SheetData = { name: string; [key: string]: unknown };

export function SheetEditor({ data, onChange }: { data: unknown; onChange: (data: unknown) => void }) {
  const sheets = (Array.isArray(data) && data.length > 0 ? data : [{ name: '시트1' }]) as SheetData[];

  return (
    <div className="h-full w-full">
      <Workbook data={sheets} onChange={(d) => onChange(d)} />
    </div>
  );
}
