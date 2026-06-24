# Office Compatibility Roadmap

Goal: make cloud documents, sheets, and slides handle external Office files as product-grade imports and exports, not approximate visual copies.

## Current Pipeline

- DOCX: `src/lib/cloudDoc/docx.ts` imports with Mammoth, then restores extra OOXML metadata through `docxAdvanced.ts` and `docxRich.ts`.
- XLSX: `src/lib/cloudSheet/xlsx.ts` combines SheetJS, ExcelJS, and direct OOXML patches for values, formulas, formats, metadata, validations, filters, charts, and export.
- PPTX: `src/lib/cloudSlide/pptx.ts` parses PowerPoint OOXML directly and exports with PptxGenJS plus XML patches.
- Upload routing: `src/lib/cloudCommon/uploadAndConvert.ts` stores converted Office metadata in cloud node `meta`.

## Product-Level Direction

1. Preserve first, approximate second.
   - Keep original OOXML intent whenever it can be represented in the editor.
   - Store compatibility metadata for unsupported features instead of silently dropping it.

2. Test with round-trip contracts.
   - Import -> internal model -> export -> reimport should preserve supported features.
   - Unsupported features should be explicitly tracked as compatibility metadata or warnings.

3. Verify visually when layout matters.
   - Use LibreOffice/PDF rendering where possible for DOCX, XLSX, and PPTX regression samples.
   - Add pixel or structural checks only after the feature has deterministic output.

## Priority Backlog

### DOCX

- Preserve large embedded images instead of replacing them. Done in this pass.
- Add explicit import warnings for unsupported macros, SmartArt, embedded objects, and unsafe remote media.
- Preserve document styles/theme metadata more systematically, not only inline visual equivalents. The first global OOXML pass now stores and re-injects `word/styles.xml`, `word/settings.xml`, `word/webSettings.xml`, `word/fontTable.xml`, `word/theme/*`, package/content-type metadata, document relationships, and document properties.
- Preserve high-value DOCX companion parts without replacing edited body XML: `word/header*.xml`, `word/footer*.xml`, header/footer relationship files, `word/media/*`, `word/numbering.xml`, `word/footnotes.xml`, `word/endnotes.xml`, and `word/comments*.xml` are now carried through the preserved OOXML pipeline for export re-injection.
- Preserve modern DOCX review and data-store metadata (`word/commentsExtended.xml`, `word/commentsIds.xml`, `word/people.xml`, comments relationship files, and `customXml/*`) so collaboration metadata and bound custom XML data are not silently dropped even when they are not fully editable.
- Preserve unsupported high-risk DOCX package parts (`word/vbaProject.bin`, `word/diagrams/*`, `word/embeddings/*`, `word/activeX/*`, `word/charts/*`, chart style/color parts, chart relationships, and referenced media/embedded workbook packages) for export re-injection while keeping explicit non-editable warnings.
- Detect DOCX content controls/form fields, inline custom XML markup, general Word field codes, and advanced tracked-change metadata in `word/document.xml`; keep visible content importable, preserve bound `customXml/*` packages and relationships, and surface explicit non-editable warnings instead of silently losing control metadata.
- Improve floating object placement beyond basic image dimensions and wrap metadata.
- Add fixture-based visual render checks for image-heavy and table-heavy documents.

### XLSX

- Continue expanding Excel formula parity in the local evaluator.
- Track unsupported workbook parts such as slicers, pivot caches, macros, external links, and rich threaded comments.
- Preserve high-risk workbook OOXML parts on import and re-inject them on export for macros, pivot caches/tables, slicers, timelines, external links, query tables, threaded comments, controls, VML, and custom XML. The first structural pass now preserves the parts themselves and merges relevant `[Content_Types].xml` overrides/defaults plus `.rels` relationships into the exported package.
- Preserve worksheet-level OOXML references for high-risk parts by merging imported `legacyDrawing`, `pivotTableDefinition`, `controls`, `oleObjects`, and related worksheet relationship files into exported worksheets without replacing edited cell data.
- Track the source sheet name for preserved worksheet-level OOXML parts and remap those parts to the worksheet path generated during export, so inserting/reordering sheets does not attach preserved relationships to the wrong sheet.
- Preserve native Excel chart/drawing OOXML parts (`xl/charts/*`, chart style/color parts, drawing XML, drawing relationships, worksheet drawing references, and referenced `xl/media/*` images) and re-inject them during export so complex chart formatting and drawing-linked images are not reduced to the app's simplified chart model.
- Preserve legacy Excel cell note OOXML (`xl/comments*.xml`, worksheet comment relationships, and related VML note drawing references) alongside the editable plain-text comment model, so author/rich-text note metadata is not silently dropped on round-trip.
- Preserve advanced worksheet conditional formatting OOXML (`conditionalFormatting` blocks plus `extLst`/`x14:conditionalFormattings` metadata) alongside editable app conditional rules, so color scales, icon sets, and advanced data bars are not silently dropped.
- Preserve workbook-level defined name OOXML (`xl/workbook.xml` `definedNames`) alongside editable named ranges, so print areas/titles, hidden names, macro entry names, and custom name attributes are not silently removed.
- Preserve workbook calculation metadata by carrying `xl/calcChain.xml`, workbook calculation relationships, and original `calcPr` settings while forcing recalculation flags on export, so imported formula workbooks keep package fidelity without relying on stale cached results.
- Preserve workbook-level structural OOXML references such as workbook protection, external reference lists, and pivot cache lists inside `xl/workbook.xml`, so preserved package parts remain connected after export.
- Detect rich text and phonetic metadata in `xl/sharedStrings.xml` or inline strings, keep visible cell text importable, and reattach original rich string OOXML as inline rich text for unchanged cells during export without overwriting edited shared strings.
- Improve native chart import/export beyond basic bar/line/pie cases.
- Add workbook-level compatibility inventory so hidden losses are visible to the UI.

### PPTX

- Preserve unsupported shape/SmartArt/media metadata as warnings or parked OOXML references. The first parked OOXML pass now preserves and re-injects high-risk package parts for macros, SmartArt/diagrams, embedded OLE, ActiveX, timed media, comments, and custom XML, including content type and relationship merges.
- Preserve slide-level animation/timing XML by carrying original PowerPoint non-visual drawing ids through the internal model and reattaching `p:timing`/`p:extLst` after export. This keeps animation targets tied to the intended objects where generated element order matches the imported slide.
- Preserve original PowerPoint theme OOXML parts and theme relationship files for export re-injection, so brand theme definitions are not reduced only to interpreted colors/fonts.
- Preserve original PowerPoint slide master and slide layout OOXML parts, their relationship files, content-type entries, and the master id list in `ppt/presentation.xml` without replacing the exported slide list.
- Preserve original PowerPoint speaker notes OOXML (`ppt/notesSlides/*`, notes slide relationships, `ppt/notesMasters/*`, and the notes master id list) alongside imported editable note text, so formatted notes and notes master metadata are not reduced to plain text on round-trip.
- Preserve original PowerPoint handout master OOXML (`ppt/handoutMasters/*`, handout master relationships, and the handout master id list) so print/export layout metadata is not silently dropped.
- Preserve original PowerPoint presentation-level metadata (`ppt/presProps.xml`, `ppt/viewProps.xml`, `ppt/tableStyles.xml`, and related relationships) so slideshow settings, authoring view state, and custom table style defaults are not silently dropped.
- Preserve original `ppt/presentation.xml` custom shows, section metadata, extension lists, embedded font lists, custom data lists, default text style, and verifier metadata without replacing the exported slide list.
- Preserve original PowerPoint chart OOXML (`ppt/charts/*`, chart relationships, chart style/color parts, referenced media, and embedded workbook packages) alongside the editable chart model, so complex chart formatting and source workbook metadata are not collapsed to regenerated basic charts.
- Preserve legacy and modern PowerPoint comment OOXML (`ppt/comments/*`, `ppt/threadedComments/*`, `ppt/commentAuthors.xml`, `ppt/authors.xml`, `ppt/persons/*`, slide comment relationships, and comment/person relationship files), so review metadata can round-trip even though comments are not yet editable.
- Improve theme/master/layout inheritance for placeholder text styles and complex fills.
- Add export checks for grouped elements, rotations, crops, charts, hyperlinks, and hidden slides.
- Add visual render samples for master-heavy decks.

## First Regression Gate

Run these after each compatibility change:

```bash
npx.cmd vitest src/test/docxImport.test.ts src/test/docxExport.test.ts src/test/cloudSheetXlsx.test.ts src/test/slidePptx.test.ts --reporter=dot
npm.cmd run typecheck -- --pretty false
```
