/** 영구 embed 차트 카드 (시트 아래 표시, 데이터 자동 갱신). */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell as RechartsCell,
  XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  CheckCircle2, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Download, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import {
  buildChartData, flattenForPie, getChartPalette,
  CHART_PALETTES, CHART_PALETTE_LABELS,
  type EmbeddedChart,
} from '@/lib/cloudSheet/chart';
import { idxToCol } from '@/lib/cloudSheet/formula';

type Cells = Record<string, string>;

interface EmbeddedChartCardProps {
  chart: EmbeddedChart;
  cells: Cells;
  onRemove: () => void;
  onMovePrev?: () => void;
  onMoveNext?: () => void;
  onChangePalette?: (palette: string) => void;
  onChangeTitle?: (title: string) => void;
  onChangeType?: (type: 'bar' | 'line' | 'pie') => void;
  onChangeOrientation?: (orientation: 'columns' | 'rows') => void;
  onToggleCollapsed?: () => void;
}

export function EmbeddedChartCard({
  chart, cells, onRemove, onMovePrev, onMoveNext, onChangePalette, onChangeTitle, onChangeType, onChangeOrientation, onToggleCollapsed,
}: EmbeddedChartCardProps) {
  const data = useMemo(
    () => buildChartData(cells, chart.range, chart.orientation),
    [cells, chart.range, chart.orientation],
  );
  const hasData = data.rows.length > 0 && data.seriesKeys.length > 0;
  const rangeStr = useMemo(() => {
    const a = `${idxToCol(chart.range.minC)}${chart.range.minR + 1}`;
    const b = `${idxToCol(chart.range.maxC)}${chart.range.maxR + 1}`;
    return a === b ? a : `${a}:${b}`;
  }, [chart.range]);
  const palette = getChartPalette(chart.palette);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(chart.title ?? '');
  const titleInputRef = useRef<HTMLInputElement>(null);
  const chartBodyRef = useRef<HTMLDivElement>(null);
  const safeTitle = useCallback(
    () => (chart.title || `${chart.type}_chart`).replace(/[\\/?*:|"<>]/g, '_'),
    [chart.title, chart.type],
  );
  const handleDownloadPng = useCallback(async () => {
    const el = chartBodyRef.current;
    if (!el) return;
    try {
      const html2canvasMod = await import('html2canvas');
      const html2canvas = html2canvasMod.default;
      const canvas = await html2canvas(el, { backgroundColor: '#ffffff', scale: 2 });
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${safeTitle()}_${Date.now()}.png`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        toast({ title: 'PNG 저장됨' });
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ title: 'PNG 저장 실패', description: msg });
    }
  }, [safeTitle]);
  const handleDownloadSvg = useCallback(() => {
    const el = chartBodyRef.current;
    if (!el) return;
    const svg = el.querySelector('svg');
    if (!svg) {
      toast({ title: 'SVG 추출 실패', description: '차트 SVG 를 찾지 못함' });
      return;
    }
    try {
      const clone = svg.cloneNode(true) as SVGElement;
      if (!clone.getAttribute('xmlns')) clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      // 흰 배경 박스 prepend
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
      a.download = `${safeTitle()}_${Date.now()}.svg`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast({ title: 'SVG 저장됨' });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ title: 'SVG 저장 실패', description: msg });
    }
  }, [safeTitle]);
  useEffect(() => {
    if (editingTitle) {
      setTitleDraft(chart.title ?? '');
      setTimeout(() => {
        titleInputRef.current?.focus();
        titleInputRef.current?.select();
      }, 0);
    }
  }, [editingTitle, chart.title]);
  const commitTitle = () => {
    setEditingTitle(false);
    const v = titleDraft.trim();
    if (onChangeTitle && v !== (chart.title ?? '')) onChangeTitle(v);
  };
  const defaultTitle = `${chart.type === 'bar' ? '막대' : chart.type === 'line' ? '선' : '원'} 차트`;

  return (
    <div className="rounded border border-border bg-background overflow-hidden">
      <div className="flex items-center px-3 py-1.5 border-b border-border bg-muted/30 text-xs gap-1">
        {onChangeType ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="px-1 py-0.5 rounded hover:bg-muted"
                title="차트 종류 변경"
                aria-label="차트 종류"
              >
                <span aria-hidden>{chart.type === 'bar' ? '📊' : chart.type === 'line' ? '📈' : '🥧'}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[120px]">
              {([
                { t: 'bar' as const, icon: '📊', label: '막대' },
                { t: 'line' as const, icon: '📈', label: '선' },
                { t: 'pie' as const, icon: '🥧', label: '원' },
              ]).map(({ t, icon, label }) => (
                <DropdownMenuItem key={t} onSelect={() => onChangeType(t)} className="flex items-center gap-2">
                  <span aria-hidden>{icon}</span>
                  <span>{label}</span>
                  {chart.type === t && (
                    <CheckCircle2 className="w-3.5 h-3.5 ml-auto text-foreground" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <span aria-hidden>{chart.type === 'bar' ? '📊' : chart.type === 'line' ? '📈' : '🥧'}</span>
        )}
        {editingTitle ? (
          <input
            ref={titleInputRef}
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); commitTitle(); }
              else if (e.key === 'Escape') { e.preventDefault(); setEditingTitle(false); }
            }}
            onBlur={commitTitle}
            placeholder={defaultTitle}
            className="font-medium text-xs px-1 py-0 rounded border border-border bg-background outline-none flex-1 min-w-0 max-w-[200px]"
          />
        ) : (
          <button
            type="button"
            onClick={() => onChangeTitle && setEditingTitle(true)}
            disabled={!onChangeTitle}
            className={cn(
              'font-medium text-left truncate max-w-[200px]',
              onChangeTitle && 'hover:underline cursor-text',
            )}
            title={onChangeTitle ? '클릭으로 제목 편집' : undefined}
          >
            {chart.title || defaultTitle}
          </button>
        )}
        <span className="ml-1 text-muted-foreground">{rangeStr}</span>
        <div className="ml-auto flex items-center gap-0.5">
          {onChangePalette && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="px-1.5 py-0.5 rounded hover:bg-muted text-muted-foreground flex items-center gap-1"
                  aria-label="색상 팔레트"
                  title="색상 팔레트 변경"
                >
                  <span className="flex">
                    {palette.slice(0, 4).map((c) => (
                      <span
                        key={c}
                        className="block w-2 h-2.5 -ml-px first:ml-0 border border-background"
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[140px]">
                {(Object.keys(CHART_PALETTES) as Array<keyof typeof CHART_PALETTES>).map((name) => (
                  <DropdownMenuItem
                    key={name}
                    onSelect={() => onChangePalette(name)}
                    className="flex items-center gap-2"
                  >
                    <span className="flex">
                      {CHART_PALETTES[name].slice(0, 5).map((c) => (
                        <span
                          key={c}
                          className="block w-3 h-3 -ml-px first:ml-0 border border-background rounded-sm"
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </span>
                    <span>{CHART_PALETTE_LABELS[name]}</span>
                    {(chart.palette ?? 'default') === name && (
                      <CheckCircle2 className="w-3.5 h-3.5 ml-auto text-foreground" />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {onChangeOrientation && (
            <button
              type="button"
              onClick={() => onChangeOrientation(chart.orientation === 'columns' ? 'rows' : 'columns')}
              className="px-1.5 py-0.5 rounded hover:bg-muted text-muted-foreground text-[10px] font-medium tabular-nums"
              title={chart.orientation === 'columns' ? '시리즈 방향: 열 (클릭으로 행으로)' : '시리즈 방향: 행 (클릭으로 열로)'}
              aria-label="시리즈 방향 전환"
            >
              {chart.orientation === 'columns' ? '열 ⇆ 행' : '행 ⇆ 열'}
            </button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                disabled={!hasData}
                className="p-1 rounded hover:bg-muted text-muted-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="이미지 다운로드"
                title="이미지 다운로드 (PNG / SVG)"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[120px]">
              <DropdownMenuItem onSelect={() => { void handleDownloadPng(); }}>
                PNG (래스터)
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => handleDownloadSvg()}>
                SVG (벡터)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            type="button"
            onClick={onMovePrev}
            disabled={!onMovePrev}
            className="p-1 rounded hover:bg-muted text-muted-foreground disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="앞으로"
            title="앞으로 이동"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onMoveNext}
            disabled={!onMoveNext}
            className="p-1 rounded hover:bg-muted text-muted-foreground disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="뒤로"
            title="뒤로 이동"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          {onToggleCollapsed && (
            <button
              type="button"
              onClick={onToggleCollapsed}
              className="p-1 rounded hover:bg-muted text-muted-foreground"
              aria-label={chart.collapsed ? '펴기' : '접기'}
              title={chart.collapsed ? '차트 펴기' : '차트 접기 (헤더만 표시)'}
            >
              {chart.collapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            </button>
          )}
          <button
            type="button"
            onClick={onRemove}
            className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
            aria-label="차트 삭제"
            title="차트 삭제"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      {!chart.collapsed && (
      <div ref={chartBodyRef} className="h-[260px] p-2 bg-white">
        {!hasData ? (
          <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
            데이터 없음 ({rangeStr})
          </div>
        ) : chart.type === 'bar' ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.rows} margin={{ top: 5, right: 12, bottom: 5, left: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {data.seriesKeys.map((k, i) => (
                <Bar key={k} dataKey={k} fill={palette[i % palette.length]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        ) : chart.type === 'line' ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.rows} margin={{ top: 5, right: 12, bottom: 5, left: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {data.seriesKeys.map((k, i) => (
                <Line
                  key={k} type="monotone" dataKey={k}
                  stroke={palette[i % palette.length]}
                  strokeWidth={2} dot={{ r: 2 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Pie
                data={flattenForPie(data)}
                dataKey="value" nameKey="name"
                cx="50%" cy="50%" outerRadius={80} label={false}
              >
                {flattenForPie(data).map((_, i) => (
                  <RechartsCell key={i} fill={palette[i % palette.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
      )}
    </div>
  );
}
