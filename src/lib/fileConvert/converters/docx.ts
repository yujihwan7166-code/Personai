// DOCX 변환: TXT / Markdown / HTML
// mammoth 재활용

let mammothPromise: Promise<typeof import('mammoth/mammoth.browser')> | null = null;
function loadMammoth() {
  if (!mammothPromise) mammothPromise = import('mammoth/mammoth.browser');
  return mammothPromise;
}

function baseName(name: string): string {
  return name.replace(/\.[^.]+$/, '');
}

export async function convertDocxToText(file: File): Promise<{ blob: Blob; suggestedName: string }> {
  const mammoth = await loadMammoth();
  const buf = await file.arrayBuffer();
  const res = await mammoth.extractRawText({ arrayBuffer: buf });
  const blob = new Blob([res.value], { type: 'text/plain;charset=utf-8' });
  return { blob, suggestedName: `${baseName(file.name)}.txt` };
}

export async function convertDocxToMarkdown(file: File): Promise<{ blob: Blob; suggestedName: string }> {
  const mammoth = await loadMammoth();
  const buf = await file.arrayBuffer();
  // mammoth는 Markdown 직접 지원 안 함 → HTML 변환 후 경량 변환
  const res = await mammoth.convertToHtml({ arrayBuffer: buf });
  const md = await htmlToMarkdown(res.value);
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  return { blob, suggestedName: `${baseName(file.name)}.md` };
}

export async function convertDocxToHtml(file: File): Promise<{ blob: Blob; suggestedName: string }> {
  const mammoth = await loadMammoth();
  const buf = await file.arrayBuffer();
  const res = await mammoth.convertToHtml({ arrayBuffer: buf });
  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>${baseName(file.name)}</title>
<style>body{max-width:780px;margin:2rem auto;padding:0 1rem;font-family:system-ui,sans-serif;line-height:1.7;color:#1e293b}h1,h2,h3{margin-top:1.5em}table{border-collapse:collapse;margin:1em 0}th,td{border:1px solid #cbd5e1;padding:4px 8px}</style>
</head>
<body>
${res.value}
</body>
</html>`;
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  return { blob, suggestedName: `${baseName(file.name)}.html` };
}

async function htmlToMarkdown(html: string): Promise<string> {
  const { default: TurndownService } = await import('turndown');
  const service = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-',
  });
  return service.turndown(html);
}
