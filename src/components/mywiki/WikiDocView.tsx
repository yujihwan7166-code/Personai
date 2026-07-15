/**
 * 마이위키 문서 화면 — 양피지 서재 톤, 보기 기본 + 편집 토글.
 *
 * 보기: 세리프 본문 렌더 · float 인포박스 · 목차 박스 · 관련 문서 칩 · 백링크(발췌).
 * 편집: 제목 입력 · 스티키 툴바(제목/본문/굵게/목록/표/주석) · contentEditable
 *       · 드래그 선택 팝오버(다른 문서에 연결 / 나중에 만들 문서로 표시 / 주석).
 *
 * 링크는 문서 id 기반(<a data-link>) — 제목을 바꿔도 안 깨짐. 예약 링크는
 * <a data-stub-title> 로 붉게 표시되고, 보기 모드에서 클릭하면 그 자리에서 새 문서.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pencil, Check, Trash2 } from 'lucide-react';
import { notify } from '@/lib/notify';
import { PW, SANS, SERIF, STUB_TEXT_LENGTH, type WikiDoc, type WikiTopic } from '@/types/mywiki';
import { mywikiStore } from '@/services/mywikiStore';
import {
  backlinkSnippet, extractWikiToc, linkHtml, outgoingLinkIds, stubHtml, stubLinkTitles, wikiPlainText,
} from '@/lib/mywiki/html';

/* 본문 렌더/편집 공용 스타일 — sanitize 가 style 을 걷어내므로 표시는 전부 여기서. */
const BODY_CSS = `
.pwk-body { font-family: ${SANS}; font-size: 16.5px; line-height: 1.85; color: ${PW.body}; }
.pwk-body:focus { outline: none; }
.pwk-body p { margin: 0 0 0.95em; }
.pwk-body h2 { font-family: ${SERIF}; font-weight: 700; font-size: 22px; color: ${PW.ink}; margin: 26px 0 12px; padding-bottom: 7px; border-bottom: 1px solid ${PW.cardLine}; letter-spacing: -0.01em; }
.pwk-body h3 { font-family: ${SERIF}; font-weight: 700; font-size: 18px; color: ${PW.ink}; margin: 20px 0 8px; }
.pwk-body ul, .pwk-body ol { margin: 0 0 0.95em; padding-left: 22px; }
.pwk-body li { margin-bottom: 5px; }
.pwk-body blockquote { margin: 0 0 0.95em; padding: 2px 0 2px 14px; border-left: 3px solid ${PW.input}; color: ${PW.sub}; }
.pwk-body a[data-link] { color: ${PW.accent}; border-bottom: 1px solid ${PW.linkUnder}; cursor: pointer; text-decoration: none; font-weight: 500; }
.pwk-body a[data-stub-title] { color: ${PW.red}; border-bottom: 1px dashed ${PW.red}; cursor: pointer; text-decoration: none; }
.pwk-body sup[data-fn] { color: ${PW.accent}; font-size: 12px; font-weight: 700; }
.pwk-body table { border-collapse: collapse; margin: 0 0 0.95em; width: 100%; font-size: 14.5px; }
.pwk-body td, .pwk-body th { border: 1px solid ${PW.cardLine}; padding: 7px 10px; min-width: 56px; }
.pwk-body th { background: ${PW.card}; font-weight: 700; }
.pwk-body[contenteditable="true"]:empty::before { content: '여기에 써 내려가요. 글자를 드래그하면 다른 문서와 이어져요.'; color: ${PW.faint}; font-style: italic; }
`;

type PopState =
  | { mode: 'menu'; text: string; top: number; left: number }
  | { mode: 'link'; text: string; top: number; left: number; q: string }
  | { mode: 'footnote'; text: string; top: number; left: number; q: string }
  | null;

interface Props {
  doc: WikiDoc;
  docs: WikiDoc[];
  topic: WikiTopic;
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

export function WikiDocView({ doc, docs, topic, crumbs, onOpenDoc, onDeleted }: Props) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(doc.title);
  const [pop, setPop] = useState<PopState>(null);
  const [addingInfo, setAddingInfo] = useState(false);
  const [infoK, setInfoK] = useState('');
  const [infoV, setInfoV] = useState('');

  const bodyRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const savedRange = useRef<Range | null>(null);
  const saveTimer = useRef<number | null>(null);
  const docRef = useRef(doc);
  docRef.current = doc;

  /* 문서 전환 시 상태 초기화 */
  useEffect(() => {
    setTitle(doc.title);
    setEditing(false);
    setPop(null);
    setAddingInfo(false);
    scrollerRef.current?.scrollTo({ top: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc.id]);

  /* 편집 진입 시 본문 주입 (편집 중 리렌더로 덮지 않게 편집 시작 시 1회만) */
  useEffect(() => {
    if (!editing) return;
    const el = bodyRef.current;
    if (el) el.innerHTML = doc.body;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, doc.id]);

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

  useEffect(() => () => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
  }, []);

  const finishEditing = () => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    commitBody();
    const t = title.trim();
    if (t && t !== doc.title) mywikiStore.updateDoc(doc.id, { title: t });
    setEditing(false);
    setPop(null);
  };

  /* ── 파생값 (저장된 body 기준) ── */
  const plain = useMemo(() => wikiPlainText(doc.body), [doc.body]);
  const isStub = plain.length < STUB_TEXT_LENGTH;
  const { html: viewHtml, headings } = useMemo(() => extractWikiToc(doc.body), [doc.body]);
  const backlinks = useMemo(
    () => docs
      .filter((d) => d.id !== doc.id && outgoingLinkIds(d.body).includes(doc.id))
      .map((d) => ({ id: d.id, title: d.title, snippet: backlinkSnippet(d.body, doc.id) })),
    [docs, doc.id],
  );
  const related = useMemo(() => {
    const out: Array<{ title: string; exists: boolean; id?: string; stubTitle?: string }> = [];
    for (const id of outgoingLinkIds(doc.body)) {
      const d = docs.find((x) => x.id === id);
      if (d) out.push({ title: d.title, exists: true, id });
    }
    for (const t of stubLinkTitles(doc.body)) out.push({ title: t, exists: false, stubTitle: t });
    return out;
  }, [doc.body, docs]);

  /* ── 예약 링크 → 그 자리에서 생성 (문자열 치환으로 저장본 갱신) ── */
  const materializeStub = useCallback((stubTitle: string) => {
    const created = mywikiStore.addDoc({ topicId: doc.topicId, parentId: doc.id, title: stubTitle });
    const holder = document.createElement('div');
    holder.innerHTML = docRef.current.body;
    holder.querySelectorAll(`a[data-stub-title="${CSS.escape(stubTitle)}"]`).forEach((a) => {
      a.removeAttribute('data-stub-title');
      a.removeAttribute('title');
      a.setAttribute('data-link', created.id);
    });
    mywikiStore.updateDoc(doc.id, { body: holder.innerHTML });
    notify.success(`'${stubTitle}' 문서를 새로 팠어요`, { duration: 2200 });
    onOpenDoc(created.id);
  }, [doc.topicId, doc.id, onOpenDoc]);

  /* ── 본문 클릭 (보기·편집 공용) ── */
  const onBodyClick = (e: React.MouseEvent) => {
    const t = e.target as HTMLElement;
    const link = t.closest('a[data-link]');
    if (link) {
      e.preventDefault();
      const id = link.getAttribute('data-link')!;
      if (docs.some((d) => d.id === id)) {
        if (editing) finishEditing();
        onOpenDoc(id);
      }
      return;
    }
    const stub = t.closest('a[data-stub-title]');
    if (stub) {
      e.preventDefault();
      if (editing) commitBody();
      materializeStub(stub.getAttribute('data-stub-title')!);
    }
  };

  /* ── 선택 팝오버 (편집 모드 전용) ── */
  const onBodyMouseUp = () => {
    if (!editing) return;
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

  const replaceSelection = (html: string) => {
    const range = savedRange.current;
    if (!range || !bodyRef.current) return;
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
    notify.success(`'${pop.text}' 새 문서를 만들며 연결했어요`, { description: '이 문서의 하위로 들어갔어요' });
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
      range.collapse(false);
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

  /* ── 툴바 ── */
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
    setPop({ mode: 'footnote', text: '', top: (r.bottom || 220) + 8, left: Math.max(12, Math.min(r.left || 220, window.innerWidth - 300)), q: '' });
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

  const addInfoRow = () => {
    const k = infoK.trim();
    const v = infoV.trim();
    setAddingInfo(false);
    setInfoK(''); setInfoV('');
    if (!k || !v) return;
    mywikiStore.updateDoc(doc.id, { infobox: [...doc.infobox, { k, v }] });
  };

  const tbBtn: React.CSSProperties = {
    height: 30, padding: '0 10px', border: 'none', background: 'transparent', borderRadius: 7,
    fontSize: 13, color: PW.sub, cursor: 'pointer', fontFamily: 'inherit',
  };

  const scrollToHeading = (id: string) => {
    const el = document.getElementById(id);
    const sc = scrollerRef.current;
    if (!el || !sc) return;
    sc.scrollTo({ top: el.offsetTop - 16, behavior: 'smooth' });
  };

  return (
    <div ref={scrollerRef} className="pwk-scroll" style={{ flex: 1, minWidth: 0, overflow: 'auto', position: 'relative', padding: '36px 48px 120px' }}>
      <style>{BODY_CSS}</style>
      <article style={{ maxWidth: 760, margin: '0 auto' }}>
        {/* 브레드크럼 + 편집 토글 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', fontSize: 12.5, color: PW.faint, marginBottom: 10 }}>
          {crumbs.map((c, i) => (
            <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span onClick={c.onClick} style={{ cursor: c.onClick ? 'pointer' : 'default', color: i === crumbs.length - 1 ? PW.sub : PW.faint, fontWeight: i === crumbs.length - 1 ? 700 : 400 }}>
                {c.title}
              </span>
              {i < crumbs.length - 1 && <span style={{ opacity: 0.5 }}>›</span>}
            </span>
          ))}
          <span style={{ flex: 1 }} />
          {editing ? (
            <button type="button" onClick={finishEditing} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: 'none', background: PW.accent, color: '#fbf6ee', borderRadius: 8, padding: '6px 14px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              <Check size={13} strokeWidth={2.6} /> 완료
            </button>
          ) : (
            <button type="button" onClick={() => setEditing(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: `1px solid ${PW.input}`, background: PW.inputBg, color: PW.sub, borderRadius: 8, padding: '6px 13px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              <Pencil size={12} /> 편집
            </button>
          )}
        </div>

        {/* 제목 */}
        {editing ? (
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); bodyRef.current?.focus(); } }}
            style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', fontFamily: SERIF, fontWeight: 700, fontSize: 34, letterSpacing: '-0.02em', color: PW.ink, margin: '0 0 6px', padding: 0, borderBottom: `2px dashed ${PW.input}` }}
          />
        ) : (
          <h1 style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 34, letterSpacing: '-0.02em', color: PW.ink, margin: '0 0 6px' }}>{doc.title}</h1>
        )}

        {/* 메타 줄 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12.5, color: PW.faint, marginBottom: 18 }}>
          <span>{topic.name} · {fmtRelative(doc.updatedAt)} 수정</span>
          {isStub && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 11px', background: '#fbeeec', border: '1px solid #f0d3ce', borderRadius: 20, fontSize: 12, color: PW.red }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: PW.red }} /> 얇은 판 · 아직 정리 중
            </span>
          )}
          <button type="button" onClick={removeDoc} title="문서 삭제" aria-label="문서 삭제" style={{ marginLeft: 'auto', border: 'none', background: 'transparent', color: '#c4b8a4', cursor: 'pointer', padding: 4, borderRadius: 6, display: 'inline-flex' }}>
            <Trash2 size={15} />
          </button>
        </div>

        {/* 인포박스 — float 우측 (시안 그대로) */}
        <div style={{ float: 'right', width: 250, margin: '4px 0 22px 28px', background: PW.card, border: `1px solid #e4dbc9`, borderRadius: 12, overflow: 'hidden' }} className="hidden sm:block">
          <div style={{ padding: '11px 15px', background: topic.tint, color: '#fbf6ee', fontFamily: SERIF, fontWeight: 700, fontSize: 15 }}>{doc.title}</div>
          <div>
            {doc.infobox.map((row, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, padding: '9px 15px', borderBottom: '1px solid #efe8d9', fontSize: 13 }}>
                <span style={{ flex: '0 0 62px', color: PW.faint, fontWeight: 500 }}>{row.k}</span>
                <span style={{ flex: 1, color: PW.body, lineHeight: 1.55 }}>
                  {row.v}
                  {editing && (
                    <button type="button" aria-label={`${row.k} 삭제`} onClick={() => mywikiStore.updateDoc(doc.id, { infobox: doc.infobox.filter((_, j) => j !== i) })} style={{ border: 'none', background: 'transparent', color: '#c4b8a4', cursor: 'pointer', marginLeft: 5, fontSize: 11 }}>✕</button>
                  )}
                </span>
              </div>
            ))}
            {editing && (addingInfo ? (
              <div style={{ display: 'flex', gap: 5, padding: '8px 12px' }}>
                <input autoFocus value={infoK} onChange={(e) => setInfoK(e.target.value)} placeholder="항목" style={{ width: 58, border: `1px solid ${PW.input}`, borderRadius: 7, padding: '4px 7px', fontSize: 12, outline: 'none', fontFamily: 'inherit', background: PW.inputBg }} />
                <input value={infoV} onChange={(e) => setInfoV(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addInfoRow(); if (e.key === 'Escape') setAddingInfo(false); }} onBlur={addInfoRow} placeholder="값" style={{ flex: 1, minWidth: 0, border: `1px solid ${PW.input}`, borderRadius: 7, padding: '4px 7px', fontSize: 12, outline: 'none', fontFamily: 'inherit', background: PW.inputBg }} />
              </div>
            ) : (
              <button type="button" onClick={() => setAddingInfo(true)} style={{ display: 'block', width: '100%', border: 'none', background: 'transparent', color: PW.faint, fontSize: 12, padding: '9px 15px', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>+ 항목 추가</button>
            ))}
          </div>
        </div>

        {/* 목차 (보기 모드 · 헤딩 2개 이상) */}
        {!editing && headings.length >= 2 && (
          <nav style={{ margin: '4px 0 18px', padding: '14px 20px', background: '#f6f1e7', border: `1px solid ${PW.cardLine}`, borderRadius: 12, display: 'inline-block', minWidth: 260 }}>
            <div style={{ fontSize: 11.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: PW.faint, fontWeight: 700, marginBottom: 8 }}>목차</div>
            {headings.map((h, i) => (
              <div key={h.id} onClick={() => scrollToHeading(h.id)} style={{ fontSize: 14, color: '#5a5147', padding: '3px 0', paddingLeft: h.level === 3 ? 16 : 0, cursor: 'pointer' }}>
                <span style={{ color: PW.sand, marginRight: 8 }}>{i + 1}</span>{h.text}
              </div>
            ))}
          </nav>
        )}

        {/* 편집 툴바 (편집 모드 · 스티키) */}
        {editing && (
          <div style={{ position: 'sticky', top: 0, zIndex: 5, display: 'flex', alignItems: 'center', flexWrap: 'wrap', rowGap: 6, gap: 2, padding: '8px 0', marginBottom: 10, background: `linear-gradient(${PW.paper} 72%, rgba(242,237,227,0))`, borderBottom: `1px solid ${PW.line}` }}>
            <button type="button" title="큰 제목" style={tbBtn} onMouseDown={exec(cmd('formatBlock', 'H2'))}><b style={{ fontSize: 14.5, fontFamily: SERIF }}>제목</b></button>
            <button type="button" title="작은 제목" style={tbBtn} onMouseDown={exec(cmd('formatBlock', 'H3'))}>제목2</button>
            <button type="button" title="본문으로" style={tbBtn} onMouseDown={exec(cmd('formatBlock', 'P'))}>본문</button>
            <span style={{ width: 1, height: 18, background: '#e3ddce', margin: '0 6px' }} />
            <button type="button" title="굵게" style={tbBtn} onMouseDown={exec(cmd('bold'))}><b>B</b></button>
            <button type="button" title="목록" style={tbBtn} onMouseDown={exec(cmd('insertUnorderedList'))}>≔ 목록</button>
            <button type="button" title="표 넣기" style={tbBtn} onMouseDown={exec(insertTable)}>▦ 표</button>
            <button type="button" title="주석 달기" style={tbBtn} onMouseDown={footnoteFromToolbar}>¹ 주석</button>
            <span style={{ fontSize: 12, color: PW.sand, paddingLeft: 6, whiteSpace: 'nowrap', marginLeft: 'auto' }}>
              글자를 <b style={{ color: PW.accent }}>드래그</b>하면 다른 문서와 연결돼요
            </span>
          </div>
        )}

        {/* 본문 */}
        {editing ? (
          <div
            ref={bodyRef}
            className="pwk-body"
            contentEditable
            suppressContentEditableWarning
            spellCheck={false}
            onInput={scheduleSave}
            onMouseUp={onBodyMouseUp}
            onClick={onBodyClick}
            onPaste={(e) => {
              e.preventDefault();
              document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
            }}
            style={{ minHeight: 240 }}
          />
        ) : (
          <div
            className="pwk-body"
            onClick={onBodyClick}
            dangerouslySetInnerHTML={{ __html: viewHtml || `<p style="color:${PW.faint};font-style:italic;">아직 내용이 없어요 — 우상단 '편집'을 눌러 첫 문장을 적어보세요.</p>` }}
          />
        )}

        {/* 주석 */}
        {doc.footnotes.length > 0 && (
          <div style={{ clear: 'both', marginTop: 32, paddingTop: 14, borderTop: `1px solid ${PW.cardLine}` }}>
            <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.08em', color: PW.faint, marginBottom: 8 }}>주석</div>
            {doc.footnotes.map((f) => (
              <div key={f.n} style={{ display: 'flex', gap: 8, fontSize: 13.5, color: PW.sub, lineHeight: 1.7, marginBottom: 5 }}>
                <span style={{ color: PW.accent, fontWeight: 700 }}>{f.n}</span>
                <span>{f.text}</span>
              </div>
            ))}
          </div>
        )}

        {/* 푸터 — 관련 문서 + 백링크 */}
        <footer style={{ clear: 'both', marginTop: 42, paddingTop: 24, borderTop: `1px solid ${PW.cardLine}` }}>
          {related.length > 0 && (
            <div style={{ marginBottom: 22 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: PW.ink, marginBottom: 10 }}>관련 문서</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {related.map((r, i) => (
                  <span
                    key={i}
                    onClick={() => (r.exists && r.id ? onOpenDoc(r.id) : materializeStub(r.stubTitle!))}
                    style={{
                      padding: '6px 13px', borderRadius: 20, fontSize: 13.5, cursor: 'pointer',
                      border: `1px solid ${r.exists ? '#ddd3c0' : '#f0d3ce'}`,
                      background: r.exists ? PW.card : '#fbeeec',
                      color: r.exists ? '#5a5147' : PW.red,
                    }}
                  >{r.title}</span>
                ))}
              </div>
            </div>
          )}
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: PW.ink, marginBottom: 4 }}>
              여기를 가리키는 문서 <span style={{ color: PW.sand, fontWeight: 400 }}>· 자동으로 모여요</span>
            </div>
            {backlinks.length === 0 ? (
              <div style={{ fontSize: 13.5, color: PW.sand, fontStyle: 'italic', marginTop: 8 }}>아직 이 문서를 가리키는 곳이 없어요.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
                {backlinks.map((b) => (
                  <div key={b.id} onClick={() => onOpenDoc(b.id)} style={{ padding: '11px 14px', background: PW.card, border: `1px solid ${PW.cardLine}`, borderRadius: 10, cursor: 'pointer' }}>
                    <div style={{ fontSize: 14, color: PW.ink, fontWeight: 600 }}>{b.title}</div>
                    {b.snippet && <div style={{ fontSize: 12.5, color: PW.faint, marginTop: 2, lineHeight: 1.5 }}>{b.snippet}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </footer>
      </article>

      {/* ── 선택 팝오버 (편집 모드) ── */}
      {pop && (
        <div ref={popRef} style={{ position: 'fixed', top: pop.top, left: pop.left, zIndex: 50, background: PW.inputBg, border: `1px solid ${PW.line}`, borderRadius: 12, boxShadow: '0 14px 40px rgba(60,45,30,0.18)' }}>
          {pop.mode === 'menu' && (
            <div style={{ display: 'flex', flexDirection: 'column', padding: 6, minWidth: 210 }}>
              <PopItem onClick={() => setPop({ ...pop, mode: 'link', q: '' })} icon="🔗" label="다른 문서에 연결" />
              <PopItem onClick={markStub} icon="◌" iconColor={PW.red} label="나중에 만들 문서로 표시" />
              <PopItem onClick={() => setPop({ ...pop, mode: 'footnote', q: '' })} icon="¹" label="주석 달기" />
            </div>
          )}
          {pop.mode === 'link' && (
            <div style={{ padding: 8, minWidth: 250 }}>
              <div style={{ fontSize: 11.5, color: PW.faint, padding: '2px 6px 8px' }}>
                ‘<b style={{ color: PW.accent }}>{pop.text}</b>’ 을(를) 연결할 문서
              </div>
              <input
                autoFocus
                value={pop.q}
                onChange={(e) => setPop({ ...pop, q: e.target.value })}
                placeholder="문서 검색…"
                style={{ width: '100%', border: `1px solid ${PW.input}`, borderRadius: 8, padding: '8px 10px', fontSize: 13, outline: 'none', marginBottom: 6, fontFamily: 'inherit', background: '#fff' }}
              />
              <div style={{ maxHeight: 190, overflow: 'auto' }}>
                {docs
                  .filter((d) => d.id !== doc.id && (!pop.q.trim() || d.title.toLowerCase().includes(pop.q.trim().toLowerCase())))
                  .slice(0, 7)
                  .map((d) => (
                    <div key={d.id} onClick={() => linkTo(d)} style={{ padding: '8px 10px', borderRadius: 8, cursor: 'pointer', fontSize: 13.5, color: PW.body, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: PW.accent }}>📄</span> {d.title}
                    </div>
                  ))}
                <div onClick={createAndLink} style={{ marginTop: 4, padding: '9px 10px', borderRadius: 8, cursor: 'pointer', fontSize: 13, color: PW.accent, fontWeight: 700, borderTop: '1px solid #f0ece0', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>＋</span> ‘{pop.text}’ 새 문서로 만들며 연결
                </div>
              </div>
            </div>
          )}
          {pop.mode === 'footnote' && (
            <div style={{ padding: 8, minWidth: 260 }}>
              <div style={{ fontSize: 11.5, color: PW.faint, padding: '2px 6px 8px' }}>주석 내용</div>
              <input
                autoFocus
                value={pop.q}
                onChange={(e) => setPop({ ...pop, q: e.target.value })}
                onKeyDown={(e) => { if (e.key === 'Enter') addFootnote(pop.q); if (e.key === 'Escape') setPop(null); }}
                placeholder="입력 후 Enter"
                style={{ width: '100%', border: `1px solid ${PW.input}`, borderRadius: 8, padding: '8px 10px', fontSize: 13, outline: 'none', fontFamily: 'inherit', background: '#fff' }}
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
      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 11px', border: 'none', background: 'transparent', borderRadius: 8, fontSize: 13.5, color: PW.body, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', width: '100%' }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = '#f5efe4'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
    >
      <span style={{ fontSize: 15, color: iconColor }}>{icon}</span> {label}
    </button>
  );
}
