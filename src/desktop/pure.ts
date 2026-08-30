export type AppBackground = 'default' | 'white';

export type AppPreferences = {
  background: AppBackground;
  notifications: {
    enabled: boolean;
    dms: boolean;
    servers: boolean;
  };
  settings: {
    showOnlineStatus: boolean;
    dataSaver: boolean;
  };
};

export const DEFAULT_APP_PREFERENCES: AppPreferences = {
  background: 'default',
  notifications: {
    enabled: true,
    dms: true,
    servers: true,
  },
  settings: {
    showOnlineStatus: true,
    dataSaver: false,
  },
};

export function normalizeAppPreferences(raw: unknown): AppPreferences {
  const source = raw as {appPreferences?: any} | null | undefined;
  const app = source?.appPreferences ?? {};
  return {
    background: app.background === 'white' ? 'white' : 'default',
    notifications: {
      enabled: app.notifications?.enabled ?? DEFAULT_APP_PREFERENCES.notifications.enabled,
      dms: app.notifications?.dms ?? DEFAULT_APP_PREFERENCES.notifications.dms,
      servers: app.notifications?.servers ?? DEFAULT_APP_PREFERENCES.notifications.servers,
    },
    settings: {
      showOnlineStatus: app.settings?.showOnlineStatus ?? DEFAULT_APP_PREFERENCES.settings.showOnlineStatus,
      dataSaver: app.settings?.dataSaver ?? DEFAULT_APP_PREFERENCES.settings.dataSaver,
    },
  };
}

export function timestampValue(timestamp: any) {
  const millis = timestamp?.toMillis?.();
  if (typeof millis === 'number') return millis;
  return typeof timestamp?.seconds === 'number' ? timestamp.seconds * 1000 : 0;
}

export function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export function fileExtension(name: string) {
  const clean = name.trim().toLowerCase();
  const dot = clean.lastIndexOf('.');
  return dot >= 0 ? clean.slice(dot + 1) : '';
}

export function isAllowedDriveUpload(name: string, contentType?: string | null) {
  const ext = fileExtension(name);
  const type = (contentType || '').toLowerCase();
  const allowedExtensions = [
    'gif', 'jpg', 'jpeg', 'png', 'webp', 'pdf', 'epub', 'mp4', 'webm', 'mov', 'm4v',
    'ppt', 'pptx', 'html', 'htm', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'txt', 'md', 'zip',
  ];
  if (allowedExtensions.includes(ext)) return true;
  return type.startsWith('image/') ||
    type.startsWith('video/') ||
    type === 'application/pdf' ||
    type === 'application/epub+zip' ||
    type === 'application/vnd.ms-powerpoint' ||
    type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
    type === 'text/html' ||
    type === 'application/msword' ||
    type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    type === 'application/vnd.ms-excel' ||
    type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    type === 'text/csv' ||
    type === 'text/plain' ||
    type === 'text/markdown' ||
    type === 'application/zip' ||
    type === 'application/x-zip-compressed';
}

export type FileKind =
  | 'image'
  | 'video'
  | 'pdf'
  | 'ebook'
  | 'sheet'
  | 'presentation'
  | 'code'
  | 'archive'
  | 'document'
  | 'file';

export function fileKind(file: {name: string; contentType?: string | null}): FileKind {
  const ext = fileExtension(file.name);
  const type = (file.contentType || '').toLowerCase();
  if (type.startsWith('image/')) return 'image';
  if (type.startsWith('video/')) return 'video';
  if (ext === 'pdf' || type.includes('pdf')) return 'pdf';
  if (ext === 'epub' || type.includes('epub')) return 'ebook';
  if (['xlsx', 'xls', 'csv'].includes(ext)) return 'sheet';
  if (['ppt', 'pptx'].includes(ext)) return 'presentation';
  if (['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'kt', 'c', 'cpp', 'html', 'css', 'json'].includes(ext)) return 'code';
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'archive';
  if (['doc', 'docx', 'txt', 'md', 'rtf'].includes(ext)) return 'document';
  return 'file';
}

export type LibraryBook = {
  key: string;
  title: string;
  author: string;
  firstPublishYear?: number;
  coverId?: number;
  ebookAccess?: string;
  ia: string[];
};

export function normalizeOpenLibraryDoc(docData: any): LibraryBook | null {
  const key = typeof docData?.key === 'string' ? docData.key : '';
  const title = typeof docData?.title === 'string' ? docData.title.trim() : '';
  if (!key || !title) return null;
  const authors = Array.isArray(docData?.author_name) ? docData.author_name.filter(Boolean) : [];
  const ia = Array.isArray(docData?.ia) ? docData.ia.filter((x: unknown) => typeof x === 'string') : [];
  return {
    key,
    title,
    author: authors.join(', ') || 'Autor desconhecido',
    firstPublishYear: Number.isFinite(Number(docData?.first_publish_year)) ? Number(docData.first_publish_year) : undefined,
    coverId: Number.isFinite(Number(docData?.cover_i)) ? Number(docData.cover_i) : undefined,
    ebookAccess: typeof docData?.ebook_access === 'string' ? docData.ebook_access : undefined,
    ia,
  };
}

export function isRecentMusicActivity(
  activity?: {title?: string; provider?: string | null; updatedAt?: any} | null,
  maxAgeMs = 120000,
) {
  if (!activity?.title || !activity.provider) return false;
  const updated = timestampValue(activity.updatedAt);
  return updated > 0 && Date.now() - updated <= maxAgeMs;
}
