/** 수식 함수 popover — 시그니처 hint + prefix 매치 후보 리스트. */

import { useCallback, useMemo } from 'react';
import { FUNC_HELP } from '@/lib/cloudSheet/formula';

/**
 * 마지막 미닫힌 `(` 이후 입력 텍스트를 보고, 현재 입력 중인 인자 인덱스(0-based)를 추정.
 * 중첩 괄호와 따옴표 안 콤마는 무시한다.
 */
function currentArgIdx(valueAfterOpen: string): number {
  let depth = 0;
  let idx = 0;
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < valueAfterOpen.length; i++) {
    const c = valueAfterOpen[i];
    if (inSingle) { if (c === "'") inSingle = false; continue; }
    if (inDouble) { if (c === '"') inDouble = false; continue; }
    if (c === "'") { inSingle = true; continue; }
    if (c === '"') { inDouble = true; continue; }
    if (c === '(') depth++;
    else if (c === ')') depth--;
    else if (c === ',' && depth === 0) idx++;
  }
  return idx;
}

/** sig 문자열에서 `NAME(arg1, arg2, ...)` 를 [name, [arg1, arg2, ...]] 로 분리 */
function splitSig(sig: string): { name: string; args: string[] } | null {
  const m = sig.match(/^([A-Z_][A-Z0-9_]*)\((.*)\)$/i);
  if (!m) return null;
  const name = m[1];
  const argsStr = m[2].trim();
  if (!argsStr) return { name, args: [] };
  // 중첩 괄호 안 콤마는 무시. 따옴표 안도.
  const args: string[] = [];
  let buf = '';
  let depth = 0;
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < argsStr.length; i++) {
    const c = argsStr[i];
    if (inSingle) { buf += c; if (c === "'") inSingle = false; continue; }
    if (inDouble) { buf += c; if (c === '"') inDouble = false; continue; }
    if (c === "'") { buf += c; inSingle = true; continue; }
    if (c === '"') { buf += c; inDouble = true; continue; }
    if (c === '(') { depth++; buf += c; continue; }
    if (c === ')') { depth--; buf += c; continue; }
    if (c === ',' && depth === 0) {
      args.push(buf.trim());
      buf = '';
    } else buf += c;
  }
  if (buf.trim()) args.push(buf.trim());
  return { name, args };
}

/** 입력 끝의 함수 prefix 로 매치되는 후보 (정렬: 짧은 이름 우선) */
export function getFuncSuggestionNames(value: string): string[] {
  if (!value.startsWith('=')) return [];
  // 미닫힌 ( 가 있으면 시그니처 hint 모드 — 후보 X
  const lastOpen = value.lastIndexOf('(');
  const lastClose = value.lastIndexOf(')');
  if (lastOpen > lastClose) return [];
  const tail = value.slice(1).match(/([A-Z]+)$/i);
  if (!tail) return [];
  const prefix = tail[1].toUpperCase();
  return Object.keys(FUNC_HELP)
    .filter((k) => k.startsWith(prefix))
    .sort((a, b) => a.length - b.length || a.localeCompare(b));
}

/** 입력 끝의 알파벳 prefix 를 NAME( 으로 교체 */
export function applyFuncSuggestion(value: string, name: string): string {
  const m = value.match(/([A-Za-z]+)$/);
  if (!m) return value;
  const before = value.slice(0, value.length - m[1].length);
  return `${before}${name}(`;
}

interface FuncHintPopoverProps {
  value: string;
  /** 후보 클릭 시 입력값 교체 (부모가 textarea/input 값 갱신). */
  onReplaceValue?: (next: string) => void;
}

export function FuncHintPopover({ value, onReplaceValue }: FuncHintPopoverProps) {
  /** 함수( 안 — 시그니처 hint + 현재 인자 인덱스 */
  const sigHint = useMemo(() => {
    if (!value.startsWith('=')) return null;
    const lastOpen = value.lastIndexOf('(');
    const lastClose = value.lastIndexOf(')');
    if (lastOpen <= lastClose) return null;
    const beforeOpen = value.slice(0, lastOpen);
    const m = beforeOpen.match(/([A-Z]+)$/i);
    if (!m) return null;
    const name = m[1].toUpperCase();
    if (!FUNC_HELP[name]) return null;
    const afterOpen = value.slice(lastOpen + 1);
    const argIdx = currentArgIdx(afterOpen);
    return { name, ...FUNC_HELP[name], argIdx };
  }, [value]);

  /** 미닫힌 ( 가 없을 때 — 입력 끝의 함수 prefix 로 후보 리스트 (최대 8) */
  const suggestions = useMemo(() => {
    if (sigHint) return [];
    return getFuncSuggestionNames(value).slice(0, 8).map((name) => ({ name, ...FUNC_HELP[name] }));
  }, [value, sigHint]);

  /** 후보 클릭 시 입력값에서 끝 prefix 를 NAME( 로 교체 */
  const pick = useCallback((name: string) => {
    if (!onReplaceValue) return;
    onReplaceValue(applyFuncSuggestion(value, name));
  }, [value, onReplaceValue]);

  if (sigHint) {
    const split = splitSig(sigHint.sig);
    return (
      <div
        className="absolute left-0 top-full mt-0.5 z-50 rounded border border-border bg-popover shadow-md px-2 py-1 text-xs whitespace-nowrap pointer-events-none"
        role="tooltip"
      >
        {split ? (
          <span className="font-mono">
            <span className="font-medium">{split.name}</span>
            <span>(</span>
            {split.args.map((arg, i) => (
              <span key={i}>
                <span
                  className={
                    i === sigHint.argIdx
                      ? 'font-bold text-foreground bg-foreground/10 rounded px-1'
                      : 'text-muted-foreground'
                  }
                >
                  {arg}
                </span>
                {i < split.args.length - 1 && <span className="text-muted-foreground">, </span>}
              </span>
            ))}
            <span>)</span>
          </span>
        ) : (
          <span className="font-mono font-medium">{sigHint.sig}</span>
        )}
        <span className="text-muted-foreground ml-2">{sigHint.desc}</span>
      </div>
    );
  }
  if (suggestions.length === 0) return null;
  return (
    <div
      className="absolute left-0 top-full mt-0.5 z-50 rounded border border-border bg-popover shadow-md py-1 text-xs min-w-[260px] max-w-[360px]"
      role="listbox"
      aria-label="함수 자동완성 후보"
      onPointerDown={(e) => e.stopPropagation()}
    >
      {suggestions.map((s) => (
        <button
          key={s.name}
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => { e.preventDefault(); pick(s.name); }}
          className="w-full text-left px-2 py-1 hover:bg-muted flex items-center gap-2"
          title={`${s.sig} — ${s.desc}`}
          role="option"
        >
          <span className="font-mono font-medium w-20 shrink-0 truncate">{s.name}</span>
          <span className="font-mono text-muted-foreground truncate flex-1">{s.sig}</span>
        </button>
      ))}
    </div>
  );
}
