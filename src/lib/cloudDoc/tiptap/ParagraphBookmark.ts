import { Extension } from '@tiptap/core';

const BOOKMARK_ATTR = 'data-bookmark-id';

export const ParagraphBookmark = Extension.create({
  name: 'paragraphBookmark',

  addGlobalAttributes() {
    return [
      {
        types: ['paragraph', 'heading'],
        attributes: {
          bookmarkId: {
            default: null,
            parseHTML: (element) => safeBookmarkId(
              element.getAttribute(BOOKMARK_ATTR) ?? element.getAttribute('id') ?? '',
            ) || null,
            renderHTML: (attributes) => {
              const id = safeBookmarkId(attributes.bookmarkId as string | null | undefined);
              return id ? { [BOOKMARK_ATTR]: id, id } : {};
            },
          },
        },
      },
    ];
  },
});

function safeBookmarkId(value: string | null | undefined): string {
  const id = String(value ?? '').trim().replace(/^#/, '').replace(/[^A-Za-z0-9_:-]/g, '_');
  if (!id || /^\d/.test(id)) return id ? `_${id}` : '';
  return id;
}
