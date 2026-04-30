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

// ───── HTML → PDF ─────
// 입력 HTML 파일을 그대로 렌더 → html2canvas → jsPDF a4 분할
export async function convertHtmlFileToPdf(file: File): Promise<{ blob: Blob; suggestedName: string }> {
  const text = await file.text();
  // 임시 div 에 렌더 (외부 리소스 제한)
  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'position:absolute;left:-99999px;top:0;width:780px;background:#ffffff;color:#1e293b;font-family:system-ui,-apple-system,Noto Sans KR,sans-serif;padding:48px;line-height:1.6;';
  // body 내부만 추출 (외부 head 무시)
  const parser = new DOMParser();
  const docHtml = parser.parseFromString(text, 'text/html');
  wrapper.innerHTML = docHtml.body.innerHTML;
  document.body.appendChild(wrapper);
  try {
    const html2canvas = (await loadHtml2Canvas()).default;
    const { jsPDF } = await loadJsPdf();
    const canvas = await html2canvas(wrapper, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
      windowWidth: 780,
      logging: false,
    });
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
    heightLeft -= pageHeight;
    while (heightLeft > 0) {
      position -= pageHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pageHeight;
    }
    const arrayBuffer = pdf.output('arraybuffer');
    const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
    const base = file.name.replace(/\.(html|htm)$/i, '');
    return { blob, suggestedName: `${base}.pdf` };
  } finally {
    wrapper.remove();
  }
}

// ───── Markdown → PDF ─────
// 전략: Markdown → HTML → DOM 렌더 → html2canvas → jsPDF
// 라이브러리: html2canvas, jspdf (이미 있음)
let html2canvasPromise: Promise<typeof import('html2canvas')> | null = null;
function loadHtml2Canvas() {
  if (!html2canvasPromise) html2canvasPromise = import('html2canvas');
  return html2canvasPromise;
}
let jspdfPromise: Promise<typeof import('jspdf')> | null = null;
function loadJsPdf() {
  if (!jspdfPromise) jspdfPromise = import('jspdf');
  return jspdfPromise;
}

export async function convertMdFileToPdf(file: File): Promise<{ blob: Blob; suggestedName: string }> {
  const text = await file.text();
  const html = await mdToHtml(text);
  // 임시 div 에 렌더 → html2canvas 로 캡처 → jsPDF
  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'position:absolute;left:-99999px;top:0;width:780px;background:#ffffff;color:#1e293b;font-family:system-ui,-apple-system,Noto Sans KR,sans-serif;padding:48px;line-height:1.7;';
  // mdToHtml 이 만든 <html><body>... 에서 body 안만 추출
  const parser = new DOMParser();
  const docHtml = parser.parseFromString(html, 'text/html');
  wrapper.innerHTML = docHtml.body.innerHTML;
  // 인라인 스타일 보강 (페이지 분리 friendly)
  const style = document.createElement('style');
  style.textContent = `
    h1,h2,h3{margin-top:1.4em;break-after:avoid}
    p,ul,ol,blockquote,pre,table{break-inside:avoid}
    code{background:#f1f5f9;padding:2px 4px;border-radius:3px;font-family:Menlo,Consolas,monospace;font-size:0.9em}
    pre{background:#0f172a;color:#e2e8f0;padding:1rem;border-radius:6px;overflow-x:auto;font-size:0.85em}
    blockquote{border-left:3px solid #cbd5e1;padding-left:1rem;color:#475569;margin:1em 0}
    table{border-collapse:collapse;width:100%}
    th,td{border:1px solid #cbd5e1;padding:6px 10px;text-align:left}
    th{background:#f8fafc}
    img{max-width:100%}
  `;
  wrapper.prepend(style);
  document.body.appendChild(wrapper);
  try {
    const html2canvas = (await loadHtml2Canvas()).default;
    const { jsPDF } = await loadJsPdf();
    const canvas = await html2canvas(wrapper, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
      windowWidth: 780,
      logging: false,
    });
    // jsPDF a4 — 페이지 분할
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
    heightLeft -= pageHeight;
    while (heightLeft > 0) {
      position -= pageHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pageHeight;
    }
    const arrayBuffer = pdf.output('arraybuffer');
    const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
    const base = file.name.replace(/\.(md|markdown)$/i, '');
    return { blob, suggestedName: `${base}.pdf` };
  } finally {
    wrapper.remove();
  }
}
