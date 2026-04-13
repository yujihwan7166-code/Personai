import { describe, expect, it } from 'vitest';
import { buildAttachmentPrompt, extractDocxTextFromXml, validateFile, type AttachedFile } from '@/lib/fileProcessor';

describe('fileProcessor', () => {
  it('builds a sensible default prompt for a single PDF', () => {
    expect(
      buildAttachmentPrompt([{ name: 'report.pdf', mimeType: 'application/pdf' }])
    ).toBe('이 PDF를 읽고 핵심 내용을 요약해줘.');
  });

  it('accepts supported files even when the browser leaves mimeType empty', () => {
    const file = new File(['image'], 'photo.jpg', { type: '' });

    expect(validateFile(file, [])).toBeNull();
  });

  it('rejects duplicate attachments with the same name and size', () => {
    const file = new File(['duplicate'], 'photo.jpg', { type: 'image/jpeg' });
    const existingFiles: AttachedFile[] = [
      {
        id: 'file-1',
        name: 'photo.jpg',
        mimeType: 'image/jpeg',
        size: file.size,
        base64: 'ZmFrZQ==',
      },
    ];

    expect(validateFile(file, existingFiles)).toBe('같은 파일이 이미 첨부되어 있어요.');
  });

  it('extracts paragraph text from docx xml', () => {
    const xml = `
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:body>
          <w:p><w:r><w:t>첫 번째 문장</w:t></w:r></w:p>
          <w:p>
            <w:r><w:t>둘째</w:t></w:r>
            <w:r><w:tab /></w:r>
            <w:r><w:t>문단</w:t></w:r>
          </w:p>
        </w:body>
      </w:document>
    `;

    expect(extractDocxTextFromXml(xml)).toBe('첫 번째 문장\n둘째\t문단');
  });
});
