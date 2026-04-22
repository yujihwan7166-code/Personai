// 에러 유형 → 사용자용 메시지·재시도 경로 매핑
// 각 모듈의 catch 블록은 이 catalog를 사용해 일관된 UX 제공.

export type ErrorKind =
  | 'network'
  | 'quota'
  | 'server'
  | 'timeout'
  | 'unauthorized'
  | 'file-too-large'
  | 'unsupported-format'
  | 'password-pdf'
  | 'scanned-pdf'
  | 'empty-result'
  | 'cancel'
  | 'unknown';

export interface ErrorDescriptor {
  kind: ErrorKind;
  title: string;
  description: string;
  /** 주 액션 (보통 "다시 시도") */
  primary?: { label: string };
  /** 보조 액션 (보통 "다른 방법") */
  secondary?: { label: string };
  /** 도움말·문서 링크 */
  help?: { label: string; href?: string };
}

const CATALOG: Record<ErrorKind, Omit<ErrorDescriptor, 'kind'>> = {
  network: {
    title: '네트워크에 연결되지 않았어요',
    description: '인터넷 연결을 확인하고 다시 시도해 주세요.',
    primary: { label: '다시 시도' },
  },
  quota: {
    title: '오늘 사용 한도에 도달했어요',
    description: '내일 자정에 한도가 초기화돼요.',
    primary: { label: '확인' },
  },
  server: {
    title: '서버에 문제가 있어요',
    description: '잠시 후 다시 시도해 주세요. 같은 문제가 반복되면 문의해 주세요.',
    primary: { label: '다시 시도' },
  },
  timeout: {
    title: '처리 시간이 너무 오래 걸렸어요',
    description: '네트워크 상태를 확인하거나 더 작은 입력으로 다시 시도해 주세요.',
    primary: { label: '다시 시도' },
  },
  unauthorized: {
    title: '인증이 필요해요',
    description: '다시 로그인한 뒤 시도해 주세요.',
    primary: { label: '로그인' },
  },
  'file-too-large': {
    title: '파일이 너무 커요',
    description: '브라우저에서 처리 가능한 크기를 넘었어요. 파일을 나누거나 크기를 줄여 주세요.',
    secondary: { label: '다른 파일 선택' },
  },
  'unsupported-format': {
    title: '지원하지 않는 포맷이에요',
    description: '현재 지원하는 형식 중에서 선택해 주세요.',
    secondary: { label: '다른 파일 선택' },
  },
  'password-pdf': {
    title: '암호가 걸린 PDF예요',
    description: '브라우저에서 바로 처리할 수 없어요. 암호를 풀어 다시 올리거나 다른 파일을 선택해 주세요.',
    secondary: { label: '다른 파일 선택' },
  },
  'scanned-pdf': {
    title: '텍스트가 없는 PDF예요 (스캔본)',
    description: 'AI OCR로 텍스트를 읽어낼 수 있어요. 시간은 약 20~60초 걸려요.',
    primary: { label: 'AI OCR 실행' },
    secondary: { label: '취소' },
  },
  'empty-result': {
    title: '결과가 비어 있어요',
    description: '입력을 확인하고 다시 시도해 주세요.',
    primary: { label: '다시 시도' },
  },
  cancel: {
    title: '작업을 취소했어요',
    description: '언제든 다시 시도할 수 있어요.',
  },
  unknown: {
    title: '문제가 생겼어요',
    description: '잠시 후 다시 시도해 주세요.',
    primary: { label: '다시 시도' },
  },
};

// Error 메시지 문자열을 kind로 휴리스틱 매핑
export function classifyError(err: unknown): ErrorKind {
  const msg = err instanceof Error ? err.message : String(err ?? '');
  const lower = msg.toLowerCase();
  if (lower.includes('abort') || lower.includes('cancel')) return 'cancel';
  if (lower.includes('429') || lower.includes('한도') || lower.includes('quota')) return 'quota';
  if (lower.includes('401') || lower.includes('unauthorized')) return 'unauthorized';
  if (lower.includes('timeout') || lower.includes('시간이')) return 'timeout';
  if (lower.includes('network') || lower.includes('networkerror') || lower.includes('fetch')) return 'network';
  if (lower.includes('500') || lower.includes('502') || lower.includes('503') || lower.includes('서버')) return 'server';
  if (lower.includes('password') || lower.includes('encrypt') || lower.includes('암호')) return 'password-pdf';
  if (lower.includes('너무 커') || lower.includes('too large')) return 'file-too-large';
  if (lower.includes('지원하지 않') || lower.includes('unsupported')) return 'unsupported-format';
  if (lower.includes('비어')) return 'empty-result';
  return 'unknown';
}

export function describeError(err: unknown, override?: Partial<ErrorDescriptor>): ErrorDescriptor {
  const kind = override?.kind ?? classifyError(err);
  const base = CATALOG[kind];
  return { kind, ...base, ...override };
}
