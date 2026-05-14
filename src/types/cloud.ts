/**
 * 클라우드 모드 도메인 타입.
 *
 * Supabase row 와 1:1 매핑되지 않고 camelCase 로 변환한 클라이언트 형태.
 * row 변환은 rowToCloudNode() 사용. 역방향(insert payload) 은 cloudStore 에서.
 */

export type CloudNodeKind = 'file' | 'folder';

export type CloudFileType = 'doc' | 'sheet' | 'slide' | 'pdf' | 'image' | 'other';

export interface CloudNode {
  id: string;
  ownerId: string;
  parentFolderId: string | null;
  kind: CloudNodeKind;
  name: string;
  fileType: CloudFileType | null;
  mimeType: string | null;
  sizeBytes: number | null;
  /** 변환·자체 포맷 파일 경로 (cloud-files 버킷). */
  storagePath: string | null;
  /** 원본 백업 경로 (cloud-originals 버킷). 변환 시 첫 업로드 1회만 저장. */
  originalStoragePath: string | null;
  /** 에디터별 자체 포맷 데이터 (슬라이드 JSON, 시트 데이터 등). */
  meta: Record<string, unknown>;
  starred: boolean;
  /** ISO 8601. NULL=정상, 값 있으면 휴지통(30일 후 자동 영구 삭제). */
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Supabase row → 도메인 객체. */
export interface CloudNodeRow {
  id: string;
  owner_id: string;
  parent_folder_id: string | null;
  kind: string;
  name: string;
  file_type: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  storage_path: string | null;
  original_storage_path: string | null;
  meta: Record<string, unknown> | null;
  starred: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export function rowToCloudNode(row: CloudNodeRow): CloudNode {
  return {
    id: row.id,
    ownerId: row.owner_id,
    parentFolderId: row.parent_folder_id,
    kind: row.kind as CloudNodeKind,
    name: row.name,
    fileType: row.file_type as CloudFileType | null,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    storagePath: row.storage_path,
    originalStoragePath: row.original_storage_path,
    meta: row.meta ?? {},
    starred: row.starred,
    deletedAt: row.deleted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** MIME 타입 → 파일 종류. */
export function fileTypeFromMime(mime: string | null | undefined): CloudFileType {
  if (!mime) return 'other';
  if (mime.startsWith('application/vnd.openxmlformats-officedocument.wordprocessingml')) return 'doc';
  if (mime === 'application/msword') return 'doc';
  if (mime.startsWith('application/vnd.openxmlformats-officedocument.spreadsheetml')) return 'sheet';
  if (mime === 'application/vnd.ms-excel') return 'sheet';
  if (mime.startsWith('application/vnd.openxmlformats-officedocument.presentationml')) return 'slide';
  if (mime === 'application/vnd.ms-powerpoint') return 'slide';
  if (mime === 'application/pdf') return 'pdf';
  if (mime.startsWith('image/')) return 'image';
  return 'other';
}

/** 확장자 → 파일 종류 (MIME 없을 때 fallback). */
export function fileTypeFromExt(ext: string): CloudFileType {
  const e = ext.toLowerCase().replace(/^\./, '');
  if (['docx', 'doc'].includes(e)) return 'doc';
  if (['xlsx', 'xls', 'csv'].includes(e)) return 'sheet';
  if (['pptx', 'ppt'].includes(e)) return 'slide';
  if (e === 'pdf') return 'pdf';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'avif'].includes(e)) return 'image';
  return 'other';
}

/** 파일 이름 → 파일 종류 (MIME 우선, 없으면 확장자). */
export function fileTypeFromName(name: string, mime?: string | null): CloudFileType {
  const byMime = fileTypeFromMime(mime);
  if (byMime !== 'other') return byMime;
  const dotIdx = name.lastIndexOf('.');
  if (dotIdx === -1) return 'other';
  return fileTypeFromExt(name.slice(dotIdx + 1));
}

export const FILE_TYPE_LABEL: Record<CloudFileType, string> = {
  doc: '문서',
  sheet: '시트',
  slide: '슬라이드',
  pdf: 'PDF',
  image: '이미지',
  other: '파일',
};

export const FILE_TYPE_EMOJI: Record<CloudFileType, string> = {
  doc: '📄',
  sheet: '📊',
  slide: '🎬',
  pdf: '📑',
  image: '🖼️',
  other: '📎',
};

/** 사람 친화적 크기 표시. */
export function formatSize(bytes: number | null | undefined): string {
  if (bytes == null || bytes < 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

/** Storage 경로 빌더: {userId}/{fileId}.{ext} */
export function buildStoragePath(userId: string, fileId: string, ext: string): string {
  const cleanExt = ext.toLowerCase().replace(/^\./, '');
  return cleanExt ? `${userId}/${fileId}.${cleanExt}` : `${userId}/${fileId}`;
}
