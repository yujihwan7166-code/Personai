// 파일 변환 태스크 카탈로그 — 각 태스크는 독립적 변환 단위
// ID는 URL-safe한 kebab-case. 카테고리·Quick Action 여부·예상 소요시간 메타 포함.

export type TaskCategory = 'pdf' | 'image' | 'doc' | 'data' | 'markup';
export type TaskTier = 'native' | 'ai-assisted' | 'lossy';

export interface ConvertTask {
  id: string;
  label: string;
  category: TaskCategory;
  icon: string;
  description: string;
  // 허용 확장자 (magic bytes 삼중 감지의 보조 데이터)
  accept: string[];
  // 여러 파일을 받는지 (PDF 병합 등)
  multiFile: boolean;
  // 품질 등급
  tier: TaskTier;
  // 예상 소요시간 설명 (사용자용)
  estimatedTime: string;
  // Quick Actions 후보 여부
  quickAction?: boolean;
}

export const TASKS: ConvertTask[] = [
  // ───── 이미지 ─────
  {
    id: 'image-format',
    label: '이미지 포맷 변환',
    category: 'image',
    icon: '🖼️',
    description: 'JPG·PNG·WEBP 서로 변환',
    accept: ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.heic'],
    multiFile: false,
    tier: 'native',
    estimatedTime: '1초 이내',
    quickAction: true,
  },
  {
    id: 'image-to-pdf',
    label: '이미지를 PDF로',
    category: 'image',
    icon: '📄',
    description: '여러 이미지를 하나의 PDF로 묶어요',
    accept: ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.heic'],
    multiFile: true,
    tier: 'native',
    estimatedTime: '2~3초',
    quickAction: true,
  },
  {
    id: 'image-to-text',
    label: '이미지에서 텍스트 추출',
    category: 'image',
    icon: '🔍',
    description: 'AI OCR로 이미지 속 글자를 읽어요',
    accept: ['.jpg', '.jpeg', '.png', '.webp'],
    multiFile: false,
    tier: 'ai-assisted',
    estimatedTime: '5~15초',
    quickAction: true,
  },

  // ───── PDF ─────
  {
    id: 'pdf-merge',
    label: 'PDF 합치기',
    category: 'pdf',
    icon: '🔗',
    description: '여러 PDF를 하나로 병합',
    accept: ['.pdf'],
    multiFile: true,
    tier: 'native',
    estimatedTime: '2~5초',
    quickAction: true,
  },
  {
    id: 'pdf-split',
    label: 'PDF 분할',
    category: 'pdf',
    icon: '✂️',
    description: '페이지 범위를 골라 분리',
    accept: ['.pdf'],
    multiFile: false,
    tier: 'native',
    estimatedTime: '2~5초',
  },
  {
    id: 'pdf-compress',
    label: 'PDF 압축',
    category: 'pdf',
    icon: '🗜️',
    description: '파일 크기를 줄여요 (이미지 재인코딩)',
    accept: ['.pdf'],
    multiFile: false,
    tier: 'lossy',
    estimatedTime: '15~30초',
    quickAction: true,
  },
  {
    id: 'pdf-to-images',
    label: 'PDF를 이미지로',
    category: 'pdf',
    icon: '🖼️',
    description: '페이지별 JPG·PNG 추출',
    accept: ['.pdf'],
    multiFile: false,
    tier: 'native',
    estimatedTime: '페이지당 1~2초',
    quickAction: true,
  },
  {
    id: 'pdf-to-text',
    label: 'PDF에서 텍스트 추출',
    category: 'pdf',
    icon: '📝',
    description: 'PDF 본문을 텍스트로',
    accept: ['.pdf'],
    multiFile: false,
    tier: 'lossy',
    estimatedTime: '1~5초',
  },

  // ───── 문서 ─────
  {
    id: 'docx-to-text',
    label: 'Word를 텍스트로',
    category: 'doc',
    icon: '📝',
    description: 'DOCX에서 순수 텍스트 추출',
    accept: ['.docx'],
    multiFile: false,
    tier: 'native',
    estimatedTime: '1~2초',
  },
  {
    id: 'docx-to-markdown',
    label: 'Word를 Markdown으로',
    category: 'doc',
    icon: '⬇️',
    description: '제목·목록 구조 유지해서 MD로',
    accept: ['.docx'],
    multiFile: false,
    tier: 'native',
    estimatedTime: '1~2초',
  },
  {
    id: 'docx-to-html',
    label: 'Word를 HTML로',
    category: 'doc',
    icon: '🌐',
    description: '웹에 붙여넣을 HTML 생성',
    accept: ['.docx'],
    multiFile: false,
    tier: 'native',
    estimatedTime: '1~2초',
  },

  // ───── 스프레드시트 ─────
  {
    id: 'xlsx-to-csv',
    label: 'Excel을 CSV로',
    category: 'data',
    icon: '📊',
    description: 'XLSX → CSV (Excel 호환 BOM 포함)',
    accept: ['.xlsx', '.xls'],
    multiFile: false,
    tier: 'native',
    estimatedTime: '1초 이내',
    quickAction: true,
  },
  {
    id: 'csv-to-xlsx',
    label: 'CSV를 Excel로',
    category: 'data',
    icon: '📈',
    description: 'CSV → XLSX (한글 인코딩 자동 감지)',
    accept: ['.csv', '.tsv'],
    multiFile: false,
    tier: 'native',
    estimatedTime: '1초 이내',
  },
  {
    id: 'xlsx-to-json',
    label: 'Excel을 JSON으로',
    category: 'data',
    icon: '🔤',
    description: '행 단위 객체 배열로',
    accept: ['.xlsx', '.xls'],
    multiFile: false,
    tier: 'native',
    estimatedTime: '1초 이내',
  },

  // ───── 마크업 ─────
  {
    id: 'md-to-html',
    label: 'Markdown을 HTML로',
    category: 'markup',
    icon: '🌐',
    description: 'MD 문법을 HTML 태그로',
    accept: ['.md', '.markdown'],
    multiFile: false,
    tier: 'native',
    estimatedTime: '1초 이내',
  },
  {
    id: 'html-to-md',
    label: 'HTML을 Markdown으로',
    category: 'markup',
    icon: '⬇️',
    description: '웹 HTML을 MD 문법으로',
    accept: ['.html', '.htm'],
    multiFile: false,
    tier: 'native',
    estimatedTime: '1초 이내',
  },
];

export const CATEGORY_LABELS: Record<TaskCategory, string> = {
  pdf: 'PDF 도구',
  image: '이미지 도구',
  doc: '문서 변환',
  data: '스프레드시트·데이터',
  markup: '마크업',
};

export function getTaskById(id: string): ConvertTask | undefined {
  return TASKS.find((t) => t.id === id);
}

export function getQuickActions(): ConvertTask[] {
  return TASKS.filter((t) => t.quickAction);
}

export function getTasksByCategory(category: TaskCategory): ConvertTask[] {
  return TASKS.filter((t) => t.category === category);
}

export function getTasksForFile(extension: string): ConvertTask[] {
  const ext = extension.toLowerCase().startsWith('.') ? extension.toLowerCase() : `.${extension.toLowerCase()}`;
  return TASKS.filter((t) => t.accept.includes(ext));
}
