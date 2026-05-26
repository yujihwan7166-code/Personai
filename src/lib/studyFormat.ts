export function formatStudyCharCount(value: number): string {
  const count = Math.max(0, Math.round(value));
  if (count >= 1000) return `${Math.round(count / 100) / 10}K자`;
  return `${count}자`;
}
