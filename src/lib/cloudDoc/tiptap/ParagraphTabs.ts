import { Extension, type CommandProps } from '@tiptap/core';

type TabStop = {
  type: 'left' | 'right' | 'center' | 'decimal' | 'bar';
  positionTwips: number;
  leader?: 'dot' | 'hyphen' | 'middleDot' | 'underscore' | 'none';
};

const TABS_ATTR = 'data-paragraph-tabs';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    paragraphTabs: {
      setParagraphTabs: (tabStops: TabStop[] | null) => ReturnType;
    };
  }
}

export const ParagraphTabs = Extension.create({
  name: 'paragraphTabs',

  addGlobalAttributes() {
    return [
      {
        types: ['paragraph', 'heading'],
        attributes: {
          tabStops: {
            default: null,
            parseHTML: (element) => parseTabStops(element.getAttribute(TABS_ATTR)),
            renderHTML: (attributes) => {
              const tabStops = normalizeTabStops(attributes.tabStops);
              return tabStops.length > 0
                ? { [TABS_ATTR]: encodeURIComponent(JSON.stringify(tabStops)) }
                : {};
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setParagraphTabs:
        (tabStops) =>
        (props) =>
          updateSelectedBlocks(props, {
            tabStops: normalizeTabStops(tabStops),
          }),
    };
  },
});

function updateSelectedBlocks(
  { state, tr, dispatch }: CommandProps,
  attrs: Record<string, unknown>,
): boolean {
  const { from, to } = state.selection;
  let changed = false;

  state.doc.nodesBetween(from, to, (node, pos) => {
    if (node.type.name !== 'paragraph' && node.type.name !== 'heading') return;
    tr.setNodeMarkup(pos, undefined, {
      ...node.attrs,
      ...attrs,
    });
    changed = true;
  });

  if (changed && dispatch) dispatch(tr.scrollIntoView());
  return changed;
}

function parseTabStops(value: string | null): TabStop[] | null {
  if (!value) return null;
  try {
    return normalizeTabStops(JSON.parse(decodeURIComponent(value)));
  } catch {
    return null;
  }
}

function normalizeTabStops(value: unknown): TabStop[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => normalizeTabStop(item))
    .filter((item): item is TabStop => Boolean(item));
}

function normalizeTabStop(value: unknown): TabStop | null {
  if (!value || typeof value !== 'object') return null;
  const item = value as Record<string, unknown>;
  const type = normalizeType(item.type);
  const positionTwips = Number(item.positionTwips);
  if (!type || !Number.isFinite(positionTwips) || positionTwips <= 0) return null;
  const leader = normalizeLeader(item.leader);
  return {
    type,
    positionTwips: Math.round(positionTwips),
    ...(leader ? { leader } : {}),
  };
}

function normalizeType(value: unknown): TabStop['type'] | null {
  if (value === 'left' || value === 'right' || value === 'center' || value === 'decimal' || value === 'bar') return value;
  return null;
}

function normalizeLeader(value: unknown): TabStop['leader'] | undefined {
  if (value === 'dot' || value === 'hyphen' || value === 'middleDot' || value === 'underscore' || value === 'none') return value;
  return undefined;
}
