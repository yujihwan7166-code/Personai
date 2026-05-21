import { Extension } from '@tiptap/core';

export const RunTextStyle = Extension.create({
  name: 'runTextStyle',

  addGlobalAttributes() {
    return [
      {
        types: ['textStyle'],
        attributes: {
          underlineStyle: {
            default: null,
            parseHTML: (element) => normalizeUnderlineStyle(element.getAttribute('data-docx-underline-style')),
            renderHTML: (attributes) => {
              const style = normalizeUnderlineStyle(attributes.underlineStyle);
              return style ? { 'data-docx-underline-style': style } : {};
            },
          },
          underlineColor: {
            default: null,
            parseHTML: (element) => normalizeHexColor(element.getAttribute('data-docx-underline-color')),
            renderHTML: (attributes) => {
              const color = normalizeHexColor(attributes.underlineColor);
              return color ? { 'data-docx-underline-color': color } : {};
            },
          },
          doubleStrike: {
            default: null,
            parseHTML: (element) => {
              const style = (element as HTMLElement).style;
              return element.getAttribute('data-docx-double-strike') === 'true'
                || (style.textDecorationLine.includes('line-through') && style.textDecorationStyle === 'double')
                ? true
                : null;
            },
            renderHTML: (attributes) => attributes.doubleStrike
              ? {
                  'data-docx-double-strike': 'true',
                  style: 'text-decoration-line: line-through; text-decoration-style: double',
                }
              : {},
          },
          complexScriptBold: {
            default: null,
            parseHTML: (element) => element.getAttribute('data-docx-cs-bold') === 'true' ? true : null,
            renderHTML: (attributes) => attributes.complexScriptBold
              ? {
                  'data-docx-cs-bold': 'true',
                  style: 'font-weight: 700',
                }
              : {},
          },
          complexScriptItalic: {
            default: null,
            parseHTML: (element) => element.getAttribute('data-docx-cs-italic') === 'true' ? true : null,
            renderHTML: (attributes) => attributes.complexScriptItalic
              ? {
                  'data-docx-cs-italic': 'true',
                  style: 'font-style: italic',
                }
              : {},
          },
          smallCaps: {
            default: null,
            parseHTML: (element) => (
              element.getAttribute('data-docx-small-caps') === 'true'
              || (element as HTMLElement).style.fontVariantCaps === 'small-caps'
                ? true
                : null
            ),
            renderHTML: (attributes) => attributes.smallCaps
              ? {
                  'data-docx-small-caps': 'true',
                  style: 'font-variant-caps: small-caps',
                }
              : {},
          },
          allCaps: {
            default: null,
            parseHTML: (element) => (
              element.getAttribute('data-docx-all-caps') === 'true'
              || (element as HTMLElement).style.textTransform === 'uppercase'
                ? true
                : null
            ),
            renderHTML: (attributes) => attributes.allCaps
              ? {
                  'data-docx-all-caps': 'true',
                  style: 'text-transform: uppercase',
                }
              : {},
          },
          characterSpacing: {
            default: null,
            parseHTML: (element) => {
              const raw = element.getAttribute('data-docx-character-spacing');
              if (raw != null) return normalizeCharacterSpacing(raw);
              return null;
            },
            renderHTML: (attributes) => {
              const spacing = normalizeCharacterSpacing(attributes.characterSpacing);
              return spacing != null
                ? {
                    'data-docx-character-spacing': String(spacing),
                    style: `letter-spacing: ${twipsToPx(spacing)}px`,
                  }
                : {};
            },
          },
          textScale: {
            default: null,
            parseHTML: (element) => {
              const raw = element.getAttribute('data-docx-text-scale');
              if (raw != null) return normalizeTextScale(raw);
              return null;
            },
            renderHTML: (attributes) => {
              const scale = normalizeTextScale(attributes.textScale);
              return scale != null
                ? {
                    'data-docx-text-scale': String(scale),
                    style: `font-stretch: ${scale}%`,
                  }
                : {};
            },
          },
          textPosition: {
            default: null,
            parseHTML: (element) => {
              const raw = element.getAttribute('data-docx-text-position');
              if (raw != null) return normalizeTextPosition(raw);
              return null;
            },
            renderHTML: (attributes) => {
              const position = normalizeTextPosition(attributes.textPosition);
              return position != null
                ? {
                    'data-docx-text-position': String(position),
                    style: `vertical-align: ${halfPointsToPx(position)}px`,
                  }
                : {};
            },
          },
          hiddenText: {
            default: null,
            parseHTML: (element) => element.getAttribute('data-docx-hidden-text') === 'true' ? true : null,
            renderHTML: (attributes) => attributes.hiddenText
              ? {
                  'data-docx-hidden-text': 'true',
                  style: 'opacity: 0.55',
                }
              : {},
          },
          specHiddenText: {
            default: null,
            parseHTML: (element) => element.getAttribute('data-docx-spec-hidden-text') === 'true' ? true : null,
            renderHTML: (attributes) => attributes.specHiddenText
              ? {
                  'data-docx-spec-hidden-text': 'true',
                  style: 'opacity: 0.55',
                }
              : {},
          },
          emboss: {
            default: null,
            parseHTML: (element) => element.getAttribute('data-docx-emboss') === 'true' ? true : null,
            renderHTML: (attributes) => attributes.emboss
              ? {
                  'data-docx-emboss': 'true',
                  style: 'text-shadow: -1px -1px 0 rgba(255,255,255,0.75), 1px 1px 0 rgba(15,23,42,0.25)',
                }
              : {},
          },
          imprint: {
            default: null,
            parseHTML: (element) => element.getAttribute('data-docx-imprint') === 'true' ? true : null,
            renderHTML: (attributes) => attributes.imprint
              ? {
                  'data-docx-imprint': 'true',
                  style: 'text-shadow: 1px 1px 0 rgba(255,255,255,0.75), -1px -1px 0 rgba(15,23,42,0.25)',
                }
              : {},
          },
          textEffect: {
            default: null,
            parseHTML: (element) => normalizeTextEffect(element.getAttribute('data-docx-text-effect')),
            renderHTML: (attributes) => {
              const effect = normalizeTextEffect(attributes.textEffect);
              return effect ? { 'data-docx-text-effect': effect } : {};
            },
          },
          complexScriptFontFamily: {
            default: null,
            parseHTML: (element) => normalizeFontFamily(element.getAttribute('data-docx-cs-font-family')),
            renderHTML: (attributes) => {
              const font = normalizeFontFamily(attributes.complexScriptFontFamily);
              return font ? { 'data-docx-cs-font-family': font } : {};
            },
          },
          complexScriptHighlight: {
            default: null,
            parseHTML: (element) => normalizeHexColor(element.getAttribute('data-docx-cs-highlight')),
            renderHTML: (attributes) => {
              const color = normalizeHexColor(attributes.complexScriptHighlight);
              return color
                ? {
                    'data-docx-cs-highlight': color,
                    style: `background-color: ${color}`,
                  }
                : {};
            },
          },
          complexScriptFontSize: {
            default: null,
            parseHTML: (element) => normalizePositiveInteger(element.getAttribute('data-docx-cs-font-size')),
            renderHTML: (attributes) => {
              const size = normalizePositiveInteger(attributes.complexScriptFontSize);
              return size != null ? { 'data-docx-cs-font-size': String(size) } : {};
            },
          },
          language: {
            default: null,
            parseHTML: (element) => normalizeLanguageTag(
              element.getAttribute('data-docx-lang') ?? element.getAttribute('lang'),
            ),
            renderHTML: (attributes) => {
              const language = normalizeLanguageTag(attributes.language);
              return language ? { lang: language, 'data-docx-lang': language } : {};
            },
          },
          eastAsiaLanguage: {
            default: null,
            parseHTML: (element) => normalizeLanguageTag(element.getAttribute('data-docx-east-asia-lang')),
            renderHTML: (attributes) => {
              const language = normalizeLanguageTag(attributes.eastAsiaLanguage);
              return language ? { 'data-docx-east-asia-lang': language } : {};
            },
          },
          bidiLanguage: {
            default: null,
            parseHTML: (element) => normalizeLanguageTag(element.getAttribute('data-docx-bidi-lang')),
            renderHTML: (attributes) => {
              const language = normalizeLanguageTag(attributes.bidiLanguage);
              return language ? { 'data-docx-bidi-lang': language } : {};
            },
          },
          kerning: {
            default: null,
            parseHTML: (element) => normalizePositiveInteger(element.getAttribute('data-docx-kerning')),
            renderHTML: (attributes) => {
              const kerning = normalizePositiveInteger(attributes.kerning);
              return kerning != null
                ? {
                    'data-docx-kerning': String(kerning),
                    style: 'font-kerning: normal',
                  }
                : {};
            },
          },
          rightToLeft: {
            default: null,
            parseHTML: (element) => (
              element.getAttribute('data-docx-rtl') === 'true'
              || element.getAttribute('dir') === 'rtl'
                ? true
                : null
            ),
            renderHTML: (attributes) => attributes.rightToLeft
              ? {
                  dir: 'rtl',
                  'data-docx-rtl': 'true',
                  style: 'direction: rtl; unicode-bidi: isolate',
                }
              : {},
          },
          noProof: {
            default: null,
            parseHTML: (element) => element.getAttribute('data-docx-no-proof') === 'true' ? true : null,
            renderHTML: (attributes) => attributes.noProof
              ? { 'data-docx-no-proof': 'true' }
              : {},
          },
          snapToGrid: {
            default: null,
            parseHTML: (element) => element.getAttribute('data-docx-snap-to-grid') === 'true' ? true : null,
            renderHTML: (attributes) => attributes.snapToGrid
              ? { 'data-docx-snap-to-grid': 'true' }
              : {},
          },
          emphasisMark: {
            default: null,
            parseHTML: (element) => normalizeEmphasisMark(element.getAttribute('data-docx-emphasis-mark')),
            renderHTML: (attributes) => {
              const mark = normalizeEmphasisMark(attributes.emphasisMark);
              return mark
                ? {
                    'data-docx-emphasis-mark': mark,
                    style: 'text-emphasis: filled dot; text-emphasis-position: over right',
                  }
                : {};
            },
          },
          mathRun: {
            default: null,
            parseHTML: (element) => element.getAttribute('data-docx-run-math') === 'true' ? true : null,
            renderHTML: (attributes) => attributes.mathRun
              ? {
                  'data-docx-run-math': 'true',
                  style: 'font-family: Cambria Math, STIX Two Math, serif',
                }
              : {},
          },
          runBorderStyle: {
            default: null,
            parseHTML: (element) => normalizeBorderStyle(element.getAttribute('data-docx-run-border-style')),
            renderHTML: (attributes) => {
              const style = normalizeBorderStyle(attributes.runBorderStyle);
              return style ? { 'data-docx-run-border-style': style } : {};
            },
          },
          runBorderColor: {
            default: null,
            parseHTML: (element) => normalizeHexColor(element.getAttribute('data-docx-run-border-color')),
            renderHTML: (attributes) => {
              const color = normalizeHexColor(attributes.runBorderColor);
              return color ? { 'data-docx-run-border-color': color } : {};
            },
          },
          runBorderSize: {
            default: null,
            parseHTML: (element) => normalizePositiveInteger(element.getAttribute('data-docx-run-border-size')),
            renderHTML: (attributes) => {
              const size = normalizePositiveInteger(attributes.runBorderSize);
              return size != null ? { 'data-docx-run-border-size': String(size) } : {};
            },
          },
          runBorderSpace: {
            default: null,
            parseHTML: (element) => normalizePositiveInteger(element.getAttribute('data-docx-run-border-space')),
            renderHTML: (attributes) => {
              const space = normalizePositiveInteger(attributes.runBorderSpace);
              return space != null ? { 'data-docx-run-border-space': String(space) } : {};
            },
          },
        },
      },
    ];
  },
});

function normalizeUnderlineStyle(value: unknown): string | null {
  if (
    value === 'single'
    || value === 'words'
    || value === 'double'
    || value === 'thick'
    || value === 'dotted'
    || value === 'dottedHeavy'
    || value === 'dash'
    || value === 'dashedHeavy'
    || value === 'dashLong'
    || value === 'dashLongHeavy'
    || value === 'dotDash'
    || value === 'dashDotHeavy'
    || value === 'dotDotDash'
    || value === 'dashDotDotHeavy'
    || value === 'wave'
    || value === 'wavyHeavy'
    || value === 'wavyDouble'
  ) {
    return value;
  }
  return null;
}

function normalizeHexColor(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const match = value.trim().match(/^#?([0-9a-f]{6})$/i);
  return match ? `#${match[1].toUpperCase()}` : null;
}

function normalizeFontFamily(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || /[<>{}]/.test(trimmed)) return null;
  return trimmed.slice(0, 80);
}

function normalizeCharacterSpacing(value: unknown): number | null {
  if (value == null || value === '') return null;
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric) || numeric === 0) return null;
  return Math.round(numeric);
}

function normalizeTextScale(value: unknown): number | null {
  if (value == null || value === '') return null;
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0 || numeric === 100) return null;
  return Math.max(1, Math.min(600, Math.round(numeric)));
}

function normalizeTextPosition(value: unknown): number | null {
  if (value == null || value === '') return null;
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric) || numeric === 0) return null;
  return Math.max(-3168, Math.min(3168, Math.round(numeric)));
}

function normalizePositiveInteger(value: unknown): number | null {
  if (value == null || value === '') return null;
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  return Math.max(1, Math.min(3168, Math.round(numeric)));
}

function normalizeTextEffect(value: unknown): string | null {
  if (
    value === 'blinkBackground'
    || value === 'lights'
    || value === 'antsBlack'
    || value === 'antsRed'
    || value === 'shimmer'
    || value === 'sparkle'
    || value === 'none'
  ) {
    return value;
  }
  return null;
}

function normalizeEmphasisMark(value: unknown): string | null {
  return value === 'dot' ? value : null;
}

function normalizeBorderStyle(value: unknown): string | null {
  if (
    value === 'single'
    || value === 'dashed'
    || value === 'dashSmallGap'
    || value === 'dotted'
    || value === 'double'
    || value === 'thick'
  ) {
    return value;
  }
  return null;
}

function normalizeLanguageTag(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed === 'none') return null;
  return /^[A-Za-z]{2,8}(?:-[A-Za-z0-9]{1,8})*$/.test(trimmed) ? trimmed : null;
}

function twipsToPx(twips: number): number {
  return Math.round(twips / 15);
}

function halfPointsToPx(halfPoints: number): number {
  return Math.round((halfPoints / 2) * 1.333);
}
