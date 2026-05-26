const normalize = (value: string): string => value.trim().toLowerCase();

export function rewriteWikiLinkTargets(body: string, titleMap: Map<string, string>): string {
  if (titleMap.size === 0 || !body) return body;

  const rewriteTarget = (raw: string): string => {
    const target = raw.trim();
    const next = titleMap.get(normalize(target));
    return next ?? target;
  };

  return body
    .replace(/\[\[([^\]|]+?)(?:\|([^\]]+?))?]]/g, (_match, target: string, label?: string) => {
      const nextTarget = rewriteTarget(target);
      if (nextTarget === target.trim()) return label ? `[[${target.trim()}|${label}]]` : `[[${target.trim()}]]`;
      return label ? `[[${nextTarget}|${label}]]` : `[[${nextTarget}]]`;
    })
    .replace(/\]\(##wiki:([^)]+?)\)/g, (_match, encodedTarget: string) => {
      const decoded = decodeURIComponent(encodedTarget).trim();
      const nextTarget = rewriteTarget(decoded);
      return `](##wiki:${encodeURIComponent(nextTarget)})`;
    });
}

export function addAliasOnce(aliases: string[], alias: string): string[] {
  const clean = alias.trim();
  if (!clean) return aliases;
  if (aliases.some((item) => normalize(item) === normalize(clean))) return aliases;
  return [...aliases, clean];
}

export function formatWikiTitleLink(title: string, label?: string): string {
  const target = sanitizeWikiLinkPart(title);
  const cleanLabel = label ? sanitizeWikiLinkPart(label) : '';
  if (!target) return '';
  if (cleanLabel && normalize(cleanLabel) !== normalize(target)) return `[[${target}|${cleanLabel}]]`;
  return `[[${target}]]`;
}

export function formatWikiIdMarkdownLink(id: string, label: string): string {
  const cleanId = id.trim();
  const cleanLabel = sanitizeMarkdownLabel(label);
  if (!cleanId || !cleanLabel) return '';
  return `[${cleanLabel}](##wiki:${encodeURIComponent(cleanId)})`;
}

export function linkFirstUnlinkedMention(body: string, matchedText: string, targetTitle: string): string {
  const cleanText = matchedText.trim();
  const link = formatWikiTitleLink(targetTitle, cleanText);
  if (!body || !cleanText || !link) return body;

  const masked = maskLinkedMarkdown(body);
  const idx = indexOfInsensitive(masked, cleanText);
  if (idx < 0) return body;
  return `${body.slice(0, idx)}${link}${body.slice(idx + cleanText.length)}`;
}

export interface WikiMentionLinkTarget {
  matchedText: string;
  targetTitle: string;
  index?: number;
}

export function linkUnlinkedMentions(body: string, targets: WikiMentionLinkTarget[]): string {
  if (!body || targets.length === 0) return body;
  return [...targets]
    .sort((a, b) => (b.index ?? -1) - (a.index ?? -1))
    .reduce((nextBody, target) => {
      const cleanText = target.matchedText.trim();
      const link = formatWikiTitleLink(target.targetTitle, cleanText);
      if (!cleanText || !link) return nextBody;

      if (typeof target.index === 'number' && target.index >= 0) {
        const exactText = nextBody.slice(target.index, target.index + target.matchedText.length);
        const maskedText = maskLinkedMarkdown(nextBody).slice(target.index, target.index + target.matchedText.length);
        if (exactText === target.matchedText && normalize(maskedText) === normalize(target.matchedText)) {
          return `${nextBody.slice(0, target.index)}${link}${nextBody.slice(target.index + target.matchedText.length)}`;
        }
      }

      return linkFirstUnlinkedMention(nextBody, target.matchedText, target.targetTitle);
    }, body);
}

function sanitizeWikiLinkPart(value: string): string {
  return value
    .replace(/[\r\n]+/g, ' ')
    .replace(/\]\]/g, '')
    .replace(/\|/g, '/')
    .replace(/\s+/g, ' ')
    .trim();
}

function maskLinkedMarkdown(value: string): string {
  const chars = value.split('');
  const mask = (regex: RegExp) => {
    regex.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(value)) !== null) {
      for (let i = match.index; i < match.index + match[0].length; i += 1) chars[i] = ' ';
    }
  };

  mask(/```[\s\S]*?```/g);
  mask(/`[^`\n]+`/g);
  mask(/\[\[[^\]]+?]]/g);
  mask(/!\[[^\]]*]\([^)]+\)/g);
  mask(/\[[^\]]+]\([^)]+\)/g);
  return chars.join('');
}

function indexOfInsensitive(value: string, search: string): number {
  return value.toLowerCase().indexOf(normalize(search));
}

function sanitizeMarkdownLabel(value: string): string {
  return value
    .replace(/[\r\n]+/g, ' ')
    .replace(/]/g, '\\]')
    .replace(/\s+/g, ' ')
    .trim();
}
