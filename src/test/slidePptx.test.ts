import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import {
  exportPptxBlob,
  importPptxDeck,
  importPptxFile,
  patchSlideHiddenXml,
  patchSlideImageCropsXml,
  patchSlideInternalLinkRelsXml,
  patchSlideInternalLinksXml,
  patchSlideTransitionXml,
  pptxBulletOptions,
  pptxHyperlink,
  pptxImageSource,
  pptxLineSpacingMultiple,
  uint8ArrayToBase64,
} from '@/lib/cloudSlide/pptx';
import { isChart, isImage, isShape, isTable, isText } from '@/lib/cloudSlide/types';

const PPTX_MIME = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';

async function makePptxFile(
  slideXml: string,
  presentationXml?: string,
  slideRelsXml?: string,
  extraFiles?: Record<string, string | Uint8Array>,
): Promise<File> {
  const zip = new JSZip();
  zip.file('ppt/presentation.xml', presentationXml ?? `
    <p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
      <p:sldSz cx="12192000" cy="6858000" type="wide"/>
    </p:presentation>
  `);
  zip.file('ppt/slides/slide1.xml', slideXml);
  if (slideRelsXml) zip.file('ppt/slides/_rels/slide1.xml.rels', slideRelsXml);
  for (const [path, content] of Object.entries(extraFiles ?? {})) zip.file(path, content);
  const bytes = await zip.generateAsync({ type: 'uint8array' });
  return new File([bytes], 'deck.pptx', { type: PPTX_MIME });
}

function readBlobArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  if (typeof blob.arrayBuffer === 'function') return blob.arrayBuffer();

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) resolve(reader.result);
      else reject(new Error('Unable to read blob as ArrayBuffer'));
    };
    reader.onerror = () => reject(reader.error ?? new Error('Unable to read blob as ArrayBuffer'));
    reader.readAsArrayBuffer(blob);
  });
}

describe('cloudSlide pptx import', () => {
  it('imports slides in presentation relationship order instead of slide file number order', async () => {
    const slideOneXml = `
      <p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
             xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
        <p:cSld><p:spTree>
          <p:sp>
            <p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="3000000" cy="800000"/></a:xfrm></p:spPr>
            <p:txBody><a:p><a:r><a:t>File one</a:t></a:r></a:p></p:txBody>
          </p:sp>
        </p:spTree></p:cSld>
      </p:sld>
    `;
    const slideTwoXml = `
      <p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
             xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
        <p:cSld><p:spTree>
          <p:sp>
            <p:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="3000000" cy="800000"/></a:xfrm></p:spPr>
            <p:txBody><a:p><a:r><a:t>File two, first in deck</a:t></a:r></a:p></p:txBody>
          </p:sp>
        </p:spTree></p:cSld>
      </p:sld>
    `;
    const file = await makePptxFile(slideOneXml, `
      <p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
                      xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
        <p:sldSz cx="12192000" cy="6858000" type="wide"/>
        <p:sldIdLst>
          <p:sldId id="258" r:id="rId2"/>
          <p:sldId id="257" r:id="rId1"/>
        </p:sldIdLst>
      </p:presentation>
    `, undefined, {
      'ppt/slides/slide2.xml': slideTwoXml,
      'ppt/_rels/presentation.xml.rels': `
        <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
          <Relationship Id="rId1"
            Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide"
            Target="slides/slide1.xml"/>
          <Relationship Id="rId2"
            Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide"
            Target="slides/slide2.xml"/>
        </Relationships>
      `,
    });

    const deck = await importPptxDeck(file);

    expect(deck.slides).toHaveLength(2);
    expect(deck.slides[0]?.elements.find(isText)).toMatchObject({ content: 'File two, first in deck' });
    expect(deck.slides[1]?.elements.find(isText)).toMatchObject({ content: 'File one' });
  });

  it('maps internal slide links to presentation order after importing reordered decks', async () => {
    const slideOneXml = `
      <p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
             xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
             xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
        <p:cSld><p:spTree>
          <p:sp>
            <p:nvSpPr><p:cNvPr id="2" name="Jump"><a:hlinkClick r:id="rIdJump"/></p:cNvPr></p:nvSpPr>
            <p:spPr>
              <a:xfrm><a:off x="0" y="0"/><a:ext cx="2000000" cy="800000"/></a:xfrm>
              <a:prstGeom prst="rect"/>
            </p:spPr>
          </p:sp>
        </p:spTree></p:cSld>
      </p:sld>
    `;
    const slideTwoXml = `
      <p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
             xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
        <p:cSld><p:spTree /></p:cSld>
      </p:sld>
    `;
    const file = await makePptxFile(slideOneXml, `
      <p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
                      xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
        <p:sldSz cx="12192000" cy="6858000" type="wide"/>
        <p:sldIdLst>
          <p:sldId id="258" r:id="rId2"/>
          <p:sldId id="257" r:id="rId1"/>
        </p:sldIdLst>
      </p:presentation>
    `, `
      <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
        <Relationship Id="rIdJump"
          Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide"
          Target="slide2.xml"/>
      </Relationships>
    `, {
      'ppt/slides/slide2.xml': slideTwoXml,
      'ppt/_rels/presentation.xml.rels': `
        <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
          <Relationship Id="rId1"
            Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide"
            Target="slides/slide1.xml"/>
          <Relationship Id="rId2"
            Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide"
            Target="slides/slide2.xml"/>
        </Relationships>
      `,
    });

    const deck = await importPptxDeck(file);

    expect(deck.slides[1]?.elements.find(isShape)).toMatchObject({ hyperlink: '#slide=1' });
  });

  it('preserves non-wide presentation size metadata', async () => {
    const file = await makePptxFile(`
      <p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
             xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
        <p:cSld><p:spTree /></p:cSld>
      </p:sld>
    `, `
      <p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
        <p:sldSz cx="9144000" cy="6858000" type="screen4x3"/>
      </p:presentation>
    `);

    const deck = await importPptxDeck(file);

    expect(deck.slideSize).toEqual({ width: 960, height: 720 });
    expect(deck.slides).toHaveLength(1);
  });

  it('imports slide transition metadata', async () => {
    const file = await makePptxFile(`
      <p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
             xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
        <p:cSld><p:spTree /></p:cSld>
        <p:transition spd="slow" advClick="0" advTm="2500">
          <p:push dir="l"/>
        </p:transition>
      </p:sld>
    `);

    const [slide] = await importPptxFile(file);

    expect(slide.transition).toEqual({
      type: 'push',
      direction: 'left',
      durationMs: 2000,
      advanceOnClick: false,
      advanceAfterMs: 2500,
    });
  });

  it('imports hidden PowerPoint slides', async () => {
    const file = await makePptxFile(`
      <p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
             xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
             show="0">
        <p:cSld><p:spTree /></p:cSld>
      </p:sld>
    `);

    const [slide] = await importPptxFile(file);

    expect(slide.hidden).toBe(true);
  });

  it('uses the original presentation size when converting coordinates', async () => {
    const file = await makePptxFile(`
      <p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
             xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
        <p:cSld>
          <p:spTree>
            <p:sp>
              <p:spPr>
                <a:xfrm>
                  <a:off x="6096000" y="1714500"/>
                  <a:ext cx="3048000" cy="1714500"/>
                </a:xfrm>
              </p:spPr>
              <p:txBody>
                <a:p>
                  <a:pPr algn="ctr">
                    <a:lnSpc><a:spcPct val="150000"/></a:lnSpc>
                  </a:pPr>
                  <a:r>
                    <a:rPr sz="2400" b="1" i="1" u="sng">
                      <a:solidFill><a:srgbClr val="FF0000"/></a:solidFill>
                      <a:latin typeface="Arial"/>
                    </a:rPr>
                    <a:t>Hello</a:t>
                  </a:r>
                </a:p>
              </p:txBody>
            </p:sp>
          </p:spTree>
        </p:cSld>
      </p:sld>
    `);

    const [slide] = await importPptxFile(file);
    const text = slide.elements.find(isText);

    expect(text).toBeTruthy();
    expect(text?.xPct).toBeCloseTo(50);
    expect(text?.yPct).toBeCloseTo(25);
    expect(text?.wPct).toBeCloseTo(25);
    expect(text?.hPct).toBeCloseTo(25);
    expect(text?.fontSizeRem).toBeCloseTo(2);
    expect(text?.bold).toBe(true);
    expect(text?.italic).toBe(true);
    expect(text?.underline).toBe(true);
    expect(text?.align).toBe('center');
    expect(text?.textColor).toBe('#FF0000');
    expect(text?.fontFamily).toBe('Arial');
    expect(text?.lineHeight).toBeCloseTo(1.5);
  });

  it('preserves paragraph default text style when runs omit explicit formatting', async () => {
    const file = await makePptxFile(`
      <p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
             xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
        <p:cSld>
          <p:spTree>
            <p:sp>
              <p:spPr>
                <a:xfrm>
                  <a:off x="0" y="0"/>
                  <a:ext cx="3048000" cy="685800"/>
                </a:xfrm>
              </p:spPr>
              <p:txBody>
                <a:p>
                  <a:pPr>
                    <a:defRPr sz="3000" b="1">
                      <a:solidFill><a:srgbClr val="336699"/></a:solidFill>
                      <a:latin typeface="Aptos"/>
                    </a:defRPr>
                  </a:pPr>
                  <a:r><a:t>Styled by paragraph</a:t></a:r>
                </a:p>
              </p:txBody>
            </p:sp>
          </p:spTree>
        </p:cSld>
      </p:sld>
    `);

    const [slide] = await importPptxFile(file);
    const text = slide.elements.find(isText);

    expect(text).toMatchObject({
      content: 'Styled by paragraph',
      bold: true,
      textColor: '#336699',
      fontFamily: 'Aptos',
    });
    expect(text?.fontSizeRem).toBeCloseTo(2.5);
  });

  it('imports PowerPoint slide background images', async () => {
    const imageBytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3]);
    const file = await makePptxFile(`
      <p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
             xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
             xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
        <p:cSld>
          <p:bg>
            <p:bgPr>
              <a:blipFill>
                <a:blip r:embed="rIdBg"/>
                <a:stretch><a:fillRect/></a:stretch>
              </a:blipFill>
            </p:bgPr>
          </p:bg>
          <p:spTree />
        </p:cSld>
      </p:sld>
    `, undefined, `
      <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
        <Relationship Id="rIdBg"
          Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image"
          Target="../media/background.png"/>
      </Relationships>
    `, {
      'ppt/media/background.png': imageBytes,
    });

    const [slide] = await importPptxFile(file);

    expect(slide.backgroundImage).toBe(`data:image/png;base64,${uint8ArrayToBase64(imageBytes)}`);
  });

  it('inherits background images from PowerPoint slide layouts', async () => {
    const imageBytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 4, 5, 6]);
    const file = await makePptxFile(`
      <p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
             xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
        <p:cSld><p:spTree /></p:cSld>
      </p:sld>
    `, undefined, `
      <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
        <Relationship Id="rIdLayout"
          Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout"
          Target="../slideLayouts/slideLayout1.xml"/>
      </Relationships>
    `, {
      'ppt/slideLayouts/slideLayout1.xml': `
        <p:sldLayout xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
                     xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
                     xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
          <p:cSld>
            <p:bg>
              <p:bgPr>
                <a:blipFill>
                  <a:blip r:embed="rIdBg"/>
                  <a:stretch><a:fillRect/></a:stretch>
                </a:blipFill>
              </p:bgPr>
            </p:bg>
            <p:spTree />
          </p:cSld>
        </p:sldLayout>
      `,
      'ppt/slideLayouts/_rels/slideLayout1.xml.rels': `
        <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
          <Relationship Id="rIdBg"
            Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image"
            Target="../media/layout-bg.png"/>
        </Relationships>
      `,
      'ppt/media/layout-bg.png': imageBytes,
    });

    const [slide] = await importPptxFile(file);

    expect(slide.backgroundImage).toBe(`data:image/png;base64,${uint8ArrayToBase64(imageBytes)}`);
  });

  it('falls back to PowerPoint slide master backgrounds through layouts', async () => {
    const file = await makePptxFile(`
      <p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
             xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
        <p:cSld><p:spTree /></p:cSld>
      </p:sld>
    `, undefined, `
      <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
        <Relationship Id="rIdLayout"
          Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout"
          Target="../slideLayouts/slideLayout1.xml"/>
      </Relationships>
    `, {
      'ppt/slideLayouts/slideLayout1.xml': `
        <p:sldLayout xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
          <p:cSld><p:spTree /></p:cSld>
        </p:sldLayout>
      `,
      'ppt/slideLayouts/_rels/slideLayout1.xml.rels': `
        <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
          <Relationship Id="rIdMaster"
            Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster"
            Target="../slideMasters/slideMaster1.xml"/>
        </Relationships>
      `,
      'ppt/slideMasters/slideMaster1.xml': `
        <p:sldMaster xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
                     xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <p:cSld>
            <p:bg>
              <p:bgPr>
                <a:solidFill><a:srgbClr val="112233"/></a:solidFill>
              </p:bgPr>
            </p:bg>
            <p:spTree />
          </p:cSld>
        </p:sldMaster>
      `,
    });

    const [slide] = await importPptxFile(file);

    expect(slide.background).toBe('#112233');
  });

  it('inherits non-placeholder objects from PowerPoint slide masters and layouts', async () => {
    const imageBytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 7, 8, 9]);
    const file = await makePptxFile(`
      <p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
             xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
        <p:cSld>
          <p:spTree>
            <p:sp>
              <p:spPr>
                <a:xfrm><a:off x="1219200" y="685800"/><a:ext cx="3048000" cy="685800"/></a:xfrm>
              </p:spPr>
              <p:txBody><a:p><a:r><a:t>Slide body</a:t></a:r></a:p></p:txBody>
            </p:sp>
          </p:spTree>
        </p:cSld>
      </p:sld>
    `, undefined, `
      <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
        <Relationship Id="rIdLayout"
          Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout"
          Target="../slideLayouts/slideLayout1.xml"/>
      </Relationships>
    `, {
      'ppt/slideLayouts/slideLayout1.xml': `
        <p:sldLayout xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
                     xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <p:cSld>
            <p:spTree>
              <p:sp>
                <p:nvSpPr><p:nvPr><p:ph type="body"/></p:nvPr></p:nvSpPr>
                <p:txBody><a:p><a:r><a:t>Layout placeholder</a:t></a:r></a:p></p:txBody>
              </p:sp>
              <p:sp>
                <p:spPr>
                  <a:xfrm><a:off x="0" y="6172200"/><a:ext cx="12192000" cy="685800"/></a:xfrm>
                  <a:prstGeom prst="rect"/>
                  <a:solidFill><a:srgbClr val="AABBCC"/></a:solidFill>
                </p:spPr>
              </p:sp>
            </p:spTree>
          </p:cSld>
        </p:sldLayout>
      `,
      'ppt/slideLayouts/_rels/slideLayout1.xml.rels': `
        <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
          <Relationship Id="rIdMaster"
            Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster"
            Target="../slideMasters/slideMaster1.xml"/>
        </Relationships>
      `,
      'ppt/slideMasters/slideMaster1.xml': `
        <p:sldMaster xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
                     xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
                     xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
          <p:cSld>
            <p:spTree>
              <p:pic>
                <p:spPr>
                  <a:xfrm><a:off x="10363200" y="0"/><a:ext cx="1219200" cy="685800"/></a:xfrm>
                </p:spPr>
                <p:blipFill><a:blip r:embed="rIdLogo"/></p:blipFill>
              </p:pic>
            </p:spTree>
          </p:cSld>
        </p:sldMaster>
      `,
      'ppt/slideMasters/_rels/slideMaster1.xml.rels': `
        <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
          <Relationship Id="rIdLogo"
            Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image"
            Target="../media/master-logo.png"/>
        </Relationships>
      `,
      'ppt/media/master-logo.png': imageBytes,
    });

    const [slide] = await importPptxFile(file);
    const image = slide.elements.find(isImage);
    const inheritedShape = slide.elements.find(isShape);
    const text = slide.elements.find(isText);

    expect(slide.elements).toHaveLength(3);
    expect(slide.elements[0]?.type).toBe('image');
    expect(slide.elements[1]?.type).toBe('rect');
    expect(slide.elements[2]?.type).toBe('text');
    expect(image?.src).toBe(`data:image/png;base64,${uint8ArrayToBase64(imageBytes)}`);
    expect(inheritedShape?.fillColor).toBe('#AABBCC');
    expect(text?.content).toBe('Slide body');
    expect(slide.elements.some((el) => isText(el) && el.content === 'Layout placeholder')).toBe(false);
  });

  it('preserves soft line breaks inside a PowerPoint paragraph', async () => {
    const file = await makePptxFile(`
      <p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
             xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
        <p:cSld>
          <p:spTree>
            <p:sp>
              <p:spPr>
                <a:xfrm>
                  <a:off x="0" y="0"/>
                  <a:ext cx="3048000" cy="1714500"/>
                </a:xfrm>
              </p:spPr>
              <p:txBody>
                <a:p>
                  <a:r><a:t>Line 1</a:t></a:r>
                  <a:br/>
                  <a:r><a:t>Line 2</a:t></a:r>
                </a:p>
              </p:txBody>
            </p:sp>
          </p:spTree>
        </p:cSld>
      </p:sld>
    `);

    const [slide] = await importPptxFile(file);
    const text = slide.elements.find(isText);

    expect(text?.content).toBe('Line 1\nLine 2');
  });

  it('preserves PowerPoint field text such as slide numbers and dates', async () => {
    const file = await makePptxFile(`
      <p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
             xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
        <p:cSld>
          <p:spTree>
            <p:sp>
              <p:spPr>
                <a:xfrm>
                  <a:off x="0" y="0"/>
                  <a:ext cx="3048000" cy="685800"/>
                </a:xfrm>
              </p:spPr>
              <p:txBody>
                <a:p>
                  <a:fld id="{field-id}" type="slidenum">
                    <a:rPr sz="1200">
                      <a:solidFill><a:srgbClr val="666666"/></a:solidFill>
                    </a:rPr>
                    <a:t>7</a:t>
                  </a:fld>
                </a:p>
              </p:txBody>
            </p:sp>
          </p:spTree>
        </p:cSld>
      </p:sld>
    `);

    const [slide] = await importPptxFile(file);
    const text = slide.elements.find(isText);

    expect(text).toMatchObject({
      content: '7',
      textColor: '#666666',
    });
    expect(text?.fontSizeRem).toBeCloseTo(1);
  });

  it('preserves PowerPoint bullet list semantics on import', async () => {
    const file = await makePptxFile(`
      <p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
             xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
        <p:cSld>
          <p:spTree>
            <p:sp>
              <p:spPr>
                <a:xfrm><a:off x="0" y="0"/><a:ext cx="3048000" cy="1714500"/></a:xfrm>
              </p:spPr>
              <p:txBody>
                <a:p><a:pPr><a:buChar char="•"/></a:pPr><a:r><a:t>First</a:t></a:r></a:p>
                <a:p><a:pPr><a:buChar char="•"/></a:pPr><a:r><a:t>Second</a:t></a:r></a:p>
              </p:txBody>
            </p:sp>
          </p:spTree>
        </p:cSld>
      </p:sld>
    `);

    const [slide] = await importPptxFile(file);
    const text = slide.elements.find(isText);

    expect(text?.content).toBe('First\nSecond');
    expect(text?.listStyle).toBe('bullet');
  });

  it('preserves PowerPoint numbered list semantics on import', async () => {
    const file = await makePptxFile(`
      <p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
             xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
        <p:cSld>
          <p:spTree>
            <p:sp>
              <p:spPr>
                <a:xfrm><a:off x="0" y="0"/><a:ext cx="3048000" cy="1714500"/></a:xfrm>
              </p:spPr>
              <p:txBody>
                <a:p><a:pPr><a:buAutoNum type="arabicPeriod" startAt="3"/></a:pPr><a:r><a:t>Third</a:t></a:r></a:p>
                <a:p><a:pPr><a:buAutoNum type="arabicPeriod"/></a:pPr><a:r><a:t>Fourth</a:t></a:r></a:p>
              </p:txBody>
            </p:sp>
          </p:spTree>
        </p:cSld>
      </p:sld>
    `);

    const [slide] = await importPptxFile(file);
    const text = slide.elements.find(isText);

    expect(text?.content).toBe('Third\nFourth');
    expect(text?.listStyle).toBe('number');
    expect(text?.listStart).toBe(3);
  });

  it('imports connector lines with stroke color and width', async () => {
    const file = await makePptxFile(`
      <p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
             xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
        <p:cSld>
          <p:spTree>
            <p:cxnSp>
              <p:spPr>
                <a:xfrm>
                  <a:off x="0" y="0"/>
                  <a:ext cx="1219200" cy="685800"/>
                </a:xfrm>
                <a:prstGeom prst="straightConnector1"/>
                <a:ln w="25400">
                  <a:solidFill><a:srgbClr val="00AA00"/></a:solidFill>
                </a:ln>
              </p:spPr>
            </p:cxnSp>
          </p:spTree>
        </p:cSld>
      </p:sld>
    `);

    const [slide] = await importPptxFile(file);
    const line = slide.elements.find(isShape);

    expect(line).toMatchObject({
      type: 'line',
      strokeColor: '#00AA00',
      strokeWidth: 2,
    });
    expect(line?.wPct).toBeCloseTo(10);
    expect(line?.hPct).toBeCloseTo(10);
  });

  it('preserves zero-height horizontal connector geometry', async () => {
    const file = await makePptxFile(`
      <p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
             xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
        <p:cSld>
          <p:spTree>
            <p:cxnSp>
              <p:spPr>
                <a:xfrm>
                  <a:off x="1219200" y="3429000"/>
                  <a:ext cx="6096000" cy="0"/>
                </a:xfrm>
                <a:prstGeom prst="straightConnector1"/>
                <a:ln w="12700">
                  <a:solidFill><a:srgbClr val="222222"/></a:solidFill>
                </a:ln>
              </p:spPr>
            </p:cxnSp>
          </p:spTree>
        </p:cSld>
      </p:sld>
    `);

    const [slide] = await importPptxFile(file);
    const line = slide.elements.find(isShape);

    expect(line).toMatchObject({
      type: 'line',
      xPct: 10,
      yPct: 50,
      wPct: 50,
      hPct: 0,
      strokeColor: '#222222',
      strokeWidth: 1,
    });
  });

  it('preserves drawing order between connectors and shapes', async () => {
    const file = await makePptxFile(`
      <p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
             xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
        <p:cSld>
          <p:spTree>
            <p:cxnSp>
              <p:spPr>
                <a:xfrm>
                  <a:off x="0" y="0"/>
                  <a:ext cx="1219200" cy="0"/>
                </a:xfrm>
                <a:prstGeom prst="straightConnector1"/>
              </p:spPr>
            </p:cxnSp>
            <p:sp>
              <p:spPr>
                <a:xfrm>
                  <a:off x="0" y="0"/>
                  <a:ext cx="1219200" cy="685800"/>
                </a:xfrm>
                <a:prstGeom prst="rect"/>
              </p:spPr>
            </p:sp>
          </p:spTree>
        </p:cSld>
      </p:sld>
    `);

    const [slide] = await importPptxFile(file);

    expect(slide.elements.map((el) => el.type)).toEqual(['line', 'rect']);
  });

  it('imports PowerPoint grouped shapes as one editor group without duplicating children', async () => {
    const file = await makePptxFile(`
      <p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
             xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
        <p:cSld>
          <p:spTree>
            <p:sp>
              <p:spPr>
                <a:xfrm><a:off x="0" y="0"/><a:ext cx="1219200" cy="685800"/></a:xfrm>
                <a:prstGeom prst="rect"/>
                <a:solidFill><a:srgbClr val="111111"/></a:solidFill>
              </p:spPr>
            </p:sp>
            <p:grpSp>
              <p:nvGrpSpPr/>
              <p:grpSpPr>
                <a:xfrm>
                  <a:off x="1219200" y="685800"/>
                  <a:ext cx="6096000" cy="2057400"/>
                  <a:chOff x="0" y="0"/>
                  <a:chExt cx="6096000" cy="2057400"/>
                </a:xfrm>
              </p:grpSpPr>
              <p:sp>
                <p:spPr>
                  <a:xfrm><a:off x="0" y="0"/><a:ext cx="1219200" cy="685800"/></a:xfrm>
                  <a:prstGeom prst="rect"/>
                  <a:solidFill><a:srgbClr val="222222"/></a:solidFill>
                </p:spPr>
              </p:sp>
              <p:sp>
                <p:spPr>
                  <a:xfrm><a:off x="1219200" y="685800"/><a:ext cx="1219200" cy="685800"/></a:xfrm>
                  <a:prstGeom prst="ellipse"/>
                  <a:solidFill><a:srgbClr val="333333"/></a:solidFill>
                </p:spPr>
              </p:sp>
            </p:grpSp>
            <p:sp>
              <p:spPr>
                <a:xfrm><a:off x="2438400" y="0"/><a:ext cx="1219200" cy="685800"/></a:xfrm>
                <a:prstGeom prst="rect"/>
                <a:solidFill><a:srgbClr val="444444"/></a:solidFill>
              </p:spPr>
            </p:sp>
          </p:spTree>
        </p:cSld>
      </p:sld>
    `);

    const [slide] = await importPptxFile(file);
    const shapes = slide.elements.filter(isShape);

    expect(shapes.map((el) => el.type)).toEqual(['rect', 'rect', 'ellipse', 'rect']);
    expect(shapes).toHaveLength(4);
    expect(shapes[0].groupId).toBeUndefined();
    expect(shapes[1].groupId).toBeTruthy();
    expect(shapes[2].groupId).toBe(shapes[1].groupId);
    expect(shapes[3].groupId).toBeUndefined();
    expect(shapes[1]).toMatchObject({ xPct: 10, yPct: 10, wPct: 10, hPct: 10, fillColor: '#222222' });
    expect(shapes[2]).toMatchObject({ xPct: 20, yPct: 20, wPct: 10, hPct: 10, fillColor: '#333333' });
  });

  it('preserves full-slide elements without shrinking them on import', async () => {
    const file = await makePptxFile(`
      <p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
             xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
        <p:cSld>
          <p:spTree>
            <p:sp>
              <p:spPr>
                <a:xfrm>
                  <a:off x="0" y="0"/>
                  <a:ext cx="12192000" cy="6858000"/>
                </a:xfrm>
                <a:prstGeom prst="rect"/>
                <a:solidFill><a:srgbClr val="123456"/></a:solidFill>
              </p:spPr>
            </p:sp>
          </p:spTree>
        </p:cSld>
      </p:sld>
    `);

    const [slide] = await importPptxFile(file);
    const shape = slide.elements.find(isShape);

    expect(shape).toMatchObject({
      type: 'rect',
      xPct: 0,
      yPct: 0,
      wPct: 100,
      hPct: 100,
      fillColor: '#123456',
    });
  });

  it('preserves outline-only shapes without inventing a fill color', async () => {
    const file = await makePptxFile(`
      <p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
             xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
        <p:cSld>
          <p:spTree>
            <p:sp>
              <p:spPr>
                <a:xfrm>
                  <a:off x="0" y="0"/>
                  <a:ext cx="1219200" cy="685800"/>
                </a:xfrm>
                <a:prstGeom prst="rect"/>
                <a:noFill/>
                <a:ln w="12700">
                  <a:solidFill><a:srgbClr val="445566"/></a:solidFill>
                </a:ln>
              </p:spPr>
            </p:sp>
          </p:spTree>
        </p:cSld>
      </p:sld>
    `);

    const [slide] = await importPptxFile(file);
    const shape = slide.elements.find(isShape);

    expect(shape).toMatchObject({
      type: 'rect',
      fillColor: 'transparent',
      strokeColor: '#445566',
      strokeWidth: 1,
    });
  });

  it('imports PowerPoint shape locks so protected objects cannot be edited accidentally', async () => {
    const file = await makePptxFile(`
      <p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
             xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
        <p:cSld>
          <p:spTree>
            <p:sp>
              <p:nvSpPr>
                <p:cNvPr id="4" name="Locked box"/>
                <p:cNvSpPr>
                  <a:spLocks noMove="1" noResize="1" noRot="1" noTextEdit="1"/>
                </p:cNvSpPr>
                <p:nvPr/>
              </p:nvSpPr>
              <p:spPr>
                <a:xfrm>
                  <a:off x="0" y="0"/>
                  <a:ext cx="1219200" cy="685800"/>
                </a:xfrm>
                <a:prstGeom prst="rect"/>
                <a:solidFill><a:srgbClr val="445566"/></a:solidFill>
              </p:spPr>
            </p:sp>
          </p:spTree>
        </p:cSld>
      </p:sld>
    `);

    const [slide] = await importPptxFile(file);
    const shape = slide.elements.find(isShape);

    expect(shape).toMatchObject({
      type: 'rect',
      locked: true,
      fillColor: '#445566',
    });
  });

  it('imports safe shape hyperlinks and drops unsafe shape hyperlinks', async () => {
    const file = await makePptxFile(`
      <p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
             xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
             xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
        <p:cSld>
          <p:spTree>
            <p:sp>
              <p:nvSpPr>
                <p:cNvPr id="4" name="Linked box">
                  <a:hlinkClick r:id="rIdShapeLink"/>
                </p:cNvPr>
                <p:cNvSpPr/>
                <p:nvPr/>
              </p:nvSpPr>
              <p:spPr>
                <a:xfrm>
                  <a:off x="0" y="0"/>
                  <a:ext cx="1219200" cy="685800"/>
                </a:xfrm>
                <a:prstGeom prst="rect"/>
                <a:solidFill><a:srgbClr val="445566"/></a:solidFill>
              </p:spPr>
            </p:sp>
            <p:sp>
              <p:nvSpPr>
                <p:cNvPr id="5" name="Unsafe box">
                  <a:hlinkClick r:id="rIdBad"/>
                </p:cNvPr>
                <p:cNvSpPr/>
                <p:nvPr/>
              </p:nvSpPr>
              <p:spPr>
                <a:xfrm>
                  <a:off x="1219200" y="0"/>
                  <a:ext cx="1219200" cy="685800"/>
                </a:xfrm>
                <a:prstGeom prst="rect"/>
                <a:solidFill><a:srgbClr val="778899"/></a:solidFill>
              </p:spPr>
            </p:sp>
            <p:sp>
              <p:nvSpPr>
                <p:cNvPr id="6" name="Text button">
                  <a:hlinkClick r:id="rIdTextShape"/>
                </p:cNvPr>
                <p:cNvSpPr/>
                <p:nvPr/>
              </p:nvSpPr>
              <p:spPr>
                <a:xfrm>
                  <a:off x="2438400" y="0"/>
                  <a:ext cx="1828800" cy="685800"/>
                </a:xfrm>
                <a:prstGeom prst="roundRect"/>
                <a:solidFill><a:srgbClr val="112233"/></a:solidFill>
              </p:spPr>
              <p:txBody><a:p><a:r><a:t>Open</a:t></a:r></a:p></p:txBody>
            </p:sp>
          </p:spTree>
        </p:cSld>
      </p:sld>
    `, undefined, `
      <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
        <Relationship Id="rIdShapeLink"
          Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink"
          Target="https://example.com/shape"
          TargetMode="External"/>
        <Relationship Id="rIdTextShape"
          Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink"
          Target="https://example.com/text-shape"
          TargetMode="External"/>
        <Relationship Id="rIdBad"
          Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink"
          Target="javascript:alert(1)"
          TargetMode="External"/>
      </Relationships>
    `);

    const [slide] = await importPptxFile(file);
    const shapes = slide.elements.filter(isShape);
    const text = slide.elements.find(isText);

    expect(shapes[0]).toMatchObject({
      type: 'rect',
      hyperlink: 'https://example.com/shape',
    });
    expect(shapes[1]).toMatchObject({
      type: 'rect',
      fillColor: '#778899',
    });
    expect(shapes[1]?.hyperlink).toBeUndefined();
    expect(text).toMatchObject({
      type: 'text',
      content: 'Open',
      hyperlink: 'https://example.com/text-shape',
    });
  });

  it('imports internal PowerPoint slide jump hyperlinks as safe internal links', async () => {
    const file = await makePptxFile(`
      <p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
             xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
             xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
        <p:cSld>
          <p:spTree>
            <p:sp>
              <p:nvSpPr>
                <p:cNvPr id="2" name="Jump">
                  <a:hlinkClick r:id="rIdSlide2" action="ppaction://hlinksldjump"/>
                </p:cNvPr>
              </p:nvSpPr>
              <p:spPr>
                <a:xfrm>
                  <a:off x="0" y="0"/>
                  <a:ext cx="1219200" cy="685800"/>
                </a:xfrm>
                <a:prstGeom prst="rect"/>
                <a:solidFill><a:srgbClr val="112233"/></a:solidFill>
              </p:spPr>
            </p:sp>
          </p:spTree>
        </p:cSld>
      </p:sld>
    `, undefined, `
      <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
        <Relationship Id="rIdSlide2"
          Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide"
          Target="slide2.xml"/>
      </Relationships>
    `, {
      'ppt/slides/slide2.xml': `
        <p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
               xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <p:cSld><p:spTree /></p:cSld>
        </p:sld>
      `,
    });

    const [slide] = await importPptxFile(file);
    const shape = slide.elements.find(isShape);

    expect(shape?.hyperlink).toBe('#slide=2');
  });

  it('maps common PowerPoint theme colors instead of falling back to defaults', async () => {
    const file = await makePptxFile(`
      <p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
             xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
        <p:cSld>
          <p:spTree>
            <p:sp>
              <p:spPr>
                <a:xfrm>
                  <a:off x="0" y="0"/>
                  <a:ext cx="1219200" cy="685800"/>
                </a:xfrm>
                <a:prstGeom prst="rect"/>
                <a:solidFill><a:schemeClr val="accent2"/></a:solidFill>
              </p:spPr>
            </p:sp>
          </p:spTree>
        </p:cSld>
      </p:sld>
    `);

    const [slide] = await importPptxFile(file);
    const shape = slide.elements.find(isShape);

    expect(shape).toMatchObject({
      type: 'rect',
      fillColor: '#ED7D31',
    });
  });

  it('uses the presentation theme color scheme for PowerPoint scheme colors', async () => {
    const file = await makePptxFile(`
      <p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
             xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
        <p:cSld>
          <p:spTree>
            <p:sp>
              <p:spPr>
                <a:xfrm>
                  <a:off x="0" y="0"/>
                  <a:ext cx="1219200" cy="685800"/>
                </a:xfrm>
                <a:prstGeom prst="rect"/>
                <a:solidFill><a:schemeClr val="accent2"/></a:solidFill>
              </p:spPr>
            </p:sp>
            <p:sp>
              <p:spPr>
                <a:xfrm>
                  <a:off x="1219200" y="0"/>
                  <a:ext cx="3048000" cy="685800"/>
                </a:xfrm>
              </p:spPr>
              <p:txBody>
                <a:p>
                  <a:r>
                    <a:rPr>
                      <a:solidFill><a:schemeClr val="tx1"/></a:solidFill>
                    </a:rPr>
                    <a:t>Theme text</a:t>
                  </a:r>
                </a:p>
              </p:txBody>
            </p:sp>
          </p:spTree>
        </p:cSld>
      </p:sld>
    `, undefined, undefined, {
      'ppt/_rels/presentation.xml.rels': `
        <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
          <Relationship Id="rIdTheme"
            Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme"
            Target="theme/theme1.xml"/>
        </Relationships>
      `,
      'ppt/theme/theme1.xml': `
        <a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:themeElements>
            <a:clrScheme name="Brand">
              <a:dk1><a:srgbClr val="111111"/></a:dk1>
              <a:lt1><a:srgbClr val="FAFAFA"/></a:lt1>
              <a:dk2><a:srgbClr val="222222"/></a:dk2>
              <a:lt2><a:srgbClr val="EEEEEE"/></a:lt2>
              <a:accent1><a:srgbClr val="AAAAAA"/></a:accent1>
              <a:accent2><a:srgbClr val="123456"/></a:accent2>
              <a:accent3><a:srgbClr val="BBBBBB"/></a:accent3>
              <a:accent4><a:srgbClr val="CCCCCC"/></a:accent4>
              <a:accent5><a:srgbClr val="DDDDDD"/></a:accent5>
              <a:accent6><a:srgbClr val="EEEEEE"/></a:accent6>
              <a:hlink><a:srgbClr val="0055AA"/></a:hlink>
              <a:folHlink><a:srgbClr val="884499"/></a:folHlink>
            </a:clrScheme>
          </a:themeElements>
        </a:theme>
      `,
    });

    const [slide] = await importPptxFile(file);
    const shape = slide.elements.find(isShape);
    const text = slide.elements.find(isText);

    expect(shape).toMatchObject({
      type: 'rect',
      fillColor: '#123456',
    });
    expect(text).toMatchObject({
      type: 'text',
      textColor: '#111111',
    });
  });

  it('applies PowerPoint color transforms for theme and direct RGB fills', async () => {
    const file = await makePptxFile(`
      <p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
             xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
        <p:cSld>
          <p:spTree>
            <p:sp>
              <p:spPr>
                <a:xfrm>
                  <a:off x="0" y="0"/>
                  <a:ext cx="1219200" cy="685800"/>
                </a:xfrm>
                <a:prstGeom prst="rect"/>
                <a:solidFill>
                  <a:schemeClr val="accent2">
                    <a:lumMod val="50000"/>
                    <a:lumOff val="20000"/>
                  </a:schemeClr>
                </a:solidFill>
              </p:spPr>
            </p:sp>
            <p:sp>
              <p:spPr>
                <a:xfrm>
                  <a:off x="1219200" y="0"/>
                  <a:ext cx="1219200" cy="685800"/>
                </a:xfrm>
                <a:prstGeom prst="rect"/>
                <a:solidFill>
                  <a:srgbClr val="003366">
                    <a:tint val="50000"/>
                  </a:srgbClr>
                </a:solidFill>
              </p:spPr>
            </p:sp>
            <p:sp>
              <p:spPr>
                <a:xfrm>
                  <a:off x="2438400" y="0"/>
                  <a:ext cx="1219200" cy="685800"/>
                </a:xfrm>
                <a:prstGeom prst="rect"/>
                <a:solidFill>
                  <a:srgbClr val="80C0FF">
                    <a:shade val="50000"/>
                  </a:srgbClr>
                </a:solidFill>
              </p:spPr>
            </p:sp>
          </p:spTree>
        </p:cSld>
      </p:sld>
    `, undefined, undefined, {
      'ppt/_rels/presentation.xml.rels': `
        <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
          <Relationship Id="rIdTheme"
            Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme"
            Target="theme/theme1.xml"/>
        </Relationships>
      `,
      'ppt/theme/theme1.xml': `
        <a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:themeElements>
            <a:clrScheme name="Brand">
              <a:dk1><a:srgbClr val="111111"/></a:dk1>
              <a:lt1><a:srgbClr val="FFFFFF"/></a:lt1>
              <a:accent2><a:srgbClr val="123456"/></a:accent2>
            </a:clrScheme>
          </a:themeElements>
        </a:theme>
      `,
    });

    const [slide] = await importPptxFile(file);
    const shapes = slide.elements.filter(isShape);

    expect(shapes[0]?.fillColor).toBe('#1B4D7F');
    expect(shapes[1]?.fillColor).toBe('#8099B3');
    expect(shapes[2]?.fillColor).toBe('#406080');
  });

  it('resolves PowerPoint theme font tokens to editable text fonts', async () => {
    const file = await makePptxFile(`
      <p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
             xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
        <p:cSld>
          <p:spTree>
            <p:sp>
              <p:spPr>
                <a:xfrm>
                  <a:off x="0" y="0"/>
                  <a:ext cx="3048000" cy="685800"/>
                </a:xfrm>
              </p:spPr>
              <p:txBody>
                <a:p>
                  <a:r>
                    <a:rPr><a:latin typeface="+mj-lt"/></a:rPr>
                    <a:t>Theme title</a:t>
                  </a:r>
                </a:p>
              </p:txBody>
            </p:sp>
          </p:spTree>
        </p:cSld>
      </p:sld>
    `, undefined, undefined, {
      'ppt/_rels/presentation.xml.rels': `
        <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
          <Relationship Id="rIdTheme"
            Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme"
            Target="theme/theme1.xml"/>
        </Relationships>
      `,
      'ppt/theme/theme1.xml': `
        <a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:themeElements>
            <a:fontScheme name="Brand Fonts">
              <a:majorFont>
                <a:latin typeface="Aptos Display"/>
                <a:ea typeface="Malgun Gothic"/>
                <a:cs typeface="Arial"/>
              </a:majorFont>
              <a:minorFont>
                <a:latin typeface="Aptos"/>
                <a:ea typeface="Malgun Gothic"/>
                <a:cs typeface="Arial"/>
              </a:minorFont>
            </a:fontScheme>
          </a:themeElements>
        </a:theme>
      `,
    });

    const [slide] = await importPptxFile(file);
    const text = slide.elements.find(isText);

    expect(text).toMatchObject({
      type: 'text',
      content: 'Theme title',
      fontFamily: 'Aptos Display',
    });
  });

  it('imports editable PowerPoint table graphic frames as structured table elements', async () => {
    const file = await makePptxFile(`
      <p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
             xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
        <p:cSld>
          <p:spTree>
            <p:graphicFrame>
              <p:xfrm>
                <a:off x="1219200" y="685800"/>
                <a:ext cx="6096000" cy="2057400"/>
              </p:xfrm>
              <a:graphic>
                <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/table">
                  <a:tbl>
                    <a:tblGrid>
                      <a:gridCol w="3048000"/>
                      <a:gridCol w="3048000"/>
                    </a:tblGrid>
                    <a:tr h="685800">
                      <a:tc>
                        <a:txBody>
                          <a:p>
                            <a:r>
                              <a:rPr sz="1800" b="1">
                                <a:solidFill><a:srgbClr val="111111"/></a:solidFill>
                                <a:latin typeface="Aptos"/>
                              </a:rPr>
                              <a:t>Name</a:t>
                            </a:r>
                          </a:p>
                        </a:txBody>
                      </a:tc>
                      <a:tc>
                        <a:tcPr>
                          <a:solidFill><a:srgbClr val="F8FAFC"/></a:solidFill>
                        </a:tcPr>
                        <a:txBody><a:p><a:r><a:t>Status</a:t></a:r></a:p></a:txBody>
                      </a:tc>
                    </a:tr>
                    <a:tr h="685800">
                      <a:tc>
                        <a:txBody><a:p><a:r><a:t>Launch</a:t></a:r></a:p></a:txBody>
                      </a:tc>
                      <a:tc>
                        <a:txBody><a:p><a:r><a:t>Ready</a:t></a:r></a:p></a:txBody>
                      </a:tc>
                    </a:tr>
                  </a:tbl>
                </a:graphicData>
              </a:graphic>
            </p:graphicFrame>
          </p:spTree>
        </p:cSld>
      </p:sld>
    `);

    const [slide] = await importPptxFile(file);
    const table = slide.elements.find(isTable);

    expect(table).toMatchObject({
      type: 'table',
      rows: [
        [
          { text: 'Name', fontSizeRem: 1.5, bold: true, textColor: '#111111', fontFamily: 'Aptos' },
          { text: 'Status', bgColor: '#F8FAFC' },
        ],
        [
          { text: 'Launch' },
          { text: 'Ready' },
        ],
      ],
      colWidthsPct: [50, 50],
      rowHeightsPct: [50, 50],
      borderColor: '#CBD5E1',
      headerRow: true,
    });
    expect(table?.xPct).toBeCloseTo(10);
    expect(table?.yPct).toBeCloseTo(10);
    expect(table?.wPct).toBeCloseTo(50);
    expect(table?.hPct).toBeCloseTo(30);
  });

  it('preserves merged PowerPoint table cells on import', async () => {
    const file = await makePptxFile(`
      <p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
             xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
        <p:cSld>
          <p:spTree>
            <p:graphicFrame>
              <p:xfrm>
                <a:off x="0" y="0"/>
                <a:ext cx="6096000" cy="2057400"/>
              </p:xfrm>
              <a:graphic>
                <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/table">
                  <a:tbl>
                    <a:tblGrid>
                      <a:gridCol w="2032000"/>
                      <a:gridCol w="2032000"/>
                      <a:gridCol w="2032000"/>
                    </a:tblGrid>
                    <a:tr h="685800">
                      <a:tc rowSpan="2">
                        <a:txBody><a:p><a:r><a:t>Owner</a:t></a:r></a:p></a:txBody>
                      </a:tc>
                      <a:tc gridSpan="2">
                        <a:txBody><a:p><a:r><a:t>Merged header</a:t></a:r></a:p></a:txBody>
                      </a:tc>
                      <a:tc hMerge="1">
                        <a:txBody><a:p><a:r><a:t>Hidden</a:t></a:r></a:p></a:txBody>
                      </a:tc>
                    </a:tr>
                    <a:tr h="685800">
                      <a:tc vMerge="1">
                        <a:txBody><a:p><a:r><a:t>Hidden</a:t></a:r></a:p></a:txBody>
                      </a:tc>
                      <a:tc>
                        <a:txBody><a:p><a:r><a:t>Done</a:t></a:r></a:p></a:txBody>
                      </a:tc>
                      <a:tc>
                        <a:txBody><a:p><a:r><a:t>Next</a:t></a:r></a:p></a:txBody>
                      </a:tc>
                    </a:tr>
                  </a:tbl>
                </a:graphicData>
              </a:graphic>
            </p:graphicFrame>
          </p:spTree>
        </p:cSld>
      </p:sld>
    `);

    const [slide] = await importPptxFile(file);
    const table = slide.elements.find(isTable);

    expect(table?.rows).toEqual([
      [
        { text: 'Owner', rowspan: 2 },
        { text: 'Merged header', colspan: 2 },
      ],
      [
        { text: 'Done' },
        { text: 'Next' },
      ],
    ]);
    expect(table?.colWidthsPct).toHaveLength(3);
    table?.colWidthsPct?.forEach((width) => expect(width).toBeCloseTo(100 / 3));
  });

  it('imports speaker notes from notes slide relationships', async () => {
    const file = await makePptxFile(`
      <p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
             xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
        <p:cSld><p:spTree /></p:cSld>
      </p:sld>
    `, undefined, `
      <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
        <Relationship Id="rIdNotes"
          Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesSlide"
          Target="../notesSlides/notesSlide1.xml"/>
      </Relationships>
    `, {
      'ppt/notesSlides/notesSlide1.xml': `
        <p:notes xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
                 xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <p:cSld>
            <p:spTree>
              <p:sp>
                <p:nvSpPr><p:nvPr><p:ph type="sldNum"/></p:nvPr></p:nvSpPr>
                <p:txBody><a:p><a:r><a:t>1</a:t></a:r></a:p></p:txBody>
              </p:sp>
              <p:sp>
                <p:nvSpPr><p:nvPr><p:ph type="body"/></p:nvPr></p:nvSpPr>
                <p:txBody>
                  <a:p><a:r><a:t>Opening cue</a:t></a:r></a:p>
                  <a:p><a:r><a:t>Follow-up detail</a:t></a:r></a:p>
                </p:txBody>
              </p:sp>
            </p:spTree>
          </p:cSld>
        </p:notes>
      `,
    });

    const [slide] = await importPptxFile(file);

    expect(slide.notes).toBe('Opening cue\nFollow-up detail');
  });

  it('imports speaker notes from absolute package relationship targets', async () => {
    const file = await makePptxFile(`
      <p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
             xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
        <p:cSld><p:spTree /></p:cSld>
      </p:sld>
    `, undefined, `
      <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
        <Relationship Id="rIdNotes"
          Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesSlide"
          Target="/ppt/notesSlides/notesSlide1.xml"/>
      </Relationships>
    `, {
      'ppt/notesSlides/notesSlide1.xml': `
        <p:notes xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
                 xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <p:cSld>
            <p:spTree>
              <p:sp>
                <p:nvSpPr><p:nvPr><p:ph type="body"/></p:nvPr></p:nvSpPr>
                <p:txBody><a:p><a:r><a:t>Absolute note target</a:t></a:r></a:p></p:txBody>
              </p:sp>
            </p:spTree>
          </p:cSld>
        </p:notes>
      `,
    });

    const [slide] = await importPptxFile(file);

    expect(slide.notes).toBe('Absolute note target');
  });

  it('exports speaker notes as PowerPoint notes slides', async () => {
    const blob = await exportPptxBlob([{
      id: 'slide_notes',
      elements: [],
      notes: 'Opening cue\nFollow-up detail',
    }]);
    const buffer = await readBlobArrayBuffer(blob);
    const zip = await JSZip.loadAsync(buffer);
    const notesPath = Object.keys(zip.files).find((path) => /^ppt\/notesSlides\/notesSlide\d+\.xml$/.test(path));
    expect(notesPath).toBeTruthy();

    const slideRels = await zip.file('ppt/slides/_rels/slide1.xml.rels')?.async('string');
    const notesXml = notesPath ? await zip.file(notesPath)?.async('string') : '';
    expect(slideRels).toContain('/notesSlide');
    expect(notesXml).toContain('Opening cue');
    expect(notesXml).toContain('Follow-up detail');

    const deck = await importPptxDeck(new File([buffer], 'notes.pptx', { type: PPTX_MIME }));
    expect(deck.slides[0]?.notes).toBe('Opening cue\nFollow-up detail');
  });

  it('preserves safe table cell hyperlinks and drops unsafe ones on import', async () => {
    const file = await makePptxFile(`
      <p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
             xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
             xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
        <p:cSld>
          <p:spTree>
            <p:graphicFrame>
              <p:xfrm>
                <a:off x="0" y="0"/>
                <a:ext cx="6096000" cy="1371600"/>
              </p:xfrm>
              <a:graphic>
                <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/table">
                  <a:tbl>
                    <a:tblGrid>
                      <a:gridCol w="3048000"/>
                      <a:gridCol w="3048000"/>
                    </a:tblGrid>
                    <a:tr h="685800">
                      <a:tc>
                        <a:txBody>
                          <a:p>
                            <a:r>
                              <a:rPr><a:hlinkClick r:id="rIdSafe"/></a:rPr>
                              <a:t>Docs</a:t>
                            </a:r>
                          </a:p>
                        </a:txBody>
                      </a:tc>
                      <a:tc>
                        <a:txBody>
                          <a:p>
                            <a:r>
                              <a:rPr><a:hlinkClick r:id="rIdUnsafe"/></a:rPr>
                              <a:t>Bad</a:t>
                            </a:r>
                          </a:p>
                        </a:txBody>
                      </a:tc>
                    </a:tr>
                  </a:tbl>
                </a:graphicData>
              </a:graphic>
            </p:graphicFrame>
          </p:spTree>
        </p:cSld>
      </p:sld>
    `, undefined, `
      <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
        <Relationship Id="rIdSafe"
          Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink"
          Target="https://example.com/table"
          TargetMode="External"/>
        <Relationship Id="rIdUnsafe"
          Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink"
          Target="javascript:alert(1)"
          TargetMode="External"/>
      </Relationships>
    `);

    const [slide] = await importPptxFile(file);
    const table = slide.elements.find(isTable);

    expect(table?.rows[0][0]).toMatchObject({
      text: 'Docs',
      hyperlink: 'https://example.com/table',
    });
    expect(table?.rows[0][1]).toEqual({ text: 'Bad' });
  });

  it('imports basic PowerPoint chart data as editable chart elements', async () => {
    const file = await makePptxFile(`
      <p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
             xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
             xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart"
             xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
        <p:cSld>
          <p:spTree>
            <p:graphicFrame>
              <p:xfrm>
                <a:off x="1219200" y="685800"/>
                <a:ext cx="6096000" cy="2057400"/>
              </p:xfrm>
              <a:graphic>
                <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart">
                  <c:chart r:id="rIdChart1"/>
                </a:graphicData>
              </a:graphic>
            </p:graphicFrame>
          </p:spTree>
        </p:cSld>
      </p:sld>
    `, undefined, `
      <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
        <Relationship Id="rIdChart1"
          Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart"
          Target="../charts/chart1.xml"/>
      </Relationships>
    `, {
      'ppt/charts/chart1.xml': `
        <c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart"
                      xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <c:chart>
            <c:title>
              <c:tx>
                <c:rich>
                  <a:p><a:r><a:t>Revenue</a:t></a:r></a:p>
                </c:rich>
              </c:tx>
            </c:title>
            <c:plotArea>
              <c:barChart>
                <c:ser>
                  <c:tx><c:strRef><c:strCache><c:pt idx="0"><c:v>North</c:v></c:pt></c:strCache></c:strRef></c:tx>
                  <c:spPr>
                    <a:solidFill><a:srgbClr val="AA3377"/></a:solidFill>
                  </c:spPr>
                  <c:cat><c:strRef><c:strCache>
                    <c:pt idx="0"><c:v>Q1</c:v></c:pt>
                    <c:pt idx="1"><c:v>Q2</c:v></c:pt>
                  </c:strCache></c:strRef></c:cat>
                  <c:val><c:numRef><c:numCache>
                    <c:pt idx="0"><c:v>10</c:v></c:pt>
                    <c:pt idx="1"><c:v>25</c:v></c:pt>
                  </c:numCache></c:numRef></c:val>
                </c:ser>
                <c:dLbls>
                  <c:dLblPos val="outEnd"/>
                  <c:showVal val="1"/>
                  <c:showCatName val="0"/>
                  <c:showPercent val="0"/>
                  <c:showSerName val="0"/>
                </c:dLbls>
              </c:barChart>
              <c:catAx>
                <c:delete val="1"/>
                <c:title><c:tx><c:rich><a:p><a:r><a:t>Quarter</a:t></a:r></a:p></c:rich></c:tx></c:title>
                <c:numFmt formatCode="@" sourceLinked="0"/>
                <c:tickLblPos val="low"/>
              </c:catAx>
              <c:valAx>
                <c:delete val="0"/>
                <c:majorGridlines/>
                <c:title><c:tx><c:rich><a:p><a:r><a:t>Revenue USD</a:t></a:r></a:p></c:rich></c:tx></c:title>
                <c:numFmt formatCode="$#,##0" sourceLinked="0"/>
                <c:tickLblPos val="high"/>
              </c:valAx>
            </c:plotArea>
            <c:legend>
              <c:legendPos val="r"/>
            </c:legend>
          </c:chart>
        </c:chartSpace>
      `,
    });

    const [slide] = await importPptxFile(file);
    const chart = slide.elements.find(isChart);

    expect(chart).toMatchObject({
      type: 'chart',
      chartType: 'bar',
      title: 'Revenue',
      categoryAxisTitle: 'Quarter',
      valueAxisTitle: 'Revenue USD',
      showLegend: true,
      legendPosition: 'r',
      showDataLabels: true,
      showDataLabelValue: true,
      showDataLabelCategory: false,
      showDataLabelPercent: false,
      showDataLabelSeriesName: false,
      dataLabelPosition: 'outEnd',
      categoryAxisHidden: true,
      valueAxisHidden: false,
      showCategoryGridLines: false,
      showValueGridLines: true,
      categoryAxisLabelFormatCode: '@',
      categoryAxisLabelPosition: 'low',
      valueAxisLabelFormatCode: '$#,##0',
      valueAxisLabelPosition: 'high',
      categories: ['Q1', 'Q2'],
      series: [{ name: 'North', values: [10, 25], color: '#AA3377' }],
    });
    expect(chart?.xPct).toBeCloseTo(10);
    expect(chart?.yPct).toBeCloseTo(10);
    expect(chart?.wPct).toBeCloseTo(50);
    expect(chart?.hPct).toBeCloseTo(30);
  });

  it('exports chart axis titles to editable PowerPoint charts', async () => {
    const blob = await exportPptxBlob([{
      id: 'slide_chart_axes',
      elements: [{
        id: 'chart_axes',
        type: 'chart',
        xPct: 10,
        yPct: 10,
        wPct: 50,
        hPct: 30,
        chartType: 'bar',
        title: 'Revenue',
        categoryAxisTitle: 'Quarter',
        valueAxisTitle: 'Revenue USD',
        showLegend: true,
        legendPosition: 'r',
        showDataLabels: true,
        showDataLabelValue: true,
        dataLabelPosition: 'outEnd',
        categoryAxisHidden: true,
        valueAxisHidden: false,
        showCategoryGridLines: false,
        showValueGridLines: true,
        categoryAxisLabelFormatCode: '@',
        categoryAxisLabelPosition: 'low',
        valueAxisLabelFormatCode: '$#,##0',
        valueAxisLabelPosition: 'high',
        categories: ['Q1', 'Q2'],
        series: [{ name: 'North', values: [10, 25], color: '#AA3377' }],
      }],
    }]);
    const buffer = await readBlobArrayBuffer(blob);
    const zip = await JSZip.loadAsync(buffer);
    const chartPath = Object.keys(zip.files).find((path) => /^ppt\/charts\/chart\d+\.xml$/.test(path));
    expect(chartPath).toBeTruthy();
    const chartXml = chartPath ? await zip.file(chartPath)?.async('string') : '';
    expect(chartXml).toContain('Revenue');
    expect(chartXml).toContain('Quarter');
    expect(chartXml).toContain('Revenue USD');
    expect(chartXml).toMatch(/<c:legendPos val="r"\/>/);
    expect(chartXml).toMatch(/<c:dLblPos val="outEnd"\/>/);
    expect(chartXml).toMatch(/<c:showVal val="1"\/>/);
    expect(chartXml).toMatch(/<c:delete val="1"\/>/);
    expect(chartXml).toContain('<c:majorGridlines>');
    expect(chartXml).toContain('formatCode="$#,##0"');
    expect(chartXml).toMatch(/<c:tickLblPos val="high"\/>/);
  });

  it('exports image alt text to PowerPoint picture metadata', async () => {
    const transparentPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=';
    const blob = await exportPptxBlob([{
      id: 'slide_image_alt',
      elements: [{
        id: 'image_alt',
        type: 'image',
        xPct: 10,
        yPct: 10,
        wPct: 20,
        hPct: 20,
        src: transparentPng,
        alt: 'Quarterly product screenshot',
      }],
    }]);
    const buffer = await readBlobArrayBuffer(blob);
    const zip = await JSZip.loadAsync(buffer);
    const slideXml = await zip.file('ppt/slides/slide1.xml')?.async('string');
    expect(slideXml).toContain('Quarterly product screenshot');
  });

  it('preserves safe text hyperlinks from PowerPoint relationships', async () => {
    const file = await makePptxFile(`
      <p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
             xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
             xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
        <p:cSld>
          <p:spTree>
            <p:sp>
              <p:spPr>
                <a:xfrm>
                  <a:off x="0" y="0"/>
                  <a:ext cx="3048000" cy="685800"/>
                </a:xfrm>
              </p:spPr>
              <p:txBody>
                <a:p>
                  <a:r>
                    <a:rPr>
                      <a:hlinkClick r:id="rIdLink"/>
                    </a:rPr>
                    <a:t>Open docs</a:t>
                  </a:r>
                </a:p>
              </p:txBody>
            </p:sp>
          </p:spTree>
        </p:cSld>
      </p:sld>
    `, undefined, `
      <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
        <Relationship Id="rIdLink"
          Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink"
          Target="https://example.com/docs?q=1"
          TargetMode="External"/>
      </Relationships>
    `);

    const [slide] = await importPptxFile(file);
    const text = slide.elements.find(isText);

    expect(text).toMatchObject({
      type: 'text',
      content: 'Open docs',
      hyperlink: 'https://example.com/docs?q=1',
    });
  });

  it('drops unsafe text hyperlinks during PowerPoint import', async () => {
    const file = await makePptxFile(`
      <p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
             xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
             xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
        <p:cSld>
          <p:spTree>
            <p:sp>
              <p:spPr>
                <a:xfrm>
                  <a:off x="0" y="0"/>
                  <a:ext cx="3048000" cy="685800"/>
                </a:xfrm>
              </p:spPr>
              <p:txBody>
                <a:p>
                  <a:r>
                    <a:rPr>
                      <a:hlinkClick r:id="rIdBad"/>
                    </a:rPr>
                    <a:t>Unsafe</a:t>
                  </a:r>
                </a:p>
              </p:txBody>
            </p:sp>
          </p:spTree>
        </p:cSld>
      </p:sld>
    `, undefined, `
      <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
        <Relationship Id="rIdBad"
          Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink"
          Target="javascript:alert(1)"
          TargetMode="External"/>
      </Relationships>
    `);

    const [slide] = await importPptxFile(file);
    const text = slide.elements.find(isText);

    expect(text?.content).toBe('Unsafe');
    expect(text?.hyperlink).toBeUndefined();
  });

  it('imports picture alt text and safe picture hyperlinks', async () => {
    const imageBytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
    const file = await makePptxFile(`
      <p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
             xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
             xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
        <p:cSld>
          <p:spTree>
            <p:pic>
              <p:nvPicPr>
                <p:cNvPr id="2" name="Linked picture" descr="Product screenshot">
                  <a:hlinkClick r:id="rIdLink"/>
                </p:cNvPr>
                <p:cNvPicPr/>
                <p:nvPr/>
              </p:nvPicPr>
              <p:spPr>
                <a:xfrm>
                  <a:off x="0" y="0"/>
                  <a:ext cx="3048000" cy="1714500"/>
                </a:xfrm>
              </p:spPr>
              <p:blipFill>
                <a:blip r:embed="rIdImage1"/>
              </p:blipFill>
            </p:pic>
            <p:pic>
              <p:nvPicPr>
                <p:cNvPr id="3" name="Unsafe picture" title="Fallback title">
                  <a:hlinkClick r:id="rIdBad"/>
                </p:cNvPr>
                <p:cNvPicPr/>
                <p:nvPr/>
              </p:nvPicPr>
              <p:spPr>
                <a:xfrm>
                  <a:off x="3048000" y="0"/>
                  <a:ext cx="3048000" cy="1714500"/>
                </a:xfrm>
              </p:spPr>
              <p:blipFill>
                <a:blip r:embed="rIdImage2"/>
              </p:blipFill>
            </p:pic>
          </p:spTree>
        </p:cSld>
      </p:sld>
    `, undefined, `
      <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
        <Relationship Id="rIdImage1"
          Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image"
          Target="../media/image1.png"/>
        <Relationship Id="rIdImage2"
          Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image"
          Target="/ppt/media/image2.png"/>
        <Relationship Id="rIdLink"
          Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink"
          Target="https://example.com/product"
          TargetMode="External"/>
        <Relationship Id="rIdBad"
          Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink"
          Target="javascript:alert(1)"
          TargetMode="External"/>
      </Relationships>
    `, {
      'ppt/media/image1.png': imageBytes,
      'ppt/media/image2.png': imageBytes,
    });

    const [slide] = await importPptxFile(file);
    const images = slide.elements.filter(isImage);

    expect(images[0]).toMatchObject({
      type: 'image',
      alt: 'Product screenshot',
      hyperlink: 'https://example.com/product',
    });
    expect(images[1]).toMatchObject({
      type: 'image',
      alt: 'Fallback title',
    });
    expect(images[1]?.hyperlink).toBeUndefined();
  });

  it('preserves embedded BMP pictures from PowerPoint media parts', async () => {
    const bmpBytes = new Uint8Array([0x42, 0x4d, 0x1a, 0x00, 0x00, 0x00]);
    const file = await makePptxFile(`
      <p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
             xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
             xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
        <p:cSld>
          <p:spTree>
            <p:pic>
              <p:spPr>
                <a:xfrm>
                  <a:off x="0" y="0"/>
                  <a:ext cx="1219200" cy="685800"/>
                </a:xfrm>
              </p:spPr>
              <p:blipFill><a:blip r:embed="rIdBmp"/></p:blipFill>
            </p:pic>
          </p:spTree>
        </p:cSld>
      </p:sld>
    `, undefined, `
      <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
        <Relationship Id="rIdBmp"
          Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image"
          Target="../media/picture1.bmp"/>
      </Relationships>
    `, {
      'ppt/media/picture1.bmp': bmpBytes,
    });

    const [slide] = await importPptxFile(file);
    const image = slide.elements.find(isImage);

    expect(image?.src).toBe(`data:image/bmp;base64,${uint8ArrayToBase64(bmpBytes)}`);
  });

  it('preserves externally linked PowerPoint images from safe r:link relationships', async () => {
    const file = await makePptxFile(`
      <p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
             xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
             xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
        <p:cSld>
          <p:spTree>
            <p:pic>
              <p:nvPicPr>
                <p:cNvPr id="2" name="Linked remote image" descr="Remote image"/>
                <p:cNvPicPr/>
                <p:nvPr/>
              </p:nvPicPr>
              <p:spPr>
                <a:xfrm>
                  <a:off x="0" y="0"/>
                  <a:ext cx="3048000" cy="1714500"/>
                </a:xfrm>
              </p:spPr>
              <p:blipFill>
                <a:blip r:link="rIdRemote"/>
              </p:blipFill>
            </p:pic>
          </p:spTree>
        </p:cSld>
      </p:sld>
    `, undefined, `
      <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
        <Relationship Id="rIdRemote"
          Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image"
          Target="https://cdn.example.com/image.png"
          TargetMode="External"/>
      </Relationships>
    `);

    const [slide] = await importPptxFile(file);
    const image = slide.elements.find(isImage);

    expect(image).toMatchObject({
      type: 'image',
      alt: 'Remote image',
      src: 'https://cdn.example.com/image.png',
    });
  });

  it('drops unsupported embedded SVG pictures instead of rendering unsafe data URLs', async () => {
    const svgBytes = '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>';
    const file = await makePptxFile(`
      <p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
             xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
             xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
        <p:cSld>
          <p:spTree>
            <p:pic>
              <p:nvPicPr>
                <p:cNvPr id="2" name="Unsafe svg"/>
                <p:cNvPicPr/>
                <p:nvPr/>
              </p:nvPicPr>
              <p:spPr>
                <a:xfrm>
                  <a:off x="0" y="0"/>
                  <a:ext cx="3048000" cy="1714500"/>
                </a:xfrm>
              </p:spPr>
              <p:blipFill>
                <a:blip r:embed="rIdSvg"/>
              </p:blipFill>
            </p:pic>
          </p:spTree>
        </p:cSld>
      </p:sld>
    `, undefined, `
      <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
        <Relationship Id="rIdSvg"
          Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image"
          Target="../media/unsafe.svg"/>
      </Relationships>
    `, {
      'ppt/media/unsafe.svg': svgBytes,
    });

    const [slide] = await importPptxFile(file);

    expect(slide.elements.some(isImage)).toBe(false);
  });

  it('drops unsupported embedded SVG slide backgrounds', async () => {
    const svgBytes = '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>';
    const file = await makePptxFile(`
      <p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
             xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
             xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
        <p:cSld>
          <p:bg>
            <p:bgPr>
              <a:blipFill>
                <a:blip r:embed="rIdSvgBg"/>
              </a:blipFill>
            </p:bgPr>
          </p:bg>
          <p:spTree/>
        </p:cSld>
      </p:sld>
    `, undefined, `
      <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
        <Relationship Id="rIdSvgBg"
          Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image"
          Target="../media/unsafe-bg.svg"/>
      </Relationships>
    `, {
      'ppt/media/unsafe-bg.svg': svgBytes,
    });

    const [slide] = await importPptxFile(file);

    expect(slide.backgroundImage).toBeUndefined();
  });

  it('falls back to safe linked PowerPoint images when embedded image data is missing', async () => {
    const file = await makePptxFile(`
      <p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
             xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
             xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
        <p:cSld>
          <p:spTree>
            <p:pic>
              <p:nvPicPr>
                <p:cNvPr id="2" name="Fallback linked image"/>
                <p:cNvPicPr/>
                <p:nvPr/>
              </p:nvPicPr>
              <p:spPr>
                <a:xfrm>
                  <a:off x="0" y="0"/>
                  <a:ext cx="3048000" cy="1714500"/>
                </a:xfrm>
              </p:spPr>
              <p:blipFill>
                <a:blip r:embed="rIdMissing" r:link="rIdRemote"/>
              </p:blipFill>
            </p:pic>
          </p:spTree>
        </p:cSld>
      </p:sld>
    `, undefined, `
      <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
        <Relationship Id="rIdMissing"
          Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image"
          Target="../media/missing.png"/>
        <Relationship Id="rIdRemote"
          Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image"
          Target="https://cdn.example.com/fallback.webp"
          TargetMode="External"/>
      </Relationships>
    `);

    const [slide] = await importPptxFile(file);
    const image = slide.elements.find(isImage);

    expect(image?.src).toBe('https://cdn.example.com/fallback.webp');
  });

  it('preserves PowerPoint picture crop rectangles on import', async () => {
    const imageBytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
    const file = await makePptxFile(`
      <p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
             xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
             xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
        <p:cSld>
          <p:spTree>
            <p:pic>
              <p:nvPicPr>
                <p:cNvPr id="2" name="Cropped picture"/>
                <p:cNvPicPr/>
                <p:nvPr/>
              </p:nvPicPr>
              <p:spPr>
                <a:xfrm>
                  <a:off x="0" y="0"/>
                  <a:ext cx="3048000" cy="1714500"/>
                </a:xfrm>
              </p:spPr>
              <p:blipFill>
                <a:blip r:embed="rIdImage1"/>
                <a:srcRect l="10000" t="5000" r="20000" b="0"/>
              </p:blipFill>
            </p:pic>
          </p:spTree>
        </p:cSld>
      </p:sld>
    `, undefined, `
      <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
        <Relationship Id="rIdImage1"
          Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image"
          Target="../media/image1.png"/>
      </Relationships>
    `, {
      'ppt/media/image1.png': imageBytes,
    });

    const [slide] = await importPptxFile(file);
    const image = slide.elements.find(isImage);

    expect(image?.crop).toEqual({
      leftPct: 10,
      topPct: 5,
      rightPct: 20,
    });
  });

  it('imports embedded images larger than 3MB without dropping them', async () => {
    const imageBytes = new Uint8Array((3 * 1024 * 1024) + 123);
    for (let i = 0; i < imageBytes.length; i += 1) imageBytes[i] = i % 251;

    const file = await makePptxFile(`
      <p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
             xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
             xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
        <p:cSld>
          <p:spTree>
            <p:pic>
              <p:spPr>
                <a:xfrm>
                  <a:off x="3048000" y="1714500"/>
                  <a:ext cx="3048000" cy="1714500"/>
                </a:xfrm>
              </p:spPr>
              <p:blipFill>
                <a:blip r:embed="rIdImage1"/>
              </p:blipFill>
            </p:pic>
          </p:spTree>
        </p:cSld>
      </p:sld>
    `, undefined, `
      <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
        <Relationship Id="rIdImage1"
          Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image"
          Target="../media/image1.png"/>
      </Relationships>
    `, {
      'ppt/media/image1.png': imageBytes,
    });

    const [slide] = await importPptxFile(file);
    const image = slide.elements.find(isImage);
    const expectedBase64 = uint8ArrayToBase64(imageBytes);

    expect(image).toBeTruthy();
    expect(image?.src.startsWith('data:image/png;base64,')).toBe(true);
    expect(image?.src.length).toBe('data:image/png;base64,'.length + expectedBase64.length);
    expect(image?.src.endsWith(expectedBase64.slice(-32))).toBe(true);
    expect(image?.xPct).toBeCloseTo(25);
    expect(image?.yPct).toBeCloseTo(25);
    expect(image?.wPct).toBeCloseTo(25);
    expect(image?.hPct).toBeCloseTo(25);
  });
});

describe('cloudSlide pptx export helpers', () => {
  it('converts large byte arrays to valid base64 across chunks', () => {
    const bytes = new Uint8Array(0x6000 + 7);
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = (i * 17) % 251;
    let binary = '';
    for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);

    expect(uint8ArrayToBase64(bytes)).toBe(btoa(binary));
  });

  it('uses path for remote images and data for embedded images', () => {
    expect(pptxImageSource('https://example.com/image.png')).toEqual({ path: 'https://example.com/image.png' });
    expect(pptxImageSource('data:image/png;base64,AAAA')).toEqual({ data: 'data:image/png;base64,AAAA' });
    expect(pptxImageSource('data:image/bmp;base64,Qk0=')).toEqual({ data: 'data:image/bmp;base64,Qk0=' });
  });

  it('rejects unsupported image sources before pptx export', () => {
    expect(pptxImageSource('javascript:alert(1)')).toBeNull();
    expect(pptxImageSource('data:text/html;base64,PHNjcmlwdA==')).toBeNull();
  });

  it('maps editor line-height to bounded PowerPoint line spacing multiples', () => {
    expect(pptxLineSpacingMultiple(undefined)).toBe(1.25);
    expect(pptxLineSpacingMultiple(1.75)).toBe(1.75);
    expect(pptxLineSpacingMultiple(0.1)).toBe(0.5);
    expect(pptxLineSpacingMultiple(9)).toBe(3);
  });

  it('exports only safe hyperlinks to pptxgen', () => {
    expect(pptxHyperlink(' https://example.com/deck ')).toEqual({
      url: 'https://example.com/deck',
      tooltip: 'https://example.com/deck',
    });
    expect(pptxHyperlink('javascript:alert(1)')).toBeUndefined();
  });

  it('patches cropped image source rectangles into generated slide xml', () => {
    const xml = `
      <p:sld><p:cSld><p:spTree>
        <p:pic><p:blipFill><a:blip r:embed="rId1"/><a:stretch><a:fillRect/></a:stretch></p:blipFill></p:pic>
        <p:pic><p:blipFill><a:blip r:embed="rId2"/><a:srcRect l="0" t="0" r="0" b="0"/><a:stretch/></p:blipFill></p:pic>
      </p:spTree></p:cSld></p:sld>
    `;

    const patched = patchSlideImageCropsXml(xml, [
      { l: 10000, t: 5000, r: 20000, b: 0 },
      undefined,
    ]);

    expect(patched).toContain('<a:srcRect l="10000" t="5000" r="20000" b="0"/><a:stretch><a:fillRect/></a:stretch>');
    expect(patched).toContain('<a:srcRect l="0" t="0" r="0" b="0"/>');
  });

  it('patches PowerPoint transition metadata into slide xml', () => {
    const xml = `
      <p:sld><p:cSld><p:spTree /></p:cSld><p:clrMapOvr /></p:sld>
    `;

    const patched = patchSlideTransitionXml(xml, {
      type: 'wipe',
      direction: 'right',
      durationMs: 500,
      advanceOnClick: true,
      advanceAfterMs: 3000,
    });

    expect(patched).toContain('<p:transition spd="fast" advClick="1" advTm="3000"><p:wipe dir="r"/></p:transition>');
    expect(patched.indexOf('</p:cSld>')).toBeLessThan(patched.indexOf('<p:transition'));
  });

  it('patches hidden PowerPoint slide metadata into slide xml', () => {
    const xml = `
      <p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" show="1">
        <p:cSld><p:spTree /></p:cSld>
      </p:sld>
    `;

    const hidden = patchSlideHiddenXml(xml, true);
    const visible = patchSlideHiddenXml(hidden, false);

    expect(hidden).toContain('<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" show="0">');
    expect(visible).toContain('<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">');
    expect(visible).not.toContain('show="0"');
  });

  it('patches internal slide links into PowerPoint relationships and slide xml', () => {
    const relsXml = `
      <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
        <Relationship Id="rId1"
          Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink"
          Target="#slide=2"
          TargetMode="External"/>
        <Relationship Id="rId2"
          Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink"
          Target="https://example.com"
          TargetMode="External"/>
      </Relationships>
    `;
    const slideXml = `
      <p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
             xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
             xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
        <p:cSld><p:spTree>
          <p:sp><p:nvSpPr><p:cNvPr id="2"><a:hlinkClick r:id="rId1"/></p:cNvPr></p:nvSpPr></p:sp>
          <p:sp><p:nvSpPr><p:cNvPr id="3"><a:hlinkClick r:id="rId2"/></p:cNvPr></p:nvSpPr></p:sp>
        </p:spTree></p:cSld>
      </p:sld>
    `;

    const patchedRels = patchSlideInternalLinkRelsXml(relsXml, 3);
    const patchedSlide = patchSlideInternalLinksXml(slideXml, patchedRels.relIds);

    expect(patchedRels.xml).toContain('Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide"');
    expect(patchedRels.xml).toContain('Target="../slides/slide2.xml"');
    expect(patchedRels.xml).not.toContain('Target="#slide=2"');
    expect(patchedRels.xml).not.toContain('TargetMode="External"/>\n        <Relationship Id="rId1"');
    expect(patchedSlide).toContain('<a:hlinkClick r:id="rId1" action="ppaction://hlinksldjump"/>');
    expect(patchedSlide).toContain('<a:hlinkClick r:id="rId2"/>');
  });

  it('maps editor list metadata to pptx bullet options', () => {
    expect(pptxBulletOptions('bullet')).toEqual({ type: 'bullet' });
    expect(pptxBulletOptions('number', 3)).toEqual({ type: 'number', numberStartAt: 3 });
    expect(pptxBulletOptions(undefined)).toBeUndefined();
  });
});
