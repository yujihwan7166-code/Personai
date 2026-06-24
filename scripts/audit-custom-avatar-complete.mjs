import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { DEFAULT_EXPERTS } from '../src/types/expert.ts';

const root = process.cwd();
const customCategories = new Set([
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

const customExperts = DEFAULT_EXPERTS.filter((expert) => customCategories.has(expert.category));
const noAvatar = [];
const nonPng = [];
const missingFile = [];
const legacyExposed = [];
const invalidImage = [];
const nonWide = [];
const tinyFiles = [];
const byUrl = new Map();
const byHash = new Map();

for (const expert of customExperts) {
  if (!expert.avatarUrl) {
    noAvatar.push(pickExpert(expert));
    continue;
  }

  byUrl.set(expert.avatarUrl, [...(byUrl.get(expert.avatarUrl) ?? []), expert.id]);

  if (!expert.avatarUrl.toLowerCase().endsWith('.png')) {
    nonPng.push({ ...pickExpert(expert), avatarUrl: expert.avatarUrl });
  }

  if (/\.(jpe?g|svg)$/i.test(expert.avatarUrl)) {
    legacyExposed.push({ ...pickExpert(expert), avatarUrl: expert.avatarUrl });
  }

  if (!expert.avatarUrl.startsWith('/')) continue;

  const assetPath = path.join(root, 'public', ...expert.avatarUrl.split('/').filter(Boolean));
  if (!fs.existsSync(assetPath)) {
    missingFile.push({ ...pickExpert(expert), avatarUrl: expert.avatarUrl });
    continue;
  }

  const bytes = fs.statSync(assetPath).size;
  if (bytes < 1_000_000) tinyFiles.push({ ...pickExpert(expert), avatarUrl: expert.avatarUrl, bytes });

  const buffer = fs.readFileSync(assetPath);
  const hash = crypto.createHash('sha256').update(buffer).digest('hex');
  byHash.set(hash, [...(byHash.get(hash) ?? []), expert.id]);

  const dimensions = readPngDimensions(buffer);
  if (!dimensions) {
    invalidImage.push({ ...pickExpert(expert), avatarUrl: expert.avatarUrl });
    continue;
  }

  const ratio = dimensions.width / dimensions.height;
  if (Math.abs(ratio - 16 / 9) > 0.015) {
    nonWide.push({
      ...pickExpert(expert),
      avatarUrl: expert.avatarUrl,
      width: dimensions.width,
      height: dimensions.height,
      ratio: Number(ratio.toFixed(4)),
    });
  }
}

const duplicateUrls = [...byUrl.entries()]
  .filter(([, ids]) => ids.length > 1)
  .map(([avatarUrl, ids]) => ({ avatarUrl, ids }));

const duplicateHashes = [...byHash.entries()]
  .filter(([, ids]) => ids.length > 1)
  .map(([hash, ids]) => ({ hash, ids }));

const byCategory = customExperts.reduce((acc, expert) => {
  acc[expert.category] = (acc[expert.category] ?? 0) + 1;
  return acc;
}, {});

const report = {
  total: customExperts.length,
  byCategory,
  noAvatar,
  nonPng,
  missingFile,
  legacyExposed,
  invalidImage,
  nonWide,
  tinyFiles,
  duplicateUrls,
  duplicateHashes,
};

const summary = Object.fromEntries(
  Object.entries(report)
    .filter(([, value]) => Array.isArray(value))
    .map(([key, value]) => [key, value.length]),
);

console.log(JSON.stringify({ total: report.total, byCategory, summary, report }, null, 2));

const hasFailures = Object.values(summary).some((count) => count > 0);
if (hasFailures) process.exit(1);

function pickExpert(expert) {
  return {
    id: expert.id,
    category: expert.category,
    name: expert.name,
    nameKo: expert.nameKo,
  };
}

function readPngDimensions(buffer) {
  if (buffer.length < 24) return null;
  if (buffer.toString('ascii', 1, 4) !== 'PNG') return null;
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}
