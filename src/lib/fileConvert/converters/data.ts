// 데이터 형식 변환 — JSON ↔ YAML

let yamlPromise: Promise<typeof import('yaml')> | null = null;
function loadYaml() {
  if (!yamlPromise) yamlPromise = import('yaml');
  return yamlPromise;
}

function baseName(name: string): string {
  return name.replace(/\.[^.]+$/, '');
}

export async function convertJsonToYaml(file: File): Promise<{ blob: Blob; suggestedName: string; previewText: string }> {
  const text = await file.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    throw new Error(`JSON 파싱 실패: ${(e as Error).message}`);
  }
  const yaml = await loadYaml();
  const out = yaml.stringify(parsed, { lineWidth: 0 });
  const blob = new Blob([out], { type: 'text/yaml;charset=utf-8' });
  return {
    blob,
    suggestedName: `${baseName(file.name)}.yaml`,
    previewText: out.slice(0, 500),
  };
}

export async function convertYamlToJson(file: File): Promise<{ blob: Blob; suggestedName: string; previewText: string }> {
  const text = await file.text();
  const yaml = await loadYaml();
  let parsed: unknown;
  try {
    parsed = yaml.parse(text);
  } catch (e) {
    throw new Error(`YAML 파싱 실패: ${(e as Error).message}`);
  }
  const out = JSON.stringify(parsed, null, 2);
  const blob = new Blob([out], { type: 'application/json;charset=utf-8' });
  return {
    blob,
    suggestedName: `${baseName(file.name)}.json`,
    previewText: out.slice(0, 500),
  };
}

// ───── TXT → PDF ─────
let jspdfPromise: Promise<typeof import('jspdf')> | null = null;
function loadJsPdf() {
  if (!jspdfPromise) jspdfPromise = import('jspdf');
  return jspdfPromise;
}

export async function convertTxtToPdf(file: File): Promise<{ blob: Blob; suggestedName: string }> {
  const text = await file.text();
  const { jsPDF } = await loadJsPdf();
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 48;
  const fontSize = 11;
  const lineHeight = fontSize * 1.5;
  const usableWidth = pageWidth - margin * 2;
  // Helvetica는 한글 미지원 — system default + jsPDF 가 자동 wrap
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(fontSize);

  // 줄 단위 wrap (한글 안전 처리)
  const allLines: string[] = [];
  for (const rawLine of text.split('\n')) {
    if (rawLine.trim().length === 0) {
      allLines.push('');
      continue;
    }
    const wrapped = pdf.splitTextToSize(rawLine, usableWidth) as string[];
    allLines.push(...wrapped);
  }

  let y = margin;
  for (const line of allLines) {
    if (y + lineHeight > pageHeight - margin) {
      pdf.addPage();
      y = margin;
    }
    pdf.text(line, margin, y);
    y += lineHeight;
  }

  const arrayBuffer = pdf.output('arraybuffer');
  const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
  return { blob, suggestedName: `${baseName(file.name)}.pdf` };
}
