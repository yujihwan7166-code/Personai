import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const expertSourcePath = path.join(root, 'src', 'types', 'expert.ts');
const source = fs.readFileSync(expertSourcePath, 'utf8');

const requestedCategory = readCategoryArg();
const minBytes = readNumberArg('min-bytes');
const shouldPrintSummary = process.argv.includes('--summary');
const targetCategories = new Set(requestedCategory ? [requestedCategory] : [
  'occupation',
  'specialist',
  'religion',
  'ideology',
  'lifestyle',
  'perspective',
  'celebrity',
  'fictional',
  'mythology',
  'region',
]);

const experts = parseDefaultExperts(source)
  .filter((expert) => targetCategories.has(expert.category));

const byAvatar = new Map();
const failures = [];
const summary = new Map();

for (const expert of experts) {
  if (!expert.avatarUrl) {
    recordFailure(expert, 'missing', `${expert.id} (${expert.nameKo}) is missing avatarUrl`);
    continue;
  }

  if (!expert.avatarUrl.startsWith('/logos/')) {
    recordFailure(expert, 'invalid-path', `${expert.id} (${expert.nameKo}) avatarUrl should start with /logos/: ${expert.avatarUrl}`);
    continue;
  }

  const assetPath = path.join(root, 'public', ...expert.avatarUrl.split('/').filter(Boolean));
  if (!fs.existsSync(assetPath)) {
    recordFailure(expert, 'missing-file', `${expert.id} (${expert.nameKo}) avatar file does not exist: ${expert.avatarUrl}`);
    continue;
  }

  if (minBytes > 0) {
    const { size } = fs.statSync(assetPath);
    if (size < minBytes) {
      recordFailure(
        expert,
        'low-detail',
        `${expert.id} (${expert.nameKo}) avatar file is likely still a low-detail placeholder: ${expert.avatarUrl} (${size} bytes < ${minBytes})`,
      );
    }
  }

  const users = byAvatar.get(expert.avatarUrl) ?? [];
  users.push(expert);
  byAvatar.set(expert.avatarUrl, users);
}

for (const [avatarUrl, users] of byAvatar.entries()) {
  if (users.length <= 1) continue;
  const message =
    `duplicate avatarUrl ${avatarUrl}: ${users.map((expert) => `${expert.id}(${expert.nameKo})`).join(', ')}`;
  failures.push(message);
  for (const expert of users) incrementSummary(expert.category, 'duplicate');
}

if (failures.length > 0) {
  console.error(`Custom avatar verification failed (${failures.length} issues):`);
  if (shouldPrintSummary) printSummary();
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Custom avatar verification passed for ${experts.length} experts.`);
if (shouldPrintSummary) printSummary();

function readCategoryArg() {
  const arg = process.argv.find((value) => value.startsWith('--category='));
  return arg ? arg.split('=')[1] : '';
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

function recordFailure(expert, type, message) {
  failures.push(message);
  incrementSummary(expert.category, type);
}

function incrementSummary(category, type) {
  const bucket = summary.get(category) ?? {
    missing: 0,
    'invalid-path': 0,
    'missing-file': 0,
    'low-detail': 0,
    duplicate: 0,
  };
  bucket[type] += 1;
  summary.set(category, bucket);
}

function printSummary() {
  console.error('Issue summary by category:');
  for (const [category, bucket] of [...summary.entries()].sort(([left], [right]) => left.localeCompare(right))) {
    const parts = Object.entries(bucket)
      .filter(([, count]) => count > 0)
      .map(([type, count]) => `${type}=${count}`);
    console.error(`- ${category}: ${parts.join(', ')}`);
  }
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
      nameKo: readStringField(objectSource, 'nameKo'),
      category: readStringField(objectSource, 'category'),
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
