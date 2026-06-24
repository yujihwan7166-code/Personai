#!/usr/bin/env node
/**
 * Crop a contact sheet into individual avatar PNGs using Playwright's
 * headless Chromium canvas (no native image lib required).
 *
 * Usage:
 *   node scripts/crop-avatar-contact-sheet.mjs \
 *     --sheet tmp/avatar-specialist-contact-sheet.png \
 *     --out public/logos/specialist \
 *     --backup tmp/avatar-specialist-placeholder-backup-<ts> \
 *     --cols 4 --rows 6 --cellW 320 --cellH 218 --imgH 180 \
 *     --ids legal,finance,history,...
 *
 * Or pass --order-from src/types/expert.ts --category specialist to derive
 * the ID order from the source file in order of occurrence.
 */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import { chromium } from 'playwright';

const args = parseArgs(process.argv.slice(2));
const sheet = path.resolve(args.sheet);
const outDir = path.resolve(args.out);
const backupDir = args.backup ? path.resolve(args.backup) : null;
const cols = Number(args.cols);
const rows = Number(args.rows);
const cellW = Number(args.cellW);
const cellH = Number(args.cellH);
const imgH = Number(args.imgH || cellH);
const imgW = Number(args.imgW || cellW);
const dryRun = args.dryRun === 'true' || args.dryRun === '1';

let ids = (args.ids || '').split(',').map((s) => s.trim()).filter(Boolean);
if (!ids.length && args['order-from'] && args.category) {
  ids = readIdsFromSource(path.resolve(args['order-from']), args.category);
}
if (!ids.length) throw new Error('No ids provided (use --ids or --order-from + --category)');
if (ids.length !== cols * rows) {
  console.warn(`[warn] id count ${ids.length} != cols*rows ${cols * rows}; will only crop the first ${Math.min(ids.length, cols * rows)} cells.`);
}

if (!fs.existsSync(sheet)) throw new Error(`sheet not found: ${sheet}`);
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
if (backupDir && !dryRun) fs.mkdirSync(backupDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext();
const page = await ctx.newPage();

const sheetBytes = fs.readFileSync(sheet);
const sheetDataUrl = 'data:image/png;base64,' + sheetBytes.toString('base64');

const total = Math.min(ids.length, cols * rows);
const results = [];

await page.setContent(`<html><body><canvas id="c"></canvas></body></html>`);

const img = { dataUrl: sheetDataUrl };
for (let i = 0; i < total; i++) {
  const id = ids[i];
  const col = i % cols;
  const row = Math.floor(i / cols);
  const sx = col * cellW;
  const sy = row * cellH;
  const sw = imgW;
  const sh = imgH;

  const dataUrl = await page.evaluate(async ({ src, sx, sy, sw, sh }) => {
    const c = document.getElementById('c');
    c.width = sw; c.height = sh;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    const im = new Image();
    im.src = src;
    await new Promise((res, rej) => { im.onload = res; im.onerror = rej; });
    ctx.drawImage(im, sx, sy, sw, sh, 0, 0, sw, sh);
    return c.toDataURL('image/png');
  }, { src: img.dataUrl, sx, sy, sw, sh });

  const buf = Buffer.from(dataUrl.split(',')[1], 'base64');
  const dst = path.join(outDir, id + '.png');
  const existing = fs.existsSync(dst);

  if (existing && backupDir && !dryRun) {
    const src = fs.readFileSync(dst);
    fs.writeFileSync(path.join(backupDir, id + '.png'), src);
  }

  if (!dryRun) fs.writeFileSync(dst, buf);
  results.push({ id, sx, sy, sw, sh, dst, bytes: buf.length, replaced: existing });
}

await browser.close();

console.log(`[crop] sheet=${path.relative(process.cwd(), sheet)} ids=${ids.length} grid=${cols}x${rows} cell=${cellW}x${cellH} imgH=${imgH}`);
if (dryRun) console.log('[crop] DRY RUN — no files written');
if (backupDir) console.log('[crop] backup =>', path.relative(process.cwd(), backupDir));
for (const r of results) {
  console.log(' -', r.id, r.dst.replace(process.cwd() + path.sep, ''), 'bytes=' + r.bytes, r.replaced ? '(replaced)' : '(new)');
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.replace(/^--/, '');
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) {
      out[key] = 'true';
    } else {
      out[key] = next; i++;
    }
  }
  return out;
}

function readIdsFromSource(srcPath, category) {
  const txt = fs.readFileSync(srcPath, 'utf8').split('\n');
  const rx = new RegExp(`id:\\s*'([^']+)'.*\\/logos\\/${category}\\/([^']+)\\.png`);
  const ids = [];
  for (const line of txt) {
    const m = line.match(rx);
    if (m) ids.push(m[1]);
  }
  return ids;
}
