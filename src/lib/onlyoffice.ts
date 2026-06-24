export type OnlyOfficeDocumentType = 'word' | 'cell' | 'slide' | 'pdf';

export interface OnlyOfficeLaunchConfig {
  documentServerUrl: string;
  documentUrl: string;
  callbackUrl: string;
  title: string;
  fileType: string;
  mode: 'edit' | 'view';
  lang: string;
}

export function normalizeOnlyOfficeServerUrl(value: string): string {
  return value.trim().replace(/\/+$/, '');
}

export function onlyOfficeApiScriptUrl(documentServerUrl: string): string {
  return `${normalizeOnlyOfficeServerUrl(documentServerUrl)}/web-apps/apps/api/documents/api.js`;
}

export function fileTypeFromNameOrUrl(value: string): string {
  const clean = value.split('?')[0]?.split('#')[0] ?? value;
  const name = clean.slice(clean.lastIndexOf('/') + 1);
  const dotIndex = name.lastIndexOf('.');
  return dotIndex >= 0 ? name.slice(dotIndex + 1).toLowerCase() : '';
}

export function onlyOfficeDocumentType(fileType: string): OnlyOfficeDocumentType {
  const ext = fileType.toLowerCase();
  if (['xls', 'xlsx', 'xlsm', 'xlsb', 'csv', 'ods', 'ots', 'numbers'].includes(ext)) return 'cell';
  if (['ppt', 'pptx', 'pptm', 'pps', 'ppsx', 'odp', 'otp', 'key'].includes(ext)) return 'slide';
  if (ext === 'pdf') return 'pdf';
  return 'word';
}

export function onlyOfficeDocumentKey(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i += 1) {
    hash = ((hash << 5) + hash) ^ input.charCodeAt(i);
  }
  return `personai-${Math.abs(hash).toString(36)}-${Date.now().toString(36)}`.slice(0, 120);
}
