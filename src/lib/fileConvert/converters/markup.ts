// Markdown ↔ HTML 변환 (lazy import)

let markedPromise: Promise<typeof import('marked')> | null = null;
let turndownPromise: Promise<typeof import('turndown')> | null = null;

function loadMarked() {
  if (!markedPromise) markedPromise = import('marked');
  return markedPromise;
}

function loadTurndown() {
  if (!turndownPromise) turndownPromise = import('turndown');
  return turndownPromise;
}

export async function mdToHtml(md: string): Promise<string> {
  const { marked } = await loadMarked();
  const html = await marked.parse(md, { gfm: true, breaks: false });
  // 기본 HTML 문서 틀로 감싸기
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>Converted</title>
<style>body{max-width:780px;margin:2rem auto;padding:0 1rem;font-family:system-ui,sans-serif;line-height:1.7;color:#1e293b}h1,h2,h3{margin-top:1.5em}code{background:#f1f5f9;padding:2px 4px;border-radius:3px}pre{background:#0f172a;color:#e2e8f0;padding:1rem;border-radius:6px;overflow-x:auto}blockquote{border-left:3px solid #cbd5e1;padding-left:1rem;color:#475569}table{border-collapse:collapse}th,td{border:1px solid #cbd5e1;padding:4px 8px}</style>
</head>
<body>
${html}
</body>
</html>`;
}

export async function htmlToMd(html: string): Promise<string> {
  const { default: TurndownService } = await loadTurndown();
  const service = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-',
  });
  return service.turndown(html);
}

export async function convertMdFileToHtml(file: File): Promise<{ blob: Blob; suggestedName: string }> {
  const text = await file.text();
  const html = await mdToHtml(text);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const base = file.name.replace(/\.(md|markdown)$/i, '');
  return { blob, suggestedName: `${base}.html` };
}

export async function convertHtmlFileToMd(file: File): Promise<{ blob: Blob; suggestedName: string }> {
  const text = await file.text();
  const md = await htmlToMd(text);
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  const base = file.name.replace(/\.(html|htm)$/i, '');
  return { blob, suggestedName: `${base}.md` };
}
