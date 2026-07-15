/**
 * 마이위키 문서 화면 — 시안(Wiki.dc.html) 충실 구현.
 * 브레드크럼 · 세리프 제목 · 스티키 툴바 · contentEditable 본문(문법 제로)
 * · 주석 · 백링크(자동) · 우측 인포박스+목차 · 드래그 선택 팝오버(연결/예약/주석).
 *
 * 본문 저장: HTML(sanitize) — 링크는 <a data-link="docId"> (개명 안전),
 * 예약 링크는 <a data-stub-title="제목"> (클릭 시 그 자리에서 새 문서).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { notify } from '@/lib/notify';
import { SERIF, STUB_TEXT_LENGTH, WK, type WikiDoc } from '@/types/mywiki';
import { mywikiStore } from '@/services/mywikiStore';
import {
  backlinkSnippet, extractWikiToc, linkHtml, outgoingLinkIds, stubHtml, wikiPlainText,
} from '@/lib/mywiki/html';

/* 본문 렌더 스타일 — sanitize 가 style 속성을 걷어내므로 표시 책임은 이 CSS 가 진다. */
const BODY_CSS = `
.wk-body { font-family: ${SERIF}; font-size: 17.5px; line-height: 1.9; color: ${WK.ink}; letter-spacing: -0.01em; }
.wk-body:focus { outline: none; }
.wk-body p { margin: 0 0 16px; }
.wk-body h2 { font-family: ${SERIF}; font-weight: 600; font-size: 23px; color: ${WK.inkDeep}; margin: 26px 0 10px; letter-spacing: -0.01em; }
.wk-body h3 { font-family: ${SERIF}; font-weight: 600; font-size: 19px; color: ${WK.inkDeep}; margin: 22px 0 8px; }
.wk-body ul, .wk-body ol { margin: 0 0 16px; padding-left: 22px; }
.wk-body li { margin-bottom: 6px; }
.wk-body blockquote { margin: 0 0 16px; padding: 2px 0 2px 14px; border-left: 3px solid #D8D2C4; color: #5C665F; }
.wk-body a[data-link] { color: ${WK.green}; border-bottom: 1px solid #BBD8C8; cursor: pointer; text-decoration: none; }
.wk-body a[data-link]:hover { color: ${WK.greenDark}; }
.wk-body a[data-stub-title] { color: ${WK.red}; border-bottom: 1px dashed #E0A79F; cursor: pointer; text-decoration: none; }
.wk-body sup[data-fn] { color: ${WK.green}; font-size: 12px; font-weight: 600; }
.wk-body table { border-collapse: collapse; margin: 0 0 16px; width: 100%; font-size: 15px; font-family: 'Pretendard', sans-serif; }
.wk-body td, .wk-body th { border: 1px solid ${WK.lineSoft}; padding: 7px 10px; min-width: 60px; }
.wk-body th { background: #F4F1E8; font-weight: 600; }
.wk-body:empty::before { content: '여기에 내용을 적어 내려가요. 글자를 드래그하면 다른 문서와 이어져요.'; color: #A7B0AA; font-style: italic; }
`;

type PopState =
  | { mode: 'menu'; text: string; top: number; left: number }
  | { mode: 'link'; text: string; top: number; left: number; q: string }
  | { mode: 'footnote'; text: string; top: number; left: number; q: string }
  | null;

interface Props {
  doc: WikiDoc;
  docs: WikiDoc[];
  crumbs: Array<{ title: string; onClick?: () => void }>;
  onOpenDoc: (id: string) => void;
  onDeleted: () => void;
}

function fmtRelative(iso: string): string {
  const d = Math.floor((Date.now() - Date.parse(iso)) / (1000 * 60 * 60 * 24));
  if (d <= 0) return '오늘';
  if (d === 1) return '어제';
  if (d < 7) return `${d}일 전`;
  if (d < 30) return `${Math.floor(d / 7)}주 전`;
  return new Date(iso).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' });
}

export function WikiDocView({ doc, docs, crumbs, onOpenDoc, onDeleted }: Props) {
  const [title, setTitle] = useState(doc.title);
  const [pop, setPop] = useState<PopState>(null);
  const [addingInfo, setAddingInfo] = useState(false);
  const [infoK, setInfoK] = useState('');
  const [infoV, setInfoV] = useState('');
  const [tagInput, setTagInput] = useState(false);
  const [tagVal, setTagVal] = useState('');

  const bodyRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const savedRange = useRef<Range | null>(null);
  const saveTimer = useRef<number | null>(null);
  const docRef = useRef(doc);
  docRef.current = doc;

  /* ── 본문 초기화 (문서 전환 시에만 innerHTML 주입 — 편집 중 리렌더로 덮지 않게) ── */
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const { html } = extractWikiToc(doc.body);
    el.innerHTML = html;
    setTitle(doc.title);
    setPop(null);
    scrollerRef.current?.scrollTo({ top: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc.id]);

  const commitBody = useCallback(() => {
    const el = bodyRef.current;
    if (!el) return;
    const html = el.innerHTML;
    if (html !== docRef.current.body) mywikiStore.updateDoc(docRef.current.id, { body: html });
  }, []);

  const scheduleSave = useCallback(() => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(commitBody, 800);
  }, [commitBody]);

  // 언마운트/문서 전환 시 미저장분 플러시
  useEffect(() => () => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    commitBody();
  }, [doc.id, commitBody]);

  /* ── 파생값 (저장된 body 기준) ── */
  const plain = useMemo(() => wikiPlainText(doc.body), [doc.body]);
  const isStub = plain.length < STUB_TEXT_LENGTH;
  const headings = useMemo(() => extractWikiToc(doc.body).headings, [doc.body]);
  const backlinks = useMemo(
    () => docs
      .filter((d) => d.id !== doc.id && outgoingLinkIds(d.body).includes(doc.id))
      .map((d) => ({ id: d.id, title: d.title, snippet: backlinkSnippet(d.body, doc.id) })),
    [docs, doc.id],
  );

  /* ── 선택 팝오버 ── */
  const onBodyMouseUp = () => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.toString().trim()) { setPop(null); return; }
    const range = sel.getRangeAt(0);
    if (!bodyRef.current || !bodyRef.current.contains(range.commonAncestorContainer)) return;
    savedRange.current = range.cloneRange();
    const r = range.getBoundingClientRect();
    setPop({ mode: 'menu', text: sel.toString().trim().slice(0, 60), top: r.bottom + 8, left: Math.max(12, Math.min(r.left, window.innerWidth - 300)) });
  };

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (popRef.current?.contains(e.target as Node)) return;
      setPop((p) => (p ? null : p));
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  /** 저장해둔 선택 영역을 HTML 조각으로 치환. */
  const replaceSelection = (html: string) => {
    const range = savedRange.current;
    const el = bodyRef.current;
    if (!range || !el) return;
    const tpl = document.createElement('template');
    tpl.innerHTML = html;
    range.deleteContents();
    range.insertNode(tpl.content);
    window.getSelection()?.removeAllRanges();
    commitBody();
  };

  const linkTo = (target: WikiDoc) => {
    if (!pop) return;
    replaceSelection(linkHtml(target.id, pop.text));
    setPop(null);
    notify.success(`'${pop.text}' → ${target.title} 에 연결했어요`);
  };

  const createAndLink = () => {
    if (!pop) return;
    const created = mywikiStore.addDoc({ topicId: doc.topicId, parentId: doc.id, title: pop.text });
    replaceSelection(linkHtml(created.id, pop.text));
    setPop(null);
    notify.success(`'${pop.text}' 새 문서를 만들며 연결했어요`, { description: '지금 문서의 하위로 들어갔어요' });
  };

  const markStub = () => {
    if (!pop) return;
    replaceSelection(stubHtml(pop.text));
    setPop(null);
    notify.info(`'${pop.text}' 을(를) 나중에 만들 문서로 표시했어요`, { description: '붉은 표시를 누르면 그 자리에서 새로 파요' });
  };

  const addFootnote = (text: string) => {
    const t = text.trim();
    if (!t || !pop) { setPop(null); return; }
    const n = doc.footnotes.length + 1;
    const range = savedRange.current;
    const el = bodyRef.current;
    if (range && el) {
      range.collapse(false); // 선택 끝으로
      const sup = document.createElement('sup');
      sup.setAttribute('data-fn', String(n));
      sup.textContent = String(n);
      range.insertNode(sup);
      window.getSelection()?.removeAllRanges();
      mywikiStore.updateDoc(doc.id, { body: el.innerHTML, footnotes: [...doc.footnotes, { n, text: t }] });
    }
    setPop(null);
    notify.success(`주석 ${n}번을 달았어요`);
  };

  /* ── 본문 클릭 (링크 이동 · 예약 링크 생성) ── */
  const onBodyClick = (e: React.MouseEvent) => {
    const t = e.target as HTMLElement;
    const link = t.closest('a[data-link]');
    if (link) {
      e.preventDefault();
      const id = link.getAttribute('data-link')!;
      if (docs.some((d) => d.id === id)) { commitBody(); onOpenDoc(id); }
      return;
    }
    const stub = t.closest('a[data-stub-title]');
    if (stub) {
      e.preventDefault();
      const stubTitle = stub.getAttribute('data-stub-title')!;
      const created = mywikiStore.addDoc({ topicId: doc.topicId, parentId: doc.id, title: stubTitle });
      // 이 문서 안 같은 제목의 예약 링크를 전부 실제 링크로 전환
      const el = bodyRef.current;
      if (el) {
        el.querySelectorAll(`a[data-stub-title="${CSS.escape(stubTitle)}"]`).forEach((a) => {
          a.removeAttribute('data-stub-title');
          a.removeAttribute('title');
          a.setAttribute('data-link', created.id);
        });
        mywikiStore.updateDoc(doc.id, { body: el.innerHTML });
      }
      notify.success(`'${stubTitle}' 문서를 새로 팠어요`);
      onOpenDoc(created.id);
    }
  };

  /* ── 툴바 (mousedown 에서 실행 — 선택 유지) ── */
  const exec = (fn: () => void) => (e: React.MouseEvent) => {
    e.preventDefault();
    bodyRef.current?.focus();
    fn();
    scheduleSave();
  };
  const cmd = (command: string, value?: string) => () => document.execCommand(command, false, value);
  const insertTable = () => {
    const rows = '<tr><td> </td><td> </td><td> </td></tr>';
    document.execCommand('insertHTML', false, `<table><tr><th> </th><th> </th><th> </th></tr>${rows}${rows}</table><p></p>`);
  };
  const footnoteFromToolbar = (e: React.MouseEvent) => {
    e.preventDefault();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || !bodyRef.current?.contains(sel.getRangeAt(0).commonAncestorContainer)) {
      notify.info('주석을 달 위치를 본문에서 클릭한 뒤 눌러주세요');
      return;
    }
    savedRange.current = sel.getRangeAt(0).cloneRange();
    const r = sel.getRangeAt(0).getBoundingClientRect();
    setPop({ mode: 'footnote', text: '', top: (r.bottom || 200) + 8, left: Math.max(12, Math.min(r.left || 200, window.innerWidth - 300)), q: '' });
  };

  const commitTitle = () => {
    const t = title.trim();
    if (!t) { setTitle(doc.title); return; }
    if (t !== doc.title) mywikiStore.updateDoc(doc.id, { title: t });
  };

  const removeDoc = () => {
    const kids = docs.filter((d) => d.parentId === doc.id).length;
    const msg = kids > 0
      ? `'${doc.title}' 문서를 삭제할까요?\n\n하위 문서 ${kids}개는 한 단계 위로 올라가요.`
      : `'${doc.title}' 문서를 삭제할까요?`;
    if (!confirm(msg)) return;
    mywikiStore.removeDoc(doc.id);
    notify.success('삭제했어요');
    onDeleted();
  };

  /* ── 인포박스·태그 ── */
  const addInfoRow = () => {
    const k = infoK.trim();
    const v = infoV.trim();
    if (!k || !v) { setAddingInfo(false); setInfoK(''); setInfoV(''); return; }
    mywikiStore.updateDoc(doc.id, { infobox: [...doc.infobox, { k, v }] });
    setInfoK(''); setInfoV(''); setAddingInfo(false);
  };
  const addTag = () => {
    const t = tagVal.trim().replace(/^#/, '');
    if (t && !doc.tags.includes(t)) mywikiStore.updateDoc(doc.id, { tags: [...doc.tags, t] });
    setTagVal(''); setTagInput(false);
  };

  const tbBtn: React.CSSProperties = {
    height: 30, padding: '0 10px', border: 'none', background: 'transparent', borderRadius: 7,
    fontSize: 13, color: '#5C665F', cursor: 'pointer', fontFamily: SERIF,
  };

  const scrollToHeading = (id: string) => {
    const el = document.getElementById(id);
    const sc = scrollerRef.current;
    if (!el || !sc) return;
    sc.scrollTo({ top: el.offsetTop - 14, behavior: 'smooth' });
  };

  return (
    <div ref={scrollerRef} className="wiki-scroll" style={{ flex: 1, minWidth: 0, overflow: 'auto', background: WK.paper, position: 'relative' }}>
      <style>{BODY_CSS}</style>
      <div style={{ maxWidth: 1140, margin: '0 auto', padding: '0 40px 120px', display: 'flex', gap: 44 }}>

        {/* ── 본문 컬럼 ── */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* 브레드크럼 */}
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6, padding: '26px 0 4px', fontSize: 12.5, color: WK.muted }}>
            {crumbs.map((c, i) => (
              <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span
                  onClick={c.onClick}
                  style={{ cursor: c.onClick ? 'pointer' : 'default', color: i === crumbs.length - 1 ? '#3B6552' : WK.muted, fontWeight: i === crumbs.length - 1 ? 600 : 400 }}
                >
                  {c.title}
                </span>
                {i < crumbs.length - 1 && <span style={{ color: '#C9CFC7' }}>›</span>}
              </span>
            ))}
          </div>

          {/* 제목 */}
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commitTitle(); bodyRef.current?.focus(); } }}
            style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', fontFamily: SERIF, fontWeight: 700, fontSize: 38, lineHeight: 1.2, letterSpacing: '-0.02em', color: WK.inkDeep, margin: '6px 0 4px', padding: 0 }}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12.5, color: WK.faint, marginBottom: 20 }}>
            <span>{fmtRelative(doc.updatedAt)} 수정</span>
            {isStub && (
              <span style={{ color: WK.red, background: '#F7E9E6', padding: '2px 9px', borderRadius: 20, fontWeight: 600 }}>◌ 아직 정리 중인 문서</span>
            )}
            <button
              type="button"
              onClick={removeDoc}
              title="문서 삭제"
              aria-label="문서 삭제"
              style={{ marginLeft: 'auto', border: 'none', background: 'transparent', color: '#B9C2BC', cursor: 'pointer', padding: 4, borderRadius: 6, display: 'inline-flex' }}
            >
              <Trash2 size={15} />
            </button>
          </div>

          {/* 에디터 툴바 (스티키) */}
          <div style={{ position: 'sticky', top: 0, zIndex: 5, display: 'flex', alignItems: 'center', flexWrap: 'wrap', rowGap: 6, gap: 2, padding: '8px 0', marginBottom: 8, background: 'linear-gradient(#FBFAF5 72%, rgba(251,250,245,0))', borderBottom: `1px solid ${WK.line}` }}>
            <button type="button" title="큰 제목" style={tbBtn} onMouseDown={exec(cmd('formatBlock', 'H2'))}><b style={{ fontSize: 15 }}>제목</b></button>
            <button type="button" title="작은 제목" style={tbBtn} onMouseDown={exec(cmd('formatBlock', 'H3'))}>제목2</button>
            <button type="button" title="본문으로" style={tbBtn} onMouseDown={exec(cmd('formatBlock', 'P'))}>본문</button>
            <span style={{ width: 1, height: 18, background: '#E3DDCE', margin: '0 6px' }} />
            <button type="button" title="굵게" style={tbBtn} onMouseDown={exec(cmd('bold'))}><b>B</b></button>
            <button type="button" title="목록" style={tbBtn} onMouseDown={exec(cmd('insertUnorderedList'))}>≔ 목록</button>
            <button type="button" title="표 넣기" style={tbBtn} onMouseDown={exec(insertTable)}>▦ 표</button>
            <button type="button" title="주석 달기" style={tbBtn} onMouseDown={footnoteFromToolbar}>¹ 주석</button>
            <span style={{ fontSize: 12, color: WK.sand, paddingLeft: 6, whiteSpace: 'nowrap', marginLeft: 'auto' }}>
              글자를 <b style={{ color: WK.green }}>드래그</b>하면 다른 문서와 연결돼요
            </span>
          </div>

          {/* 본문 */}
          <div
            ref={bodyRef}
            className="wk-body"
            contentEditable
            suppressContentEditableWarning
            spellCheck={false}
            onInput={scheduleSave}
            onMouseUp={onBodyMouseUp}
            onClick={onBodyClick}
            onPaste={(e) => {
              e.preventDefault();
              const text = e.clipboardData.getData('text/plain');
              document.execCommand('insertText', false, text);
            }}
            style={{ minHeight: 220 }}
          />

          {/* 주석 */}
          {doc.footnotes.length > 0 && (
            <div style={{ marginTop: 34, paddingTop: 16, borderTop: `1px solid ${WK.line}` }}>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', color: WK.faint, marginBottom: 10 }}>주석</div>
              {doc.footnotes.map((f) => (
                <div key={f.n} style={{ display: 'flex', gap: 8, fontSize: 13.5, color: '#5C665F', lineHeight: 1.7, marginBottom: 6 }}>
                  <span style={{ color: WK.green, fontWeight: 600 }}>{f.n}</span>
                  <span>{f.text}</span>
                </div>
              ))}
            </div>
          )}

          {/* 백링크 */}
          <div style={{ marginTop: 38 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <span style={{ fontFamily: SERIF, fontSize: 19, fontWeight: 600, color: WK.inkDeep }}>이 문서를 언급한 곳</span>
              <span style={{ background: '#E4EDE7', color: '#3B6552', fontSize: 11.5, fontWeight: 600, padding: '2px 8px', borderRadius: 20 }}>{backlinks.length}</span>
              <span style={{ fontSize: 12, color: WK.sand }}>— 자동으로 모여요</span>
            </div>
            {backlinks.length === 0 ? (
              <div style={{ fontSize: 13.5, color: '#A7B0AA', fontStyle: 'italic' }}>아직 이 문서를 가리키는 곳이 없어요.</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {backlinks.map((b) => (
                  <div key={b.id} onClick={() => onOpenDoc(b.id)} style={{ border: '1px solid #EAE4D5', background: '#fff', borderRadius: 12, padding: '14px 16px', cursor: 'pointer' }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: WK.greenDark, marginBottom: 5 }}>{b.title}</div>
                    <div style={{ fontSize: 12.5, color: '#7A857F', lineHeight: 1.6 }}>{b.snippet || '이 문서를 링크로 언급'}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── 우측: 인포박스 + 목차 ── */}
        <div style={{ width: 240, flex: 'none', paddingTop: 26 }} className="hidden xl:block">
          <div style={{ position: 'sticky', top: 20 }}>
            <div style={{ border: '1px solid #E7E1D2', borderRadius: 14, overflow: 'hidden', background: '#fff', marginBottom: 22 }}>
              <div style={{ background: WK.inkDeep, color: '#DCEAE1', padding: '11px 15px', fontSize: 13, fontWeight: 600 }}>{doc.title}</div>
              <div style={{ padding: '6px 15px 12px' }}>
                {doc.infobox.map((row, i) => (
                  <div key={i} className="group" style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '7px 0', borderBottom: '1px solid #F1EDE2', fontSize: 12.5, alignItems: 'baseline' }}>
                    <span style={{ color: WK.faint }}>{row.k}</span>
                    <span style={{ color: '#2E3A34', fontWeight: 500, textAlign: 'right' }}>
                      {row.v}
                      <button
                        type="button"
                        aria-label={`${row.k} 항목 삭제`}
                        onClick={() => mywikiStore.updateDoc(doc.id, { infobox: doc.infobox.filter((_, j) => j !== i) })}
                        className="opacity-0 group-hover:opacity-100"
                        style={{ border: 'none', background: 'transparent', color: '#C7BFA9', cursor: 'pointer', marginLeft: 5, fontSize: 11 }}
                      >✕</button>
                    </span>
                  </div>
                ))}
                {addingInfo ? (
                  <div style={{ display: 'flex', gap: 5, padding: '8px 0 2px' }}>
                    <input autoFocus value={infoK} onChange={(e) => setInfoK(e.target.value)} placeholder="항목" style={{ width: 64, border: '1px solid #E2DCCD', borderRadius: 7, padding: '4px 7px', fontSize: 12, outline: 'none', fontFamily: 'inherit' }} />
                    <input value={infoV} onChange={(e) => setInfoV(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addInfoRow(); if (e.key === 'Escape') setAddingInfo(false); }} onBlur={addInfoRow} placeholder="값" style={{ flex: 1, minWidth: 0, border: '1px solid #E2DCCD', borderRadius: 7, padding: '4px 7px', fontSize: 12, outline: 'none', fontFamily: 'inherit' }} />
                  </div>
                ) : null}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, paddingTop: 11 }}>
                  {doc.tags.map((t) => (
                    <span
                      key={t}
                      onClick={() => mywikiStore.updateDoc(doc.id, { tags: doc.tags.filter((x) => x !== t) })}
                      title="누르면 제거"
                      style={{ background: '#EDF2EE', color: '#3B6552', fontSize: 11.5, padding: '3px 9px', borderRadius: 20, whiteSpace: 'nowrap', cursor: 'pointer' }}
                    >{t}</span>
                  ))}
                  {tagInput ? (
                    <input autoFocus value={tagVal} onChange={(e) => setTagVal(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addTag(); if (e.key === 'Escape') setTagInput(false); }} onBlur={addTag} placeholder="태그" style={{ width: 68, border: '1px solid #E2DCCD', borderRadius: 20, padding: '3px 9px', fontSize: 11.5, outline: 'none', fontFamily: 'inherit' }} />
                  ) : (
                    <span onClick={() => setTagInput(true)} style={{ border: '1px dashed #CFD6CF', color: '#93A099', fontSize: 11.5, padding: '3px 9px', borderRadius: 20, cursor: 'pointer', whiteSpace: 'nowrap' }}>+ 태그</span>
                  )}
                  {!addingInfo && (
                    <span onClick={() => setAddingInfo(true)} style={{ border: '1px dashed #CFD6CF', color: '#93A099', fontSize: 11.5, padding: '3px 9px', borderRadius: 20, cursor: 'pointer', whiteSpace: 'nowrap' }}>+ 항목</span>
                  )}
                </div>
              </div>
            </div>

            {headings.length > 0 && (
              <>
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', color: WK.sand, margin: '0 0 8px 2px', textTransform: 'uppercase' }}>목차</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {headings.map((h) => (
                    <div
                      key={h.id}
                      onClick={() => scrollToHeading(h.id)}
                      style={{ padding: '6px 10px', paddingLeft: h.level === 3 ? 22 : 10, borderRadius: 7, fontSize: 13, color: '#5C665F', cursor: 'pointer', borderLeft: '2px solid #EAE4D5' }}
                    >{h.text}</div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── 선택 팝오버 ── */}
      {pop && (
        <div
          ref={popRef}
          style={{ position: 'fixed', top: pop.top, left: pop.left, zIndex: 50, background: '#fff', border: '1px solid #E4DECF', borderRadius: 12, boxShadow: '0 14px 40px rgba(20,52,43,0.18)' }}
        >
          {pop.mode === 'menu' && (
            <div style={{ display: 'flex', flexDirection: 'column', padding: 6, minWidth: 210 }}>
              <PopItem onClick={() => setPop({ ...pop, mode: 'link', q: '' })} icon="🔗" label="다른 문서에 연결" />
              <PopItem onClick={markStub} icon="◌" iconColor={WK.red} label="나중에 만들 문서로 표시" />
              <PopItem onClick={() => setPop({ ...pop, mode: 'footnote', q: '' })} icon="¹" label="주석 달기" />
            </div>
          )}
          {pop.mode === 'link' && (
            <div style={{ padding: 8, minWidth: 250 }}>
              <div style={{ fontSize: 11.5, color: '#93A099', padding: '2px 6px 8px' }}>
                ‘<b style={{ color: WK.green }}>{pop.text}</b>’ 을(를) 연결할 문서
              </div>
              <input
                autoFocus
                value={pop.q}
                onChange={(e) => setPop({ ...pop, q: e.target.value })}
                placeholder="문서 검색…"
                style={{ width: '100%', border: '1px solid #E2DCCD', borderRadius: 8, padding: '8px 10px', fontSize: 13, outline: 'none', marginBottom: 6, fontFamily: 'inherit' }}
              />
              <div style={{ maxHeight: 190, overflow: 'auto' }}>
                {docs
                  .filter((d) => d.id !== doc.id && (!pop.q.trim() || d.title.toLowerCase().includes(pop.q.trim().toLowerCase())))
                  .slice(0, 7)
                  .map((d) => (
                    <div key={d.id} onClick={() => linkTo(d)} style={{ padding: '8px 10px', borderRadius: 8, cursor: 'pointer', fontSize: 13.5, color: WK.ink, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: WK.green }}>📄</span> {d.title}
                    </div>
                  ))}
                <div onClick={createAndLink} style={{ marginTop: 4, padding: '9px 10px', borderRadius: 8, cursor: 'pointer', fontSize: 13, color: WK.green, fontWeight: 600, borderTop: '1px solid #F0ECE0', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>＋</span> ‘{pop.text}’ 새 문서로 만들며 연결
                </div>
              </div>
            </div>
          )}
          {pop.mode === 'footnote' && (
            <div style={{ padding: 8, minWidth: 260 }}>
              <div style={{ fontSize: 11.5, color: '#93A099', padding: '2px 6px 8px' }}>주석 내용</div>
              <input
                autoFocus
                value={pop.q}
                onChange={(e) => setPop({ ...pop, q: e.target.value })}
                onKeyDown={(e) => { if (e.key === 'Enter') addFootnote(pop.q); if (e.key === 'Escape') setPop(null); }}
                placeholder="입력 후 Enter"
                style={{ width: '100%', border: '1px solid #E2DCCD', borderRadius: 8, padding: '8px 10px', fontSize: 13, outline: 'none', fontFamily: 'inherit' }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PopItem({ onClick, icon, iconColor, label }: { onClick: () => void; icon: string; iconColor?: string; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 11px', border: 'none', background: 'transparent', borderRadius: 8, fontSize: 13.5, color: WK.ink, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', width: '100%' }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#F4F1E8'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
    >
      <span style={{ fontSize: 15, color: iconColor }}>{icon}</span> {label}
    </button>
  );
}
