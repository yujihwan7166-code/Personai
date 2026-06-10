export const estimateWhiteboardTextWidth = (value: string, fontSize: number): number => {
  let total = 0;
  for (const ch of value || ' ') {
    if (ch === ' ') total += fontSize * 0.35;
    else if (/[ -~]/.test(ch)) total += fontSize * 0.56;
    else total += fontSize * 0.92;
  }
  return total;
};

export const estimateWrappedLineCount = (
  value: string,
  fontSize: number,
  usableWidth: number,
): number => {
  const safeWidth = Math.max(1, usableWidth);
  return (value || ' ')
    .split('\n')
    .reduce((sum, line) => sum + Math.max(1, Math.ceil(estimateWhiteboardTextWidth(line, fontSize) / safeWidth)), 0);
};
