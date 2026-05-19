/** 차트 만들기 모달 — 선택 범위를 막대/선/영역/원 차트로 미리보기 + PNG 저장 / 시트 embed. */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell as RechartsCell,
  XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  BarChart3, LineChart as LineChartIcon, AreaChart as AreaChartIcon, PieChart as PieChartIcon,
  Download, Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  buildChartData, flattenForPie, getChartPalette,
  CHART_PALETTES, CHART_PALETTE_LABELS,
  type SelRange,
} from '@/lib/cloudSheet/chart';
import { idxToCol } from '@/lib/cloudSheet/formula';

type ChartType = 'bar' | 'line' | 'area' | 'pie';
type Cells = Record<string, string>;

interface ChartModalProps {
  open: boolean;
  onClose: () => void;
  cells: Cells;
  range: SelRange;
  /** "시트에 추가" — 클릭 시 영구 차트로 embed (palette 포함) */
  onEmbed?: (c: { type: ChartType; orientation: 'columns' | 'rows'; range: SelRange; palette: string }) => void;
}

export function ChartModal({ open, onClose, cells, range, onEmbed }: ChartModalProps) {
  const [type, setType] = useState<ChartType>('bar');
  const [orientation, setOrientation] = useState<'columns' | 'rows'>('columns');
  const [paletteName, setPaletteName] = useState<string>('default');
  const data = useMemo(
    () => buildChartData(cells, range, orientation),
    [cells, range, orientation],
  );
  const palette = useMemo(() => getChartPalette(paletteName), [paletteName]);
  const chartRef = useRef<HTMLDivElement>(null);

  // 모달 열릴 때 막대 + default palette 로 초기화
  useEffect(() => {
    if (open) {
      setType('bar');
      setPaletteName('default');
    }
  }, [open]);

  const handleDownloadPng = useCallback(async () => {
    if (!chartRef.current) return;
    try {
      const html2canvasMod = await import('html2canvas');
      const html2canvas = html2canvasMod.default;
      const canvas = await html2canvas(chartRef.current, { backgroundColor: '#ffffff', scale: 2 });
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chart_${Date.now()}.png`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        toast({ title: 'PNG 저장됨' });
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ title: 'PNG 저장 실패', description: msg });
    }
  }, []);

  const handleDownloadSvg = useCallback(() => {
    if (!chartRef.current) return;
    const svg = chartRef.current.querySelector('svg');
    if (!svg) {
      toast({ title: 'SVG 추출 실패', description: '차트 SVG 를 찾지 못함' });
      return;
    }
    try {
      const clone = svg.cloneNode(true) as SVGElement;
      if (!clone.getAttribute('xmlns')) clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      bgRect.setAttribute('width', '100%');
      bgRect.setAttribute('height', '100%');
      bgRect.setAttribute('fill', '#ffffff');
      clone.insertBefore(bgRect, clone.firstChild);
      const xml = new XMLSerializer().serializeToString(clone);
      const blob = new Blob([xml], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chart_${Date.now()}.svg`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast({ title: 'SVG 저장됨' });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ title: 'SVG 저장 실패', description: msg });
    }
  }, []);

  const hasData = data.rows.length > 0 && data.seriesKeys.length > 0;
  const rangeLabel = useMemo(() => {
    const a = `${idxToCol(range.minC)}${range.minR + 1}`;
    const b = `${idxToCol(range.maxC)}${range.maxR + 1}`;
    return `${a}:${b}`;
  }, [range]);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-3xl">
        <DialogTitle className="text-base flex items-center gap-2">
          <BarChart3 className="w-4 h-4" />
          차트 만들기 — {rangeLabel}
        </DialogTitle>
        <DialogDescription className="text-xs text-muted-foreground">
          첫 행·첫 열을 라벨로 사용합니다. 숫자가 아닌 셀은 0으로 처리됩니다.
        </DialogDescription>

        <div className="flex flex-wrap items-center gap-3 text-sm">
          <div className="flex items-center gap-1 p-0.5 rounded border border-border bg-muted/40">
            <ChartTypeBtn icon={<BarChart3 className="w-4 h-4" />} label="막대" active={type === 'bar'} onClick={() => setType('bar')} />
            <ChartTypeBtn icon={<LineChartIcon className="w-4 h-4" />} label="선" active={type === 'line'} onClick={() => setType('line')} />
            <ChartTypeBtn icon={<AreaChartIcon className="w-4 h-4" />} label="영역" active={type === 'area'} onClick={() => setType('area')} />
            <ChartTypeBtn icon={<PieChartIcon className="w-4 h-4" />} label="원" active={type === 'pie'} onClick={() => setType('pie')} />
          </div>
          <div className="flex items-center gap-1 p-0.5 rounded border border-border bg-muted/40">
            <ChartTypeBtn label="열별 시리즈" active={orientation === 'columns'} onClick={() => setOrientation('columns')} />
            <ChartTypeBtn label="행별 시리즈" active={orientation === 'rows'} onClick={() => setOrientation('rows')} />
          </div>
          <div className="flex items-center gap-1 p-0.5 rounded border border-border bg-muted/40">
            {(Object.keys(CHART_PALETTES) as Array<keyof typeof CHART_PALETTES>).map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setPaletteName(name)}
                className={cn(
                  'px-2 py-1 rounded text-xs flex items-center gap-1',
                  paletteName === name
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
                title={`${CHART_PALETTE_LABELS[name]} 팔레트`}
                aria-pressed={paletteName === name}
              >
                <span className="flex">
                  {CHART_PALETTES[name].slice(0, 4).map((c) => (
                    <span
                      key={c}
                      className="block w-2 h-2.5 -ml-px first:ml-0 border border-background"
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </span>
                <span>{CHART_PALETTE_LABELS[name]}</span>
              </button>
            ))}
          </div>
        </div>

        <div ref={chartRef} className="h-[380px] bg-white rounded border border-border p-3">
          {!hasData ? (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
              데이터 부족 — 2×2 이상 범위를 선택하세요.
            </div>
          ) : type === 'bar' ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.rows} margin={{ top: 10, right: 16, bottom: 8, left: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {data.seriesKeys.map((k, i) => (
                  <Bar key={k} dataKey={k} fill={palette[i % palette.length]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          ) : type === 'line' ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.rows} margin={{ top: 10, right: 16, bottom: 8, left: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {data.seriesKeys.map((k, i) => (
                  <Line
                    key={k}
                    type="monotone"
                    dataKey={k}
                    stroke={palette[i % palette.length]}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : type === 'area' ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.rows} margin={{ top: 10, right: 16, bottom: 8, left: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {data.seriesKeys.map((k, i) => (
                  <Area
                    key={k}
                    type="monotone"
                    dataKey={k}
                    stroke={palette[i % palette.length]}
                    fill={palette[i % palette.length]}
                    fillOpacity={0.3}
                    strokeWidth={2}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Pie
                  data={flattenForPie(data)}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={120}
                  label
                >
                  {flattenForPie(data).map((_, i) => (
                    <RechartsCell key={i} fill={palette[i % palette.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="flex items-center justify-between pt-2 text-xs text-muted-foreground">
          <span>
            {type === 'pie' && data.seriesKeys.length > 1
              ? `원형은 첫 시리즈(${data.seriesKeys[0]})만 표시 — 막대/선 권장`
              : `시리즈 ${data.seriesKeys.length}개 × 카테고리 ${data.rows.length}개`}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadPng}
              disabled={!hasData}
              className="px-3 py-1.5 rounded border border-border hover:bg-muted text-sm flex items-center gap-1 disabled:opacity-50"
              title="래스터 (스크린샷)"
            >
              <Download className="w-3.5 h-3.5" /> PNG
            </button>
            <button
              type="button"
              onClick={handleDownloadSvg}
              disabled={!hasData}
              className="px-3 py-1.5 rounded border border-border hover:bg-muted text-sm flex items-center gap-1 disabled:opacity-50"
              title="벡터 (확대·인쇄·편집)"
            >
              <Download className="w-3.5 h-3.5" /> SVG
            </button>
            {onEmbed && (
              <button
                type="button"
                onClick={() => onEmbed({ type, orientation, range, palette: paletteName })}
                disabled={!hasData}
                className="px-3 py-1.5 rounded bg-violet-500 text-white hover:bg-violet-600 text-sm flex items-center gap-1 disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" /> 시트에 추가
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded bg-foreground text-background hover:bg-foreground/90 text-sm"
            >
              닫기
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ChartTypeBtn({
  icon, label, active, onClick,
}: { icon?: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'px-2 py-1 rounded text-xs flex items-center gap-1 transition-colors',
        active ? 'bg-background text-foreground shadow-sm border border-border' : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {icon}
      {label}
    </button>
  );
}
