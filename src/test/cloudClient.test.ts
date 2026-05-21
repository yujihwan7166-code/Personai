import { beforeEach, describe, expect, it, vi } from 'vitest';

const OWNER_ID = 'user_cloud_test';

describe('cloudClient localStorage safety', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
    window.localStorage.clear();
  });

  it('throws a clear error when localStorage write fails', async () => {
    const { CloudStorageError, createEmptyFile } = await import('@/lib/cloudClient');
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota exceeded', 'QuotaExceededError');
    });

    await expect(createEmptyFile(OWNER_ID, '제목 없음', 'doc', null))
      .rejects
      .toBeInstanceOf(CloudStorageError);
  });

  it('does not update the in-memory cloud cache after a failed write', async () => {
    const { createEmptyFile, fetchAliveChildren } = await import('@/lib/cloudClient');
    await createEmptyFile(OWNER_ID, '기존 문서', 'doc', null);

    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota exceeded', 'QuotaExceededError');
    });

    await expect(createEmptyFile(OWNER_ID, '실패 문서', 'doc', null)).rejects.toThrow();
    const nodes = await fetchAliveChildren(OWNER_ID, null);

    expect(nodes.map((n) => n.name)).toEqual(['기존 문서']);
  });
});
