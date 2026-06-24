import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { copyFile, writeFile } from 'node:fs/promises';
import { basename, dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ExcelJS from 'exceljs';
import { XMLValidator } from 'fast-xml-parser';
import JSZip from 'jszip';
import pptxgenjs from 'pptxgenjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outArg = process.argv.slice(2).find((arg) => arg.startsWith('--out='));
const outDir = resolve(outArg ? outArg.slice('--out='.length) : 'tmp/office-compat-render');
const sampleDir = resolve(outDir, 'samples');
const renderDir = resolve(outDir, 'rendered');

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const soffice = findCommand(['soffice', 'libreoffice']);
const pdftoppm = findCommand(['pdftoppm']);
const RELATIONSHIP_CONTENT_TYPE = 'application/vnd.openxmlformats-package.relationships+xml';
const RELATIONSHIP_NAMESPACE = 'http://schemas.openxmlformats.org/package/2006/relationships';
const CONTENT_TYPES_NAMESPACE = 'http://schemas.openxmlformats.org/package/2006/content-types';
const OFFICE_DOCUMENT_RELATIONSHIPS = new Set([
  'http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument',
  'http://purl.oclc.org/ooxml/officeDocument/relationships/officeDocument',
]);
const CORE_PROPERTIES_RELATIONSHIP = 'http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties';
const EXTENDED_PROPERTIES_RELATIONSHIP = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties';
const CORE_PROPERTIES_CONTENT_TYPE = 'application/vnd.openxmlformats-package.core-properties+xml';
const EXTENDED_PROPERTIES_CONTENT_TYPE = 'application/vnd.openxmlformats-officedocument.extended-properties+xml';
const MAX_EMBEDDED_OFFICE_PACKAGE_DEPTH = 4;
const MAX_EMBEDDED_OFFICE_PACKAGE_COUNT = 32;
const REACHABILITY_REQUIRED_RESOURCE_PART = /^(?:word|xl|ppt)\/(?:activeX|chartColorStyle|charts|chartStyle|diagrams|drawings|embeddings|externalLinks|fonts|media|model|pivotCache|pivotTables|printerSettings|theme)\//i;

console.log('[office-compat] running DOCX/XLSX/PPTX import-export regression tests');
run(npx, [
  'vitest',
  'run',
  'src/test/docxImport.test.ts',
  'src/test/docxExport.test.ts',
  'src/test/cloudSheetXlsx.test.ts',
  'src/test/slidePptx.test.ts',
], { required: true });

mkdirSync(sampleDir, { recursive: true });
mkdirSync(renderDir, { recursive: true });

const docxPath = resolve(sampleDir, 'office-compat.docx');
const xlsxPath = resolve(sampleDir, 'office-compat.xlsx');
const pptxPath = resolve(sampleDir, 'office-compat.pptx');
const generatedDocxPath = resolve('tmp/docs/doc-compat-sample.docx');

console.log('[office-compat] generating compatibility samples');
run(npx, ['tsx', 'scripts/write-doc-compat-sample.ts'], { required: true });
await copyFile(generatedDocxPath, docxPath);
await writeXlsxSample(xlsxPath);
await writePptxSample(pptxPath);

for (const sample of [docxPath, xlsxPath, pptxPath]) {
  if (!existsSync(sample)) {
    console.error(`[office-compat] expected sample was not created: ${sample}`);
    process.exit(1);
  }
}

console.log('[office-compat] validating sample package structure');
for (const sample of [docxPath, xlsxPath, pptxPath]) {
  await validateOoxmlPackage(sample);
}
await validateDocxSample(docxPath);
await validateXlsxSample(xlsxPath);
await validatePptxSample(pptxPath);
await runOoxmlValidatorSelfChecks();

if (!soffice || !pdftoppm) {
  console.log('[office-compat] render tools missing; structure and round-trip tests passed, visual render skipped');
  console.log(`[office-compat] render tooling: soffice=${soffice ? 'yes' : 'no'}, pdftoppm=${pdftoppm ? 'yes' : 'no'}`);
  console.log('[office-compat] install LibreOffice and Poppler to enable DOCX/XLSX/PPTX -> PDF/PNG visual checks');
  process.exit(0);
}

for (const sample of [docxPath, xlsxPath, pptxPath]) {
  console.log(`[office-compat] rendering ${sample}`);
  run(soffice, ['--headless', '--convert-to', 'pdf', '--outdir', renderDir, sample], { required: true });
  const pdfPath = resolve(renderDir, `${basename(sample, extname(sample))}.pdf`);
  if (!existsSync(pdfPath)) {
    console.error(`[office-compat] expected PDF was not created: ${pdfPath}`);
    process.exit(1);
  }
  run(pdftoppm, ['-png', pdfPath, resolve(renderDir, basename(sample, extname(sample)))], { required: true });
}

console.log(`[office-compat] rendered PDFs and PNG pages written to ${renderDir}`);

async function writeXlsxSample(path) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'office-compat';
  workbook.calcProperties.fullCalcOnLoad = true;
  const sheet = workbook.addWorksheet('Compatibility', {
    views: [{ state: 'frozen', ySplit: 1 }],
    pageSetup: { orientation: 'landscape', fitToPage: true },
  });
  sheet.columns = [
    { header: 'Item', key: 'item', width: 22 },
    { header: 'Q1', key: 'q1', width: 12 },
    { header: 'Q2', key: 'q2', width: 12 },
    { header: 'Total', key: 'total', width: 14 },
  ];
  sheet.addRows([
    { item: 'Revenue', q1: 1200, q2: 1800 },
    { item: 'Cost', q1: 700, q2: 900 },
    { item: 'Margin', q1: 500, q2: 900 },
  ]);
  for (let row = 2; row <= 4; row += 1) {
    sheet.getCell(`D${row}`).value = { formula: `SUM(B${row}:C${row})`, result: row === 2 ? 3000 : row === 3 ? 1600 : 1400 };
  }
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E79' } };
  sheet.getColumn('B').numFmt = '#,##0';
  sheet.getColumn('C').numFmt = '#,##0';
  sheet.getColumn('D').numFmt = '#,##0';
  sheet.mergeCells('A6:D6');
  sheet.getCell('A6').value = 'Merged note with validation and comments';
  sheet.getCell('A6').alignment = { horizontal: 'center' };
  sheet.getCell('A2').note = 'Imported/exported note smoke check';
  sheet.getCell('A7').dataValidation = {
    type: 'list',
    allowBlank: true,
    formulae: ['"Open,Closed,Review"'],
  };
  await workbook.xlsx.writeFile(path);
  await addXlsxStructuralSmokeMetadata(path);
}

async function addXlsxStructuralSmokeMetadata(path) {
  const zip = await JSZip.loadAsync(await readFile(path));
  const contentTypes = await zip.file('[Content_Types].xml')?.async('string');
  if (contentTypes) {
    zip.file('[Content_Types].xml', addContentTypeOverrides(contentTypes, [
      ['xl/externalLinks/externalLink1.xml', 'application/vnd.openxmlformats-officedocument.spreadsheetml.externalLink+xml'],
      ['xl/pivotCache/pivotCacheDefinition1.xml', 'application/vnd.openxmlformats-officedocument.spreadsheetml.pivotCacheDefinition+xml'],
      ['xl/drawings/drawing1.xml', 'application/vnd.openxmlformats-officedocument.drawing+xml'],
      ['xl/charts/chart1.xml', 'application/vnd.openxmlformats-officedocument.drawingml.chart+xml'],
      ['xl/tables/table1.xml', 'application/vnd.openxmlformats-officedocument.spreadsheetml.table+xml'],
    ]));
  }

  const workbookXml = await zip.file('xl/workbook.xml')?.async('string');
  if (workbookXml) {
    const withRelsNs = workbookXml.includes('xmlns:r=')
      ? workbookXml
      : workbookXml.replace('<workbook ', '<workbook xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ');
    const structuralXml = `
  <externalReferences>
    <externalReference r:id="rIdCompatExternalRef"/>
  </externalReferences>
  <definedNames>
    <definedName name="_xlnm.Print_Area" localSheetId="0">'Compatibility'!$A$1:$D$7</definedName>
    <definedName name="CompatTotalRange">'Compatibility'!$D$2:$D$4</definedName>
  </definedNames>
  <pivotCaches>
    <pivotCache cacheId="1" r:id="rIdCompatPivotCache"/>
  </pivotCaches>`;
    zip.file('xl/workbook.xml', withRelsNs.replace(/(<calcPr\b[\s\S]*?\/>|<calcPr\b[\s\S]*?<\/calcPr>|<\/workbook>)/, (match) => (
      match === '</workbook>' ? `${structuralXml}</workbook>` : `${structuralXml}${match}`
    )));
  }

  const workbookRels = await zip.file('xl/_rels/workbook.xml.rels')?.async('string');
  if (workbookRels) {
    zip.file('xl/_rels/workbook.xml.rels', addRelationships(workbookRels, [
      ['rIdCompatExternalRef', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/externalLink', 'externalLinks/externalLink1.xml'],
      ['rIdCompatPivotCache', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/pivotCacheDefinition', 'pivotCache/pivotCacheDefinition1.xml'],
    ]));
  }
  const worksheetXml = await zip.file('xl/worksheets/sheet1.xml')?.async('string');
  if (worksheetXml) {
    const withRelsNs = worksheetXml.includes('xmlns:r=')
      ? worksheetXml
      : worksheetXml.replace('<worksheet ', '<worksheet xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ');
    const autoFilterXml = `
  <autoFilter ref="A1:D7">
    <filterColumn colId="0">
      <filters><filter val="Revenue"/><filter val="Margin"/></filters>
    </filterColumn>
    <filterColumn colId="3">
      <top10 top="1" percent="0" val="2"/>
    </filterColumn>
    <sortState ref="A2:D7">
      <sortCondition ref="D2:D7" descending="1"/>
    </sortState>
  </autoFilter>`;
    const conditionalFormattingXml = `
  <conditionalFormatting sqref="D2:D4">
    <cfRule type="colorScale" priority="1">
      <colorScale>
        <cfvo type="min"/>
        <cfvo type="max"/>
        <color rgb="FFF8696B"/>
        <color rgb="FF63BE7B"/>
      </colorScale>
    </cfRule>
  </conditionalFormatting>`;
    let patchedWorksheet = withRelsNs.includes('<autoFilter ')
      ? withRelsNs.replace(/<autoFilter\b[\s\S]*?<\/autoFilter>|<autoFilter\b[^>]*\/>/, autoFilterXml)
      : withRelsNs.replace(/(<sheetData\b[\s\S]*?<\/sheetData>)/, `$1${autoFilterXml}`);
    patchedWorksheet = patchedWorksheet.includes('<conditionalFormatting ')
      ? patchedWorksheet
      : patchedWorksheet.replace(/(<mergeCells\b[\s\S]*?<\/mergeCells>|<autoFilter\b[\s\S]*?<\/autoFilter>)/, `$1${conditionalFormattingXml}`);
    patchedWorksheet = patchedWorksheet.includes('<tableParts ')
      ? patchedWorksheet
      : patchedWorksheet.replace(/(<drawing\b[\s\S]*?\/>|<\/worksheet>)/, '<tableParts count="1"><tablePart r:id="rIdCompatTable"/></tableParts>$1');
    patchedWorksheet = patchedWorksheet.includes('<drawing ')
      ? patchedWorksheet
      : patchedWorksheet.replace('</worksheet>', '<drawing r:id="rIdCompatDrawing"/></worksheet>');
    zip.file('xl/worksheets/sheet1.xml', patchedWorksheet);
  }
  const worksheetRelsPath = 'xl/worksheets/_rels/sheet1.xml.rels';
  const worksheetRels = await zip.file(worksheetRelsPath)?.async('string');
  zip.file(worksheetRelsPath, worksheetRels
    ? addRelationships(worksheetRels, [
      ['rIdCompatDrawing', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing', '../drawings/drawing1.xml'],
      ['rIdCompatTable', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/table', '../tables/table1.xml'],
    ])
    : `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rIdCompatDrawing" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/>
  <Relationship Id="rIdCompatTable" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/table" Target="../tables/table1.xml"/>
</Relationships>`);
  zip.file('xl/externalLinks/externalLink1.xml', '<externalLink/>');
  zip.file('xl/pivotCache/pivotCacheDefinition1.xml', '<pivotCacheDefinition/>');
  zip.file('xl/tables/table1.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<table xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" id="1" name="CompatibilityTable" displayName="CompatibilityTable" ref="A1:D4" totalsRowShown="0">
  <autoFilter ref="A1:D4"/>
  <tableColumns count="4">
    <tableColumn id="1" name="Item"/>
    <tableColumn id="2" name="Q1"/>
    <tableColumn id="3" name="Q2"/>
    <tableColumn id="4" name="Total"/>
  </tableColumns>
  <tableStyleInfo name="TableStyleMedium2" showFirstColumn="0" showLastColumn="0" showRowStripes="1" showColumnStripes="0"/>
</table>`);
  zip.file('xl/drawings/drawing1.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing"
  xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <xdr:twoCellAnchor>
    <xdr:from><xdr:col>5</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>1</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from>
    <xdr:to><xdr:col>9</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>10</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to>
    <xdr:graphicFrame>
      <xdr:nvGraphicFramePr><xdr:cNvPr id="2" name="Compatibility Chart"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr>
      <xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm>
      <a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart">
        <c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" r:id="rIdCompatChart"/>
      </a:graphicData></a:graphic>
    </xdr:graphicFrame>
    <xdr:clientData/>
  </xdr:twoCellAnchor>
</xdr:wsDr>`);
  zip.file('xl/drawings/_rels/drawing1.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rIdCompatChart" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="../charts/chart1.xml"/>
</Relationships>`);
  zip.file('xl/charts/chart1.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart"
  xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <c:chart>
    <c:title><c:tx><c:rich><a:p><a:r><a:t>Compatibility Totals</a:t></a:r></a:p></c:rich></c:tx></c:title>
    <c:plotArea>
      <c:barChart>
        <c:barDir val="col"/>
        <c:ser>
          <c:idx val="0"/><c:order val="0"/>
          <c:tx><c:v>Total</c:v></c:tx>
          <c:cat><c:strRef><c:f>Compatibility!$A$2:$A$4</c:f></c:strRef></c:cat>
          <c:val><c:numRef><c:f>Compatibility!$D$2:$D$4</c:f></c:numRef></c:val>
        </c:ser>
      </c:barChart>
    </c:plotArea>
  </c:chart>
</c:chartSpace>`);

  const out = await zip.generateAsync({ type: 'nodebuffer' });
  await writeFile(path, out);
}

async function writePptxSample(path) {
  const pptx = new pptxgenjs();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = 'office-compat';
  pptx.subject = 'Office compatibility render smoke sample';
  pptx.theme = {
    headFontFace: 'Arial',
    bodyFontFace: 'Arial',
    lang: 'en-US',
  };

  const slide = pptx.addSlide();
  slide.background = { color: 'F7FAFC' };
  slide.addText('Office Compatibility Smoke', {
    x: 0.6,
    y: 0.45,
    w: 11.0,
    h: 0.55,
    fontFace: 'Arial',
    fontSize: 28,
    bold: true,
    color: '1F2937',
  });
  slide.addText('Text, table, chart, and shape content should survive export and render.', {
    x: 0.65,
    y: 1.08,
    w: 10.8,
    h: 0.35,
    fontSize: 13,
    color: '4B5563',
  });
  slide.addTable([
    ['Metric', 'Q1', 'Q2'],
    ['Revenue', '1200', '1800'],
    ['Margin', '500', '900'],
  ], {
    x: 0.7,
    y: 1.7,
    w: 4.6,
    h: 1.5,
    border: { type: 'solid', color: 'CBD5E1', pt: 1 },
    fill: { color: 'FFFFFF' },
    color: '111827',
    fontSize: 12,
  });
  slide.addChart(pptx.ChartType.bar, [{
    name: 'Q1',
    labels: ['Revenue', 'Margin'],
    values: [1200, 500],
  }, {
    name: 'Q2',
    labels: ['Revenue', 'Margin'],
    values: [1800, 900],
  }], {
    x: 5.8,
    y: 1.55,
    w: 5.7,
    h: 3.2,
    showLegend: true,
    showTitle: true,
    title: 'Quarter Comparison',
  });
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.7,
    y: 4.0,
    w: 4.6,
    h: 1.05,
    fill: { color: 'DBEAFE' },
    line: { color: '2563EB', width: 1 },
    radius: 0.12,
  });
  slide.addText('Shape and text placement render check', {
    x: 0.95,
    y: 4.32,
    w: 4.1,
    h: 0.35,
    fontSize: 14,
    bold: true,
    color: '1E3A8A',
  });
  slide.addNotes('Presenter note: verify notes slide and notes master relationships survive.');

  await pptx.writeFile({ fileName: path });
  await addPptxStructuralSmokeMetadata(path);
}

async function addPptxStructuralSmokeMetadata(path) {
  const zip = await JSZip.loadAsync(await readFile(path));
  const contentTypes = await zip.file('[Content_Types].xml')?.async('string');
  if (contentTypes) {
    let patchedContentTypes = contentTypes;
    const overrides = [
      ['ppt/presProps.xml', 'application/vnd.openxmlformats-officedocument.presentationml.presProps+xml'],
      ['ppt/viewProps.xml', 'application/vnd.openxmlformats-officedocument.presentationml.viewProps+xml'],
      ['ppt/tableStyles.xml', 'application/vnd.openxmlformats-officedocument.presentationml.tableStyles+xml'],
      ['ppt/tags/tag1.xml', 'application/vnd.openxmlformats-officedocument.presentationml.tags+xml'],
    ];
    for (const [partName, contentType] of overrides) {
      if (patchedContentTypes.includes(`PartName="/${partName}"`)) continue;
      patchedContentTypes = addContentTypeOverrides(patchedContentTypes, [[partName, contentType]]);
    }
    zip.file('[Content_Types].xml', patchedContentTypes);
  }

  const presentationXml = await zip.file('ppt/presentation.xml')?.async('string');
  if (presentationXml) {
    const slideId = readXmlAttribute(presentationXml.match(/<p:sldId\b[^>]*>/)?.[0] ?? '', 'id') ?? '256';
    const withP14Namespace = presentationXml.includes('xmlns:p14=')
      ? presentationXml
      : presentationXml.replace('<p:presentation ', '<p:presentation xmlns:p14="http://schemas.microsoft.com/office/powerpoint/2010/main" ');
    const customShowsXml = `
  <p:custShowLst>
    <p:custShow name="Compatibility Review Path" id="1">
      <p:sldLst><p:sld id="${slideId}"/></p:sldLst>
    </p:custShow>
  </p:custShowLst>`;
    const sectionsXml = `
  <p:extLst>
    <p:ext uri="{521415D9-36F7-43E2-AB2F-B90AF26B5E84}">
      <p14:sectionLst>
        <p14:section name="Compatibility Section" id="{11111111-2222-3333-4444-555555555555}">
          <p14:sldIdLst><p14:sldId id="${slideId}"/></p14:sldIdLst>
        </p14:section>
      </p14:sectionLst>
    </p:ext>
  </p:extLst>`;
    zip.file('ppt/presentation.xml', withP14Namespace
      .replace('</p:presentation>', `${customShowsXml}${sectionsXml}</p:presentation>`));
  }

  const presentationRels = await zip.file('ppt/_rels/presentation.xml.rels')?.async('string');
  if (presentationRels) {
    let patchedPresentationRels = presentationRels;
    const relationships = [
      ['rIdCompatPresProps', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/presProps', 'presProps.xml'],
      ['rIdCompatViewProps', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/viewProps', 'viewProps.xml'],
      ['rIdCompatTableStyles', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/tableStyles', 'tableStyles.xml'],
    ];
    for (const [id, type, target] of relationships) {
      if (patchedPresentationRels.includes(`Target="${target}"`)) continue;
      patchedPresentationRels = addRelationships(patchedPresentationRels, [[id, type, target]]);
    }
    zip.file('ppt/_rels/presentation.xml.rels', patchedPresentationRels);
  }

  const slideRelsPath = 'ppt/slides/_rels/slide1.xml.rels';
  const slideRels = await zip.file(slideRelsPath)?.async('string');
  if (slideRels) {
    zip.file(slideRelsPath, addRelationships(slideRels, [
      ['rIdCompatTags', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/tags', '../tags/tag1.xml'],
    ]));
  }

  zip.file('ppt/presProps.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentationPr xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:showPr loop="1"/>
</p:presentationPr>`);
  zip.file('ppt/viewProps.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:viewPr xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:normalViewPr restoredLeft="15620" restoredTop="94660"/>
</p:viewPr>`);
  zip.file('ppt/tableStyles.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<a:tblStyleLst xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" def="{5C22544A-7EE6-4342-B048-85BDC9FD1C3A}">
  <a:tblStyle styleId="{11111111-2222-3333-4444-555555555555}" styleName="Compatibility Table"/>
</a:tblStyleLst>`);
  zip.file('ppt/tags/tag1.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:tagLst xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:tag name="workflowId" val="compatibility-smoke-001"/>
</p:tagLst>`);

  const out = await zip.generateAsync({ type: 'nodebuffer' });
  await writeFile(path, out);
}

async function validateDocxSample(path) {
  const zip = await JSZip.loadAsync(await readFile(path));
  await requireContentTypes(zip, path, {
    'word/document.xml': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml',
    'word/footnotes.xml': 'application/vnd.openxmlformats-officedocument.wordprocessingml.footnotes+xml',
    'word/endnotes.xml': 'application/vnd.openxmlformats-officedocument.wordprocessingml.endnotes+xml',
    'word/comments.xml': 'application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml',
    'word/styles.xml': 'application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml',
    'word/numbering.xml': 'application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml',
    'word/settings.xml': 'application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml',
    'word/fontTable.xml': 'application/vnd.openxmlformats-officedocument.wordprocessingml.fontTable+xml',
    'word/header1.xml': 'application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml',
    'word/footer1.xml': 'application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml',
    'word/charts/chart1.xml': 'application/vnd.openxmlformats-officedocument.drawingml.chart+xml',
    'word/chartStyle/style1.xml': 'application/vnd.ms-office.chartstyle+xml',
    'word/chartColorStyle/colors1.xml': 'application/vnd.ms-office.chartcolorstyle+xml',
    'word/embeddings/Microsoft_Excel_Worksheet1.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  await requireRelationships(zip, path, '_rels/.rels', {
    'word/document.xml': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument',
    'docProps/core.xml': 'http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties',
    'docProps/app.xml': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties',
  });
  await requireRelationships(zip, path, 'word/_rels/document.xml.rels', {
    'styles.xml': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles',
    'numbering.xml': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering',
    'footnotes.xml': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/footnotes',
    'endnotes.xml': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/endnotes',
    'comments.xml': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments',
    'settings.xml': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings',
    'fontTable.xml': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/fontTable',
    'header1.xml': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/header',
    'footer1.xml': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer',
    'charts/chart1.xml': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart',
  });
  await requireRelationships(zip, path, 'word/charts/_rels/chart1.xml.rels', {
    '../embeddings/Microsoft_Excel_Worksheet1.xlsx': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/package',
    '../chartStyle/style1.xml': 'http://schemas.microsoft.com/office/2011/relationships/chartStyle',
    '../chartColorStyle/colors1.xml': 'http://schemas.microsoft.com/office/2011/relationships/chartColorStyle',
  });
  await requireZipText(zip, 'word/document.xml', [
    '<w:tbl',
    '<w:tblW',
    '<w:tblLayout',
    '<w:tblGrid',
    '<w:gridCol',
    '<w:tcW',
    '<w:tcMar',
    '<w:tcBorders',
    '<w:vMerge',
    '<w:tblHeader',
    '<w:tabs',
    '<w:ind',
    '<w:spacing',
    '<w:numPr',
    '<w:ilvl',
    '<w:numId',
    '<w:rFonts',
    'w:eastAsia',
    '<w:footnoteReference',
    '<w:sectPr',
    '<w:headerReference w:type="default" r:id="rIdCompatHeader"',
    '<w:footerReference w:type="default" r:id="rIdCompatFooter"',
    'r:id="rIdCompatChart"',
    'Native DOCX chart relationship smoke test',
    '<w:pgMar',
  ]);
  await requireZipText(zip, 'word/header1.xml', ['Compatibility Header']);
  await requireZipText(zip, 'word/footer1.xml', ['Compatibility Footer']);
  await requireZipText(zip, 'word/footnotes.xml', [
    '<w:footnote',
    'w:type="separator"',
    'w:type="continuationSeparator"',
    '<w:footnoteRef/>',
    '<w:separator/>',
    '<w:continuationSeparator/>',
  ]);
  await requireZipText(zip, 'word/endnotes.xml', [
    '<w:endnote',
    'w:type="separator"',
    'w:type="continuationSeparator"',
  ]);
  await requireZipText(zip, 'word/styles.xml', [
    '<w:styles',
    'w:styleId="Heading1"',
    'w:styleId="Hyperlink"',
    'w:styleId="FootnoteReference"',
    'w:styleId="FootnoteText"',
  ]);
  await requireZipText(zip, 'word/numbering.xml', [
    '<w:numbering',
    '<w:abstractNum',
    '<w:lvl',
    '<w:num ',
    'w:start w:val="5"',
    'w:numFmt w:val="upperLetter"',
    'w:suff w:val="space"',
    'w:numFmt w:val="bullet"',
    'w:suff w:val="nothing"',
  ]);
  await requireZipText(zip, 'word/settings.xml', ['<w:settings']);
  await requireZipText(zip, 'word/fontTable.xml', ['<w:fonts']);
  await requireZipText(zip, 'word/comments.xml', ['<w:comments']);
  await requireZipText(zip, 'word/charts/chart1.xml', [
    'Compatibility Chart',
    'rIdCompatChartWorkbook',
    'Sheet1!$A$2:$A$4',
    'Sheet1!$B$2:$B$4',
  ]);
  await requireZipText(zip, 'word/charts/_rels/chart1.xml.rels', [
    'Target="../embeddings/Microsoft_Excel_Worksheet1.xlsx"',
    'Target="../chartStyle/style1.xml"',
    'Target="../chartColorStyle/colors1.xml"',
  ]);
  await requireZipText(zip, 'word/chartStyle/style1.xml', ['<cs:chartStyle']);
  await requireZipText(zip, 'word/chartColorStyle/colors1.xml', ['<cs:colorStyle']);
}

async function validateXlsxSample(path) {
  const zip = await JSZip.loadAsync(await readFile(path));
  await requireContentTypes(zip, path, {
    'xl/workbook.xml': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml',
    'xl/worksheets/sheet1.xml': 'application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml',
    'xl/sharedStrings.xml': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml',
    'xl/styles.xml': 'application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml',
    'xl/comments1.xml': 'application/vnd.openxmlformats-officedocument.spreadsheetml.comments+xml',
    'xl/externalLinks/externalLink1.xml': 'application/vnd.openxmlformats-officedocument.spreadsheetml.externalLink+xml',
    'xl/pivotCache/pivotCacheDefinition1.xml': 'application/vnd.openxmlformats-officedocument.spreadsheetml.pivotCacheDefinition+xml',
    'xl/drawings/drawing1.xml': 'application/vnd.openxmlformats-officedocument.drawing+xml',
    'xl/charts/chart1.xml': 'application/vnd.openxmlformats-officedocument.drawingml.chart+xml',
    'xl/tables/table1.xml': 'application/vnd.openxmlformats-officedocument.spreadsheetml.table+xml',
  });
  await requireRelationships(zip, path, '_rels/.rels', {
    'xl/workbook.xml': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument',
    'docProps/core.xml': 'http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties',
    'docProps/app.xml': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties',
  });
  await requireRelationships(zip, path, 'xl/_rels/workbook.xml.rels', {
    'worksheets/sheet1.xml': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet',
    'styles.xml': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles',
    'sharedStrings.xml': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings',
    'externalLinks/externalLink1.xml': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/externalLink',
    'pivotCache/pivotCacheDefinition1.xml': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/pivotCacheDefinition',
  });
  await requireRelationships(zip, path, 'xl/worksheets/_rels/sheet1.xml.rels', {
    '../drawings/drawing1.xml': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing',
    '../tables/table1.xml': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/table',
  });
  await requireRelationships(zip, path, 'xl/drawings/_rels/drawing1.xml.rels', {
    '../charts/chart1.xml': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart',
  });
  await requireZipText(zip, 'xl/workbook.xml', ['Compatibility']);
  await requireZipText(zip, 'xl/workbook.xml', [
    '<externalReferences>',
    'rIdCompatExternalRef',
    '<definedNames>',
    'name="_xlnm.Print_Area"',
    'name="CompatTotalRange"',
    '<pivotCaches>',
    'rIdCompatPivotCache',
    '<calcPr',
    'fullCalcOnLoad="1"',
  ]);
  await requireZipText(zip, 'xl/_rels/workbook.xml.rels', [
    'Target="externalLinks/externalLink1.xml"',
    'Target="pivotCache/pivotCacheDefinition1.xml"',
  ]);
  await requireZipText(zip, '[Content_Types].xml', [
    'PartName="/xl/externalLinks/externalLink1.xml"',
    'PartName="/xl/pivotCache/pivotCacheDefinition1.xml"',
    'PartName="/xl/drawings/drawing1.xml"',
    'PartName="/xl/charts/chart1.xml"',
    'PartName="/xl/tables/table1.xml"',
  ]);
  await requireZipText(zip, 'xl/externalLinks/externalLink1.xml', ['<externalLink']);
  await requireZipText(zip, 'xl/pivotCache/pivotCacheDefinition1.xml', ['<pivotCacheDefinition']);
  await requireZipText(zip, 'xl/worksheets/sheet1.xml', [
    '<mergeCell ref="A6:D6"',
    '<autoFilter ref="A1:D7"',
    '<filterColumn colId="0">',
    '<sortState ref="A2:D7">',
    '<conditionalFormatting sqref="D2:D4">',
    '<cfRule type="colorScale"',
    '<dataValidations',
    '<tableParts count="1">',
    'rIdCompatTable',
    '<pageSetup',
    '<drawing r:id="rIdCompatDrawing"',
    '<f>SUM(B2:C2)</f>',
    '<f>SUM(B3:C3)</f>',
    '<f>SUM(B4:C4)</f>',
  ]);
  await requireZipText(zip, 'xl/worksheets/_rels/sheet1.xml.rels', [
    'Target="../tables/table1.xml"',
  ]);
  await requireZipText(zip, 'xl/tables/table1.xml', [
    'displayName="CompatibilityTable"',
    '<autoFilter ref="A1:D4"',
    '<tableColumn id="4" name="Total"',
    '<tableStyleInfo name="TableStyleMedium2"',
  ]);
  await requireZipText(zip, 'xl/drawings/drawing1.xml', [
    'Compatibility Chart',
    'rIdCompatChart',
  ]);
  await requireZipText(zip, 'xl/charts/chart1.xml', [
    'Compatibility Totals',
    'Compatibility!$A$2:$A$4',
    'Compatibility!$D$2:$D$4',
  ]);
  await requireZipText(zip, 'xl/sharedStrings.xml', [
    'Revenue',
  ]);
  await requireZipText(zip, 'xl/comments1.xml', ['Imported/exported note smoke check']);
  await requireZipText(zip, 'xl/styles.xml', ['<styleSheet']);
}

async function validatePptxSample(path) {
  const zip = await JSZip.loadAsync(await readFile(path));
  await requireContentTypes(zip, path, {
    'ppt/presentation.xml': 'application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml',
    'ppt/slides/slide1.xml': 'application/vnd.openxmlformats-officedocument.presentationml.slide+xml',
    'ppt/slideMasters/slideMaster1.xml': 'application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml',
    'ppt/slideLayouts/slideLayout1.xml': 'application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml',
    'ppt/notesSlides/notesSlide1.xml': 'application/vnd.openxmlformats-officedocument.presentationml.notesSlide+xml',
    'ppt/notesMasters/notesMaster1.xml': 'application/vnd.openxmlformats-officedocument.presentationml.notesMaster+xml',
    'ppt/theme/theme1.xml': 'application/vnd.openxmlformats-officedocument.theme+xml',
    'ppt/charts/chart1.xml': 'application/vnd.openxmlformats-officedocument.drawingml.chart+xml',
    'ppt/embeddings/Microsoft_Excel_Worksheet1.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'ppt/presProps.xml': 'application/vnd.openxmlformats-officedocument.presentationml.presProps+xml',
    'ppt/viewProps.xml': 'application/vnd.openxmlformats-officedocument.presentationml.viewProps+xml',
    'ppt/tableStyles.xml': 'application/vnd.openxmlformats-officedocument.presentationml.tableStyles+xml',
    'ppt/tags/tag1.xml': 'application/vnd.openxmlformats-officedocument.presentationml.tags+xml',
  });
  await requireRelationships(zip, path, '_rels/.rels', {
    'ppt/presentation.xml': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument',
    'docProps/core.xml': 'http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties',
    'docProps/app.xml': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties',
  });
  await requireRelationships(zip, path, 'ppt/_rels/presentation.xml.rels', {
    'slides/slide1.xml': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide',
    'slideMasters/slideMaster1.xml': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster',
    'notesMasters/notesMaster1.xml': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesMaster',
    'theme/theme1.xml': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme',
    'presProps.xml': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/presProps',
    'viewProps.xml': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/viewProps',
    'tableStyles.xml': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/tableStyles',
  });
  await requireRelationships(zip, path, 'ppt/slides/_rels/slide1.xml.rels', {
    '../charts/chart1.xml': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart',
    '../slideLayouts/slideLayout1.xml': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout',
    '../notesSlides/notesSlide1.xml': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesSlide',
    '../tags/tag1.xml': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/tags',
  });
  await requireRelationships(zip, path, 'ppt/slideMasters/_rels/slideMaster1.xml.rels', {
    '../slideLayouts/slideLayout1.xml': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout',
    '../theme/theme1.xml': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme',
  });
  await requireRelationships(zip, path, 'ppt/slideLayouts/_rels/slideLayout1.xml.rels', {
    '../slideMasters/slideMaster1.xml': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster',
  });
  await requireRelationships(zip, path, 'ppt/notesSlides/_rels/notesSlide1.xml.rels', {
    '../notesMasters/notesMaster1.xml': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesMaster',
    '../slides/slide1.xml': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide',
  });
  await requireRelationships(zip, path, 'ppt/notesMasters/_rels/notesMaster1.xml.rels', {
    '../theme/theme1.xml': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme',
  });
  await requireRelationships(zip, path, 'ppt/charts/_rels/chart1.xml.rels', {
    '../embeddings/Microsoft_Excel_Worksheet1.xlsx': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/package',
  });
  await requireZipText(zip, 'ppt/presentation.xml', [
    '<p:presentation',
    '<p:custShowLst>',
    'Compatibility Review Path',
    '<p14:sectionLst>',
    'Compatibility Section',
  ]);
  await requireZipText(zip, 'ppt/presProps.xml', [
    '<p:presentationPr',
    'loop="1"',
  ]);
  await requireZipText(zip, 'ppt/viewProps.xml', [
    '<p:viewPr',
    'restoredLeft="15620"',
  ]);
  await requireZipText(zip, 'ppt/tableStyles.xml', [
    '<a:tblStyleLst',
    'Compatibility Table',
  ]);
  await requireZipText(zip, 'ppt/tags/tag1.xml', [
    '<p:tagLst',
    'workflowId',
    'compatibility-smoke-001',
  ]);
  await requireZipText(zip, 'ppt/slideMasters/slideMaster1.xml', ['<p:sldMaster']);
  await requireZipText(zip, 'ppt/slideLayouts/slideLayout1.xml', ['<p:sldLayout']);
  await requireZipText(zip, 'ppt/notesSlides/notesSlide1.xml', [
    '<p:notes',
    'Presenter note: verify notes slide and notes master relationships survive.',
  ]);
  await requireZipText(zip, 'ppt/notesMasters/notesMaster1.xml', ['<p:notesMaster']);
  await requireZipText(zip, 'ppt/theme/theme1.xml', ['<a:theme']);
  await requireZipText(zip, 'ppt/slides/slide1.xml', [
    'Office Compatibility Smoke',
    'Shape and text placement render check',
    'Revenue',
    '<a:tbl>',
    '<p:graphicFrame>',
  ]);
  await requireZipText(zip, 'ppt/charts/chart1.xml', [
    'Quarter Comparison',
    '<c:barChart>',
    '<c:externalData',
  ]);
  await requireZipText(zip, 'ppt/charts/_rels/chart1.xml.rels', [
    'Target="../embeddings/Microsoft_Excel_Worksheet1.xlsx"',
  ]);
}

async function validateOoxmlPackage(path) {
  const zip = await JSZip.loadAsync(await readFile(path));
  await validateOoxmlZip(zip, path, { depth: 0, validatedEmbeddedPackages: new Set() });
}

async function validateOoxmlZip(zip, packagePath, options = { depth: 0, validatedEmbeddedPackages: new Set() }) {
  validatePackagePartNames(zip, packagePath);
  await validateXmlParts(zip, packagePath);
  validateRelationshipPartSources(zip, packagePath);
  await validateRelationshipXmlRoots(zip, packagePath);
  await validateRelationshipIds(zip, packagePath);
  await validateRelationshipTargets(zip, packagePath);
  await validateRelationshipReferences(zip, packagePath);
  await validateContentTypes(zip, packagePath);
  await validateReachableResourceParts(zip, packagePath);
  await validateRootOfficeDocument(zip, packagePath);
  await validatePackageProperties(zip, packagePath);
  await validateWorkbookDefinedNames(zip, packagePath);
  await validateEmbeddedOfficePackages(zip, packagePath, options);
}

async function validateEmbeddedOfficePackages(zip, packagePath, options = { depth: 0, validatedEmbeddedPackages: new Set() }) {
  if (options.depth >= MAX_EMBEDDED_OFFICE_PACKAGE_DEPTH) {
    const embeddedParts = await readEmbeddedOfficePackageTargets(zip, packagePath);
    if (embeddedParts.size === 0) return;
    throw new Error(`[office-compat] ${packagePath} exceeds embedded Office package depth limit (${MAX_EMBEDDED_OFFICE_PACKAGE_DEPTH})`);
  }
  const embeddedParts = await readEmbeddedOfficePackageTargets(zip, packagePath);
  for (const partPath of embeddedParts) {
    const embeddedPackagePath = `${packagePath}!/${partPath}`;
    if (options.validatedEmbeddedPackages.has(embeddedPackagePath)) continue;
    if (options.validatedEmbeddedPackages.size >= MAX_EMBEDDED_OFFICE_PACKAGE_COUNT) {
      throw new Error(`[office-compat] ${packagePath} exceeds embedded Office package count limit (${MAX_EMBEDDED_OFFICE_PACKAGE_COUNT})`);
    }
    options.validatedEmbeddedPackages.add(embeddedPackagePath);
    const file = zip.file(partPath);
    if (!file) {
      throw new Error(`[office-compat] ${packagePath} has embedded Office package relationship to missing part: ${partPath}`);
    }
    let embeddedZip;
    try {
      embeddedZip = await JSZip.loadAsync(await file.async('uint8array'));
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new Error(`[office-compat] ${embeddedPackagePath} is not a readable OOXML zip package: ${detail}`);
    }
    await validateOoxmlZip(embeddedZip, embeddedPackagePath, {
      depth: options.depth + 1,
      validatedEmbeddedPackages: options.validatedEmbeddedPackages,
    });
  }
}

async function readEmbeddedOfficePackageTargets(zip, packagePath) {
  const out = new Set();
  for (const [relsPath, entry] of Object.entries(zip.files)) {
    if (entry.dir || !isRelationshipPartPath(relsPath)) continue;
    const sourceDir = packageSourceDirFromRelsPath(relsPath);
    for (const rel of readRelationshipTags(await entry.async('string'))) {
      if (!isEmbeddedOfficePackageRelationship(rel)) continue;
      const target = rel.target ?? '';
      const partPath = resolvePackageTarget(sourceDir, target);
      if (!partPath) {
        throw new Error(`[office-compat] ${packagePath} has embedded Office package relationship without resolvable target in ${relsPath}`);
      }
      out.add(partPath);
    }
  }
  return out;
}

function isEmbeddedOfficePackageRelationship(rel) {
  if (rel.targetMode && /^External$/i.test(rel.targetMode)) return false;
  if (!/\/relationships\/package$/i.test(rel.type ?? '')) return false;
  return /\.(?:docx|xlsx|pptx|xlsm|docm|pptm)$/i.test(rel.target ?? '');
}

function validatePackagePartNames(zip, packagePath) {
  const normalizedParts = new Map();
  for (const [path, entry] of Object.entries(zip.files)) {
    if (entry.dir) continue;
    if (!path || path.startsWith('/') || path.includes('\\')) {
      throw new Error(`[office-compat] ${packagePath} has invalid OOXML part path: ${path}`);
    }
    if (path.split('/').some((part) => !part || part === '.' || part === '..')) {
      throw new Error(`[office-compat] ${packagePath} has non-normalized OOXML part path: ${path}`);
    }
    const normalizedPath = normalizePackagePath(path);
    const previousPath = normalizedParts.get(normalizedPath);
    if (previousPath) {
      throw new Error(`[office-compat] ${packagePath} has duplicate normalized OOXML part paths: ${previousPath} and ${path}`);
    }
    normalizedParts.set(normalizedPath, path);
  }
}

async function validateXmlParts(zip, packagePath) {
  for (const [path, entry] of Object.entries(zip.files)) {
    if (entry.dir || !isXmlPartPath(path)) continue;
    const result = XMLValidator.validate(await entry.async('string'));
    if (result === true) continue;
    const detail = result.err ? `${result.err.msg} at ${result.err.line}:${result.err.col}` : 'unknown XML parse error';
    throw new Error(`[office-compat] ${packagePath} has malformed XML part ${path}: ${detail}`);
  }
}

function validateRelationshipPartSources(zip, packagePath) {
  for (const [path, entry] of Object.entries(zip.files)) {
    if (entry.dir || !isRelationshipPartPath(path) || normalizePackagePath(path) === '_rels/.rels') continue;
    const sourcePart = sourcePartPathFromRelationshipPath(path);
    if (sourcePart && zip.file(sourcePart)) continue;
    throw new Error(`[office-compat] ${packagePath} has relationship part without source part: ${path} -> ${sourcePart || 'unknown'}`);
  }
}

async function validateRelationshipXmlRoots(zip, packagePath) {
  for (const [path, entry] of Object.entries(zip.files)) {
    if (entry.dir || !isRelationshipPartPath(path)) continue;
    const root = xmlRootInfoFromText(await entry.async('string'));
    if (root?.name !== 'Relationships') {
      throw new Error(`[office-compat] ${packagePath} has relationship part without Relationships root: ${path}`);
    }
    if (root.namespace === RELATIONSHIP_NAMESPACE) continue;
    throw new Error(`[office-compat] ${packagePath} has relationship part with wrong Relationships namespace: ${path}`);
  }
}

async function validateRelationshipIds(zip, packagePath) {
  for (const [path, entry] of Object.entries(zip.files)) {
    if (entry.dir || !isRelationshipPartPath(path)) continue;
    const seen = new Set();
    for (const rel of readRelationshipTags(await entry.async('string'))) {
      if (!rel.id) {
        throw new Error(`[office-compat] ${packagePath} has relationship without Id in ${path}`);
      }
      if (!rel.type) {
        throw new Error(`[office-compat] ${packagePath} has relationship without Type in ${path}: ${rel.id}`);
      }
      if (!isAbsoluteUri(rel.type)) {
        throw new Error(`[office-compat] ${packagePath} has relationship Type that is not an absolute URI in ${path}: ${rel.id} -> ${rel.type}`);
      }
      if (!rel.target) {
        throw new Error(`[office-compat] ${packagePath} has relationship without Target in ${path}: ${rel.id}`);
      }
      if (rel.targetMode && !/^(Internal|External)$/i.test(rel.targetMode)) {
        throw new Error(`[office-compat] ${packagePath} has relationship with invalid TargetMode in ${path}: ${rel.id} -> ${rel.targetMode}`);
      }
      if (!seen.has(rel.id)) {
        seen.add(rel.id);
        continue;
      }
      throw new Error(`[office-compat] ${packagePath} has duplicate relationship Id in ${path}: ${rel.id}`);
    }
  }
}

async function validateRelationshipTargets(zip, packagePath) {
  for (const [path, entry] of Object.entries(zip.files)) {
    if (entry.dir || !isRelationshipPartPath(path)) continue;
    const relsXml = await entry.async('string');
    const sourceDir = packageSourceDirFromRelsPath(path);
    for (const rel of readRelationshipTags(relsXml)) {
      const target = rel.target ?? '';
      if (target.includes('\\')) {
        throw new Error(`[office-compat] ${packagePath} has relationship target with backslashes: ${path} -> ${target}`);
      }
      if (isExternalTarget(target) && !/^External$/i.test(rel.targetMode ?? '')) {
        throw new Error(`[office-compat] ${packagePath} has external relationship target without TargetMode=External: ${path} -> ${target}`);
      }
      if (/^External$/i.test(rel.targetMode ?? '')) continue;
      const { normalizedTarget, escapesPackageRoot } = resolvePackageTargetInfo(sourceDir, target);
      if (escapesPackageRoot) {
        throw new Error(`[office-compat] ${packagePath} has relationship target escaping package root: ${path} -> ${target}`);
      }
      if (!normalizedTarget || zip.file(normalizedTarget)) continue;
      throw new Error(`[office-compat] ${packagePath} has broken relationship target: ${path} -> ${target} (${normalizedTarget})`);
    }
  }
}

async function validateContentTypes(zip, packagePath) {
  const contentTypes = await readContentTypeMap(zip, packagePath);

  for (const partPath of contentTypes.overrides.keys()) {
    if (zip.file(partPath)) continue;
    throw new Error(`[office-compat] ${packagePath} has content type Override for missing part: ${partPath}`);
  }

  for (const [path, entry] of Object.entries(zip.files)) {
    if (entry.dir || path === '[Content_Types].xml') continue;
    if (isRelationshipPartPath(path)) {
      const actual = contentTypeForPath(contentTypes, path);
      if (actual === RELATIONSHIP_CONTENT_TYPE) continue;
      throw new Error(`[office-compat] ${packagePath} has wrong relationship content type for ${path}: expected ${RELATIONSHIP_CONTENT_TYPE}, got ${actual ?? 'none'}`);
    }
    const normalizedPath = normalizePackagePath(path);
    const extension = normalizedPath.includes('.') ? normalizedPath.slice(normalizedPath.lastIndexOf('.') + 1).toLowerCase() : '';
    if (contentTypes.overrides.has(normalizedPath) || (extension && contentTypes.defaults.has(extension))) continue;
    throw new Error(`[office-compat] ${packagePath} has part without content type: ${normalizedPath}`);
  }
}

async function validateRelationshipReferences(zip, packagePath) {
  for (const [path, entry] of Object.entries(zip.files)) {
    if (entry.dir || !/\.xml$/i.test(path) || path === '[Content_Types].xml' || /^_rels\/|\/_rels\//i.test(path)) continue;
    const xml = await entry.async('string');
    const referenceIds = readRelationshipReferenceIds(xml);
    if (referenceIds.size === 0) continue;

    const relsPath = relationshipPathForSourcePart(path);
    const relsFile = zip.file(relsPath);
    if (!relsFile) {
      throw new Error(`[office-compat] ${packagePath} has relationship references in ${path} but no relationship part: ${relsPath}`);
    }

    const relationshipIds = new Set(readRelationshipTags(await relsFile.async('string')).map((rel) => rel.id));
    for (const id of referenceIds) {
      if (relationshipIds.has(id)) continue;
      throw new Error(`[office-compat] ${packagePath} has missing relationship id: ${path} references ${id}, but ${relsPath} does not define it`);
    }
  }
}

async function validateReachableResourceParts(zip, packagePath) {
  const reachable = await readReachablePackageParts(zip);
  for (const [path, entry] of Object.entries(zip.files)) {
    if (entry.dir) continue;
    const normalized = normalizePackagePath(path);
    if (!REACHABILITY_REQUIRED_RESOURCE_PART.test(normalized)) continue;
    if (reachable.has(normalized)) continue;
    throw new Error(`[office-compat] ${packagePath} has unreachable resource OOXML part: ${normalized}`);
  }
}

async function readReachablePackageParts(zip) {
  const reachable = new Set(['[Content_Types].xml']);
  const relsQueue = [];
  if (zip.file('_rels/.rels')) {
    reachable.add('_rels/.rels');
    relsQueue.push('_rels/.rels');
  }

  while (relsQueue.length > 0) {
    const relsPath = relsQueue.shift();
    const relsFile = zip.file(relsPath);
    if (!relsFile) continue;
    const sourceDir = packageSourceDirFromRelsPath(relsPath);
    const relsXml = await relsFile.async('string');
    for (const rel of readRelationshipTags(relsXml)) {
      const target = rel.target ?? '';
      if (!target || /^External$/i.test(rel.targetMode ?? '') || isExternalTarget(target)) continue;
      const targetPath = resolvePackageTarget(sourceDir, target);
      if (!targetPath || !zip.file(targetPath) || reachable.has(targetPath)) continue;
      reachable.add(targetPath);
      const childRelsPath = relationshipPathForSourcePart(targetPath);
      if (zip.file(childRelsPath) && !reachable.has(childRelsPath)) {
        reachable.add(childRelsPath);
        relsQueue.push(childRelsPath);
      }
    }
  }

  return reachable;
}

async function validateRootOfficeDocument(zip, packagePath) {
  const rootRels = zip.file('_rels/.rels');
  if (!rootRels) {
    throw new Error(`[office-compat] ${packagePath} is missing root relationships part: _rels/.rels`);
  }
  const officeDocumentRelationships = readRelationshipTags(await rootRels.async('string'))
    .filter((rel) => OFFICE_DOCUMENT_RELATIONSHIPS.has(rel.type));
  if (officeDocumentRelationships.length !== 1) {
    throw new Error(`[office-compat] ${packagePath} must have exactly one root officeDocument relationship, found ${officeDocumentRelationships.length}`);
  }

  const target = resolvePackageTarget('', officeDocumentRelationships[0].target ?? '');
  if (!target || !zip.file(target)) {
    throw new Error(`[office-compat] ${packagePath} has root officeDocument relationship pointing to missing part: ${target || 'none'}`);
  }

  const contentTypes = await readContentTypeMap(zip, packagePath);
  const contentType = contentTypeForPath(contentTypes, target);
  if (!contentType || !officeDocumentRootForContentType(contentType)) {
    throw new Error(`[office-compat] ${packagePath} has invalid officeDocument content type for ${target}: ${contentType ?? 'none'}`);
  }
  const root = await xmlRootInfo(zip, target);
  const expectedRoot = officeDocumentRootForContentType(contentType);
  if (root?.name !== expectedRoot?.name) {
    throw new Error(`[office-compat] ${packagePath} has invalid officeDocument root for ${target}: expected ${expectedRoot?.name}, got ${root?.name ?? 'none'}`);
  }
  if (!expectedRoot.namespaces.includes(root?.namespace)) {
    throw new Error(`[office-compat] ${packagePath} has invalid officeDocument namespace for ${target}: expected one of ${expectedRoot.namespaces.join(', ')}, got ${root?.namespace ?? 'none'}`);
  }
}

async function validatePackageProperties(zip, packagePath) {
  const rootRels = zip.file('_rels/.rels');
  if (!rootRels) {
    throw new Error(`[office-compat] ${packagePath} is missing root relationships part: _rels/.rels`);
  }
  const relationships = readRelationshipTags(await rootRels.async('string'));
  const contentTypes = await readContentTypeMap(zip, packagePath);
  await validatePackageProperty(zip, packagePath, contentTypes, relationships, {
    kind: 'core properties',
    relationshipType: CORE_PROPERTIES_RELATIONSHIP,
    contentType: CORE_PROPERTIES_CONTENT_TYPE,
    rootName: 'coreProperties',
    namespace: 'http://schemas.openxmlformats.org/package/2006/metadata/core-properties',
  });
  await validatePackageProperty(zip, packagePath, contentTypes, relationships, {
    kind: 'extended properties',
    relationshipType: EXTENDED_PROPERTIES_RELATIONSHIP,
    contentType: EXTENDED_PROPERTIES_CONTENT_TYPE,
    rootName: 'Properties',
    namespace: 'http://schemas.openxmlformats.org/officeDocument/2006/extended-properties',
  });
}

async function validateWorkbookDefinedNames(zip, packagePath) {
  const workbook = zip.file('xl/workbook.xml');
  if (!workbook) return;

  const workbookXml = await workbook.async('string');
  const seen = new Set();
  const definedNameTags = workbookXml.match(/<definedName\b[^>]*>/g) ?? [];
  for (const tag of definedNameTags) {
    const name = readXmlAttribute(tag, 'name');
    if (!name) {
      throw new Error(`[office-compat] ${packagePath} has definedName without name in xl/workbook.xml`);
    }
    const scope = readXmlAttribute(tag, 'localSheetId') ?? 'workbook';
    const key = `${scope}\u0000${name}`;
    if (!seen.has(key)) {
      seen.add(key);
      continue;
    }
    throw new Error(`[office-compat] ${packagePath} has duplicate workbook definedName in the same scope: ${name}`);
  }
}

async function validatePackageProperty(zip, packagePath, contentTypes, relationships, expected) {
  const matches = relationships.filter((rel) => rel.type === expected.relationshipType);
  if (matches.length !== 1) {
    throw new Error(`[office-compat] ${packagePath} must have exactly one root ${expected.kind} relationship, found ${matches.length}`);
  }
  const target = resolvePackageTarget('', matches[0].target ?? '');
  if (!target || !zip.file(target)) {
    throw new Error(`[office-compat] ${packagePath} has ${expected.kind} relationship pointing to missing part: ${target || 'none'}`);
  }
  const actualContentType = contentTypeForPath(contentTypes, target);
  if (actualContentType !== expected.contentType) {
    throw new Error(`[office-compat] ${packagePath} has wrong ${expected.kind} content type for ${target}: expected ${expected.contentType}, got ${actualContentType ?? 'none'}`);
  }
  const root = await xmlRootInfo(zip, target);
  if (root?.name !== expected.rootName || root.namespace !== expected.namespace) {
    throw new Error(`[office-compat] ${packagePath} has invalid ${expected.kind} root for ${target}: expected ${expected.rootName} in ${expected.namespace}, got ${root?.name ?? 'none'} in ${root?.namespace ?? 'none'}`);
  }
}

async function requireContentTypes(zip, packagePath, expectedContentTypes) {
  const contentTypes = await readContentTypeMap(zip, packagePath);
  for (const [partPath, expected] of Object.entries(expectedContentTypes)) {
    const actual = contentTypeForPath(contentTypes, partPath);
    if (actual === expected) continue;
    throw new Error(`[office-compat] ${packagePath} has wrong content type for ${partPath}: expected ${expected}, got ${actual ?? 'none'}`);
  }
}

async function requireRelationships(zip, packagePath, relsPath, expectedRelationships) {
  const file = zip.file(relsPath);
  if (!file) {
    throw new Error(`[office-compat] expected relationship part missing: ${relsPath}`);
  }
  const sourceDir = packageSourceDirFromRelsPath(relsPath);
  const relationships = new Map(readRelationshipTags(await file.async('string'))
    .map((rel) => [resolvePackageTarget(sourceDir, rel.target ?? ''), rel.type]));

  for (const [target, expectedType] of Object.entries(expectedRelationships)) {
    const normalizedTarget = resolvePackageTarget(sourceDir, target);
    const actualType = relationships.get(normalizedTarget);
    if (actualType === expectedType) continue;
    throw new Error(`[office-compat] ${packagePath} has wrong relationship type for ${relsPath} -> ${target}: expected ${expectedType}, got ${actualType ?? 'none'}`);
  }
}

async function readContentTypeMap(zip, packagePath) {
  const contentTypesXml = await zip.file('[Content_Types].xml')?.async('string');
  if (!contentTypesXml) {
    throw new Error(`[office-compat] ${packagePath} is missing [Content_Types].xml`);
  }
  const root = xmlRootInfoFromText(contentTypesXml);
  if (root?.name !== 'Types') {
    throw new Error(`[office-compat] ${packagePath} has [Content_Types].xml without Types root`);
  }
  if (root.namespace !== CONTENT_TYPES_NAMESPACE) {
    throw new Error(`[office-compat] ${packagePath} has [Content_Types].xml with wrong Types namespace`);
  }
  const defaultEntries = Array.from(contentTypesXml.matchAll(/<([A-Za-z_][\w.-]*:)?Default\b[^>]*>/g)).map((match) => match[0]);
  const overrideEntries = Array.from(contentTypesXml.matchAll(/<([A-Za-z_][\w.-]*:)?Override\b[^>]*>/g)).map((match) => match[0]);
  return {
    defaults: contentTypeTagsToMap(packagePath, 'Default', defaultEntries, 'Extension', (extension) => extension.toLowerCase()),
    overrides: contentTypeTagsToMap(packagePath, 'Override', overrideEntries, 'PartName', normalizePackagePath),
  };
}

function contentTypeTagsToMap(packagePath, entryKind, tags, keyAttribute, normalizeKey) {
  const entries = tags.map((tag) => {
    const key = readXmlAttribute(tag, keyAttribute);
    const contentType = readXmlAttribute(tag, 'ContentType');
    if (!key) {
      throw new Error(`[office-compat] ${packagePath} has ${entryKind} content type declaration without ${keyAttribute}`);
    }
    if (!contentType) {
      throw new Error(`[office-compat] ${packagePath} has ${entryKind} content type declaration without ContentType for ${key}`);
    }
    return [normalizeContentTypeKey(packagePath, entryKind, key, normalizeKey), contentType];
  });
  return contentTypeEntriesToMap(packagePath, entryKind, entries);
}

function normalizeContentTypeKey(packagePath, entryKind, key, normalizeKey) {
  if (entryKind === 'Default' && (key.includes('/') || key.includes('\\') || key.startsWith('.'))) {
    throw new Error(`[office-compat] ${packagePath} has invalid Default content type extension: ${key}`);
  }
  if (entryKind === 'Override') {
    if (!key.startsWith('/')) {
      throw new Error(`[office-compat] ${packagePath} has Override content type PartName without leading slash: ${key}`);
    }
    if (key.includes('\\')) {
      throw new Error(`[office-compat] ${packagePath} has Override content type PartName with backslashes: ${key}`);
    }
    const normalized = normalizeKey(key);
    if (!normalized || normalized !== key.slice(1)) {
      throw new Error(`[office-compat] ${packagePath} has non-normalized Override content type PartName: ${key}`);
    }
    return normalized;
  }
  return normalizeKey(key);
}

function contentTypeEntriesToMap(packagePath, entryKind, entries) {
  const out = new Map();
  for (const [key, contentType] of entries) {
    if (!out.has(key)) {
      out.set(key, contentType);
      continue;
    }
    const existing = out.get(key);
    if (existing === contentType) {
      throw new Error(`[office-compat] ${packagePath} has duplicate ${entryKind} content type declaration for ${key}: ${contentType}`);
    }
    throw new Error(`[office-compat] ${packagePath} has conflicting ${entryKind} content type declaration for ${key}: ${existing} vs ${contentType}`);
  }
  return out;
}

function contentTypeForPath(contentTypes, path) {
  const normalizedPath = normalizePackagePath(path);
  const extension = normalizedPath.includes('.') ? normalizedPath.slice(normalizedPath.lastIndexOf('.') + 1).toLowerCase() : '';
  return contentTypes.overrides.get(normalizedPath) ?? contentTypes.defaults.get(extension);
}

async function xmlRootInfo(zip, path) {
  const xml = await zip.file(path)?.async('string');
  return xmlRootInfoFromText(xml);
}

function xmlRootInfoFromText(xml) {
  const rootTag = xml?.match(/<(([A-Za-z_][\w.-]*):)?([A-Za-z_][\w.-]*)\b[^>]*>/)?.[0];
  if (!rootTag) return undefined;
  const match = rootTag.match(/^<(([A-Za-z_][\w.-]*):)?([A-Za-z_][\w.-]*)\b/);
  const prefix = match?.[2];
  return {
    name: match?.[3],
    namespace: prefix ? readXmlAttribute(rootTag, `xmlns:${prefix}`) : readXmlAttribute(rootTag, 'xmlns'),
  };
}

function officeDocumentRootForContentType(contentType) {
  if (
    contentType.includes('wordprocessingml.document.main+xml')
    || contentType.includes('ms-word.document.macroEnabled.main+xml')
  ) {
    return {
      name: 'document',
      namespaces: [
        'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
        'http://purl.oclc.org/ooxml/wordprocessingml/main',
      ],
    };
  }
  if (
    contentType.includes('spreadsheetml.sheet.main+xml')
    || contentType.includes('ms-excel.sheet.macroEnabled.main+xml')
  ) {
    return {
      name: 'workbook',
      namespaces: [
        'http://schemas.openxmlformats.org/spreadsheetml/2006/main',
        'http://purl.oclc.org/ooxml/spreadsheetml/main',
      ],
    };
  }
  if (
    contentType.includes('presentationml.presentation.main+xml')
    || contentType.includes('ms-powerpoint.presentation.macroEnabled.main+xml')
  ) {
    return {
      name: 'presentation',
      namespaces: [
        'http://schemas.openxmlformats.org/presentationml/2006/main',
        'http://purl.oclc.org/ooxml/presentationml/main',
      ],
    };
  }
  return undefined;
}

function readRelationshipTags(xml) {
  return Array.from(xml.matchAll(/<([A-Za-z_][\w.-]*:)?Relationship\b[^>]*>/g)).map((match) => ({
    id: readXmlAttribute(match[0], 'Id'),
    target: readXmlAttribute(match[0], 'Target'),
    targetMode: readXmlAttribute(match[0], 'TargetMode'),
    type: readXmlAttribute(match[0], 'Type'),
  }));
}

function isRelationshipPartPath(path) {
  return /(^|\/)_rels\/[^/]*\.rels$/i.test(path);
}

function isXmlPartPath(path) {
  return path === '[Content_Types].xml' || /\.xml$/i.test(path) || isRelationshipPartPath(path);
}

function readRelationshipReferenceIds(xml) {
  const prefixes = relationshipNamespacePrefixes(xml);
  const ids = new Set();
  const relationshipAttributeNames = ['id', 'embed', 'link'];
  for (const prefix of prefixes) {
    for (const attributeName of relationshipAttributeNames) {
      const pattern = new RegExp(`\\b${escapeRegExp(prefix)}:${attributeName}=(["'])(.*?)\\1`, 'g');
      for (const match of xml.matchAll(pattern)) {
        if (match[2]) ids.add(match[2]);
      }
    }
  }
  return ids;
}

function relationshipNamespacePrefixes(xml) {
  const namespaces = new Set([
    'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
    'http://purl.oclc.org/ooxml/officeDocument/relationships',
  ]);
  const prefixes = new Set();
  for (const match of xml.matchAll(/\bxmlns:([A-Za-z_][\w.-]*)=(["'])(.*?)\2/g)) {
    if (namespaces.has(match[3])) prefixes.add(match[1]);
  }
  return prefixes;
}

function readXmlAttribute(tag, name) {
  const pattern = new RegExp(`\\b${name}=(["'])(.*?)\\1`);
  return tag.match(pattern)?.[2];
}

function addContentTypeOverrides(xml, overrides) {
  const tagName = prefixedChildName(xml, 'Types', 'Override');
  return insertBeforeRootClose(
    xml,
    'Types',
    overrides.map(([partName, contentType]) => `\n  <${tagName} PartName="/${partName}" ContentType="${contentType}"/>`).join(''),
  );
}

function addRelationships(xml, relationships) {
  const tagName = prefixedChildName(xml, 'Relationships', 'Relationship');
  return insertBeforeRootClose(
    xml,
    'Relationships',
    relationships.map(([id, type, target]) => `\n  <${tagName} Id="${id}" Type="${type}" Target="${target}"/>`).join(''),
  );
}

function prefixedChildName(xml, rootLocalName, childLocalName) {
  const prefix = xml.match(new RegExp(`<(([A-Za-z_][\\w.-]*):)?${rootLocalName}\\b`))?.[2];
  return prefix ? `${prefix}:${childLocalName}` : childLocalName;
}

function insertBeforeRootClose(xml, rootLocalName, insertion) {
  const closingTag = xml.match(new RegExp(`</((?:[A-Za-z_][\\w.-]*:)?${rootLocalName})>`))?.[0];
  return closingTag ? xml.replace(closingTag, `${insertion}\n${closingTag}`) : xml;
}

function relationshipPathForSourcePart(path) {
  const normalized = normalizePackagePath(path);
  const slashIndex = normalized.lastIndexOf('/');
  if (slashIndex === -1) return `_rels/${normalized}.rels`;
  return `${normalized.slice(0, slashIndex)}/_rels/${normalized.slice(slashIndex + 1)}.rels`;
}

function sourcePartPathFromRelationshipPath(relsPath) {
  const normalized = normalizePackagePath(relsPath);
  const match = normalized.match(/^(.*)\/_rels\/([^/]+)\.rels$/i);
  if (!match) return '';
  return `${match[1]}/${match[2]}`;
}

function packageSourceDirFromRelsPath(relsPath) {
  const normalized = normalizePackagePath(relsPath);
  if (normalized === '_rels/.rels') return '';
  const match = normalized.match(/^(.*)\/_rels\/([^/]+)\.rels$/i);
  if (!match) return '';
  const sourcePath = `${match[1]}/${match[2]}`;
  return sourcePath.includes('/') ? sourcePath.slice(0, sourcePath.lastIndexOf('/')) : '';
}

function resolvePackageTarget(sourceDir, target) {
  return resolvePackageTargetInfo(sourceDir, target).normalizedTarget;
}

function resolvePackageTargetInfo(sourceDir, target) {
  const packageTarget = packagePartTargetWithoutFragment(target);
  const absoluteTarget = target.startsWith('/');
  const parts = absoluteTarget || !sourceDir ? [] : sourceDir.split('/').filter(Boolean);
  let escapesPackageRoot = false;
  for (const part of packageTarget.replace(/\\/g, '/').replace(/^\/+/, '').split('/')) {
    if (!part || part === '.') continue;
    if (part !== '..') {
      parts.push(part);
      continue;
    }
    if (parts.length > 0) parts.pop();
    else escapesPackageRoot = true;
  }
  return { normalizedTarget: parts.join('/'), escapesPackageRoot };
}

function packagePartTargetWithoutFragment(target) {
  const markerIndex = target.search(/[?#]/);
  return markerIndex >= 0 ? target.slice(0, markerIndex) : target;
}

function normalizePackagePath(path) {
  const out = [];
  for (const part of path.replace(/\\/g, '/').replace(/^\/+/, '').split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') out.pop();
    else out.push(part);
  }
  return out.join('/');
}

function isExternalTarget(target) {
  return isAbsoluteUri(target);
}

function isAbsoluteUri(value) {
  return /^[a-z][a-z0-9+.-]*:/i.test(value);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function readFile(path) {
  const file = await import('node:fs/promises');
  return file.readFile(path);
}

async function requireZipText(zip, path, markers) {
  const file = zip.file(path);
  if (!file) {
    throw new Error(`[office-compat] expected OOXML part missing: ${path}`);
  }
  const text = await file.async('string');
  for (const marker of markers) {
    if (!text.includes(marker)) {
      throw new Error(`[office-compat] expected ${path} to contain ${marker}`);
    }
  }
}

async function runOoxmlValidatorSelfChecks() {
  expectPackagePartNameFailure('word/../document.xml', 'non-normalized OOXML part path');
  expectPackagePartNameFailure('word\\document.xml', 'invalid OOXML part path');
  await expectXmlPartValidationFailure(
    'word/document.xml',
    '<w:document><w:p></w:document>',
    'malformed XML part',
  );
  expectRelationshipPartSourceFailure(
    'word/_rels/missing.xml.rels',
    'relationship part without source part',
  );
  await expectRelationshipRootValidationFailure(
    '<Relationships xmlns="urn:wrong"><Relationship Id="rId1" Type="x" Target="x"/></Relationships>',
    'wrong Relationships namespace',
  );
  await expectPrefixedRelationshipValidationSuccess();
  await expectPrefixedContentTypeMapSuccess();
  await expectContentTypeMapFailure(
    '<Types xmlns="urn:wrong"><Default Extension="xml" ContentType="application/xml"/></Types>',
    'wrong Types namespace',
  );
  await expectContentTypeMapFailure(
    `<Types xmlns="${CONTENT_TYPES_NAMESPACE}"><Default ContentType="application/xml"/></Types>`,
    'without Extension',
  );
  await expectContentTypeMapFailure(
    `<Types xmlns="${CONTENT_TYPES_NAMESPACE}"><Default Extension=".xml" ContentType="application/xml"/></Types>`,
    'invalid Default content type extension',
  );
  await expectContentTypeMapFailure(
    `<Types xmlns="${CONTENT_TYPES_NAMESPACE}"><Override PartName="word/document.xml" ContentType="application/xml"/></Types>`,
    'without leading slash',
  );
  await expectContentTypeMapFailure(
    `<Types xmlns="${CONTENT_TYPES_NAMESPACE}"><Override PartName="/word/../document.xml" ContentType="application/xml"/></Types>`,
    'non-normalized Override content type PartName',
  );
  await expectContentTypeValidationFailure(
    `<Types xmlns="${CONTENT_TYPES_NAMESPACE}"><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/missing.xml" ContentType="application/xml"/></Types>`,
    'Override for missing part',
  );
  await expectContentTypeValidationFailure(
    `<Types xmlns="${CONTENT_TYPES_NAMESPACE}"><Default Extension="rels" ContentType="application/xml"/></Types>`,
    'wrong relationship content type',
    { '_rels/.rels': '<Relationships/>' },
  );
  await expectRelationshipValidationFailure(
    '<Relationships><Relationship Id="rId1" Target="word/document.xml"/></Relationships>',
    'without Type',
  );
  await expectRelationshipValidationFailure(
    '<Relationships><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument"/></Relationships>',
    'without Target',
  );
  await expectRelationshipValidationFailure(
    '<Relationships><Relationship Id="rId1" Type="officeDocument" Target="word/document.xml"/></Relationships>',
    'Type that is not an absolute URI',
  );
  await expectRelationshipValidationFailure(
    '<Relationships><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" TargetMode="Remote" Target="word/document.xml"/></Relationships>',
    'invalid TargetMode',
  );
  await expectRelationshipValidationFailure(
    '<Relationships><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="https://example.com"/></Relationships>',
    'without TargetMode=External',
  );
  await expectRelationshipValidationFailure(
    '<Relationships><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../../media/image1.png"/></Relationships>',
    'escaping package root',
    { relsPath: 'word/_rels/document.xml.rels', sourcePartPath: 'word/document.xml' },
  );
  await expectRelationshipTargetFragmentSuccess();
  await expectRelationshipReferenceValidationFailure();
  await expectAlternateRelationshipPrefixReferenceSuccess();
  await expectRootOfficeDocumentValidationFailure(
    '<Relationships></Relationships>',
    'must have exactly one root officeDocument relationship',
  );
  await expectRootOfficeDocumentValidationFailure(
    '<Relationships><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
    'invalid officeDocument content type',
  );
  await expectRootOfficeDocumentValidationFailure(
    '<Relationships><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
    'invalid officeDocument root',
    {
      contentTypesXml: `<Types xmlns="${CONTENT_TYPES_NAMESPACE}"><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`,
      mainPartXml: '<w:notDocument/>',
    },
  );
  await expectRootOfficeDocumentValidationFailure(
    '<Relationships><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
    'invalid officeDocument namespace',
    {
      contentTypesXml: `<Types xmlns="${CONTENT_TYPES_NAMESPACE}"><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`,
      mainPartXml: '<w:document xmlns:w="urn:wrong"/>',
    },
  );
  await expectMacroEnabledRootOfficeDocumentSuccess();
  await expectStrictRootOfficeDocumentSuccess();
  await expectStrictRootOfficeDocumentRelationshipSuccess();
  await expectPackagePropertiesValidationFailure(
    `<Relationships xmlns="${RELATIONSHIP_NAMESPACE}">
      <Relationship Id="rIdCore" Type="${CORE_PROPERTIES_RELATIONSHIP}" Target="docProps/core.xml"/>
    </Relationships>`,
    'must have exactly one root extended properties relationship',
  );
  await expectPackagePropertiesValidationFailure(
    `<Relationships xmlns="${RELATIONSHIP_NAMESPACE}">
      <Relationship Id="rIdCore" Type="${CORE_PROPERTIES_RELATIONSHIP}" Target="docProps/core.xml"/>
      <Relationship Id="rIdApp" Type="${EXTENDED_PROPERTIES_RELATIONSHIP}" Target="docProps/app.xml"/>
    </Relationships>`,
    'invalid core properties root',
    {
      coreXml: '<cp:notCore xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"/>',
    },
  );
  await expectEmbeddedOfficePackageValidationFailure();
  await expectEmbeddedOfficePackageDepthLimitFailure();
  await expectEmbeddedOfficePackageCountLimitFailure();
  await expectReachableResourcePartValidationFailure();
}

async function expectStrictRootOfficeDocumentRelationshipSuccess() {
  const zip = new JSZip();
  zip.file('_rels/.rels', `<Relationships xmlns="${RELATIONSHIP_NAMESPACE}">
    <Relationship Id="rIdOffice" Type="http://purl.oclc.org/ooxml/officeDocument/relationships/officeDocument" Target="word/document.xml"/>
  </Relationships>`);
  zip.file('[Content_Types].xml', `<Types xmlns="${CONTENT_TYPES_NAMESPACE}"><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`);
  zip.file('word/document.xml', '<w:document xmlns:w="http://purl.oclc.org/ooxml/wordprocessingml/main"/>');
  await validateRootOfficeDocument(zip, 'office-compat-validator-self-check');
}

async function expectStrictRootOfficeDocumentSuccess() {
  const cases = [
    {
      part: 'word/document.xml',
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml',
      xml: '<w:document xmlns:w="http://purl.oclc.org/ooxml/wordprocessingml/main"/>',
    },
    {
      part: 'xl/workbook.xml',
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml',
      xml: '<workbook xmlns="http://purl.oclc.org/ooxml/spreadsheetml/main"/>',
    },
    {
      part: 'ppt/presentation.xml',
      contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml',
      xml: '<p:presentation xmlns:p="http://purl.oclc.org/ooxml/presentationml/main"/>',
    },
  ];

  for (const item of cases) {
    const zip = new JSZip();
    zip.file('_rels/.rels', `<Relationships xmlns="${RELATIONSHIP_NAMESPACE}">
      <Relationship Id="rIdOffice" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="${item.part}"/>
    </Relationships>`);
    zip.file('[Content_Types].xml', `<Types xmlns="${CONTENT_TYPES_NAMESPACE}"><Override PartName="/${item.part}" ContentType="${item.contentType}"/></Types>`);
    zip.file(item.part, item.xml);
    await validateRootOfficeDocument(zip, 'office-compat-validator-self-check');
  }
}

async function expectMacroEnabledRootOfficeDocumentSuccess() {
  const cases = [
    {
      part: 'word/document.xml',
      contentType: 'application/vnd.ms-word.document.macroEnabled.main+xml',
      xml: '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"/>',
    },
    {
      part: 'xl/workbook.xml',
      contentType: 'application/vnd.ms-excel.sheet.macroEnabled.main+xml',
      xml: '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"/>',
    },
    {
      part: 'ppt/presentation.xml',
      contentType: 'application/vnd.ms-powerpoint.presentation.macroEnabled.main+xml',
      xml: '<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"/>',
    },
  ];

  for (const item of cases) {
    const zip = new JSZip();
    zip.file('_rels/.rels', `<Relationships xmlns="${RELATIONSHIP_NAMESPACE}">
      <Relationship Id="rIdOffice" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="${item.part}"/>
    </Relationships>`);
    zip.file('[Content_Types].xml', `<Types xmlns="${CONTENT_TYPES_NAMESPACE}"><Override PartName="/${item.part}" ContentType="${item.contentType}"/></Types>`);
    zip.file(item.part, item.xml);
    await validateRootOfficeDocument(zip, 'office-compat-validator-self-check');
  }
}

async function expectEmbeddedOfficePackageValidationFailure() {
  const zip = new JSZip();
  zip.file('word/charts/chart1.xml', '<c:chartSpace/>');
  zip.file('word/charts/_rels/chart1.xml.rels', `<Relationships xmlns="${RELATIONSHIP_NAMESPACE}">
    <Relationship Id="rIdWorkbook" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/package" Target="../embeddings/broken.xlsx"/>
  </Relationships>`);
  zip.file('word/embeddings/broken.xlsx', 'not a zip package');
  try {
    await validateEmbeddedOfficePackages(zip, 'office-compat-validator-self-check');
  } catch (error) {
    if (String(error instanceof Error ? error.message : error).includes('is not a readable OOXML zip package')) return;
    throw error;
  }
  throw new Error('[office-compat] validator self-check did not reject malformed embedded Office package');
}

async function expectEmbeddedOfficePackageDepthLimitFailure() {
  const zip = new JSZip();
  zip.file('word/charts/chart1.xml', '<c:chartSpace/>');
  zip.file('word/charts/_rels/chart1.xml.rels', `<Relationships xmlns="${RELATIONSHIP_NAMESPACE}">
    <Relationship Id="rIdWorkbook" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/package" Target="../embeddings/too-deep.xlsx"/>
  </Relationships>`);
  zip.file('word/embeddings/too-deep.xlsx', await createMinimalXlsxPackageBuffer());
  try {
    await validateEmbeddedOfficePackages(zip, 'office-compat-validator-self-check', {
      depth: MAX_EMBEDDED_OFFICE_PACKAGE_DEPTH,
      validatedEmbeddedPackages: new Set(),
    });
  } catch (error) {
    if (String(error instanceof Error ? error.message : error).includes('exceeds embedded Office package depth limit')) return;
    throw error;
  }
  throw new Error('[office-compat] validator self-check did not reject embedded Office package depth overflow');
}

async function expectEmbeddedOfficePackageCountLimitFailure() {
  const zip = new JSZip();
  zip.file('word/document.xml', '<w:document/>');
  const relationships = [];
  const embeddedWorkbook = await createMinimalXlsxPackageBuffer();
  for (let index = 0; index <= MAX_EMBEDDED_OFFICE_PACKAGE_COUNT; index += 1) {
    const fileName = `embedded-${index + 1}.xlsx`;
    relationships.push(`<Relationship Id="rIdEmbedded${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/package" Target="embeddings/${fileName}"/>`);
    zip.file(`word/embeddings/${fileName}`, embeddedWorkbook);
  }
  zip.file('word/_rels/document.xml.rels', `<Relationships xmlns="${RELATIONSHIP_NAMESPACE}">
    ${relationships.join('\n    ')}
  </Relationships>`);
  try {
    await validateEmbeddedOfficePackages(zip, 'office-compat-validator-self-check');
  } catch (error) {
    if (String(error instanceof Error ? error.message : error).includes('exceeds embedded Office package count limit')) return;
    throw error;
  }
  throw new Error('[office-compat] validator self-check did not reject embedded Office package count overflow');
}

async function expectReachableResourcePartValidationFailure() {
  const zip = new JSZip();
  zip.file('_rels/.rels', `<Relationships xmlns="${RELATIONSHIP_NAMESPACE}">
    <Relationship Id="rIdOffice" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
  </Relationships>`);
  zip.file('ppt/presentation.xml', '<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"/>');
  zip.file('ppt/media/orphan.png', '');
  try {
    await validateReachableResourceParts(zip, 'office-compat-validator-self-check');
  } catch (error) {
    if (String(error instanceof Error ? error.message : error).includes('unreachable resource OOXML part')) return;
    throw error;
  }
  throw new Error('[office-compat] validator self-check did not reject unreachable resource OOXML part');
}

async function createMinimalXlsxPackageBuffer() {
  const workbook = new ExcelJS.Workbook();
  workbook.addWorksheet('Sheet1').getCell('A1').value = 'embedded';
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

async function expectPackagePropertiesValidationFailure(relsXml, expectedMessage, options = {}) {
  const zip = new JSZip();
  zip.file('_rels/.rels', relsXml);
  zip.file('[Content_Types].xml', `<Types xmlns="${CONTENT_TYPES_NAMESPACE}">
    <Override PartName="/docProps/core.xml" ContentType="${CORE_PROPERTIES_CONTENT_TYPE}"/>
    <Override PartName="/docProps/app.xml" ContentType="${EXTENDED_PROPERTIES_CONTENT_TYPE}"/>
  </Types>`);
  zip.file('docProps/core.xml', options.coreXml ?? '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"/>');
  zip.file('docProps/app.xml', options.appXml ?? '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"/>');
  try {
    await validatePackageProperties(zip, 'office-compat-validator-self-check');
  } catch (error) {
    if (String(error instanceof Error ? error.message : error).includes(expectedMessage)) return;
    throw error;
  }
  throw new Error(`[office-compat] validator self-check did not reject malformed package properties: ${expectedMessage}`);
}

async function expectRelationshipRootValidationFailure(relsXml, expectedMessage) {
  const zip = new JSZip();
  zip.file('_rels/.rels', relsXml);
  try {
    await validateRelationshipXmlRoots(zip, 'office-compat-validator-self-check');
  } catch (error) {
    if (String(error instanceof Error ? error.message : error).includes(expectedMessage)) return;
    throw error;
  }
  throw new Error(`[office-compat] validator self-check did not reject malformed relationship root: ${expectedMessage}`);
}

async function expectPrefixedRelationshipValidationSuccess() {
  const zip = new JSZip();
  zip.file('word/document.xml', '<w:document/>');
  zip.file('word/_rels/document.xml.rels', `<pkg:Relationships xmlns:pkg="${RELATIONSHIP_NAMESPACE}">
    <pkg:Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image1.png"/>
  </pkg:Relationships>`);
  zip.file('word/media/image1.png', '');
  await validateRelationshipXmlRoots(zip, 'office-compat-validator-self-check');
  await validateRelationshipIds(zip, 'office-compat-validator-self-check');
  await validateRelationshipTargets(zip, 'office-compat-validator-self-check');
}

async function expectContentTypeValidationFailure(contentTypesXml, expectedMessage, extraParts = {}) {
  const zip = new JSZip();
  zip.file('[Content_Types].xml', contentTypesXml);
  for (const [path, content] of Object.entries(extraParts)) {
    zip.file(path, content);
  }
  try {
    await validateContentTypes(zip, 'office-compat-validator-self-check');
  } catch (error) {
    if (String(error instanceof Error ? error.message : error).includes(expectedMessage)) return;
    throw error;
  }
  throw new Error(`[office-compat] validator self-check did not reject invalid content types: ${expectedMessage}`);
}

function expectRelationshipPartSourceFailure(relsPath, expectedMessage) {
  const zip = new JSZip();
  zip.file(relsPath, '<Relationships/>');
  try {
    validateRelationshipPartSources(zip, 'office-compat-validator-self-check');
  } catch (error) {
    if (String(error instanceof Error ? error.message : error).includes(expectedMessage)) return;
    throw error;
  }
  throw new Error(`[office-compat] validator self-check did not reject orphan relationship part: ${expectedMessage}`);
}

async function expectXmlPartValidationFailure(partPath, xml, expectedMessage) {
  const zip = new JSZip();
  zip.file(partPath, xml);
  try {
    await validateXmlParts(zip, 'office-compat-validator-self-check');
  } catch (error) {
    if (String(error instanceof Error ? error.message : error).includes(expectedMessage)) return;
    throw error;
  }
  throw new Error(`[office-compat] validator self-check did not reject malformed XML: ${expectedMessage}`);
}

function expectPackagePartNameFailure(partPath, expectedMessage) {
  const zip = new JSZip();
  zip.file(partPath, '');
  try {
    validatePackagePartNames(zip, 'office-compat-validator-self-check');
  } catch (error) {
    if (String(error instanceof Error ? error.message : error).includes(expectedMessage)) return;
    throw error;
  }
  throw new Error(`[office-compat] validator self-check did not reject malformed part path: ${expectedMessage}`);
}

async function expectContentTypeMapFailure(contentTypesXml, expectedMessage) {
  const zip = new JSZip();
  zip.file('[Content_Types].xml', contentTypesXml);
  try {
    await readContentTypeMap(zip, 'office-compat-validator-self-check');
  } catch (error) {
    if (String(error instanceof Error ? error.message : error).includes(expectedMessage)) return;
    throw error;
  }
  throw new Error(`[office-compat] validator self-check did not reject malformed content type: ${expectedMessage}`);
}

async function expectPrefixedContentTypeMapSuccess() {
  const zip = new JSZip();
  zip.file('[Content_Types].xml', `<ct:Types xmlns:ct="${CONTENT_TYPES_NAMESPACE}">
    <ct:Default Extension="xml" ContentType="application/xml"/>
    <ct:Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  </ct:Types>`);
  const contentTypes = await readContentTypeMap(zip, 'office-compat-validator-self-check');
  if (contentTypes.defaults.get('xml') !== 'application/xml') {
    throw new Error('[office-compat] validator self-check did not read prefixed Default content type');
  }
  if (contentTypes.overrides.get('word/document.xml') !== 'application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml') {
    throw new Error('[office-compat] validator self-check did not read prefixed Override content type');
  }
}

async function expectRelationshipValidationFailure(relsXml, expectedMessage, options = {}) {
  const zip = new JSZip();
  const relsPath = options.relsPath ?? '_rels/.rels';
  zip.file(relsPath, relsXml);
  if (options.sourcePartPath) {
    zip.file(options.sourcePartPath, '<xml/>');
  }
  try {
    await validateRelationshipIds(zip, 'office-compat-validator-self-check');
    await validateRelationshipTargets(zip, 'office-compat-validator-self-check');
  } catch (error) {
    if (String(error instanceof Error ? error.message : error).includes(expectedMessage)) return;
    throw error;
  }
  throw new Error(`[office-compat] validator self-check did not reject malformed relationship: ${expectedMessage}`);
}

async function expectRelationshipTargetFragmentSuccess() {
  const zip = new JSZip();
  zip.file('word/document.xml', '<w:document/>');
  zip.file('word/media/image1.png', '');
  zip.file('word/_rels/document.xml.rels', `<Relationships xmlns="${RELATIONSHIP_NAMESPACE}">
    <Relationship Id="rIdImage" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image1.png#preview"/>
  </Relationships>`);
  await validateRelationshipTargets(zip, 'office-compat-validator-self-check');
}

async function expectRelationshipReferenceValidationFailure() {
  const zip = new JSZip();
  zip.file('word/document.xml', `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
    <w:body>
      <w:p>
        <w:r>
          <w:drawing>
            <a:blip xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" r:embed="rIdMissing"/>
          </w:drawing>
        </w:r>
      </w:p>
    </w:body>
  </w:document>`);
  zip.file('word/_rels/document.xml.rels', `<Relationships xmlns="${RELATIONSHIP_NAMESPACE}">
    <Relationship Id="rIdImage" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image1.png"/>
  </Relationships>`);
  zip.file('word/media/image1.png', '');
  try {
    await validateRelationshipReferences(zip, 'office-compat-validator-self-check');
  } catch (error) {
    if (String(error instanceof Error ? error.message : error).includes('missing relationship id')) return;
    throw error;
  }
  throw new Error('[office-compat] validator self-check did not reject missing XML relationship reference');
}

async function expectAlternateRelationshipPrefixReferenceSuccess() {
  const zip = new JSZip();
  zip.file('word/document.xml', `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:rel="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
    <w:body>
      <w:p>
        <w:hyperlink rel:id="rIdLink">
          <w:r><w:t>Example</w:t></w:r>
        </w:hyperlink>
      </w:p>
    </w:body>
  </w:document>`);
  zip.file('word/_rels/document.xml.rels', `<Relationships xmlns="${RELATIONSHIP_NAMESPACE}">
    <Relationship Id="rIdLink" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="https://example.com" TargetMode="External"/>
  </Relationships>`);
  await validateRelationshipReferences(zip, 'office-compat-validator-self-check');
}

async function expectRootOfficeDocumentValidationFailure(relsXml, expectedMessage, options = {}) {
  const zip = new JSZip();
  zip.file('_rels/.rels', relsXml);
  zip.file('word/document.xml', options.mainPartXml ?? '<w:document/>');
  zip.file('[Content_Types].xml', options.contentTypesXml ?? `<Types xmlns="${CONTENT_TYPES_NAMESPACE}"><Default Extension="xml" ContentType="application/xml"/></Types>`);
  try {
    await validateRootOfficeDocument(zip, 'office-compat-validator-self-check');
  } catch (error) {
    if (String(error instanceof Error ? error.message : error).includes(expectedMessage)) return;
    throw error;
  }
  throw new Error(`[office-compat] validator self-check did not reject malformed root officeDocument: ${expectedMessage}`);
}

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
  const invocation = process.platform === 'win32'
    ? {
        command: process.env.ComSpec ?? 'cmd.exe',
        args: ['/d', '/s', '/c', quoteWindowsCommand([command, ...commandArgs])],
      }
    : { command, args: commandArgs };
  const result = spawnSync(invocation.command, invocation.args, {
    cwd: repoRoot,
    stdio: 'inherit',
    shell: false,
  });
  if (result.error) {
    console.error(`[office-compat] failed to run ${command}: ${result.error.message}`);
  }
  if (required && result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function quoteWindowsCommand(parts) {
  return parts.map((part) => {
    const text = String(part);
    if (!/[\s"&<>|^]/.test(text)) return text;
    return `"${text.replace(/"/g, '\\"')}"`;
  }).join(' ');
}
