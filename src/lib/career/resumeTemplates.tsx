/**
 * 이력서 서식 템플릿 — 커리어 보드 데이터를 A4 이력서로 렌더.
 * 흰 종이·고정 잉크(테마 무관, html2canvas→PDF 안전하도록 전부 인라인 스타일).
 * 각 템플릿은 같은 데이터를 다른 레이아웃으로 그린다. RESUME_TEMPLATES 로 등록.
 */
import type { CSSProperties } from 'react';
import type { CareerProfile, SpecCategory, SpecItem } from '@/types/career';

export interface ResumeProps {
  profile: CareerProfile;
  sections: Array<{ category: SpecCategory; items: SpecItem[] }>;
}

/** A4 @96dpi 시트 기본. */
const SHEET_W = 794;
const SHEET_H = 1123;
const BASE_FONT = "'Pretendard Variable', Pretendard, -apple-system, sans-serif";
const SERIF_FONT = "'Noto Serif KR', 'Pretendard Variable', serif";

/** 팔레트 — 서식 간 공유 잉크. */
const RED = '#b23b1e';
const INK = '#1c1c1e';

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
const taglineLines = (p: CareerProfile) => (p.tagline || '').split('\n').map((l) => l.trim()).filter(Boolean);

/* ═══════════════ 1 · 미니멀 — 단정한 1단, 빨강 섹션 라벨 ═══════════════ */
export function ResumeMinimal({ profile, sections }: ResumeProps) {
  const contact = contactList(profile).join('   ·   ');
  return (
    <div style={{ width: SHEET_W, minHeight: SHEET_H, background: '#ffffff', color: INK, fontFamily: BASE_FONT, padding: '56px 60px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24, borderBottom: `2.5px solid ${INK}`, paddingBottom: 18 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 31, fontWeight: 800, letterSpacing: '-0.01em', lineHeight: 1.15 }}>{profile.name || '이름'}</div>
          {profile.tagline && <div style={{ marginTop: 8, fontSize: 13, color: '#4a4a4a', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>{profile.tagline}</div>}
          {contact && <div style={{ marginTop: 8, fontSize: 11.5, color: '#777', letterSpacing: '0.01em' }}>{contact}</div>}
        </div>
        {profile.photo && (
          <img src={profile.photo} alt="" style={{ width: 86, height: 110, objectFit: 'cover', borderRadius: 4, border: '1px solid #e2e2e2' }} />
        )}
      </div>
      {sections.map(({ category, items }) => (
        <section key={category.id} style={{ marginTop: 24 }}>
          <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: '0.14em', color: RED }}>{category.name}</div>
          <div style={{ borderTop: '1px solid #e4e4e4', marginTop: 6 }} />
          {items.map((item) => (
            <div key={item.id} className="resume-item" style={{ display: 'flex', justifyContent: 'space-between', gap: 18, marginTop: 12 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 650, lineHeight: 1.45 }}>{item.refined}</div>
                {item.org && <div style={{ fontSize: 11.5, color: '#666', marginTop: 2 }}>{item.org}</div>}
                {item.detail && <div style={{ fontSize: 11, color: '#777', marginTop: 3, whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>{item.detail}</div>}
              </div>
              <div style={{ flexShrink: 0, fontSize: 11, color: '#888', fontVariantNumeric: 'tabular-nums', paddingTop: 2 }}>{periodLabel(item)}</div>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}

/* ═══════════════ 2 · 다크 — 차콜 사이드바 + 화이트 본문 ═══════════════ */
export function ResumeCharcoal({ profile, sections }: ResumeProps) {
  const contact = contactList(profile);
  return (
    <div style={{ width: SHEET_W, minHeight: SHEET_H, background: '#ffffff', color: INK, fontFamily: BASE_FONT, display: 'flex', alignItems: 'stretch' }}>
      <aside style={{ width: 252, background: '#232326', color: '#f4f2ef', padding: '46px 28px', boxSizing: 'border-box' }}>
        {profile.photo && (
          <img src={profile.photo} alt="" style={{ width: 132, height: 164, objectFit: 'cover', borderRadius: 8, display: 'block', marginBottom: 26, border: '3px solid rgba(255,255,255,0.14)' }} />
        )}
        <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '0.18em', color: '#e2725b' }}>CONTACT</div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.16)', marginTop: 7, paddingTop: 9 }}>
          {contact.length ? contact.map((c, i) => (
            <div key={i} style={{ fontSize: 11.5, marginTop: i === 0 ? 0 : 7, color: '#d8d5d0', wordBreak: 'break-all', lineHeight: 1.5 }}>{c}</div>
          )) : (
            <div style={{ fontSize: 11, color: '#88858f' }}>연락처를 채워보세요</div>
          )}
        </div>
        {profile.tagline && (
          <div style={{ marginTop: 30 }}>
            <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '0.18em', color: '#e2725b' }}>ABOUT</div>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.16)', marginTop: 7, paddingTop: 9, fontSize: 11.5, lineHeight: 1.75, color: '#cfccc6', whiteSpace: 'pre-wrap' }}>
              {profile.tagline}
            </div>
          </div>
        )}
      </aside>
      <main style={{ flex: 1, minWidth: 0, padding: '50px 42px', boxSizing: 'border-box' }}>
        <div style={{ fontSize: 33, fontWeight: 800, letterSpacing: '-0.01em', lineHeight: 1.1 }}>{profile.name || '이름'}</div>
        <div style={{ height: 4, width: 52, background: '#e2725b', marginTop: 14, borderRadius: 2 }} />
        {sections.map(({ category, items }) => (
          <section key={category.id} style={{ marginTop: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <span style={{ width: 9, height: 9, background: '#e2725b', borderRadius: 2, flexShrink: 0 }} />
              <span style={{ fontSize: 14, fontWeight: 800, letterSpacing: '0.02em' }}>{category.name}</span>
            </div>
            {items.map((item) => (
              <div key={item.id} className="resume-item" style={{ marginTop: 12, paddingLeft: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 650, lineHeight: 1.45 }}>{item.refined}</div>
                  <div style={{ fontSize: 10.5, color: '#999', flexShrink: 0, paddingTop: 2, fontVariantNumeric: 'tabular-nums' }}>{periodLabel(item)}</div>
                </div>
                {item.org && <div style={{ fontSize: 11, color: '#777', marginTop: 2 }}>{item.org}</div>}
                {item.detail && <div style={{ fontSize: 10.5, color: '#888', marginTop: 3, whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>{item.detail}</div>}
              </div>
            ))}
          </section>
        ))}
      </main>
    </div>
  );
}

/* ═══════════════ 3 · 네이비 — 임원급 헤더 밴드 + 골드 라인 ═══════════════ */
export function ResumeNavy({ profile, sections }: ResumeProps) {
  const contact = contactList(profile).join('    |    ');
  return (
    <div style={{ width: SHEET_W, minHeight: SHEET_H, background: '#ffffff', color: '#20242c', fontFamily: BASE_FONT }}>
      <div style={{ background: '#1c2b4a', color: '#ffffff', padding: '44px 56px 38px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 26 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: SERIF_FONT, fontSize: 33, fontWeight: 700, letterSpacing: '0.04em', lineHeight: 1.15 }}>{profile.name || '이름'}</div>
            <div style={{ height: 3, width: 64, background: '#c8a55f', margin: '13px 0' }} />
            {profile.tagline && <div style={{ fontSize: 12.5, color: '#c9d3e6', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{profile.tagline}</div>}
            {contact && <div style={{ marginTop: 10, fontSize: 11, color: '#93a3c4', letterSpacing: '0.04em' }}>{contact}</div>}
          </div>
          {profile.photo && (
            <img src={profile.photo} alt="" style={{ width: 100, height: 126, objectFit: 'cover', borderRadius: 4, border: '3px solid rgba(255,255,255,0.22)', flexShrink: 0 }} />
          )}
        </div>
      </div>
      <div style={{ padding: '34px 56px 48px' }}>
        {sections.map(({ category, items }) => (
          <section key={category.id} style={{ marginTop: 24 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: '#1c2b4a', letterSpacing: '0.03em', flexShrink: 0 }}>{category.name}</span>
              <span style={{ flex: 1, borderTop: '1px solid #c8a55f', transform: 'translateY(-3px)' }} />
            </div>
            {items.map((item) => (
              <div key={item.id} className="resume-item" style={{ display: 'flex', justifyContent: 'space-between', gap: 18, marginTop: 12 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 650 }}>{item.refined}</div>
                  {item.org && <div style={{ fontSize: 11.5, color: '#5d6577', marginTop: 2 }}>{item.org}</div>}
                  {item.detail && <div style={{ fontSize: 11, color: '#79808f', marginTop: 3, whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>{item.detail}</div>}
                </div>
                <div style={{ flexShrink: 0, fontSize: 11, color: '#8a90a0', paddingTop: 2, fontVariantNumeric: 'tabular-nums' }}>{periodLabel(item)}</div>
              </div>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════ 4 · 배너 — 레드 밴드 + 원형 사진 ═══════════════ */
export function ResumeBanner({ profile, sections }: ResumeProps) {
  const contact = contactList(profile).join('   ·   ');
  return (
    <div style={{ width: SHEET_W, minHeight: SHEET_H, background: '#ffffff', color: INK, fontFamily: BASE_FONT }}>
      <div style={{ background: RED, color: '#ffffff', padding: '42px 56px', display: 'flex', alignItems: 'center', gap: 26 }}>
        {profile.photo && (
          <img src={profile.photo} alt="" style={{ width: 104, height: 104, objectFit: 'cover', borderRadius: '50%', border: '4px solid rgba(255,255,255,0.85)', flexShrink: 0 }} />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 31, fontWeight: 800, letterSpacing: '-0.01em' }}>{profile.name || '이름'}</div>
          {profile.tagline && <div style={{ marginTop: 8, fontSize: 12.5, color: '#ffe1d8', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>{profile.tagline}</div>}
          {contact && <div style={{ marginTop: 9, fontSize: 11, color: 'rgba(255,255,255,0.82)' }}>{contact}</div>}
        </div>
      </div>
      <div style={{ height: 5, background: '#8e2f18' }} />
      <div style={{ padding: '32px 56px 48px' }}>
        {sections.map(({ category, items }) => (
          <section key={category.id} style={{ marginTop: 22 }}>
            <div style={{ display: 'inline-block', background: RED, color: '#fff', fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', padding: '4px 12px', borderRadius: 3 }}>
              {category.name}
            </div>
            <div style={{ borderTop: '1px solid #f0dcd4', marginTop: 8 }} />
            {items.map((item) => (
              <div key={item.id} className="resume-item" style={{ display: 'flex', justifyContent: 'space-between', gap: 18, marginTop: 12 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 650 }}>{item.refined}</div>
                  {item.org && <div style={{ fontSize: 11.5, color: '#8a5a4c', marginTop: 2 }}>{item.org}</div>}
                  {item.detail && <div style={{ fontSize: 11, color: '#888', marginTop: 3, whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>{item.detail}</div>}
                </div>
                <div style={{ flexShrink: 0, fontSize: 11, color: '#999', paddingTop: 2, fontVariantNumeric: 'tabular-nums' }}>{periodLabel(item)}</div>
              </div>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════ 5 · 리포트 — 회색 밴드 + 이중언어 라벨 + 표 ═══════════════ */
function LabelCol({ ko, en }: { ko: string; en?: string }) {
  return (
    <div style={{ width: 146, flexShrink: 0, paddingRight: 16 }}>
      <div style={{ fontSize: 14.5, fontWeight: 800 }}>{ko}</div>
      {en && <div style={{ fontSize: 9, letterSpacing: '0.05em', color: '#b0b0b0', marginTop: 3 }}>{en}</div>}
    </div>
  );
}

export function ResumeReport({ profile, sections }: ResumeProps) {
  const lines = taglineLines(profile);
  const quote = lines[0] || profile.name || '이름';
  const desc = lines.slice(1).join('  ');
  const info: Array<[string, string | undefined]> = [['이름', profile.name], ['메일', profile.email], ['연락처', profile.phone]];
  return (
    <div style={{ width: SHEET_W, minHeight: SHEET_H, background: '#ffffff', color: '#232323', fontFamily: BASE_FONT }}>
      <div style={{ display: 'flex', gap: 28, alignItems: 'center', background: '#f2f1ef', padding: '40px 52px' }}>
        {profile.photo
          ? <img src={profile.photo} alt="" style={{ width: 106, height: 132, objectFit: 'cover', flexShrink: 0 }} />
          : <div style={{ width: 106, height: 132, background: '#dcdad6', flexShrink: 0 }} />}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 21, fontWeight: 800, lineHeight: 1.4 }}>“{quote}”</div>
          {desc && <div style={{ marginTop: 10, fontSize: 12.5, color: '#555', lineHeight: 1.7 }}>{desc}</div>}
        </div>
      </div>
      <div style={{ padding: '32px 52px 48px' }}>
        <div style={{ display: 'flex', marginBottom: 28 }}>
          <LabelCol ko="기본정보" en="PERSONAL INFORMATION" />
          <div style={{ flex: 1, minWidth: 0, borderTop: '2px solid #232323' }}>
            {info.filter(([, v]) => !!v).map(([k, v]) => (
              <div key={k} style={{ display: 'flex', fontSize: 12.5, padding: '8px 2px', borderBottom: '1px solid #e9e9e9' }}>
                <div style={{ width: 100, color: '#8a8a8a' }}>{k}</div>
                <div style={{ fontWeight: 550 }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
        {sections.map(({ category, items }) => (
          <div key={category.id} style={{ display: 'flex', marginBottom: 26 }}>
            <LabelCol ko={category.name} />
            <div style={{ flex: 1, minWidth: 0, borderTop: '2px solid #232323' }}>
              {items.map((item) => (
                <div key={item.id} className="resume-item" style={{ display: 'flex', justifyContent: 'space-between', gap: 14, padding: '9px 2px', borderBottom: '1px solid #e9e9e9' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600 }}>{item.refined}</div>
                    {item.org && <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{item.org}</div>}
                    {item.detail && <div style={{ fontSize: 10.5, color: '#999', marginTop: 2, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{item.detail}</div>}
                  </div>
                  <div style={{ fontSize: 10.5, color: '#999', flexShrink: 0, paddingTop: 2, fontVariantNumeric: 'tabular-nums' }}>{periodLabel(item)}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════ 6 · 타임라인 — 세로 흐름 + 붉은 점 ═══════════════ */
export function ResumeTimeline({ profile, sections }: ResumeProps) {
  const contact = contactList(profile).join('   ·   ');
  return (
    <div style={{ width: SHEET_W, minHeight: SHEET_H, background: '#ffffff', color: INK, fontFamily: BASE_FONT, padding: '52px 58px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 24, paddingBottom: 20, borderBottom: `2px solid ${INK}` }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 30, fontWeight: 800 }}>{profile.name || '이름'}</div>
          {profile.tagline && <div style={{ marginTop: 7, fontSize: 12.5, color: '#555', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>{profile.tagline}</div>}
          {contact && <div style={{ marginTop: 7, fontSize: 11, color: '#888' }}>{contact}</div>}
        </div>
        {profile.photo && <img src={profile.photo} alt="" style={{ width: 84, height: 106, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />}
      </div>
      {sections.map(({ category, items }) => (
        <section key={category.id} style={{ marginTop: 26 }}>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.12em', color: RED }}>{category.name}</div>
          <div style={{ marginTop: 12, marginLeft: 5, borderLeft: '2px solid #f0ddd5', paddingLeft: 22 }}>
            {items.map((item, i) => (
              <div key={item.id} className="resume-item" style={{ position: 'relative', paddingBottom: i === items.length - 1 ? 2 : 16 }}>
                <span style={{ position: 'absolute', left: -29.5, top: 3, width: 13, height: 13, borderRadius: '50%', background: '#fff', border: `3px solid ${RED}`, boxSizing: 'border-box' }} />
                <div style={{ fontSize: 10.5, fontWeight: 700, color: RED, fontVariantNumeric: 'tabular-nums' }}>{periodLabel(item)}</div>
                <div style={{ fontSize: 13.5, fontWeight: 650, marginTop: 3 }}>{item.refined}</div>
                {item.org && <div style={{ fontSize: 11.5, color: '#777', marginTop: 2 }}>{item.org}</div>}
                {item.detail && <div style={{ fontSize: 11, color: '#888', marginTop: 3, whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>{item.detail}</div>}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

/* ═══════════════ 7 · 스위스 — 큰 활자 + 2단 그리드 ═══════════════ */
export function ResumeSwiss({ profile, sections }: ResumeProps) {
  const contact = contactList(profile).join('  /  ');
  return (
    <div style={{ width: SHEET_W, minHeight: SHEET_H, background: '#ffffff', color: '#111', fontFamily: BASE_FONT, padding: '50px 54px' }}>
      <div style={{ fontSize: 44, fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1.02 }}>{profile.name || '이름'}</div>
      {profile.tagline && <div style={{ marginTop: 10, fontSize: 12.5, color: '#444', lineHeight: 1.65, whiteSpace: 'pre-wrap', maxWidth: 560 }}>{profile.tagline}</div>}
      {contact && <div style={{ marginTop: 8, fontSize: 11, color: '#777', letterSpacing: '0.02em' }}>{contact}</div>}
      <div style={{ height: 7, background: '#111', margin: '20px 0 6px' }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 34 }}>
        {sections.map(({ category, items }, idx) => (
          <section key={category.id} style={{ marginTop: 22, breakInside: 'avoid' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: 10.5, fontWeight: 900, color: RED, fontVariantNumeric: 'tabular-nums' }}>{String(idx + 1).padStart(2, '0')}</span>
              <span style={{ fontSize: 13.5, fontWeight: 800, letterSpacing: '0.03em' }}>{category.name}</span>
            </div>
            <div style={{ borderTop: '1.5px solid #111', marginTop: 5 }} />
            {items.map((item) => (
              <div key={item.id} className="resume-item" style={{ marginTop: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 650, lineHeight: 1.45 }}>{item.refined}</div>
                <div style={{ fontSize: 10, color: '#888', marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
                  {periodLabel(item)}{item.org ? `  ·  ${item.org}` : ''}
                </div>
                {item.detail && <div style={{ fontSize: 10.5, color: '#777', marginTop: 2, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{item.detail}</div>}
              </div>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════ 8 · 헤드라인 — 큰 이름 + 요약 불릿 ═══════════════ */
export function ResumeHeadline({ profile, sections }: ResumeProps) {
  const bullets = taglineLines(profile);
  const contact = contactList(profile);
  return (
    <div style={{ width: SHEET_W, minHeight: SHEET_H, background: '#ffffff', color: '#1c1c1c', fontFamily: BASE_FONT, padding: '52px 58px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 26, paddingBottom: 22, borderBottom: '2.5px solid #1c1c1c' }}>
        {profile.photo && <img src={profile.photo} alt="" style={{ width: 96, height: 120, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 36, fontWeight: 850, letterSpacing: '-0.01em', lineHeight: 1.08 }}>{profile.name || '이름'}</div>
          {contact.length > 0 && <div style={{ marginTop: 10, fontSize: 12, color: '#555' }}>{contact.join('   ·   ')}</div>}
        </div>
      </div>
      {bullets.length > 0 && (
        <ul style={{ margin: '18px 0 0', padding: 0, listStyle: 'none' }}>
          {bullets.map((b, i) => (
            <li key={i} style={{ position: 'relative', paddingLeft: 16, marginTop: 6, fontSize: 12.5, lineHeight: 1.6, color: '#333', fontWeight: 550 }}>
              <span style={{ position: 'absolute', left: 0, fontWeight: 800, color: RED }}>·</span>{b}
            </li>
          ))}
        </ul>
      )}
      {sections.map(({ category, items }) => (
        <section key={category.id} style={{ marginTop: 27 }}>
          <div style={{ fontSize: 14.5, fontWeight: 800, paddingBottom: 6, borderBottom: '1.5px solid #333' }}>{category.name}</div>
          {items.map((item) => (
            <div key={item.id} className="resume-item" style={{ marginTop: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 650 }}>
                  {item.refined}{item.org && <span style={{ fontWeight: 400, color: '#777' }}> · {item.org}</span>}
                </div>
                <div style={{ fontSize: 11.5, color: '#888', flexShrink: 0, paddingTop: 1, fontVariantNumeric: 'tabular-nums' }}>{periodLabel(item)}</div>
              </div>
              {item.detail && <div style={{ fontSize: 11, color: '#888', marginTop: 3, whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>{item.detail}</div>}
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}

/* ═══════════════ 9 · 콤팩트 — 연락처 강조 + 날짜 거터 ═══════════════ */
export function ResumeCompact({ profile, sections }: ResumeProps) {
  const contactRows: Array<[string, string | undefined]> = [['이메일', profile.email], ['연락처', profile.phone]];
  const shown = contactRows.filter(([, v]) => !!v);
  return (
    <div style={{ width: SHEET_W, minHeight: SHEET_H, background: '#ffffff', color: '#222', fontFamily: BASE_FONT, padding: '50px 54px' }}>
      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', paddingBottom: 20, borderBottom: '1px solid #e2e2e2' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 30, fontWeight: 800 }}>{profile.name || '이름'}</div>
          {shown.length > 0 && (
            <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: '5px 24px' }}>
              {shown.map(([k, v]) => (
                <div key={k} style={{ fontSize: 11.5 }}>
                  <span style={{ color: RED, fontWeight: 800, marginRight: 7 }}>{k}</span>
                  <span style={{ color: '#555' }}>{v}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        {profile.photo && <img src={profile.photo} alt="" style={{ width: 90, height: 112, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }} />}
      </div>
      {profile.tagline && (
        <div style={{ marginTop: 16, fontSize: 12.5, color: '#555', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{profile.tagline}</div>
      )}
      {sections.map(({ category, items }) => (
        <section key={category.id} style={{ marginTop: 23 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: RED, paddingBottom: 6, borderBottom: '1px solid #e2e2e2' }}>{category.name}</div>
          {items.map((item) => (
            <div key={item.id} className="resume-item" style={{ display: 'flex', gap: 16, padding: '10px 0', borderBottom: '1px solid #f3f3f3' }}>
              <div style={{ width: 104, flexShrink: 0, fontSize: 11, color: '#999', paddingTop: 2, fontVariantNumeric: 'tabular-nums' }}>{periodLabel(item)}</div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 650 }}>{item.refined}</div>
                {item.org && <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{item.org}</div>}
                {item.detail && <div style={{ fontSize: 11, color: '#999', marginTop: 2, whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>{item.detail}</div>}
              </div>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}

/* ═══════════════ 10 · 모던 — 베이지 사이드바 + 레드 톱바 ═══════════════ */
export function ResumeModern({ profile, sections }: ResumeProps) {
  const contact = contactList(profile);
  return (
    <div style={{ width: SHEET_W, minHeight: SHEET_H, background: '#ffffff', color: INK, fontFamily: BASE_FONT }}>
      <div style={{ height: 7, background: RED }} />
      <div style={{ display: 'flex', alignItems: 'stretch', minHeight: SHEET_H - 7 }}>
        <aside style={{ width: 244, background: '#f6efe8', padding: '44px 26px', boxSizing: 'border-box' }}>
          {profile.photo && (
            <img src={profile.photo} alt="" style={{ width: 122, height: 152, objectFit: 'cover', borderRadius: 10, marginBottom: 24, display: 'block' }} />
          )}
          <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '0.16em', color: RED }}>CONTACT</div>
          <div style={{ borderTop: '1px solid #e5d8cb', marginTop: 6, paddingTop: 8 }}>
            {contact.length ? contact.map((c, i) => (
              <div key={i} style={{ fontSize: 11.5, marginTop: i === 0 ? 0 : 7, color: '#4a4a4a', wordBreak: 'break-all', lineHeight: 1.5 }}>{c}</div>
            )) : (
              <div style={{ fontSize: 11, color: '#aaa' }}>연락처를 채워보세요</div>
            )}
          </div>
          {profile.tagline && (
            <div style={{ marginTop: 26 }}>
              <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '0.16em', color: RED }}>ABOUT</div>
              <div style={{ borderTop: '1px solid #e5d8cb', marginTop: 6, paddingTop: 8, fontSize: 11.5, lineHeight: 1.7, color: '#555', whiteSpace: 'pre-wrap' }}>{profile.tagline}</div>
            </div>
          )}
        </aside>
        <main style={{ flex: 1, minWidth: 0, padding: '46px 40px', boxSizing: 'border-box' }}>
          <div style={{ fontSize: 32, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.01em' }}>{profile.name || '이름'}</div>
          <div style={{ height: 3.5, width: 50, background: RED, marginTop: 13, borderRadius: 2 }} />
          {sections.map(({ category, items }) => (
            <section key={category.id} style={{ marginTop: 26 }}>
              <div style={{ fontSize: 13.5, fontWeight: 800, letterSpacing: '0.02em' }}>{category.name}</div>
              {items.map((item) => (
                <div key={item.id} className="resume-item" style={{ marginTop: 12, paddingLeft: 13, borderLeft: '2.5px solid #ecd9cd' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ fontSize: 13, fontWeight: 650, lineHeight: 1.45 }}>{item.refined}</div>
                    <div style={{ fontSize: 10.5, color: '#999', flexShrink: 0, paddingTop: 2, fontVariantNumeric: 'tabular-nums' }}>{periodLabel(item)}</div>
                  </div>
                  {item.org && <div style={{ fontSize: 11, color: '#777', marginTop: 2 }}>{item.org}</div>}
                  {item.detail && <div style={{ fontSize: 10.5, color: '#888', marginTop: 3, whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>{item.detail}</div>}
                </div>
              ))}
            </section>
          ))}
        </main>
      </div>
    </div>
  );
}

/* ═══════════════ 11 · 클래식 — 격식 세리프, 겹괘선 ═══════════════ */
export function ResumeClassic({ profile, sections }: ResumeProps) {
  const contact = contactList(profile).join('    |    ');
  return (
    <div style={{ width: SHEET_W, minHeight: SHEET_H, background: '#ffffff', color: '#222', fontFamily: SERIF_FONT, padding: '58px 62px' }}>
      <div style={{ textAlign: 'center', paddingBottom: 18, borderBottom: '3px double #333' }}>
        <div style={{ fontSize: 31, fontWeight: 700, letterSpacing: '0.1em' }}>{profile.name || '이름'}</div>
        {profile.tagline && <div style={{ marginTop: 9, fontSize: 12.5, color: '#555', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{profile.tagline}</div>}
        {contact && <div style={{ marginTop: 9, fontSize: 11, color: '#666', letterSpacing: '0.03em' }}>{contact}</div>}
      </div>
      {sections.map(({ category, items }) => (
        <section key={category.id} style={{ marginTop: 26 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ flex: 1, borderTop: '1px solid #c9c9c9' }} />
            <span style={{ fontSize: 13.5, fontWeight: 700, letterSpacing: '0.16em', color: '#333', flexShrink: 0 }}>{category.name}</span>
            <span style={{ flex: 1, borderTop: '1px solid #c9c9c9' }} />
          </div>
          {items.map((item) => (
            <div key={item.id} className="resume-item" style={{ display: 'flex', justifyContent: 'space-between', gap: 18, marginTop: 12 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>{item.refined}</div>
                {item.org && <div style={{ fontSize: 11.5, color: '#555', marginTop: 2 }}>{item.org}</div>}
                {item.detail && <div style={{ fontSize: 11, color: '#666', marginTop: 3, whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>{item.detail}</div>}
              </div>
              <div style={{ flexShrink: 0, fontSize: 11.5, color: '#666', fontStyle: 'italic', paddingTop: 2 }}>{periodLabel(item)}</div>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}

export type ResumeTemplateId =
  | 'minimal' | 'charcoal' | 'navy' | 'banner' | 'report' | 'timeline'
  | 'swiss' | 'headline' | 'compact' | 'modern' | 'classic';

/* ═══════════════ 선택 카드용 미니 썸네일 — 각 서식의 레이아웃 스케치 ═══════════════ */
const ln = (w: number | string, h: number, c: string, mt = 3): JSX.Element => (
  <div style={{ width: w, height: h, background: c, marginTop: mt, borderRadius: 1 }} />
);

export function ResumeThumb({ id }: { id: ResumeTemplateId }) {
  const box: CSSProperties = { width: '100%', aspectRatio: '210/260', background: '#fff', overflow: 'hidden', display: 'block' };
  const pad: CSSProperties = { padding: 7, boxSizing: 'border-box', height: '100%' };
  switch (id) {
    case 'minimal':
      return (
        <div style={box}><div style={pad}>
          {ln('62%', 6, '#2a2a2a', 0)}{ln('88%', 2, '#2a2a2a', 4)}
          {ln('30%', 3, RED, 7)}{ln('92%', 3, '#e0e0e0')}{ln('80%', 3, '#e0e0e0')}
          {ln('30%', 3, RED, 8)}{ln('88%', 3, '#e0e0e0')}{ln('72%', 3, '#e0e0e0')}
        </div></div>
      );
    case 'charcoal':
      return (
        <div style={{ ...box, display: 'flex' }}>
          <div style={{ width: '34%', background: '#232326', padding: 5, boxSizing: 'border-box' }}>
            <div style={{ width: '100%', aspectRatio: '1/1.2', background: '#4a4a50', borderRadius: 2 }} />
            {ln('70%', 2.5, '#e2725b', 6)}{ln('90%', 2.5, '#6f6f76')}{ln('80%', 2.5, '#6f6f76')}
          </div>
          <div style={{ flex: 1, padding: 6, boxSizing: 'border-box' }}>
            {ln('60%', 6, '#2a2a2a', 0)}{ln('22%', 3, '#e2725b', 4)}
            {ln('85%', 3, '#e0e0e0', 8)}{ln('70%', 3, '#e0e0e0')}{ln('85%', 3, '#e0e0e0', 8)}{ln('62%', 3, '#e0e0e0')}
          </div>
        </div>
      );
    case 'navy':
      return (
        <div style={box}>
          <div style={{ background: '#1c2b4a', padding: 6, boxSizing: 'border-box' }}>
            {ln('55%', 6, '#ffffff', 2)}{ln('26%', 2.5, '#c8a55f', 5)}{ln('80%', 2.5, '#8fa0c2', 4)}
          </div>
          <div style={{ padding: 6, boxSizing: 'border-box' }}>
            {ln('35%', 3.5, '#1c2b4a', 3)}{ln('90%', 3, '#e3e3e3')}{ln('76%', 3, '#e3e3e3')}
            {ln('35%', 3.5, '#1c2b4a', 8)}{ln('84%', 3, '#e3e3e3')}
          </div>
        </div>
      );
    case 'banner':
      return (
        <div style={box}>
          <div style={{ background: RED, padding: 6, display: 'flex', gap: 5, alignItems: 'center', boxSizing: 'border-box' }}>
            <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#e8b5a4', border: '1.5px solid #fff', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>{ln('70%', 5, '#ffffff', 0)}{ln('90%', 2.5, '#eaa08d', 4)}</div>
          </div>
          <div style={{ padding: 6, boxSizing: 'border-box' }}>
            <div style={{ width: '32%', height: 4.5, background: RED, borderRadius: 1.5 }} />
            {ln('92%', 2.5, '#e0e0e0', 4)}{ln('78%', 2.5, '#e0e0e0')}
            <div style={{ width: '32%', height: 4.5, background: RED, borderRadius: 1.5, marginTop: 7 }} />
            {ln('86%', 2.5, '#e0e0e0', 4)}
          </div>
        </div>
      );
    case 'report':
      return (
        <div style={box}>
          <div style={{ background: '#f0efec', padding: 6, display: 'flex', gap: 5, boxSizing: 'border-box' }}>
            <div style={{ width: 15, height: 19, background: '#d5d3cf', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>{ln('86%', 4.5, '#2c2c2c', 2)}{ln('68%', 2.5, '#9c9c9c', 4)}</div>
          </div>
          <div style={{ padding: 6, boxSizing: 'border-box', display: 'flex', gap: 5 }}>
            <div style={{ width: '30%' }}>{ln('90%', 4, '#2c2c2c', 2)}{ln('60%', 2, '#c9c9c9', 3)}</div>
            <div style={{ flex: 1, borderTop: '2px solid #2c2c2c', paddingTop: 3 }}>
              {ln('92%', 2.5, '#dedede', 3)}{ln('92%', 2.5, '#dedede', 4)}{ln('76%', 2.5, '#dedede', 4)}
            </div>
          </div>
        </div>
      );
    case 'timeline':
      return (
        <div style={box}><div style={pad}>
          {ln('55%', 6, '#2a2a2a', 0)}{ln('88%', 2, '#2a2a2a', 4)}
          {ln('26%', 3, RED, 7)}
          <div style={{ display: 'flex', marginTop: 4 }}>
            <div style={{ width: 8, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, paddingTop: 2 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', border: `1.6px solid ${RED}`, boxSizing: 'border-box' }} />
              <div style={{ width: 1.5, flex: 1, background: '#f0ddd5' }} />
              <div style={{ width: 6, height: 6, borderRadius: '50%', border: `1.6px solid ${RED}`, boxSizing: 'border-box' }} />
            </div>
            <div style={{ flex: 1, paddingLeft: 4 }}>
              {ln('80%', 3, '#e0e0e0', 2)}{ln('62%', 3, '#e0e0e0')}{ln('80%', 3, '#e0e0e0', 9)}{ln('58%', 3, '#e0e0e0')}
            </div>
          </div>
        </div></div>
      );
    case 'swiss':
      return (
        <div style={box}><div style={pad}>
          {ln('74%', 9, '#111', 0)}{ln('100%', 4, '#111', 6)}
          <div style={{ display: 'flex', gap: 6, marginTop: 5 }}>
            <div style={{ flex: 1 }}>{ln('60%', 3, RED, 0)}{ln('95%', 2.5, '#dedede', 3)}{ln('82%', 2.5, '#dedede', 3)}</div>
            <div style={{ flex: 1 }}>{ln('60%', 3, RED, 0)}{ln('95%', 2.5, '#dedede', 3)}{ln('70%', 2.5, '#dedede', 3)}</div>
          </div>
        </div></div>
      );
    case 'headline':
      return (
        <div style={box}><div style={pad}>
          <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
            <div style={{ width: 14, height: 18, background: '#d9d9d9', borderRadius: 1.5, flexShrink: 0 }} />
            {ln('64%', 8, '#1c1c1c', 0)}
          </div>
          {ln('100%', 2.5, '#1c1c1c', 5)}
          {ln('84%', 2.5, '#c9c9c9', 5)}{ln('76%', 2.5, '#c9c9c9')}
          {ln('40%', 3.5, '#333', 8)}{ln('90%', 2.5, '#e0e0e0', 4)}
        </div></div>
      );
    case 'compact':
      return (
        <div style={box}><div style={pad}>
          {ln('52%', 6, '#2a2a2a', 0)}
          <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>{ln(16, 2.5, RED, 0)}{ln(26, 2.5, '#c9c9c9', 0)}{ln(16, 2.5, RED, 0)}{ln(26, 2.5, '#c9c9c9', 0)}</div>
          {ln('34%', 3.5, RED, 8)}{ln('100%', 1.5, '#e2e2e2', 3)}
          <div style={{ display: 'flex', gap: 5, marginTop: 4 }}>
            <div style={{ width: '24%' }}>{ln('100%', 2.5, '#d0d0d0', 0)}</div>
            <div style={{ flex: 1 }}>{ln('88%', 2.5, '#a8a8a8', 0)}{ln('64%', 2.5, '#dedede', 3)}</div>
          </div>
        </div></div>
      );
    case 'modern':
      return (
        <div style={box}>
          {ln('100%', 4, RED, 0)}
          <div style={{ display: 'flex', height: 'calc(100% - 4px)' }}>
            <div style={{ width: '32%', background: '#f6efe8', padding: 5, boxSizing: 'border-box' }}>
              <div style={{ width: '100%', aspectRatio: '1/1.2', background: '#dccbb8', borderRadius: 2 }} />
              {ln('70%', 2.5, RED, 5)}{ln('90%', 2.5, '#d5c4b3')}
            </div>
            <div style={{ flex: 1, padding: 6, boxSizing: 'border-box' }}>
              {ln('58%', 6, '#2a2a2a', 0)}{ln('20%', 3, RED, 4)}
              {ln('84%', 3, '#e0e0e0', 8)}{ln('70%', 3, '#e0e0e0')}
            </div>
          </div>
        </div>
      );
    case 'classic':
      return (
        <div style={box}><div style={{ ...pad, textAlign: 'center' }}>
          <div style={{ width: '46%', height: 6, background: '#2a2a2a', margin: '0 auto' }} />
          <div style={{ width: '80%', height: 2, borderTop: '1px solid #999', borderBottom: '1px solid #999', margin: '5px auto 0', boxSizing: 'border-box' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 8 }}>
            <div style={{ flex: 1, height: 1, background: '#c9c9c9' }} />
            <div style={{ width: '30%', height: 3.5, background: '#555' }} />
            <div style={{ flex: 1, height: 1, background: '#c9c9c9' }} />
          </div>
          {ln('86%', 3, '#e0e0e0', 6)}{ln('72%', 3, '#e0e0e0')}
        </div></div>
      );
  }
}

// eslint-disable-next-line react-refresh/only-export-components -- 서식 컴포넌트 + 레지스트리를 한 파일에 둔다
export const RESUME_TEMPLATES: Array<{ id: ResumeTemplateId; name: string; desc: string; Component: (p: ResumeProps) => JSX.Element }> = [
  { id: 'minimal', name: '미니멀', desc: '단정한 1단', Component: ResumeMinimal },
  { id: 'charcoal', name: '다크', desc: '차콜 사이드바', Component: ResumeCharcoal },
  { id: 'navy', name: '네이비', desc: '헤더 밴드·골드', Component: ResumeNavy },
  { id: 'banner', name: '배너', desc: '레드 밴드·원형 사진', Component: ResumeBanner },
  { id: 'report', name: '리포트', desc: '기본정보 표·2열', Component: ResumeReport },
  { id: 'timeline', name: '타임라인', desc: '세로 흐름·점', Component: ResumeTimeline },
  { id: 'swiss', name: '스위스', desc: '큰 활자·2단', Component: ResumeSwiss },
  { id: 'headline', name: '헤드라인', desc: '큰 이름·요약 불릿', Component: ResumeHeadline },
  { id: 'compact', name: '콤팩트', desc: '연락처 강조·거터', Component: ResumeCompact },
  { id: 'modern', name: '모던', desc: '베이지 사이드바', Component: ResumeModern },
  { id: 'classic', name: '클래식', desc: '격식·세리프', Component: ResumeClassic },
];
