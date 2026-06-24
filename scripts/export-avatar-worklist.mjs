import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const expertSourcePath = path.join(root, 'src', 'types', 'expert.ts');
const source = fs.readFileSync(expertSourcePath, 'utf8');

const minBytes = readNumberArg('min-bytes') || 1_000_000;
const outPath = readStringArg('out') || path.join('docs', 'custom-avatar-worklist.json');

const targetCategories = new Set([
  'occupation',
  'specialist',
  'religion',
  'ideology',
  'lifestyle',
  'perspective',
  'celebrity',
  'fictional',
  'region',
]);

const directoryByCategory = {
  occupation: 'occupation',
  specialist: 'specialist',
  religion: 'religion',
  ideology: 'ideology',
  lifestyle: 'lifestyle',
  perspective: 'persona',
  celebrity: 'celebrity',
  fictional: 'character',
  region: 'region',
};

const experts = parseDefaultExperts(source)
  .filter((expert) => targetCategories.has(expert.category));

const items = experts.map((expert) => {
  const suggestedAvatarUrl = expert.avatarUrl || `/logos/${directoryByCategory[expert.category]}/${expert.id}.png`;
  const assetPath = path.join(root, 'public', ...suggestedAvatarUrl.split('/').filter(Boolean));
  const exists = fs.existsSync(assetPath);
  const size = exists ? fs.statSync(assetPath).size : 0;
  const status = getStatus(expert, suggestedAvatarUrl, exists, size);

  return {
    id: expert.id,
    name: expert.name,
    nameKo: expert.nameKo,
    category: expert.category,
    subCategory: expert.subCategory,
    currentAvatarUrl: expert.avatarUrl || null,
    suggestedAvatarUrl,
    status,
    size,
    promptSeed: buildPromptSeed(expert),
  };
});

const summary = items.reduce((acc, item) => {
  const bucket = acc[item.category] ?? { total: 0, ready: 0, missing: 0, missingFile: 0, lowDetail: 0, invalidPath: 0 };
  bucket.total += 1;
  if (item.status === 'ready') bucket.ready += 1;
  if (item.status === 'missing-avatar-url') bucket.missing += 1;
  if (item.status === 'missing-file') bucket.missingFile += 1;
  if (item.status === 'low-detail') bucket.lowDetail += 1;
  if (item.status === 'invalid-path') bucket.invalidPath += 1;
  acc[item.category] = bucket;
  return acc;
}, {});

const worklist = {
  generatedAt: new Date().toISOString(),
  minBytes,
  artDirection: {
    format: '16:9 landscape',
    style: 'bright polished semi-realistic anime character illustration',
    constraints: [
      'role readable within one second from thumbnail',
      'central person with clear role prop and background cue',
      'vary face, age, hairstyle, pose, and background',
      'no readable text',
      'no watermark',
      'no logo',
      'not infographic',
      'not flat icon',
      'not photorealistic',
    ],
  },
  summary,
  items,
};

fs.mkdirSync(path.dirname(path.resolve(root, outPath)), { recursive: true });
fs.writeFileSync(path.resolve(root, outPath), `${JSON.stringify(worklist, null, 2)}\n`);

console.log(`Wrote ${items.length} avatar worklist items to ${outPath}`);
for (const [category, bucket] of Object.entries(summary).sort(([left], [right]) => left.localeCompare(right))) {
  console.log(`${category}: ready=${bucket.ready}/${bucket.total}, missing=${bucket.missing}, lowDetail=${bucket.lowDetail}, missingFile=${bucket.missingFile}, invalidPath=${bucket.invalidPath}`);
}

function getStatus(expert, avatarUrl, exists, size) {
  if (!expert.avatarUrl) return 'missing-avatar-url';
  if (!avatarUrl.startsWith('/logos/')) return 'invalid-path';
  if (!exists) return 'missing-file';
  if (size < minBytes) return 'low-detail';
  return 'ready';
}

function buildPromptSeed(expert) {
  return [
    `Wide semi-realistic anime illustration of one ${expert.nameKo} avatar.`,
    'Bright clean 16:9 character portrait.',
    'Clear role-specific clothing, prop, and background cue.',
    expert.subCategory ? `Context: ${expert.subCategory}.` : '',
    'No text, no logo, no watermark.',
  ].filter(Boolean).join(' ');
}

function readNumberArg(name) {
  const arg = process.argv.find((value) => value.startsWith(`--${name}=`));
  if (!arg) return 0;
  const value = Number(arg.split('=')[1]);
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`Invalid --${name} value: ${arg}`);
  }
  return value;
}

function readStringArg(name) {
  const arg = process.argv.find((value) => value.startsWith(`--${name}=`));
  return arg ? arg.slice(name.length + 3) : '';
}

function parseDefaultExperts(text) {
  const start = text.indexOf('export const _DEFAULT_EXPERTS_RAW');
  if (start < 0) throw new Error('Could not find _DEFAULT_EXPERTS_RAW');
  const eq = text.indexOf('=', start);
  const bracketStart = text.indexOf('[', eq);
  const bracketEnd = text.indexOf('\n];', bracketStart);
  if (bracketEnd < 0) throw new Error('Could not find end of _DEFAULT_EXPERTS_RAW');
  const arraySource = text.slice(bracketStart + 1, bracketEnd);
  return splitTopLevelObjects(arraySource)
    .map((objectSource) => ({
      id: readStringField(objectSource, 'id'),
      name: readStringField(objectSource, 'name'),
      nameKo: readStringField(objectSource, 'nameKo'),
      category: readStringField(objectSource, 'category'),
      subCategory: readStringField(objectSource, 'subCategory'),
      avatarUrl: readStringField(objectSource, 'avatarUrl'),
    }))
    .filter((expert) => expert.id && expert.category && expert.nameKo);
}

function splitTopLevelObjects(value) {
  const objects = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  let escaped = false;

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === "'") inString = false;
      continue;
    }

    if (char === "'") {
      inString = true;
      continue;
    }

    if (char === '{') {
      if (depth === 0) start = index;
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0 && start >= 0) objects.push(value.slice(start, index + 1));
    }
  }

  return objects;
}

function readStringField(objectSource, fieldName) {
  const pattern = new RegExp(`${fieldName}:\\s*'([^']*)'`);
  return pattern.exec(objectSource)?.[1] ?? '';
}
