/**
 * 도형(SlideShapeEl) 렌더 — rect/ellipse 는 div, triangle/line/arrow 는 SVG.
 * 부모는 absolute pos 컨테이너를 제공하고 ShapeRender 는 100%×100% 내부를 채움.
 */

import React from 'react';
import { type SlideShapeEl, SHAPE_SHADOW } from './types';

export function ShapeRender({ el }: { el: SlideShapeEl }): React.ReactElement {
  const sw = el.strokeWidth ?? 2;
  const stroke = el.strokeColor ?? 'transparent';
  if (el.type === 'rect') {
    return (
      <div style={{
        width: '100%', height: '100%',
        backgroundColor: el.fillColor,
        border: el.strokeColor ? `${sw}px solid ${stroke}` : undefined,
        borderRadius: el.borderRadius ? `${el.borderRadius}px` : undefined,
        boxShadow: el.shadow ? SHAPE_SHADOW : undefined,
      }} />
    );
  }
  if (el.type === 'ellipse') {
    return (
      <div style={{
        width: '100%', height: '100%',
        backgroundColor: el.fillColor,
        border: el.strokeColor ? `${sw}px solid ${stroke}` : undefined,
        borderRadius: '50%',
        boxShadow: el.shadow ? SHAPE_SHADOW : undefined,
      }} />
    );
  }
  // triangle / line / arrow — SVG (viewBox 100×100, preserveAspectRatio none)
  return (
    <svg
      width="100%" height="100%"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      style={{ overflow: 'visible' }}
    >
      {el.type === 'triangle' && (
        <polygon
          points="50,0 100,100 0,100"
          fill={el.fillColor}
          stroke={el.strokeColor ?? 'none'}
          strokeWidth={el.strokeColor ? sw : 0}
          vectorEffect="non-scaling-stroke"
        />
      )}
      {el.type === 'line' && (
        <line
          x1="0" y1="50" x2="100" y2="50"
          stroke={el.strokeColor ?? el.fillColor}
          strokeWidth={sw}
          vectorEffect="non-scaling-stroke"
          strokeLinecap="round"
        />
      )}
      {el.type === 'arrow' && (
        <>
          <defs>
            <marker
              id={`ah-${el.id}`}
              viewBox="0 0 10 10"
              refX="9" refY="5"
              markerWidth="5" markerHeight="5"
              orient="auto-start-reverse"
              markerUnits="strokeWidth"
            >
              <path d="M0,0 L10,5 L0,10 z" fill={el.strokeColor ?? el.fillColor} />
            </marker>
          </defs>
          <line
            x1="0" y1="50" x2="100" y2="50"
            stroke={el.strokeColor ?? el.fillColor}
            strokeWidth={sw}
            vectorEffect="non-scaling-stroke"
            strokeLinecap="round"
            markerEnd={`url(#ah-${el.id})`}
          />
        </>
      )}
    </svg>
  );
}
