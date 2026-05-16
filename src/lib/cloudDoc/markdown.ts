/**
 * 문서 ↔ Markdown 호환.
 *
 * Import: .md / .txt 파일 → 텍스트 → TipTap setContent (TipTap 이 markdown 단축어 인식)
 * Export: TipTap markdown storage (tiptap-markdown extension) → .md 파일 다운로드
 *
 * 사용:
 *   const md = await readMarkdownFile(file);
 *   editor.commands.setContent(md);  // tiptap-markdown extension 이 markdown 인식
 *
 *   exportMarkdownFile(editor.storage.markdown.getMarkdown(), fileName);
 */

export async function readMarkdownFile(file: File): Promise<string> {
  return await file.text();
}

export function exportMarkdownFile(md: string, fileName: string): void {
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName.endsWith('.md') ? fileName : `${fileName}.md`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
