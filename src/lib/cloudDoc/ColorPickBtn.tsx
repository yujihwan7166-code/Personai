/** 도구바 색 picker — 글자색/하이라이트 공용. 더블클릭으로 색 해제. */

import React from 'react';

interface ColorPickBtnProps {
  icon: React.ReactNode;
  value: string;
  onChange: (color: string) => void;
  onClear: () => void;
  title?: string;
}

export function ColorPickBtn({ icon, value, onChange, onClear, title }: ColorPickBtnProps) {
  return (
    <label
      className="relative flex items-center gap-0.5 px-1.5 py-1.5 rounded hover:bg-muted cursor-pointer"
      title={title}
      aria-label={title}
    >
      {icon}
      <span
        className="block w-3 h-3 rounded-sm border border-border"
        style={{ backgroundColor: value }}
        aria-hidden
      />
      <input
        type="color"
        value={toHex(value)}
        onChange={(e) => onChange(e.target.value)}
        onDoubleClick={onClear}
        className="absolute inset-0 opacity-0 cursor-pointer"
        aria-label={title}
      />
    </label>
  );
}

function toHex(color: string): string {
  if (!color) return '#000000';
  if (color.startsWith('#') && (color.length === 4 || color.length === 7)) return color;
  return '#000000';
}
