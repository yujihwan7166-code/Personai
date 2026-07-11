/**
 * 이력서 서식 템플릿 — 커리어 보드 데이터를 A4 이력서로 렌더.
 * 흰 종이·고정 잉크(테마 무관, html2canvas→PDF 안전하도록 전부 인라인 스타일).
 * 각 서식은 같은 데이터를 다른 레이아웃·아이덴티티로 그린다. RESUME_TEMPLATES 로 등록.
 *
 * 공통 활자 규칙 — 이름(주인공) > 섹션 라벨(눈썹) > 항목 제목 > 보조(기관·세부) > 날짜(타뷸러).
 * 날짜는 항상 tabular-nums, 한글은 keep-all 로 단어 단위 줄바꿈.
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

/** 공유 잉크 팔레트. */
const INK = '#1c1c1f';
const SUB = '#55555a';
const MUTE = '#8a8a90';
const HAIR = '#e7e6e4';
const RED = '#b23b1e';

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
const contactList = (p: CareerProfile) => [p.birth, p.email, p.phone, p.link].filter((v): v is string => !!v && v.trim().length > 0);
const taglineLines = (p: CareerProfile) => (p.tagline || '').split('\n').map((l) => l.trim()).filter(Boolean);

/** 시트 루트 공통 — 흰 종이·keep-all. */
const sheet = (extra: CSSProperties): CSSProperties => ({
  width: SHEET_W,
  minHeight: SHEET_H,
  background: '#ffffff',
  color: INK,
  fontFamily: BASE_FONT,
  wordBreak: 'keep-all',
  boxSizing: 'border-box',
  ...extra,
});

const dateStyle = (color = MUTE): CSSProperties => ({
  flexShrink: 0,
  fontSize: 10.5,
  color,
  fontVariantNumeric: 'tabular-nums',
  paddingTop: 2.5,
  letterSpacing: '0.01em',
});

/* ═══════════════ 1 · 미니멀 — 잉크 한 줄, 빨강 눈썹 ═══════════════ */
export function ResumeMinimal({ profile, sections }: ResumeProps) {
  const contact = contactList(profile).join('   ·   ');
  return (
    <div style={sheet({ padding: '58px 62px' })}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 26, borderBottom: `2.5px solid ${INK}`, paddingBottom: 20 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 31, fontWeight: 800, letterSpacing: '-0.015em', lineHeight: 1.14 }}>{profile.name || '이름'}</div>
          {profile.tagline && (
            <div style={{ marginTop: 9, fontSize: 12.5, color: SUB, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{profile.tagline}</div>
          )}
          {contact && <div style={{ marginTop: 9, fontSize: 11, color: MUTE, letterSpacing: '0.02em' }}>{contact}</div>}
        </div>
        {profile.photo && (
          <img src={profile.photo} alt="" style={{ width: 88, height: 112, objectFit: 'cover', borderRadius: 4, border: `1px solid ${HAIR}`, flexShrink: 0 }} />
        )}
      </div>

      {sections.map(({ category, items }) => (
        <section key={category.id} style={{ marginTop: 26 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.16em', color: RED }}>{category.name}</div>
          <div style={{ borderTop: `1px solid ${HAIR}`, marginTop: 6 }} />
          {items.map((item) => (
            <div key={item.id} className="resume-item" style={{ display: 'flex', justifyContent: 'space-between', gap: 20, marginTop: 13 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 650, lineHeight: 1.45 }}>{item.refined}</div>
                {item.org && <div style={{ fontSize: 11.5, color: SUB, marginTop: 2.5 }}>{item.org}</div>}
                {item.detail && <div style={{ fontSize: 11, color: MUTE, marginTop: 3.5, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{item.detail}</div>}
              </div>
              <div style={dateStyle()}>{periodLabel(item)}</div>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}

/* ═══════════════ 2 · 다크 — 차콜 사이드바 + 코랄 포인트 ═══════════════ */
export function ResumeCharcoal({ profile, sections }: ResumeProps) {
  const contact = contactList(profile);
  const CORAL = '#e0715a';
  return (
    <div style={sheet({ display: 'flex', alignItems: 'stretch' })}>
      <aside style={{ width: 252, background: '#232327', color: '#f2f0ed', padding: '48px 28px', boxSizing: 'border-box' }}>
        {profile.photo && (
          <img
            src={profile.photo}
            alt=""
            style={{ width: 134, height: 168, objectFit: 'cover', borderRadius: 8, display: 'block', marginBottom: 28, border: '3px solid rgba(255,255,255,0.14)' }}
          />
        )}
        {contact.length > 0 && (
          <>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.2em', color: CORAL }}>CONTACT</div>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.15)', marginTop: 8, paddingTop: 10 }}>
              {contact.map((c, i) => (
                <div key={i} style={{ fontSize: 11.5, marginTop: i === 0 ? 0 : 8, color: '#d7d4cf', wordBreak: 'break-all', lineHeight: 1.55 }}>{c}</div>
              ))}
            </div>
          </>
        )}
        {profile.tagline && (
          <div style={{ marginTop: contact.length > 0 ? 32 : 0 }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.2em', color: CORAL }}>ABOUT</div>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.15)', marginTop: 8, paddingTop: 10, fontSize: 11.5, lineHeight: 1.8, color: '#cecbc5', whiteSpace: 'pre-wrap' }}>
              {profile.tagline}
            </div>
          </div>
        )}
      </aside>

      <main style={{ flex: 1, minWidth: 0, padding: '52px 42px', boxSizing: 'border-box' }}>
        <div style={{ fontSize: 33, fontWeight: 800, letterSpacing: '-0.015em', lineHeight: 1.1 }}>{profile.name || '이름'}</div>
        <div style={{ height: 4, width: 54, background: CORAL, marginTop: 15, borderRadius: 2 }} />
        {sections.map(({ category, items }) => (
          <section key={category.id} style={{ marginTop: 30 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <span style={{ width: 9, height: 9, background: CORAL, borderRadius: 2, flexShrink: 0 }} />
              <span style={{ fontSize: 14, fontWeight: 800, letterSpacing: '0.02em' }}>{category.name}</span>
            </div>
            {items.map((item) => (
              <div key={item.id} className="resume-item" style={{ marginTop: 13, paddingLeft: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 650, lineHeight: 1.45, minWidth: 0 }}>{item.refined}</div>
                  <div style={dateStyle()}>{periodLabel(item)}</div>
                </div>
                {item.org && <div style={{ fontSize: 11, color: SUB, marginTop: 2.5 }}>{item.org}</div>}
                {item.detail && <div style={{ fontSize: 10.5, color: MUTE, marginTop: 3.5, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{item.detail}</div>}
              </div>
            ))}
          </section>
        ))}
      </main>
    </div>
  );
}

/* ═══════════════ 3 · 네이비 — 임원급 밴드 + 골드 라인 ═══════════════ */
export function ResumeNavy({ profile, sections }: ResumeProps) {
  const NAVY = '#1b2a47';
  const GOLD = '#c8a55f';
  const contact = contactList(profile).join('    |    ');
  return (
    <div style={sheet({ color: '#232732' })}>
      <div style={{ background: NAVY, color: '#ffffff', padding: '46px 58px 40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: SERIF_FONT, fontSize: 33, fontWeight: 700, letterSpacing: '0.05em', lineHeight: 1.18 }}>{profile.name || '이름'}</div>
            <div style={{ height: 2.5, width: 64, background: GOLD, margin: '14px 0' }} />
            {profile.tagline && <div style={{ fontSize: 12.5, color: '#c7d1e5', lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>{profile.tagline}</div>}
            {contact && <div style={{ marginTop: 11, fontSize: 10.5, color: '#8fa0c3', letterSpacing: '0.06em' }}>{contact}</div>}
          </div>
          {profile.photo && (
            <img src={profile.photo} alt="" style={{ width: 102, height: 128, objectFit: 'cover', borderRadius: 3, border: '3px solid rgba(255,255,255,0.22)', flexShrink: 0 }} />
          )}
        </div>
      </div>

      <div style={{ padding: '36px 58px 52px' }}>
        {sections.map(({ category, items }) => (
          <section key={category.id} style={{ marginTop: 25 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: NAVY, letterSpacing: '0.04em', flexShrink: 0 }}>{category.name}</span>
              <span style={{ flex: 1, borderTop: `1px solid ${GOLD}` }} />
            </div>
            {items.map((item) => (
              <div key={item.id} className="resume-item" style={{ display: 'flex', justifyContent: 'space-between', gap: 20, marginTop: 13 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 650, lineHeight: 1.45 }}>{item.refined}</div>
                  {item.org && <div style={{ fontSize: 11.5, color: '#5c6478', marginTop: 2.5 }}>{item.org}</div>}
                  {item.detail && <div style={{ fontSize: 11, color: '#7b8294', marginTop: 3.5, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{item.detail}</div>}
                </div>
                <div style={dateStyle('#8a90a0')}>{periodLabel(item)}</div>
              </div>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════ 4 · 배너 — 레드 밴드 + 원형 사진 + 칩 섹션 ═══════════════ */
export function ResumeBanner({ profile, sections }: ResumeProps) {
  const contact = contactList(profile).join('   ·   ');
  return (
    <div style={sheet({})}>
      <div style={{ background: RED, color: '#ffffff', padding: '42px 58px', display: 'flex', alignItems: 'center', gap: 28 }}>
        {profile.photo && (
          <img src={profile.photo} alt="" style={{ width: 106, height: 106, objectFit: 'cover', borderRadius: '50%', border: '4px solid rgba(255,255,255,0.88)', flexShrink: 0 }} />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 31, fontWeight: 800, letterSpacing: '-0.01em', lineHeight: 1.15 }}>{profile.name || '이름'}</div>
          {profile.tagline && <div style={{ marginTop: 9, fontSize: 12.5, color: '#ffddd2', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{profile.tagline}</div>}
          {contact && <div style={{ marginTop: 10, fontSize: 10.5, color: 'rgba(255,255,255,0.85)', letterSpacing: '0.03em' }}>{contact}</div>}
        </div>
      </div>
      <div style={{ height: 5, background: '#8e2f18' }} />

      <div style={{ padding: '34px 58px 52px' }}>
        {sections.map(({ category, items }) => (
          <section key={category.id} style={{ marginTop: 24 }}>
            <div style={{ display: 'inline-block', background: RED, color: '#fff', fontSize: 10.5, fontWeight: 800, letterSpacing: '0.1em', padding: '4.5px 12px', borderRadius: 2 }}>
              {category.name}
            </div>
            <div style={{ borderTop: '1px solid #f1ddd5', marginTop: 9 }} />
            {items.map((item) => (
              <div key={item.id} className="resume-item" style={{ display: 'flex', justifyContent: 'space-between', gap: 20, marginTop: 13 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 650, lineHeight: 1.45 }}>{item.refined}</div>
                  {item.org && <div style={{ fontSize: 11.5, color: '#8a5a4c', marginTop: 2.5 }}>{item.org}</div>}
                  {item.detail && <div style={{ fontSize: 11, color: MUTE, marginTop: 3.5, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{item.detail}</div>}
                </div>
                <div style={dateStyle()}>{periodLabel(item)}</div>
              </div>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════ 5 · 스위스 — 초대형 활자 + 2단 그리드 ═══════════════ */
export function ResumeSwiss({ profile, sections }: ResumeProps) {
  const contact = contactList(profile).join('  /  ');
  return (
    <div style={sheet({ color: '#111114', padding: '52px 56px' })}>
      <div style={{ fontSize: 46, fontWeight: 900, letterSpacing: '-0.035em', lineHeight: 1.0 }}>{profile.name || '이름'}</div>
      {profile.tagline && (
        <div style={{ marginTop: 12, fontSize: 12.5, color: '#3f3f44', lineHeight: 1.7, whiteSpace: 'pre-wrap', maxWidth: 560 }}>{profile.tagline}</div>
      )}
      {contact && <div style={{ marginTop: 9, fontSize: 10.5, color: MUTE, letterSpacing: '0.04em', fontVariantNumeric: 'tabular-nums' }}>{contact}</div>}
      <div style={{ height: 8, background: '#111114', margin: '22px 0 4px' }} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 36 }}>
        {sections.map(({ category, items }, idx) => (
          <section key={category.id} style={{ marginTop: 24, breakInside: 'avoid' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: 10.5, fontWeight: 900, color: RED, fontVariantNumeric: 'tabular-nums' }}>{String(idx + 1).padStart(2, '0')}</span>
              <span style={{ fontSize: 13.5, fontWeight: 800, letterSpacing: '0.04em' }}>{category.name}</span>
            </div>
            <div style={{ borderTop: '1.5px solid #111114', marginTop: 6 }} />
            {items.map((item) => (
              <div key={item.id} className="resume-item" style={{ marginTop: 11 }}>
                <div style={{ fontSize: 12, fontWeight: 650, lineHeight: 1.5 }}>{item.refined}</div>
                <div style={{ fontSize: 10, color: MUTE, marginTop: 2.5, fontVariantNumeric: 'tabular-nums' }}>
                  {periodLabel(item)}{item.org ? `  ·  ${item.org}` : ''}
                </div>
                {item.detail && <div style={{ fontSize: 10.5, color: SUB, marginTop: 3, whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>{item.detail}</div>}
              </div>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════ 6 · 타임라인 — 세로 흐름 + 붉은 점 ═══════════════ */
export function ResumeTimeline({ profile, sections }: ResumeProps) {
  const contact = contactList(profile).join('   ·   ');
  return (
    <div style={sheet({ padding: '54px 60px' })}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 26, paddingBottom: 22, borderBottom: `2px solid ${INK}` }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.01em' }}>{profile.name || '이름'}</div>
          {profile.tagline && <div style={{ marginTop: 8, fontSize: 12.5, color: SUB, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{profile.tagline}</div>}
          {contact && <div style={{ marginTop: 8, fontSize: 11, color: MUTE }}>{contact}</div>}
        </div>
        {profile.photo && <img src={profile.photo} alt="" style={{ width: 86, height: 108, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />}
      </div>

      {sections.map(({ category, items }) => (
        <section key={category.id} style={{ marginTop: 28 }}>
          <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: '0.14em', color: RED }}>{category.name}</div>
          <div style={{ marginTop: 14, marginLeft: 6, borderLeft: '2px solid #efdcd3', paddingLeft: 24 }}>
            {items.map((item, i) => (
              <div key={item.id} className="resume-item" style={{ position: 'relative', paddingBottom: i === items.length - 1 ? 2 : 18 }}>
                <span style={{ position: 'absolute', left: -31.5, top: 2.5, width: 13, height: 13, borderRadius: '50%', background: '#fff', border: `3px solid ${RED}`, boxSizing: 'border-box' }} />
                <div style={{ fontSize: 10.5, fontWeight: 800, color: RED, fontVariantNumeric: 'tabular-nums', letterSpacing: '0.04em' }}>{periodLabel(item)}</div>
                <div style={{ fontSize: 13.5, fontWeight: 650, marginTop: 4, lineHeight: 1.45 }}>{item.refined}</div>
                {item.org && <div style={{ fontSize: 11.5, color: SUB, marginTop: 2.5 }}>{item.org}</div>}
                {item.detail && <div style={{ fontSize: 11, color: MUTE, marginTop: 3.5, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{item.detail}</div>}
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

/* ═══════════════ 7 · 리포트 — 회색 밴드 + 표 괘선 ═══════════════ */
function LabelCol({ ko, en }: { ko: string; en?: string }) {
  return (
    <div style={{ width: 148, flexShrink: 0, paddingRight: 18 }}>
      <div style={{ fontSize: 14.5, fontWeight: 800 }}>{ko}</div>
      {en && <div style={{ fontSize: 8.5, letterSpacing: '0.07em', color: '#b3b3b0', marginTop: 3 }}>{en}</div>}
    </div>
  );
}

export function ResumeReport({ profile, sections }: ResumeProps) {
  const lines = taglineLines(profile);
  const quote = lines[0] || profile.name || '이름';
  const desc = lines.slice(1).join('  ');
  const info: Array<[string, string | undefined]> = [
    ['이름', profile.name],
    ['생년월일', profile.birth],
    ['메일', profile.email],
    ['연락처', profile.phone],
    ['링크', profile.link],
  ];
  return (
    <div style={sheet({ color: '#242424' })}>
      <div style={{ display: 'flex', gap: 30, alignItems: 'center', background: '#f2f1ee', padding: '42px 54px' }}>
        {profile.photo
          ? <img src={profile.photo} alt="" style={{ width: 106, height: 132, objectFit: 'cover', flexShrink: 0 }} />
          : <div style={{ width: 106, height: 132, background: '#dbd9d4', flexShrink: 0 }} />}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 21, fontWeight: 800, lineHeight: 1.45 }}>“{quote}”</div>
          {desc && <div style={{ marginTop: 11, fontSize: 12.5, color: SUB, lineHeight: 1.75 }}>{desc}</div>}
        </div>
      </div>

      <div style={{ padding: '34px 54px 52px' }}>
        <div style={{ display: 'flex', marginBottom: 30 }}>
          <LabelCol ko="기본정보" en="PERSONAL INFORMATION" />
          <div style={{ flex: 1, minWidth: 0, borderTop: '2px solid #242424' }}>
            {info.filter(([, v]) => !!v).map(([k, v]) => (
              <div key={k} style={{ display: 'flex', fontSize: 12.5, padding: '8.5px 2px', borderBottom: '1px solid #ebebe9' }}>
                <div style={{ width: 102, color: MUTE }}>{k}</div>
                <div style={{ fontWeight: 550 }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
        {sections.map(({ category, items }) => (
          <div key={category.id} style={{ display: 'flex', marginBottom: 28 }}>
            <LabelCol ko={category.name} />
            <div style={{ flex: 1, minWidth: 0, borderTop: '2px solid #242424' }}>
              {items.map((item) => (
                <div key={item.id} className="resume-item" style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '9.5px 2px', borderBottom: '1px solid #ebebe9' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 620 }}>{item.refined}</div>
                    {item.org && <div style={{ fontSize: 11, color: SUB, marginTop: 2 }}>{item.org}</div>}
                    {item.detail && <div style={{ fontSize: 10.5, color: MUTE, marginTop: 2.5, whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>{item.detail}</div>}
                  </div>
                  <div style={dateStyle()}>{periodLabel(item)}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════ 8 · 콤팩트 — 연락처 라벨 + 날짜 거터 ═══════════════ */
export function ResumeCompact({ profile, sections }: ResumeProps) {
  const contactRows: Array<[string, string | undefined]> = [
    ['생년월일', profile.birth],
    ['이메일', profile.email],
    ['연락처', profile.phone],
    ['링크', profile.link],
  ];
  const shown = contactRows.filter(([, v]) => !!v);
  return (
    <div style={sheet({ color: '#232326', padding: '52px 56px' })}>
      <div style={{ display: 'flex', gap: 26, alignItems: 'flex-start', paddingBottom: 22, borderBottom: `1px solid ${HAIR}` }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.01em' }}>{profile.name || '이름'}</div>
          {shown.length > 0 && (
            <div style={{ marginTop: 13, display: 'flex', flexWrap: 'wrap', gap: '6px 26px' }}>
              {shown.map(([k, v]) => (
                <div key={k} style={{ fontSize: 11.5 }}>
                  <span style={{ color: RED, fontWeight: 800, marginRight: 8, letterSpacing: '0.02em' }}>{k}</span>
                  <span style={{ color: SUB }}>{v}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        {profile.photo && <img src={profile.photo} alt="" style={{ width: 90, height: 114, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }} />}
      </div>
      {profile.tagline && (
        <div style={{ marginTop: 17, fontSize: 12.5, color: SUB, lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>{profile.tagline}</div>
      )}

      {sections.map(({ category, items }) => (
        <section key={category.id} style={{ marginTop: 25 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: RED, paddingBottom: 7, borderBottom: `1px solid ${HAIR}` }}>{category.name}</div>
          {items.map((item) => (
            <div key={item.id} className="resume-item" style={{ display: 'flex', gap: 18, padding: '10.5px 0', borderBottom: '1px solid #f4f4f2' }}>
              <div style={{ width: 102, flexShrink: 0, fontSize: 10.5, color: MUTE, paddingTop: 2.5, fontVariantNumeric: 'tabular-nums' }}>{periodLabel(item)}</div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 650, lineHeight: 1.45 }}>{item.refined}</div>
                {item.org && <div style={{ fontSize: 11, color: SUB, marginTop: 2.5 }}>{item.org}</div>}
                {item.detail && <div style={{ fontSize: 11, color: MUTE, marginTop: 3, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{item.detail}</div>}
              </div>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}

/* ═══════════════ 9 · 모던 — 베이지 사이드바 + 레드 톱바 ═══════════════ */
export function ResumeModern({ profile, sections }: ResumeProps) {
  const contact = contactList(profile);
  return (
    <div style={sheet({})}>
      <div style={{ height: 7, background: RED }} />
      <div style={{ display: 'flex', alignItems: 'stretch', minHeight: SHEET_H - 7 }}>
        <aside style={{ width: 244, background: '#f6efe8', padding: '46px 27px', boxSizing: 'border-box' }}>
          {profile.photo && (
            <img src={profile.photo} alt="" style={{ width: 124, height: 154, objectFit: 'cover', borderRadius: 10, marginBottom: 26, display: 'block' }} />
          )}
          {contact.length > 0 && (
            <>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.18em', color: RED }}>CONTACT</div>
              <div style={{ borderTop: '1px solid #e6d8ca', marginTop: 7, paddingTop: 9 }}>
                {contact.map((c, i) => (
                  <div key={i} style={{ fontSize: 11.5, marginTop: i === 0 ? 0 : 8, color: '#4a4a48', wordBreak: 'break-all', lineHeight: 1.55 }}>{c}</div>
                ))}
              </div>
            </>
          )}
          {profile.tagline && (
            <div style={{ marginTop: contact.length > 0 ? 28 : 0 }}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.18em', color: RED }}>ABOUT</div>
              <div style={{ borderTop: '1px solid #e6d8ca', marginTop: 7, paddingTop: 9, fontSize: 11.5, lineHeight: 1.8, color: '#55534f', whiteSpace: 'pre-wrap' }}>
                {profile.tagline}
              </div>
            </div>
          )}
        </aside>

        <main style={{ flex: 1, minWidth: 0, padding: '48px 40px', boxSizing: 'border-box' }}>
          <div style={{ fontSize: 32, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.015em' }}>{profile.name || '이름'}</div>
          <div style={{ height: 3.5, width: 52, background: RED, marginTop: 14, borderRadius: 2 }} />
          {sections.map(({ category, items }) => (
            <section key={category.id} style={{ marginTop: 27 }}>
              <div style={{ fontSize: 13.5, fontWeight: 800, letterSpacing: '0.02em' }}>{category.name}</div>
              {items.map((item) => (
                <div key={item.id} className="resume-item" style={{ marginTop: 13, paddingLeft: 14, borderLeft: '2.5px solid #eed9cb' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14 }}>
                    <div style={{ fontSize: 13, fontWeight: 650, lineHeight: 1.45, minWidth: 0 }}>{item.refined}</div>
                    <div style={dateStyle()}>{periodLabel(item)}</div>
                  </div>
                  {item.org && <div style={{ fontSize: 11, color: SUB, marginTop: 2.5 }}>{item.org}</div>}
                  {item.detail && <div style={{ fontSize: 10.5, color: MUTE, marginTop: 3.5, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{item.detail}</div>}
                </div>
              ))}
            </section>
          ))}
        </main>
      </div>
    </div>
  );
}

/* ═══════════════ 10 · 클래식 — 격식 세리프 + 겹괘선 ═══════════════ */
export function ResumeClassic({ profile, sections }: ResumeProps) {
  const contact = contactList(profile).join('    |    ');
  return (
    <div style={sheet({ color: '#232323', fontFamily: SERIF_FONT, padding: '60px 64px' })}>
      <div style={{ textAlign: 'center', paddingBottom: 20, borderBottom: '3px double #333' }}>
        <div style={{ fontSize: 31, fontWeight: 700, letterSpacing: '0.12em' }}>{profile.name || '이름'}</div>
        {profile.tagline && <div style={{ marginTop: 10, fontSize: 12.5, color: SUB, lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>{profile.tagline}</div>}
        {contact && <div style={{ marginTop: 10, fontSize: 11, color: '#666', letterSpacing: '0.04em', fontVariantNumeric: 'tabular-nums' }}>{contact}</div>}
      </div>

      {sections.map(({ category, items }) => (
        <section key={category.id} style={{ marginTop: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ flex: 1, borderTop: '1px solid #cbcbc9' }} />
            <span style={{ fontSize: 13.5, fontWeight: 700, letterSpacing: '0.18em', color: '#333', flexShrink: 0 }}>{category.name}</span>
            <span style={{ flex: 1, borderTop: '1px solid #cbcbc9' }} />
          </div>
          {items.map((item) => (
            <div key={item.id} className="resume-item" style={{ display: 'flex', justifyContent: 'space-between', gap: 20, marginTop: 13 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.5 }}>{item.refined}</div>
                {item.org && <div style={{ fontSize: 11.5, color: SUB, marginTop: 2.5 }}>{item.org}</div>}
                {item.detail && <div style={{ fontSize: 11, color: '#666', marginTop: 3.5, whiteSpace: 'pre-wrap', lineHeight: 1.65 }}>{item.detail}</div>}
              </div>
              <div style={{ flexShrink: 0, fontSize: 11.5, color: '#666', fontStyle: 'italic', paddingTop: 2, fontVariantNumeric: 'tabular-nums' }}>{periodLabel(item)}</div>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}

export type ResumeTemplateId =
  | 'minimal' | 'charcoal' | 'navy' | 'banner' | 'swiss'
  | 'timeline' | 'report' | 'compact' | 'modern' | 'classic';

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
          <div style={{ width: '34%', background: '#232327', padding: 5, boxSizing: 'border-box' }}>
            <div style={{ width: '100%', aspectRatio: '1/1.2', background: '#4a4a50', borderRadius: 2 }} />
            {ln('70%', 2.5, '#e0715a', 6)}{ln('90%', 2.5, '#6f6f76')}{ln('80%', 2.5, '#6f6f76')}
          </div>
          <div style={{ flex: 1, padding: 6, boxSizing: 'border-box' }}>
            {ln('60%', 6, '#2a2a2a', 0)}{ln('22%', 3, '#e0715a', 4)}
            {ln('85%', 3, '#e0e0e0', 8)}{ln('70%', 3, '#e0e0e0')}{ln('85%', 3, '#e0e0e0', 8)}{ln('62%', 3, '#e0e0e0')}
          </div>
        </div>
      );
    case 'navy':
      return (
        <div style={box}>
          <div style={{ background: '#1b2a47', padding: 6, boxSizing: 'border-box' }}>
            {ln('55%', 6, '#ffffff', 2)}{ln('26%', 2.5, '#c8a55f', 5)}{ln('80%', 2.5, '#8fa0c3', 4)}
          </div>
          <div style={{ padding: 6, boxSizing: 'border-box' }}>
            {ln('35%', 3.5, '#1b2a47', 3)}{ln('90%', 3, '#e3e3e3')}{ln('76%', 3, '#e3e3e3')}
            {ln('35%', 3.5, '#1b2a47', 8)}{ln('84%', 3, '#e3e3e3')}
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
    case 'swiss':
      return (
        <div style={box}><div style={pad}>
          {ln('74%', 9, '#111114', 0)}{ln('100%', 4, '#111114', 6)}
          <div style={{ display: 'flex', gap: 6, marginTop: 5 }}>
            <div style={{ flex: 1 }}>{ln('60%', 3, RED, 0)}{ln('95%', 2.5, '#dedede', 3)}{ln('82%', 2.5, '#dedede', 3)}</div>
            <div style={{ flex: 1 }}>{ln('60%', 3, RED, 0)}{ln('95%', 2.5, '#dedede', 3)}{ln('70%', 2.5, '#dedede', 3)}</div>
          </div>
        </div></div>
      );
    case 'timeline':
      return (
        <div style={box}><div style={pad}>
          {ln('55%', 6, '#2a2a2a', 0)}{ln('88%', 2, '#2a2a2a', 4)}
          {ln('26%', 3, RED, 7)}
          <div style={{ display: 'flex', marginTop: 4 }}>
            <div style={{ width: 8, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, paddingTop: 2 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', border: `1.6px solid ${RED}`, boxSizing: 'border-box' }} />
              <div style={{ width: 1.5, flex: 1, background: '#efdcd3' }} />
              <div style={{ width: 6, height: 6, borderRadius: '50%', border: `1.6px solid ${RED}`, boxSizing: 'border-box' }} />
            </div>
            <div style={{ flex: 1, paddingLeft: 4 }}>
              {ln('80%', 3, '#e0e0e0', 2)}{ln('62%', 3, '#e0e0e0')}{ln('80%', 3, '#e0e0e0', 9)}{ln('58%', 3, '#e0e0e0')}
            </div>
          </div>
        </div></div>
      );
    case 'report':
      return (
        <div style={box}>
          <div style={{ background: '#f2f1ee', padding: 6, display: 'flex', gap: 5, boxSizing: 'border-box' }}>
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
  { id: 'swiss', name: '스위스', desc: '큰 활자·2단', Component: ResumeSwiss },
  { id: 'timeline', name: '타임라인', desc: '세로 흐름·점', Component: ResumeTimeline },
  { id: 'report', name: '리포트', desc: '기본정보 표·괘선', Component: ResumeReport },
  { id: 'compact', name: '콤팩트', desc: '연락처 강조·거터', Component: ResumeCompact },
  { id: 'modern', name: '모던', desc: '베이지 사이드바', Component: ResumeModern },
  { id: 'classic', name: '클래식', desc: '격식·세리프', Component: ResumeClassic },
];
