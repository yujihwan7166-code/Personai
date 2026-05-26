import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { basename, dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const docxPath = args.find((arg) => !arg.startsWith('-'));
const outDirArg = args.find((arg) => arg.startsWith('--out='));
const outDir = resolve(outDirArg ? outDirArg.slice('--out='.length) : 'tmp/docs/compat-render');

const vitest = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const node = process.platform === 'win32' ? 'node.exe' : process.execPath;
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const soffice = findCommand(['soffice', 'libreoffice']);
const pdftoppm = findCommand(['pdftoppm']);
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const generatedDocxPath = 'tmp/docs/doc-compat-sample.docx';

console.log('[doc-compat] running DOCX structure, editor-attrs, and PDF slicing tests');
run(vitest, [
  'vitest',
  'run',
  'src/test/docPaste.test.ts',
  'src/test/docxImport.test.ts',
  'src/test/docxExport.test.ts',
  'src/test/docTiptapAttrs.test.ts',
  'src/test/pdfExport.test.ts',
], { required: true });
console.log('[doc-compat] running document table browser UX checks');
run(node, ['scripts/verify-doc-table-ux.mjs'], { required: true });

console.log('[doc-compat] generating built-in compatibility DOCX sample');
run(npx, ['tsx', 'scripts/write-doc-compat-sample.ts', `--out=${generatedDocxPath}`], { required: true });

const input = resolve(docxPath ?? generatedDocxPath);
if (!docxPath) {
  console.log('[doc-compat] no DOCX path provided; using generated compatibility sample for render check');
}

if (!existsSync(input)) {
  console.error(`[doc-compat] DOCX not found: ${input}`);
  process.exit(1);
}

if (!soffice || !pdftoppm) {
  console.log('[doc-compat] render tools missing; generated sample structure was checked, render skipped');
  printToolingHint();
  process.exit(0);
}

mkdirSync(outDir, { recursive: true });
console.log(`[doc-compat] rendering ${input}`);
run(soffice, ['--headless', '--convert-to', 'pdf', '--outdir', outDir, input], { required: true });

const pdfPath = resolve(outDir, `${basename(input, extname(input))}.pdf`);
if (!existsSync(pdfPath)) {
  console.error(`[doc-compat] expected PDF was not created: ${pdfPath}`);
  process.exit(1);
}

const imagePrefix = resolve(outDir, basename(input, extname(input)));
run(pdftoppm, ['-png', pdfPath, imagePrefix], { required: true });
console.log(`[doc-compat] rendered pages written to ${outDir}`);

function findCommand(candidates) {
  for (const candidate of candidates) {
    const result = spawnSync(commandLookup(), [candidate], { encoding: 'utf8' });
    if (result.status === 0 && result.stdout.trim()) return result.stdout.trim().split(/\r?\n/)[0];
  }
  return null;
}

function commandLookup() {
  return process.platform === 'win32' ? 'where.exe' : 'which';
}

function run(command, commandArgs, { required }) {
  const result = spawnSync(command, commandArgs, {
    cwd: repoRoot,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (result.error) {
    console.error(`[doc-compat] failed to run ${command}: ${result.error.message}`);
  }
  if (required && result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function printToolingHint() {
  console.log(`[doc-compat] render tooling: soffice=${soffice ? 'yes' : 'no'}, pdftoppm=${pdftoppm ? 'yes' : 'no'}`);
  console.log('[doc-compat] install LibreOffice and Poppler to enable DOCX -> PDF/PNG visual checks');
}
