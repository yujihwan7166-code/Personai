/**
 * 라이브 프리뷰용 블록 분리·결합.
 *
 * 규칙:
 * - 빈 줄(연속 \n) 이 블록 경계
 * - 코드블록(```) pair 안의 빈 줄은 무시
 * - 헤딩(#)·구분선(---) 줄도 단독 블록 권장 (앞뒤 빈 줄 없어도 분리)
 *
 * 블록 단위로 클릭→편집을 가능케 하고, 저장 시 다시 join 한다.
 */

export interface Block {
  index: number;
  content: string;  // 블록 본문 (앞뒤 공백·빈줄 trim 됨)
}

export function splitIntoBlocks(body: string): Block[] {
  if (!body.trim()) return [];

  const lines = body.split('\n');
  const blocks: string[] = [];
  let buf: string[] = [];
  let inCode = false;

  const flush = () => {
    if (buf.length > 0) {
      const text = buf.join('\n').trim();
      if (text) blocks.push(text);
      buf = [];
    }
  };

  for (const raw of lines) {
    const line = raw;
    const trim = line.trim();

    // 코드블록 fence 토글
    if (/^```/.test(trim)) {
      // 시작 fence면 직전 블록 flush, 끝 fence면 이 줄까지 블록에 포함하고 flush
      if (!inCode) {
        flush();
        buf.push(line);
        inCode = true;
        continue;
      } else {
        buf.push(line);
        inCode = false;
        flush();
        continue;
      }
    }

    if (inCode) {
      buf.push(line);
      continue;
    }

    // 일반 모드: 빈 줄 = 블록 경계
    if (trim === '') {
      flush();
      continue;
    }

    // 헤딩·구분선은 단독 블록
    if (/^#{1,6}\s/.test(trim) || /^---+\s*$/.test(trim) || /^---\s*$/.test(trim)) {
      flush();
      buf.push(line);
      flush();
      continue;
    }

    buf.push(line);
  }
  flush();

  return blocks.map((content, index) => ({ index, content }));
}

export function joinBlocks(blocks: Block[]): string {
  return blocks.map((b) => b.content).join('\n\n');
}

/** 블록 한 개 변경 → 새 body 반환. 빈 content 면 블록 자체 제거. */
export function replaceBlock(body: string, index: number, newContent: string): string {
  const blocks = splitIntoBlocks(body);
  const trimmed = newContent.trim();
  if (trimmed === '') {
    const next = blocks.filter((b, i) => i !== index);
    return joinBlocks(next.map((b, i) => ({ ...b, index: i })));
  }
  const next = blocks.map((b, i) => (i === index ? { ...b, content: newContent } : b));
  return joinBlocks(next);
}

/** 특정 블록 뒤에 새 블록 삽입. */
export function insertBlockAfter(body: string, afterIndex: number, content: string): string {
  const blocks = splitIntoBlocks(body);
  const before = blocks.slice(0, afterIndex + 1);
  const after = blocks.slice(afterIndex + 1);
  const inserted: Block = { index: afterIndex + 1, content };
  return joinBlocks([...before, inserted, ...after]);
}
