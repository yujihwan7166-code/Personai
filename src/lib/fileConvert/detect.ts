// 파일 타입 삼중 감지: Magic bytes > MIME > 확장자

export type FileFormat = 'pdf' | 'png' | 'jpg' | 'webp' | 'gif' | 'heic' | 'docx' | 'xlsx' | 'zip' | 'csv' | 'json' | 'md' | 'html' | 'txt' | 'unknown';

// 첫 N바이트 읽기
async function readHeader(file: File | Blob, n = 16): Promise<Uint8Array> {
  const slice = file.slice(0, n);
  const buf = await slice.arrayBuffer();
  return new Uint8Array(buf);
}

function bytesStartWith(bytes: Uint8Array, signature: number[]): boolean {
  if (bytes.length < signature.length) return false;
  return signature.every((b, i) => bytes[i] === b);
}

// DOCX/XLSX는 ZIP이라 magic만으론 구분 불가 — 확장자·MIME 보조
async function detectByMagic(file: File | Blob): Promise<FileFormat | null> {
  const h = await readHeader(file, 16);
  if (bytesStartWith(h, [0x25, 0x50, 0x44, 0x46])) return 'pdf'; // %PDF
  if (bytesStartWith(h, [0x89, 0x50, 0x4E, 0x47])) return 'png';
  if (bytesStartWith(h, [0xFF, 0xD8, 0xFF])) return 'jpg';
  if (bytesStartWith(h, [0x47, 0x49, 0x46, 0x38])) return 'gif'; // GIF8
  if (bytesStartWith(h.slice(0, 4), [0x52, 0x49, 0x46, 0x46]) && bytesStartWith(h.slice(8, 12), [0x57, 0x45, 0x42, 0x50])) return 'webp';
  // HEIC: offset 4 이후 ftypheic/ftypheix/ftypmif1/ftypmsf1
  if (h.length >= 12 && h[4] === 0x66 && h[5] === 0x74 && h[6] === 0x79 && h[7] === 0x70) {
    const brand = String.fromCharCode(h[8], h[9], h[10], h[11]);
    if (['heic', 'heix', 'mif1', 'msf1', 'heis'].includes(brand)) return 'heic';
  }
  if (bytesStartWith(h, [0x50, 0x4B, 0x03, 0x04])) return 'zip'; // DOCX/XLSX/ZIP 공통
  return null;
}

function detectByExtension(name: string): FileFormat | null {
  const ext = name.toLowerCase().split('.').pop() ?? '';
  const map: Record<string, FileFormat> = {
    pdf: 'pdf', png: 'png', jpg: 'jpg', jpeg: 'jpg', webp: 'webp', gif: 'gif', heic: 'heic', heif: 'heic',
    docx: 'docx', xlsx: 'xlsx', xls: 'xlsx',
    csv: 'csv', tsv: 'csv', json: 'json',
    md: 'md', markdown: 'md',
    html: 'html', htm: 'html',
    txt: 'txt',
  };
  return map[ext] ?? null;
}

// 메인 감지 함수
export async function detectFormat(file: File): Promise<FileFormat> {
  const magic = await detectByMagic(file);
  const byExt = detectByExtension(file.name);

  // ZIP magic이면 확장자로 DOCX/XLSX 구분
  if (magic === 'zip') {
    if (byExt === 'docx' || byExt === 'xlsx') return byExt;
    return 'zip';
  }

  if (magic) return magic;
  if (byExt) return byExt;
  return 'unknown';
}

export function extensionOf(format: FileFormat): string {
  const map: Record<FileFormat, string> = {
    pdf: '.pdf', png: '.png', jpg: '.jpg', webp: '.webp', gif: '.gif', heic: '.heic',
    docx: '.docx', xlsx: '.xlsx', zip: '.zip',
    csv: '.csv', json: '.json', md: '.md', html: '.html', txt: '.txt',
    unknown: '',
  };
  return map[format];
}

export function formatLabel(format: FileFormat): string {
  const map: Record<FileFormat, string> = {
    pdf: 'PDF', png: 'PNG', jpg: 'JPG', webp: 'WEBP', gif: 'GIF', heic: 'HEIC',
    docx: 'Word', xlsx: 'Excel', zip: 'ZIP',
    csv: 'CSV', json: 'JSON', md: 'Markdown', html: 'HTML', txt: '텍스트',
    unknown: '알 수 없음',
  };
  return map[format];
}
