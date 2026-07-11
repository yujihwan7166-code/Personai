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

export type ResumeTemplateId = 'minimal' | 'modern' | 'classic';

// eslint-disable-next-line react-refresh/only-export-components -- 서식 컴포넌트 + 레지스트리를 한 파일에 둔다
export const RESUME_TEMPLATES: Array<{ id: ResumeTemplateId; name: string; desc: string; Component: (p: ResumeProps) => JSX.Element }> = [
  { id: 'minimal', name: '미니멀', desc: '단정한 1단', Component: ResumeMinimal },
  { id: 'modern', name: '모던', desc: '사이드바 2단', Component: ResumeModern },
  { id: 'classic', name: '클래식', desc: '격식·세리프', Component: ResumeClassic },
];
