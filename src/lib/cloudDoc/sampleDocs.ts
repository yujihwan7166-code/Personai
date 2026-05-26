export function createDocCompatibilitySampleJson() {
  return {
    type: 'doc',
    content: [
      {
        type: 'heading',
        attrs: { level: 1, lineHeight: 1.2, spaceAfter: 12 },
        content: [{ type: 'text', text: '문서 호환성 샘플' }],
      },
      {
        type: 'paragraph',
        attrs: { lineHeight: 1.5, spaceAfter: 8, indent: 1 },
        content: [
          {
            type: 'text',
            text: '한글과 English가 섞인 문단입니다.',
            marks: [{ type: 'textStyle', attrs: { fontFamily: '"Malgun Gothic", sans-serif', fontSize: '16px' } }],
          },
        ],
      },
      {
        type: 'paragraph',
        attrs: {
          lineHeight: 1.15,
          firstLineIndent: 32,
          rightIndent: 24,
          tabStops: [
            { type: 'left', positionTwips: 1440 },
            { type: 'right', positionTwips: 8640, leader: 'dot' },
          ],
        },
        content: [
          { type: 'text', text: '문단 속성\t탭 정지와 들여쓰기 확인' },
        ],
      },
      {
        type: 'table',
        attrs: {
          tableWidth: 520,
          tableWidthType: 'px',
          tableColumnWidths: [140, 180, 200],
          tableLayout: 'fixed',
          tableAlign: 'center',
        },
        content: [
          {
            type: 'tableRow',
            attrs: { rowHeader: true },
            content: [
              sampleCell('항목', { backgroundColor: '#E8F0FE', colwidth: [140] }, 'tableHeader'),
              sampleCell('상태', { backgroundColor: '#E8F0FE', colwidth: [180] }, 'tableHeader'),
              sampleCell('비고', { backgroundColor: '#E8F0FE', colwidth: [200] }, 'tableHeader'),
            ],
          },
          {
            type: 'tableRow',
            content: [
              sampleCell('병합 셀', { rowspan: 2, backgroundColor: '#FFF2CC', verticalAlign: 'center', colwidth: [140] }),
              sampleCell('진행 중', { backgroundColor: '#E2F0D9', colwidth: [180] }),
              sampleCell('테두리/배경 확인', { borderColor: '#C00000', borderSize: 12, colwidth: [200] }),
            ],
          },
          {
            type: 'tableRow',
            content: [
              sampleCell('완료', { colwidth: [180] }),
              sampleCell('세로 병합 continuation 확인', { colwidth: [200] }),
            ],
          },
        ],
      },
      {
        type: 'paragraph',
        attrs: { spaceBefore: 12, lineHeight: 1.15 },
        content: [
          { type: 'text', text: '표, 글꼴, 문단 속성, DOCX 내보내기를 반복 검증하기 위한 내장 샘플입니다.' },
          { type: 'footnote', attrs: { id: 'sample-footnote', text: '각주 export 확인용 샘플입니다.' } },
        ],
      },
    ],
  };
}

function sampleCell(text: string, attrs: Record<string, unknown>, type = 'tableCell') {
  return {
    type,
    attrs: {
      colspan: 1,
      rowspan: 1,
      paddingTop: 6,
      paddingRight: 8,
      paddingBottom: 6,
      paddingLeft: 8,
      ...attrs,
    },
    content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
  };
}
