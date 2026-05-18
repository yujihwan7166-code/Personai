/**
 * 피벗 테이블 구성 모달.
 *
 * 사용자 흐름:
 *   1. 영역 선택 (또는 모달에서 직접 입력)
 *   2. 행/열/값 컬럼 선택 + 집계 함수
 *   3. (옵션) 필터
 *   4. "만들기" → onSubmit(config) → 호출자가 runPivot + 새 시트 생성
 *
 * MVP — 행 1 / 열 0~1 / 값 N / 필터 1. 다차원은 v2.
 */

import { useEffect, useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Table2 } from 'lucide-react';
import type { PivotAgg, PivotConfig, PivotValueSpec, PivotFilterSpec } from '@/lib/cloudSheet/pivotTypes';
import { parsePivotRange, extractRows } from '@/lib/cloudSheet/pivot';

type Cells = Record<string, string>;

export interface PivotDialogProps {
  open: boolean;
  onClose: () => void;
  /** 현재 시트의 cells — 헤더 컬럼 추출용. */
  cells: Cells;
  /** 초기 범위 (선택 영역 자동 채움). 예: "A1:D100". */
  initialRange?: string;
  /** "만들기" → range + config 전달. 호출자가 runPivot + 새 시트 생성. */
  onSubmit: (range: string, config: PivotConfig) => void;
}

const AGG_OPTIONS: Array<{ value: PivotAgg; label: string }> = [
  { value: 'sum',   label: '합계 (SUM)' },
  { value: 'avg',   label: '평균 (AVG)' },
  { value: 'count', label: '개수 (COUNT)' },
  { value: 'min',   label: '최소 (MIN)' },
  { value: 'max',   label: '최대 (MAX)' },
];

export function PivotDialog({ open, onClose, cells, initialRange = '', onSubmit }: PivotDialogProps) {
  const [range, setRange] = useState(initialRange);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rowCol, setRowCol] = useState('');
  const [colCol, setColCol] = useState<string>(''); // '' = 행 only
  const [values, setValues] = useState<PivotValueSpec[]>([]);
  const [filters, setFilters] = useState<PivotFilterSpec[]>([]);
  const [rangeError, setRangeError] = useState<string | null>(null);

  // 모달 열 때 / 범위 변경 시 헤더 추출
  useEffect(() => {
    if (!open) return;
    setRange(initialRange);
  }, [open, initialRange]);

  useEffect(() => {
    if (!range) { setHeaders([]); setRangeError(null); return; }
    try {
      const r = parsePivotRange(range);
      const { headers: hs } = extractRows(cells, r);
      setHeaders(hs);
      setRangeError(null);
      // 기본값 자동 선택 (첫 번째 행 컬럼, 마지막 값 컬럼 SUM)
      if (hs.length > 0 && !rowCol) setRowCol(hs[0]);
      if (hs.length > 1 && values.length === 0) {
        setValues([{ col: hs[hs.length - 1], agg: 'sum' }]);
      }
    } catch (e) {
      setRangeError(e instanceof Error ? e.message : '범위 파싱 실패');
      setHeaders([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, cells]);

  const reset = () => {
    setRange('');
    setHeaders([]);
    setRowCol('');
    setColCol('');
    setValues([]);
    setFilters([]);
    setRangeError(null);
  };

  const handleSubmit = () => {
    if (!range || !rowCol || values.length === 0) return;
    const config: PivotConfig = {
      rowCol,
      colCol: colCol || undefined,
      values,
      filters: filters.length > 0 ? filters : undefined,
      sort: 'totalDesc',
    };
    onSubmit(range, config);
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Table2 className="w-4 h-4" /> 피벗 테이블 만들기
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 mt-2">
          {/* 범위 */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">원본 범위 (예: A1:D100 — 첫 행은 헤더)</label>
            <Input
              autoFocus
              value={range}
              onChange={(e) => setRange(e.target.value.toUpperCase())}
              placeholder="A1:D100"
              spellCheck={false}
            />
            {rangeError && <p className="text-xs text-destructive">{rangeError}</p>}
            {headers.length > 0 && (
              <p className="text-xs text-muted-foreground">
                인식된 컬럼: {headers.join(', ')}
              </p>
            )}
          </div>

          {/* 행 그룹 */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">행 (필수)</label>
            <select
              value={rowCol}
              onChange={(e) => setRowCol(e.target.value)}
              className="px-2 py-1.5 text-sm bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary/40"
              disabled={headers.length === 0}
            >
              <option value="">(선택)</option>
              {headers.map((h) => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>

          {/* 열 그룹 (옵션) */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">열 (옵션 — 교차표)</label>
            <select
              value={colCol}
              onChange={(e) => setColCol(e.target.value)}
              className="px-2 py-1.5 text-sm bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary/40"
              disabled={headers.length === 0}
            >
              <option value="">없음</option>
              {headers.filter((h) => h !== rowCol).map((h) => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>

          {/* 값 (N개) */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <label className="text-xs text-muted-foreground">값 (1개 이상)</label>
              <button
                type="button"
                onClick={() => setValues([...values, { col: headers[0] ?? '', agg: 'sum' }])}
                disabled={headers.length === 0}
                className="text-xs inline-flex items-center gap-0.5 text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-3 h-3" /> 추가
              </button>
            </div>
            {values.length === 0 && (
              <p className="text-xs text-muted-foreground italic">값 컬럼을 추가하세요</p>
            )}
            {values.map((v, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <select
                  value={v.col}
                  onChange={(e) => {
                    const next = [...values];
                    next[idx] = { ...v, col: e.target.value };
                    setValues(next);
                  }}
                  className="flex-1 px-2 py-1 text-xs bg-background border border-border rounded"
                >
                  {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
                <select
                  value={v.agg}
                  onChange={(e) => {
                    const next = [...values];
                    next[idx] = { ...v, agg: e.target.value as PivotAgg };
                    setValues(next);
                  }}
                  className="px-2 py-1 text-xs bg-background border border-border rounded"
                >
                  {AGG_OPTIONS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
                </select>
                <button
                  type="button"
                  onClick={() => setValues(values.filter((_, i) => i !== idx))}
                  className="p-1 text-muted-foreground hover:text-destructive"
                  aria-label="값 제거"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>

          {/* 필터 (옵션) */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <label className="text-xs text-muted-foreground">필터 (옵션 — AND)</label>
              <button
                type="button"
                onClick={() => setFilters([...filters, { col: headers[0] ?? '', criteria: '' }])}
                disabled={headers.length === 0}
                className="text-xs inline-flex items-center gap-0.5 text-primary hover:underline disabled:opacity-50"
              >
                <Plus className="w-3 h-3" /> 추가
              </button>
            </div>
            {filters.map((f, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <select
                  value={f.col}
                  onChange={(e) => {
                    const next = [...filters];
                    next[idx] = { ...f, col: e.target.value };
                    setFilters(next);
                  }}
                  className="flex-1 px-2 py-1 text-xs bg-background border border-border rounded"
                >
                  {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
                <Input
                  value={f.criteria}
                  onChange={(e) => {
                    const next = [...filters];
                    next[idx] = { ...f, criteria: e.target.value };
                    setFilters(next);
                  }}
                  placeholder='조건 (예: ">100", "*문구*")'
                  className="flex-1 text-xs h-7"
                />
                <button
                  type="button"
                  onClick={() => setFilters(filters.filter((_, i) => i !== idx))}
                  className="p-1 text-muted-foreground hover:text-destructive"
                  aria-label="필터 제거"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="ghost" onClick={() => { reset(); onClose(); }}>취소</Button>
          <Button
            onClick={handleSubmit}
            disabled={!range || !rowCol || values.length === 0 || !!rangeError}
          >
            만들기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
