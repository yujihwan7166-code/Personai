/**
 * 클립보드 복사 유틸 — Async Clipboard API + 옛 브라우저 fallback.
 *
 * 25+ 곳에서 inline 으로 navigator.clipboard.writeText 호출 + try/catch 반복.
 * 한 곳 모음 + textarea fallback 으로 비-https / 일부 옛 환경 호환.
 *
 * 사용:
 *   const ok = await copyText('hello');
 *   if (ok) toast({ title: '복사됨' });
 */

/**
 * 텍스트 복사. 성공 시 true, 실패 시 false (예외 던지지 않음).
 */
export async function copyText(text: string): Promise<boolean> {
  // 1. Async Clipboard API — https / localhost 에서 가장 안전.
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fallthrough
    }
  }

  // 2. textarea + execCommand('copy') fallback.
  if (typeof document === 'undefined') return false;
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    ta.style.top = '0';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

/**
 * HTML 도 함께 복사 (텍스트 + HTML — 이메일·문서 붙여넣기에 서식 포함).
 * 실패 시 plain text 만으로 fallback.
 */
export async function copyRich(html: string, plain?: string): Promise<boolean> {
  const fallbackText = plain ?? html.replace(/<[^>]+>/g, '');
  if (typeof navigator !== 'undefined' && navigator.clipboard?.write && typeof ClipboardItem !== 'undefined') {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([fallbackText], { type: 'text/plain' }),
        }),
      ]);
      return true;
    } catch {
      // fallthrough
    }
  }
  return copyText(fallbackText);
}
