/**
 * 이력서 서식 템플릿 — 커리어 보드 데이터를 A4 이력서로 렌더.
 * 흰 종이·검정 잉크 고정(테마 무관, html2canvas→PDF 안전하도록 전부 인라인 스타일).
 * 각 템플릿은 같은 데이터를 다른 레이아웃으로 그린다. RESUME_TEMPLATES 로 등록.
 */
import type { CareerProfile, SpecCategory, SpecItem } from '@/types/career';

export interface ResumeProps {
  profile: CareerProfile;
  sections: Array<{ category: SpecCategory; items: SpecItem[] }>;
}

/** A4 @96dpi 시트 기본. */
const SHEET_W = 794;
const SHEET_H = 1123;
const BASE_FONT = "'Pretendard Variable', Pretendard, -apple-system, sans-serif";

const monthOf = (d: string) => d.slice(0, 7).replace('-', '.');
function periodLabel(i: SpecItem): string {
  const start = monthOf(i.date);
  if (i.ongoing) return `${start}–현재`;
  if (i.endDate) {
    const end = monthOf(i.endDate);
    return end === start ? start : `${start}–${end}`;
  }
  return start;
}
const contactList = (p: CareerProfile) => [p.email, p.phone].filter((v): v is string => !!v && v.trim().length > 0);

/* ─────────── 미니멀 — 단정한 1단, 빨강 섹션 제목 ─────────── */
export function ResumeMinimal({ profile, sections }: ResumeProps) {
  const contact = contactList(profile).join('   ·   ');
  return (
    <div style={{ width: SHEET_W, minHeight: SHEET_H, background: '#ffffff', color: '#1a1a1a', fontFamily: BASE_FONT, padding: 56 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24, borderBottom: '2px solid #1a1a1a', paddingBottom: 16 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 30, fontWeight: 800, lineHeight: 1.15 }}>{profile.name || '이름'}</div>
          {profile.tagline && <div style={{ marginTop: 7, fontSize: 13.5, color: '#4a4a4a' }}>{profile.tagline}</div>}
          {contact && <div style={{ marginTop: 7, fontSize: 12, color: '#666' }}>{contact}</div>}
        </div>
        {profile.photo && (
          <img src={profile.photo} alt="" style={{ width: 84, height: 108, objectFit: 'cover', borderRadius: 4, border: '1px solid #ddd' }} />
        )}
      </div>
      {sections.map(({ category, items }) => (
        <section key={category.id} style={{ marginTop: 22 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: '0.06em', color: '#b23b1e' }}>{category.name}</div>
          <div style={{ borderTop: '1px solid #dcdcdc', marginTop: 5 }} />
          {items.map((item) => (
            <div key={item.id} className="resume-item" style={{ display: 'flex', justifyContent: 'space-between', gap: 18, marginTop: 11 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.4 }}>{item.refined}</div>
                {item.org && <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>{item.org}</div>}
                {item.detail && <div style={{ fontSize: 11.5, color: '#666', marginTop: 3, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{item.detail}</div>}
              </div>
              <div style={{ flexShrink: 0, fontSize: 11.5, color: '#666', paddingTop: 1 }}>{periodLabel(item)}</div>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}

/* ─────────── 모던 — 좌측 사이드바(사진·연락처) + 우측 본문 2단 ─────────── */
export function ResumeModern({ profile, sections }: ResumeProps) {
  const contact = contactList(profile);
  return (
    <div style={{ width: SHEET_W, minHeight: SHEET_H, background: '#ffffff', color: '#1a1a1a', fontFamily: BASE_FONT, display: 'flex' }}>
      <aside style={{ width: 244, background: '#f5ece7', padding: '48px 26px', boxSizing: 'border-box' }}>
        {profile.photo && (
          <img src={profile.photo} alt="" style={{ width: 118, height: 148, objectFit: 'cover', borderRadius: 8, marginBottom: 22, display: 'block' }} />
        )}
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', color: '#b23b1e' }}>CONTACT</div>
        {contact.length ? contact.map((c, i) => (
          <div key={i} style={{ fontSize: 11.5, marginTop: 7, color: '#4a4a4a', wordBreak: 'break-all' }}>{c}</div>
        )) : (
          <div style={{ fontSize: 11, marginTop: 7, color: '#aaa' }}>연락처를 채워보세요</div>
        )}
        {profile.tagline && (
          <div style={{ marginTop: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', color: '#b23b1e' }}>ABOUT</div>
            <div style={{ marginTop: 7, fontSize: 11.5, lineHeight: 1.65, color: '#555', whiteSpace: 'pre-wrap' }}>{profile.tagline}</div>
          </div>
        )}
      </aside>
      <main style={{ flex: 1, minWidth: 0, padding: '48px 40px', boxSizing: 'border-box' }}>
        <div style={{ fontSize: 32, fontWeight: 800, lineHeight: 1.1 }}>{profile.name || '이름'}</div>
        <div style={{ height: 3, width: 48, background: '#b23b1e', marginTop: 12, borderRadius: 2 }} />
        {sections.map(({ category, items }) => (
          <section key={category.id} style={{ marginTop: 24 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#1a1a1a', letterSpacing: '0.02em' }}>{category.name}</div>
            {items.map((item) => (
              <div key={item.id} className="resume-item" style={{ marginTop: 12, paddingLeft: 12, borderLeft: '2px solid #e7d7cf' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.4 }}>{item.refined}</div>
                  <div style={{ fontSize: 11, color: '#999', flexShrink: 0, paddingTop: 1 }}>{periodLabel(item)}</div>
                </div>
                {item.org && <div style={{ fontSize: 11.5, color: '#666', marginTop: 1 }}>{item.org}</div>}
                {item.detail && <div style={{ fontSize: 11, color: '#777', marginTop: 3, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{item.detail}</div>}
              </div>
            ))}
          </section>
        ))}
      </main>
    </div>
  );
}

/* ─────────── 클래식 — 격식체, 가운데 이름, 세리프, 가로 괘선 ─────────── */
export function ResumeClassic({ profile, sections }: ResumeProps) {
  const contact = contactList(profile).join('    |    ');
  const serif = "'Noto Serif KR', 'Pretendard Variable', serif";
  return (
    <div style={{ width: SHEET_W, minHeight: SHEET_H, background: '#ffffff', color: '#222', fontFamily: serif, padding: 60 }}>
      <div style={{ textAlign: 'center', paddingBottom: 16, borderBottom: '3px double #333' }}>
        <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: '0.08em' }}>{profile.name || '이름'}</div>
        {profile.tagline && <div style={{ marginTop: 8, fontSize: 13, color: '#555' }}>{profile.tagline}</div>}
        {contact && <div style={{ marginTop: 8, fontSize: 11.5, color: '#666', letterSpacing: '0.02em' }}>{contact}</div>}
      </div>
      {sections.map(({ category, items }) => (
        <section key={category.id} style={{ marginTop: 24 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, textAlign: 'center', letterSpacing: '0.14em', color: '#333' }}>{category.name}</div>
          <div style={{ borderTop: '1px solid #bbb', margin: '6px 0 4px' }} />
          {items.map((item) => (
            <div key={item.id} className="resume-item" style={{ display: 'flex', justifyContent: 'space-between', gap: 18, marginTop: 10 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{item.refined}</div>
                {item.org && <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>{item.org}</div>}
                {item.detail && <div style={{ fontSize: 11.5, color: '#666', marginTop: 3, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{item.detail}</div>}
              </div>
              <div style={{ flexShrink: 0, fontSize: 12, color: '#666', fontStyle: 'italic', paddingTop: 1 }}>{periodLabel(item)}</div>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}

/* ─────────── 리포트 — 회색 헤더 밴드 + 좌측 이중언어 라벨 + 우측 표 행 (레퍼런스 1) ─────────── */
function LabelCol({ ko, en }: { ko: string; en?: string }) {
  return (
    <div style={{ width: 150, flexShrink: 0, paddingRight: 16 }}>
      <div style={{ fontSize: 14, fontWeight: 800 }}>{ko}</div>
      {en && <div style={{ fontSize: 9.5, letterSpacing: '0.04em', color: '#aaa', marginTop: 2 }}>{en}</div>}
    </div>
  );
}

export function ResumeReport({ profile, sections }: ResumeProps) {
  const lines = (profile.tagline || '').split('\n').map((l) => l.trim()).filter(Boolean);
  const quote = lines[0] || profile.name || '이름';
  const desc = lines.slice(1).join('  ');
  const info: Array<[string, string | undefined]> = [['이름', profile.name], ['메일', profile.email], ['연락처', profile.phone]];
  return (
    <div style={{ width: SHEET_W, minHeight: SHEET_H, background: '#ffffff', color: '#232323', fontFamily: BASE_FONT }}>
      <div style={{ display: 'flex', gap: 26, alignItems: 'center', background: '#f1f0ee', padding: '38px 48px' }}>
        {profile.photo
          ? <img src={profile.photo} alt="" style={{ width: 104, height: 128, objectFit: 'cover', flexShrink: 0 }} />
          : <div style={{ width: 104, height: 128, background: '#d9d7d3', flexShrink: 0 }} />}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 21, fontWeight: 800, lineHeight: 1.35 }}>“{quote}”</div>
          {desc && <div style={{ marginTop: 10, fontSize: 12.5, color: '#555', lineHeight: 1.7 }}>{desc}</div>}
        </div>
      </div>
      <div style={{ padding: '30px 48px' }}>
        <div style={{ display: 'flex', marginBottom: 26 }}>
          <LabelCol ko="기본정보" en="PERSONAL INFORMATION" />
          <div style={{ flex: 1, minWidth: 0 }}>
            {info.filter(([, v]) => !!v).map(([k, v], i) => (
              <div key={k} style={{ display: 'flex', fontSize: 12.5, padding: '7px 0', borderTop: i === 0 ? 'none' : '1px solid #ececec' }}>
                <div style={{ width: 96, color: '#8a8a8a' }}>{k}</div>
                <div>{v}</div>
              </div>
            ))}
          </div>
        </div>
        {sections.map(({ category, items }) => (
          <div key={category.id} style={{ display: 'flex', marginBottom: 24 }}>
            <LabelCol ko={category.name} />
            <div style={{ flex: 1, minWidth: 0 }}>
              {items.map((item, i) => (
                <div key={item.id} className="resume-item" style={{ display: 'flex', justifyContent: 'space-between', gap: 14, padding: '8px 0', borderTop: i === 0 ? 'none' : '1px solid #ececec' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{item.refined}</div>
                    {item.org && <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{item.org}</div>}
                    {item.detail && <div style={{ fontSize: 11, color: '#999', marginTop: 2, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{item.detail}</div>}
                  </div>
                  <div style={{ fontSize: 11, color: '#999', flexShrink: 0, paddingTop: 1 }}>{periodLabel(item)}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────── 헤드라인 — 큰 이름 + 요약 불릿 + 굵은 밑줄 섹션 (레퍼런스 2) ─────────── */
export function ResumeHeadline({ profile, sections }: ResumeProps) {
  const bullets = (profile.tagline || '').split('\n').map((l) => l.trim()).filter(Boolean);
  const contact = contactList(profile);
  return (
    <div style={{ width: SHEET_W, minHeight: SHEET_H, background: '#ffffff', color: '#1c1c1c', fontFamily: BASE_FONT, padding: '52px 56px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 24, paddingBottom: 22, borderBottom: '2px solid #1c1c1c' }}>
        {profile.photo && <img src={profile.photo} alt="" style={{ width: 94, height: 118, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: '0.02em', lineHeight: 1.1 }}>{profile.name || '이름'}</div>
          {contact.length > 0 && <div style={{ marginTop: 9, fontSize: 12, color: '#555' }}>{contact.join('   ·   ')}</div>}
        </div>
      </div>
      {bullets.length > 0 && (
        <ul style={{ margin: '18px 0 0', padding: 0, listStyle: 'none' }}>
          {bullets.map((b, i) => (
            <li key={i} style={{ position: 'relative', paddingLeft: 15, marginTop: 6, fontSize: 12.5, lineHeight: 1.6, color: '#333' }}>
              <span style={{ position: 'absolute', left: 0, fontWeight: 700 }}>·</span>{b}
            </li>
          ))}
        </ul>
      )}
      {sections.map(({ category, items }) => (
        <section key={category.id} style={{ marginTop: 26 }}>
          <div style={{ fontSize: 14, fontWeight: 800, paddingBottom: 5, borderBottom: '1.5px solid #333' }}>{category.name}</div>
          {items.map((item) => (
            <div key={item.id} className="resume-item" style={{ marginTop: 11 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>
                  {item.refined}{item.org && <span style={{ fontWeight: 400, color: '#777' }}> · {item.org}</span>}
                </div>
                <div style={{ fontSize: 11.5, color: '#888', flexShrink: 0, paddingTop: 1 }}>{periodLabel(item)}</div>
              </div>
              {item.detail && <div style={{ fontSize: 11, color: '#888', marginTop: 3, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{item.detail}</div>}
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}

/* ─────────── 콤팩트 — 연락처 강조 + 날짜 좌측 거터 3열 (레퍼런스 3·5) ─────────── */
export function ResumeCompact({ profile, sections }: ResumeProps) {
  const contactRows: Array<[string, string | undefined]> = [['이메일', profile.email], ['연락처', profile.phone]];
  const shown = contactRows.filter(([, v]) => !!v);
  return (
    <div style={{ width: SHEET_W, minHeight: SHEET_H, background: '#ffffff', color: '#222', fontFamily: BASE_FONT, padding: '48px 52px' }}>
      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', paddingBottom: 20, borderBottom: '1px solid #e2e2e2' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 30, fontWeight: 800 }}>{profile.name || '이름'}</div>
          {shown.length > 0 && (
            <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: '5px 22px' }}>
              {shown.map(([k, v]) => (
                <div key={k} style={{ fontSize: 11.5 }}>
                  <span style={{ color: '#b23b1e', fontWeight: 700, marginRight: 6 }}>{k}</span>
                  <span style={{ color: '#555' }}>{v}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        {profile.photo && <img src={profile.photo} alt="" style={{ width: 90, height: 112, objectFit: 'cover', flexShrink: 0 }} />}
      </div>
      {profile.tagline && (
        <div style={{ marginTop: 16, fontSize: 12.5, color: '#555', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{profile.tagline}</div>
      )}
      {sections.map(({ category, items }) => (
        <section key={category.id} style={{ marginTop: 22 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#b23b1e', paddingBottom: 5, borderBottom: '1px solid #e2e2e2' }}>{category.name}</div>
          {items.map((item) => (
            <div key={item.id} className="resume-item" style={{ display: 'flex', gap: 16, padding: '9px 0', borderBottom: '1px solid #f2f2f2' }}>
              <div style={{ width: 104, flexShrink: 0, fontSize: 11, color: '#999', paddingTop: 1 }}>{periodLabel(item)}</div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{item.refined}</div>
                {item.org && <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{item.org}</div>}
                {item.detail && <div style={{ fontSize: 11, color: '#999', marginTop: 2, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{item.detail}</div>}
              </div>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}

export type ResumeTemplateId = 'minimal' | 'modern' | 'classic' | 'report' | 'headline' | 'compact';

// eslint-disable-next-line react-refresh/only-export-components -- 서식 컴포넌트 + 레지스트리를 한 파일에 둔다
export const RESUME_TEMPLATES: Array<{ id: ResumeTemplateId; name: string; desc: string; Component: (p: ResumeProps) => JSX.Element }> = [
  { id: 'minimal', name: '미니멀', desc: '단정한 1단', Component: ResumeMinimal },
  { id: 'report', name: '리포트', desc: '기본정보 표·2열', Component: ResumeReport },
  { id: 'headline', name: '헤드라인', desc: '큰 이름·밑줄 섹션', Component: ResumeHeadline },
  { id: 'compact', name: '콤팩트', desc: '연락처 강조·3열', Component: ResumeCompact },
  { id: 'modern', name: '모던', desc: '사이드바 2단', Component: ResumeModern },
  { id: 'classic', name: '클래식', desc: '격식·세리프', Component: ResumeClassic },
];
