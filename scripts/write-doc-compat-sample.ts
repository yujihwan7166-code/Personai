import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import JSZip from 'jszip';
import { exportDocxBlobFromJson } from '../src/lib/cloudDoc/docx';
import { createDocCompatibilitySampleJson } from '../src/lib/cloudDoc/sampleDocs';

const REQUIRED_DOCX_PARTS = [
  '[Content_Types].xml',
  'word/_rels/document.xml.rels',
  'word/styles.xml',
  'word/numbering.xml',
  'word/fontTable.xml',
  'word/settings.xml',
] as const;

const REQUIRED_DOCUMENT_MARKERS = [
  { xml: '<w:tbl', message: 'sample DOCX should contain a table' },
  { xml: '<w:tblW', message: 'sample DOCX should contain table width metadata' },
  { xml: '<w:tblLayout', message: 'sample DOCX should contain fixed table layout metadata' },
  { xml: '<w:jc', message: 'sample DOCX should contain table or paragraph alignment metadata' },
  { xml: '<w:tblGrid', message: 'sample DOCX should contain table grid metadata' },
  { xml: '<w:gridCol', message: 'sample DOCX should contain column width grid metadata' },
  { xml: '<w:tcW', message: 'sample DOCX should contain cell width metadata' },
  { xml: '<w:tcMar', message: 'sample DOCX should contain cell margin metadata' },
  { xml: '<w:shd', message: 'sample DOCX should contain cell shading metadata' },
  { xml: '<w:tcBorders', message: 'sample DOCX should contain cell border metadata' },
  { xml: '<w:vMerge', message: 'sample DOCX should contain vertical merge metadata' },
  { xml: '<w:tblHeader', message: 'sample DOCX should contain header row metadata' },
  { xml: '<w:tabs', message: 'sample DOCX should contain paragraph tab stops' },
  { xml: '<w:ind', message: 'sample DOCX should contain paragraph indent metadata' },
  { xml: '<w:spacing', message: 'sample DOCX should contain paragraph spacing metadata' },
  { xml: '<w:rFonts', message: 'sample DOCX should contain run font metadata' },
  { xml: 'w:eastAsia', message: 'sample DOCX should contain East Asian font metadata' },
  { xml: '<w:footnoteReference', message: 'sample DOCX should contain a footnote reference' },
] as const;

const outArg = process.argv.find((arg) => arg.startsWith('--out='));
const outPath = resolve(outArg ? outArg.slice('--out='.length) : 'tmp/docs/doc-compat-sample.docx');

const blob = await exportDocxBlobFromJson(createDocCompatibilitySampleJson());
const buffer = Buffer.from(await blob.arrayBuffer());
const zip = await JSZip.loadAsync(buffer);
const documentXml = await requiredText(zip, 'word/document.xml');
const footnotesXml = await requiredText(zip, 'word/footnotes.xml');

for (const part of REQUIRED_DOCX_PARTS) {
  await requiredText(zip, part);
}

for (const marker of REQUIRED_DOCUMENT_MARKERS) {
  assertIncludes(documentXml, marker.xml, marker.message);
}

assertIncludes(footnotesXml, '각주 export 확인용 샘플입니다.', 'sample DOCX should contain footnote body text');

await mkdir(dirname(outPath), { recursive: true });
await writeFile(outPath, buffer);
console.log(`[doc-compat] wrote sample DOCX: ${outPath}`);

async function requiredText(zipFile: JSZip, path: string): Promise<string> {
  const file = zipFile.file(path);
  if (!file) throw new Error(`[doc-compat] required DOCX part missing: ${path}`);
  return file.async('string');
}

function assertXml(condition: boolean, message: string): void {
  if (!condition) throw new Error(`[doc-compat] ${message}`);
}

function assertIncludes(xml: string, marker: string, message: string): void {
  assertXml(xml.includes(marker), message);
}
