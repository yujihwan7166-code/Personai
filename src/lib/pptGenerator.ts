import PptxGenJS from 'pptxgenjs';

// ── 테마 ──
export interface PptTheme {
  name: string;
  primary: string;
  secondary: string;
  bg: string;
  text: string;
  accent: string;
}

export const PPT_THEMES: Record<string, PptTheme> = {
  blue: { name: '블루', primary: '#2563EB', secondary: '#3B82F6', bg: '#F8FAFC', text: '#1E293B', accent: '#DBEAFE' },
  dark: { name: '다크', primary: '#6366F1', secondary: '#818CF8', bg: '#0F172A', text: '#F8FAFC', accent: '#1E1B4B' },
  green: { name: '그린', primary: '#059669', secondary: '#10B981', bg: '#F0FDF4', text: '#1E293B', accent: '#D1FAE5' },
  warm: { name: '웜', primary: '#D97706', secondary: '#F59E0B', bg: '#FFFBEB', text: '#1C1917', accent: '#FEF3C7' },
  minimal: { name: '미니멀', primary: '#374151', secondary: '#6B7280', bg: '#FFFFFF', text: '#111827', accent: '#F3F4F6' },
};

// ── 슬라이드 타입 ──
export interface SlideTitle { layout: 'title'; title: string; subtitle?: string; }
export interface SlideBullets { layout: 'bullets'; title: string; items: string[]; }
export interface SlideTwoColumn { layout: 'twoColumn'; title: string; left: { heading: string; items: string[] }; right: { heading: string; items: string[] }; }
export interface SlideQuote { layout: 'quote'; quote: string; author?: string; }
export interface SlideEnding { layout: 'ending'; title: string; items?: string[]; }

export type SlideData = SlideTitle | SlideBullets | SlideTwoColumn | SlideQuote | SlideEnding;

export interface PptData {
  theme?: string;
  slides: SlideData[];
}

// ── PPT 생성 ──
export function generatePpt(data: PptData, filename?: string) {
  const theme = PPT_THEMES[data.theme || 'blue'] || PPT_THEMES.blue;
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = 'Personai';

  // 마스터 슬라이드 정의
  pptx.defineSlideMaster({
    title: 'MASTER',
    background: { fill: theme.bg },
    objects: [
      // 하단 라인
      { rect: { x: 0, y: '95%', w: '100%', h: '5%', fill: { color: theme.primary } } },
    ],
  });

  for (const slide of data.slides) {
    const s = pptx.addSlide({ masterName: 'MASTER' });

    switch (slide.layout) {
      case 'title': {
        s.background = { fill: theme.primary };
        s.addText(slide.title, {
          x: 0.8, y: 1.5, w: 11.5, h: 2,
          fontSize: 36, fontFace: 'Pretendard, Arial',
          color: '#FFFFFF', bold: true, align: 'left',
        });
        if (slide.subtitle) {
          s.addText(slide.subtitle, {
            x: 0.8, y: 3.5, w: 11.5, h: 1,
            fontSize: 18, fontFace: 'Pretendard, Arial',
            color: '#FFFFFF', alpha: 80, align: 'left',
          });
        }
        // 날짜
        s.addText(new Date().toLocaleDateString('ko-KR'), {
          x: 0.8, y: 5.5, w: 5, h: 0.5,
          fontSize: 12, fontFace: 'Pretendard, Arial',
          color: '#FFFFFF', alpha: 60,
        });
        break;
      }

      case 'bullets': {
        // 제목
        s.addText(slide.title, {
          x: 0.8, y: 0.4, w: 11.5, h: 0.8,
          fontSize: 24, fontFace: 'Pretendard, Arial',
          color: theme.primary, bold: true,
        });
        // 구분선
        s.addShape(pptx.ShapeType.rect, {
          x: 0.8, y: 1.2, w: 2, h: 0.05, fill: { color: theme.primary },
        });
        // 불릿
        const bulletItems = slide.items.map(item => ({
          text: item,
          options: { fontSize: 16, fontFace: 'Pretendard, Arial', color: theme.text, bullet: { type: 'bullet' as const, code: '25CF' }, indentLevel: 0, paraSpaceAfter: 8 },
        }));
        s.addText(bulletItems, {
          x: 0.8, y: 1.5, w: 11.5, h: 5,
          valign: 'top',
        });
        break;
      }

      case 'twoColumn': {
        // 제목
        s.addText(slide.title, {
          x: 0.8, y: 0.4, w: 11.5, h: 0.8,
          fontSize: 24, fontFace: 'Pretendard, Arial',
          color: theme.primary, bold: true,
        });
        s.addShape(pptx.ShapeType.rect, {
          x: 0.8, y: 1.2, w: 2, h: 0.05, fill: { color: theme.primary },
        });
        // 왼쪽
        s.addShape(pptx.ShapeType.rect, {
          x: 0.6, y: 1.5, w: 5.8, h: 5, fill: { color: theme.accent }, rectRadius: 0.1,
        });
        s.addText(slide.left.heading, {
          x: 0.8, y: 1.6, w: 5.4, h: 0.6,
          fontSize: 16, fontFace: 'Pretendard, Arial',
          color: theme.primary, bold: true,
        });
        const leftItems = slide.left.items.map(item => ({
          text: item,
          options: { fontSize: 14, fontFace: 'Pretendard, Arial', color: theme.text, bullet: { type: 'bullet' as const, code: '2022' }, paraSpaceAfter: 6 },
        }));
        s.addText(leftItems, { x: 0.8, y: 2.2, w: 5.4, h: 4, valign: 'top' });

        // 오른쪽
        s.addShape(pptx.ShapeType.rect, {
          x: 6.7, y: 1.5, w: 5.8, h: 5, fill: { color: theme.accent }, rectRadius: 0.1,
        });
        s.addText(slide.right.heading, {
          x: 6.9, y: 1.6, w: 5.4, h: 0.6,
          fontSize: 16, fontFace: 'Pretendard, Arial',
          color: theme.primary, bold: true,
        });
        const rightItems = slide.right.items.map(item => ({
          text: item,
          options: { fontSize: 14, fontFace: 'Pretendard, Arial', color: theme.text, bullet: { type: 'bullet' as const, code: '2022' }, paraSpaceAfter: 6 },
        }));
        s.addText(rightItems, { x: 6.9, y: 2.2, w: 5.4, h: 4, valign: 'top' });
        break;
      }

      case 'quote': {
        s.background = { fill: theme.accent };
        s.addText(`"${slide.quote}"`, {
          x: 1.5, y: 1.5, w: 10, h: 3,
          fontSize: 24, fontFace: 'Pretendard, Arial',
          color: theme.text, italic: true, align: 'center', valign: 'middle',
        });
        if (slide.author) {
          s.addText(`— ${slide.author}`, {
            x: 1.5, y: 4.5, w: 10, h: 0.8,
            fontSize: 16, fontFace: 'Pretendard, Arial',
            color: theme.secondary, align: 'center',
          });
        }
        break;
      }

      case 'ending': {
        s.background = { fill: theme.primary };
        s.addText(slide.title, {
          x: 0.8, y: 2, w: 11.5, h: 1.5,
          fontSize: 32, fontFace: 'Pretendard, Arial',
          color: '#FFFFFF', bold: true, align: 'center', valign: 'middle',
        });
        if (slide.items && slide.items.length > 0) {
          const endItems = slide.items.map(item => ({
            text: item,
            options: { fontSize: 14, fontFace: 'Pretendard, Arial', color: '#FFFFFF', alpha: 80, align: 'center' as const, paraSpaceAfter: 4 },
          }));
          s.addText(endItems, { x: 2, y: 3.8, w: 9, h: 2.5, valign: 'top' });
        }
        // Personai 로고
        s.addText('Made with Personai', {
          x: 0, y: 6.5, w: 13.33, h: 0.5,
          fontSize: 10, fontFace: 'Pretendard, Arial',
          color: '#FFFFFF', alpha: 40, align: 'center',
        });
        break;
      }
    }
  }

  pptx.writeFile({ fileName: filename || 'presentation.pptx' });
}

// ── AI 응답 파싱 ──
export function parsePptJson(text: string): PptData | null {
  try {
    // JSON 블록 추출
    const jsonMatch = text.match(/```json\s*([\s\S]*?)```/) || text.match(/\{[\s\S]*"slides"[\s\S]*\}/);
    if (!jsonMatch) return null;
    const jsonStr = jsonMatch[1] || jsonMatch[0];
    const data = JSON.parse(jsonStr);
    if (data.slides && Array.isArray(data.slides)) return data as PptData;
    return null;
  } catch {
    return null;
  }
}

// ── PPT 생성 프롬프트 ──
export const PPT_SYSTEM_PROMPT = `당신은 프레젠테이션 전문가입니다. 사용자의 요청을 바탕으로 PPT 슬라이드를 설계하세요.

반드시 아래 JSON 형식만 출력하세요. 마크다운이나 설명 없이 JSON만 출력하세요.

\`\`\`json
{
  "theme": "blue",
  "slides": [
    { "layout": "title", "title": "제목", "subtitle": "부제목" },
    { "layout": "bullets", "title": "섹션 제목", "items": ["항목1", "항목2", "항목3"] },
    { "layout": "twoColumn", "title": "비교", "left": { "heading": "왼쪽", "items": ["항목1"] }, "right": { "heading": "오른쪽", "items": ["항목1"] } },
    { "layout": "quote", "quote": "인용문", "author": "출처" },
    { "layout": "ending", "title": "감사합니다", "items": ["요약1", "요약2"] }
  ]
}
\`\`\`

## 규칙
- theme: "blue" | "dark" | "green" | "warm" | "minimal" 중 선택
- 슬라이드 첫 장은 반드시 title 레이아웃
- 마지막 장은 반드시 ending 레이아웃
- bullets의 items는 3~6개가 적당
- 내용은 한국어로, 핵심만 간결하게
- 총 슬라이드 수는 사용자 요청에 맞추되 기본 8~12장
`;
