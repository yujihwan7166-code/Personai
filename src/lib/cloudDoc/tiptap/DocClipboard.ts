import { Extension } from '@tiptap/core';
import { DOMSerializer, type Fragment } from '@tiptap/pm/model';
import { Plugin } from '@tiptap/pm/state';
import { normalizeDocCopyHtml } from '@/lib/cloudDoc/paste';

export const DocClipboard = Extension.create({
  name: 'docClipboard',

  addProseMirrorPlugins() {
    const serializer = DOMSerializer.fromSchema(this.editor.schema);

    return [
      new Plugin({
        props: {
          clipboardSerializer: {
            serializeFragment: (fragment: Fragment, options: { document?: Document } = {}, target?: HTMLElement | DocumentFragment) => {
              const doc = options.document ?? document;
              const source = doc.createElement('div');
              serializer.serializeFragment(fragment, options, source);

              const normalized = doc.createElement('div');
              normalized.innerHTML = normalizeDocCopyHtml(source.innerHTML);

              const output = target ?? doc.createDocumentFragment();
              while (normalized.firstChild) {
                output.appendChild(normalized.firstChild);
              }
              return output;
            },
          },
        },
      }),
    ];
  },
});
