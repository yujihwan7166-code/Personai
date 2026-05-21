import React from 'react';
import type { SlideChartEl } from './types';

const DEFAULT_COLORS = ['#4472C4', '#ED7D31', '#A5A5A5', '#FFC000', '#5B9BD5', '#70AD47'];

function colorFor(el: SlideChartEl, index: number): string {
  return el.series[index]?.color ?? DEFAULT_COLORS[index % DEFAULT_COLORS.length];
}

function allValues(el: SlideChartEl): number[] {
  return el.series.flatMap((s) => s.values).filter((v) => Number.isFinite(v));
}

export function ChartRender({ el }: { el: SlideChartEl }): React.ReactElement {
  const values = allValues(el);
  const max = Math.max(1, ...values.map((v) => Math.abs(v)));
  const categories = el.categories.length > 0 ? el.categories : [''];
  const series = el.series.length > 0 ? el.series : [{ name: '', values: [0] }];

  if (el.chartType === 'pie') {
    const pieValues = series[0]?.values.length ? series[0].values : [1];
    const total = pieValues.reduce((sum, v) => sum + Math.max(0, v), 0) || 1;
    let acc = 0;
    return (
      <div className="w-full h-full bg-white/80 border border-border/50 overflow-hidden flex flex-col">
        {el.title && <div className="px-2 pt-1 text-[11px] font-medium truncate text-center">{el.title}</div>}
        <svg viewBox="0 0 100 70" className="min-h-0 flex-1">
          {pieValues.map((value, i) => {
            const start = (acc / total) * Math.PI * 2;
            acc += Math.max(0, value);
            const end = (acc / total) * Math.PI * 2;
            const large = end - start > Math.PI ? 1 : 0;
            const x1 = 50 + Math.cos(start - Math.PI / 2) * 26;
            const y1 = 35 + Math.sin(start - Math.PI / 2) * 26;
            const x2 = 50 + Math.cos(end - Math.PI / 2) * 26;
            const y2 = 35 + Math.sin(end - Math.PI / 2) * 26;
            return (
              <path
                key={i}
                d={`M50 35 L${x1} ${y1} A26 26 0 ${large} 1 ${x2} ${y2} Z`}
                fill={DEFAULT_COLORS[i % DEFAULT_COLORS.length]}
                stroke="#fff"
                strokeWidth="1"
              />
            );
          })}
        </svg>
      </div>
    );
  }

  const plotTop = 12;
  const plotBottom = 82;
  const plotLeft = 10;
  const plotRight = 96;
  const catCount = Math.max(1, categories.length);
  const band = (plotRight - plotLeft) / catCount;
  const barW = Math.max(1.4, band / Math.max(1, series.length) * 0.68);
  const yFor = (v: number) => plotBottom - (Math.max(0, v) / max) * (plotBottom - plotTop);

  return (
    <div className="w-full h-full bg-white/80 border border-border/50 overflow-hidden flex flex-col">
      {el.title && <div className="px-2 pt-1 text-[11px] font-medium truncate text-center">{el.title}</div>}
      <svg viewBox="0 0 100 92" className="min-h-0 flex-1">
        <line x1={plotLeft} y1={plotBottom} x2={plotRight} y2={plotBottom} stroke="#d1d5db" strokeWidth="0.8" />
        <line x1={plotLeft} y1={plotTop} x2={plotLeft} y2={plotBottom} stroke="#d1d5db" strokeWidth="0.8" />
        {el.chartType === 'bar' && categories.map((_, ci) => (
          <React.Fragment key={ci}>
            {series.map((s, si) => {
              const v = s.values[ci] ?? 0;
              const h = plotBottom - yFor(v);
              const x = plotLeft + ci * band + (band - series.length * barW) / 2 + si * barW;
              return <rect key={s.name || si} x={x} y={plotBottom - h} width={barW * 0.86} height={h} fill={colorFor(el, si)} rx="0.8" />;
            })}
          </React.Fragment>
        ))}
        {el.chartType === 'line' && series.map((s, si) => {
          const pts = categories.map((_, ci) => {
            const x = plotLeft + ci * band + band / 2;
            const y = yFor(s.values[ci] ?? 0);
            return `${x},${y}`;
          }).join(' ');
          return (
            <g key={s.name || si}>
              <polyline points={pts} fill="none" stroke={colorFor(el, si)} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
              {categories.map((_, ci) => (
                <circle key={ci} cx={plotLeft + ci * band + band / 2} cy={yFor(s.values[ci] ?? 0)} r="1.5" fill={colorFor(el, si)} />
              ))}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
