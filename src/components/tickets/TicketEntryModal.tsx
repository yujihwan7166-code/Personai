/**
 * 티켓 끊기 / 수정 — 1번 시안의 중앙 모달.
 * 제목 검색(API) → 자동 채움 / AI 채움 → 별점·본날·어디서·한줄평 → (접힘) 긴감상·명대사·사진.
 * 사진은 저장 시점에만 IndexedDB 로 커밋(취소 시 고아 방지).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { X, Plus, Sparkles, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  KIND_LABEL, KIND_CREATOR_LABEL, TICKET_KINDS, type TicketEntry, type TicketKind,
} from '@/lib/tickets/ticketStore';
import { searchMedia, hasApiFor, type MediaSearchResult } from '@/lib/tickets/search';
import { aiFillEntry } from '@/lib/tickets/aiFill';
import { putPhoto, getPhotoUrl, deletePhoto, deletePhotos } from '@/lib/tickets/photoStore';
import { KIND_EMOJI, PLACES, GENRES, DEFAULT_GENRE, gradientFor, palFor, todayKeyLocal } from './ticketVisuals';

export type TicketDraft = Omit<TicketEntry, 'id' | 'createdAt'>;

interface Props {
  open: boolean;
  initial: TicketEntry | null;              // null = 새 티켓, 있으면 수정
  // 추천·탐색·볼 것에서 담기 — 있는 만큼 미리 채움
  prefill?: { kind?: TicketKind; title?: string; creator?: string; year?: number; posterUrl?: string; genres?: string[] } | null;
  entriesCount: number;                     // 다음 시리얼 미리보기
  onClose: () => void;
  onSave: (draft: TicketDraft, editingId?: string) => void;
}

type PhotoItem = { key: string; url: string; id?: string; file?: File };

const inputStyle: React.CSSProperties = {
  width: '100%', background: '#0b131f', border: '1px solid #ffffff1c', borderRadius: 11,
  color: '#eef1f6', padding: '10px 12px', fontSize: 14, outline: 'none', fontFamily: 'inherit',
};
const labelStyle: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: '#9aa3b2', display: 'block', marginBottom: 7 };

export function TicketEntryModal({ open, initial, prefill, entriesCount, onClose, onSave }: Props) {
  const [kind, setKind] = useState<TicketKind>('movie');
  const [title, setTitle] = useState('');
  const [creator, setCreator] = useState('');
  const [year, setYear] = useState('');
  const [genres, setGenres] = useState<string[]>([]);
  const [rating, setRating] = useState(0);
  const [watchedAt, setWatchedAt] = useState(todayKeyLocal());
  const [where, setWhere] = useState('');
  const [oneLiner, setOneLiner] = useState('');
  const [longNote, setLongNote] = useState('');
  const [quote, setQuote] = useState('');
  const [posterUrl, setPosterUrl] = useState<string | undefined>();
  const [expanded, setExpanded] = useState(false);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [results, setResults] = useState<MediaSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [filled, setFilled] = useState(false);   // 검색/AI 로 메타 채워짐 → 결과 숨김
  const [err, setErr] = useState('');
  const debounceRef = useRef<number | null>(null);
  const editingId = initial?.id;

  // 열릴 때 초기화 (수정=기존값, 신규=prefill/빈값)
  useEffect(() => {
    if (!open) return;
    setErr(''); setResults([]); setAiBusy(false); setSearching(false);
    if (initial) {
      setKind(initial.kind); setTitle(initial.title); setCreator(initial.creator);
      setYear(initial.year ? String(initial.year) : ''); setGenres(initial.genres ?? []);
      setRating(initial.rating); setWatchedAt(initial.watchedAt); setWhere(initial.where ?? '');
      setOneLiner(initial.oneLiner); setLongNote(initial.longNote ?? ''); setQuote((initial.quotes ?? []).join('\n'));
      setPosterUrl(initial.posterUrl); setFilled(true);
      setExpanded(!!(initial.longNote || initial.quotes?.length || initial.photoIds?.length));
    } else {
      setKind(prefill?.kind ?? 'movie'); setTitle(prefill?.title ?? ''); setCreator(prefill?.creator ?? '');
      setYear(prefill?.year ? String(prefill.year) : ''); setGenres(prefill?.genres ?? []);
      setRating(0); setWatchedAt(todayKeyLocal()); setWhere(''); setOneLiner('');
      setLongNote(''); setQuote(''); setPosterUrl(prefill?.posterUrl); setFilled(!!prefill?.title); setExpanded(false);
    }
  }, [open, initial, prefill]);

  // 기존 사진 로드 (수정 시)
  useEffect(() => {
    if (!open) { setPhotos([]); return; }
    let alive = true;
    const urls: string[] = [];
    (async () => {
      const loaded: PhotoItem[] = [];
      for (const id of initial?.photoIds ?? []) {
        const url = await getPhotoUrl(id);
        if (url) { urls.push(url); loaded.push({ key: id, url, id }); }
      }
      if (alive) setPhotos(loaded); else urls.forEach(URL.revokeObjectURL);
    })();
    return () => { alive = false; };
  }, [open, initial]);

  // Esc 닫기
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const onTitle = (v: string) => {
    setTitle(v); setErr('');
    if (filled) { setFilled(false); setCreator(''); setYear(''); setGenres([]); setPosterUrl(undefined); }
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    const q = v.trim();
    if (!q || !hasApiFor(kind)) { setResults([]); setSearching(false); return; }
    setSearching(true);
    debounceRef.current = window.setTimeout(async () => {
      const rs = await searchMedia(kind, q);
      setResults(rs); setSearching(false);
    }, 400);
  };

  const pick = (r: MediaSearchResult) => {
    setKind(r.kind); setTitle(r.title); setCreator(r.creator);
    setYear(r.year ? String(r.year) : ''); setGenres(r.genres ?? []);
    setPosterUrl(r.posterUrl); setFilled(true); setResults([]);
  };

  const runAiFill = async () => {
    if (!title.trim()) { setErr('제목을 먼저 입력해주세요'); return; }
    if (aiBusy) return;
    setAiBusy(true); setResults([]);
    const r = await aiFillEntry(kind, title);
    setAiBusy(false);
    if (r) {
      if (r.creator) setCreator(r.creator);
      if (r.year) setYear(String(r.year));
      if (r.genres) setGenres(r.genres);
      setFilled(true);
      toast.success('AI가 정보를 채웠어요 — 틀리면 고쳐주세요');
    } else {
      setFilled(true);
      toast('AI 연결이 어려워요 — 직접 입력해도 충분해요');
    }
  };

  const addPhoto = async (files: FileList | null) => {
    if (!files) return;
    const next: PhotoItem[] = [];
    for (const f of Array.from(files).slice(0, 6)) {
      if (!f.type.startsWith('image/')) continue;
      next.push({ key: `new_${Date.now()}_${next.length}`, url: URL.createObjectURL(f), file: f });
    }
    if (next.length) setPhotos((p) => [...p, ...next]);
  };
  const removePhoto = (key: string) => {
    setPhotos((p) => {
      const t = p.find((x) => x.key === key);
      if (t) URL.revokeObjectURL(t.url);
      return p.filter((x) => x.key !== key);
    });
  };

  const save = async () => {
    if (!title.trim()) { setErr('제목이 필요해요 — 그거면 절반은 끝나요'); return; }
    if (!rating) { setErr('별점을 탭해주세요'); return; }
    // 사진 커밋: 신규는 IndexedDB 저장, 삭제된 기존은 제거
    const savedIds = photos.filter((p) => p.id).map((p) => p.id!);
    let newIds: string[] = [];
    try {
      newIds = await Promise.all(photos.filter((p) => p.file).map((p) => putPhoto(p.file!)));
    } catch {
      toast.error('사진 저장에 실패했어요 — 나머지는 저장돼요');
    }
    const removed = (initial?.photoIds ?? []).filter((id) => !savedIds.includes(id));
    await deletePhotos(removed);
    const photoIds = [...savedIds, ...newIds];

    const pickedGenres = genres.slice(0, 4);
    const quotes = quote.split('\n').map((q) => q.trim()).filter(Boolean);
    const draft: TicketDraft = {
      kind, title: title.trim(), creator: creator.trim() || '미상',
      year: year ? Number(year) || undefined : undefined,
      posterUrl, rating, watchedAt: watchedAt || todayKeyLocal(),
      where: where.trim() || undefined, oneLiner: oneLiner.trim(),
      longNote: longNote.trim() || undefined,
      quotes: quotes.length ? quotes : undefined,
      rewatch: false,
      genres: pickedGenres.length ? pickedGenres : [DEFAULT_GENRE[kind]],
      photoIds: photoIds.length ? photoIds : undefined,
    };
    onSave(draft, editingId);
  };

  const nextSerial = `NO.${String(entriesCount + 1).padStart(4, '0')}`;
  const searchHint = hasApiFor(kind)
    ? (kind === 'book' ? '책은 카카오에서 검색돼요' : '영화·드라마는 TMDB에서 검색돼요')
    : '이 카테고리는 검색 대신 AI로 채워요';
  const showResults = !filled && !!title.trim() && (searching || results.length > 0);
  const pal = useMemo(() => palFor(title || '?'), [title]);

  if (!open) return null;
  return (
    <div onMouseDown={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(4,8,17,.74)', backdropFilter: 'blur(7px)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'tk-fadeIn .18s ease' }}>
      <div onMouseDown={(e) => e.stopPropagation()} className="tk-scroll" style={{ width: 630, maxWidth: '100%', maxHeight: '92vh', overflowY: 'auto', background: '#101a2e', border: '1px solid #ffffff17', borderRadius: 18, padding: 26, animation: 'tk-fadeUp .24s ease', boxShadow: '0 30px 80px -20px rgba(0,0,0,.8)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div>
            <div style={{ fontSize: 18.5, fontWeight: 800 }}>{editingId ? '티켓 수정' : '티켓 끊기'}</div>
            <div style={{ fontSize: 12, color: '#8b95a6', marginTop: 3 }}>30초면 끝나요 — 제목만 치면 나머지는 자동으로 붙어요</div>
          </div>
          <button type="button" onClick={onClose} style={{ width: 30, height: 30, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6e80a1', cursor: 'pointer', background: 'none', border: 'none' }}><X size={16} /></button>
        </div>

        {/* 카테고리 칩 */}
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginTop: 18 }}>
          {TICKET_KINDS.map((k) => (
            <button key={k} type="button" onClick={() => { setKind(k); setResults([]); setWhere(''); setFilled(false); }}
              style={chip(kind === k)}>{KIND_EMOJI[k]} {KIND_LABEL[k]}</button>
          ))}
        </div>

        {/* 제목 검색 */}
        <div style={{ position: 'relative', marginTop: 14 }}>
          <div style={{ position: 'relative' }}>
            <Search size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#5c6c8c', pointerEvents: 'none' }} />
            <input autoFocus value={title} onChange={(e) => onTitle(e.target.value)} placeholder="제목을 입력해보세요"
              style={{ ...inputStyle, padding: '12px 14px 12px 36px', fontSize: 15, fontWeight: 600 }} />
          </div>
          <div style={{ fontSize: 11, color: '#5c6c8c', marginTop: 6 }}>{searchHint}</div>
          {showResults && (
            <div className="tk-scroll" style={{ position: 'absolute', top: 48, left: 0, right: 0, zIndex: 10, background: '#15213a', border: '1px solid #ffffff1a', borderRadius: 12, overflow: 'hidden', maxHeight: 260, overflowY: 'auto', boxShadow: '0 18px 50px -12px rgba(0,0,0,.8)' }}>
              {searching && <div style={{ padding: '12px 14px', fontSize: 12.5, color: '#8b95a6' }}>검색 중…</div>}
              {!searching && results.map((r, i) => (
                <button key={`${r.title}${i}`} type="button" onClick={() => pick(r)}
                  style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '9px 12px', cursor: 'pointer', width: '100%', textAlign: 'left', background: 'none', border: 'none', color: 'inherit' }}>
                  <div style={{ width: 30, height: 43, borderRadius: 4, flex: 'none', overflow: 'hidden', background: gradientFor(r.title) }}>
                    {r.posterUrl && <img src={r.posterUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700 }}>{r.title}</div>
                    <div style={{ fontSize: 11, color: '#8b95a6', marginTop: 1 }}>{[r.creator, r.year, (r.genres ?? [])[0]].filter(Boolean).join(' · ')}</div>
                  </div>
                  <div style={{ fontFamily: 'var(--tk-mono)', fontSize: 8.5, letterSpacing: '.1em', color: '#5c6c8c', border: '1px solid #2a3854', borderRadius: 5, padding: '2px 6px' }}>{r.kind === 'book' ? 'KAKAO' : 'TMDB'}</div>
                </button>
              ))}
              {!searching && results.length === 0 && (
                <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ fontSize: 12.5, color: '#8b95a6' }}>검색에 없어요 — 대신 AI가 채워드릴까요?</div>
                  <button type="button" onClick={runAiFill} style={pillBtn}>{aiBusy ? '채우는 중…' : 'AI로 채우기'}</button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 미리보기 + 메타 */}
        <div style={{ display: 'flex', gap: 16, marginTop: 16 }}>
          <div style={{ width: 92, flex: 'none' }}>
            <div style={{ width: 92, height: 132, borderRadius: 10, overflow: 'hidden', background: posterUrl ? '#0b1424' : gradientFor(title || '?'), color: pal[2], padding: 9, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', border: posterUrl ? 'none' : '1px solid #ffffff10' }}>
              {posterUrl ? <img src={posterUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 6 }} /> : (
                <>
                  <div style={{ fontFamily: 'var(--tk-mono)', fontSize: 6.5, letterSpacing: '.12em', opacity: .75 }}>TICKETBOOK</div>
                  <div style={{ fontSize: 12, fontWeight: 800, lineHeight: 1.2, wordBreak: 'keep-all' }}>{title || '제목'}</div>
                  <div style={{ fontFamily: 'var(--tk-mono)', fontSize: 7.5, opacity: .7 }}>{nextSerial}</div>
                </>
              )}
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 88px', gap: 10 }}>
              <div>
                <div style={{ ...labelStyle, marginBottom: 4 }}>{KIND_CREATOR_LABEL[kind]}</div>
                <input value={creator} onChange={(e) => setCreator(e.target.value)} placeholder="자동으로 채워져요" style={{ ...inputStyle, padding: '8px 10px', fontSize: 13 }} />
              </div>
              <div>
                <div style={{ ...labelStyle, marginBottom: 4 }}>연도</div>
                <input value={year} onChange={(e) => setYear(e.target.value)} placeholder="—" style={{ ...inputStyle, padding: '8px 10px', fontSize: 13 }} />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
              <button type="button" onClick={runAiFill} style={pillBtn}><Sparkles size={12} /> {aiBusy ? '채우는 중…' : 'AI로 채우기'}</button>
              <div style={{ fontSize: 10.5, color: '#5c6c8c' }}>검색에 안 걸리는 게임·공연은 AI가 채워요</div>
            </div>
          </div>
        </div>

        {/* 장르 — 여러 개 고르기 (+ 직접 추가) */}
        <div style={{ marginTop: 16 }}>
          <div style={labelStyle}>장르 <span style={{ fontWeight: 400, color: '#5c6c8c' }}>· 여러 개 고를 수 있어요</span></div>
          <ChipCloud
            options={GENRES[kind]}
            active={genres}
            onToggle={(g) => setGenres((cur) => (cur.includes(g) ? cur.filter((x) => x !== g) : cur.length >= 4 ? cur : [...cur, g]))}
            onAdd={(g) => setGenres((cur) => (cur.includes(g) || cur.length >= 4 ? cur : [...cur, g]))}
          />
        </div>

        <div style={{ borderTop: '1.5px dashed #ffffff1a', margin: '18px 0' }} />

        {/* 별점 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ fontSize: 12, color: '#8b95a6', fontWeight: 600, width: 52 }}>별점</div>
          <StarPicker rating={rating} onChange={(v) => { setRating(v); setErr(''); }} />
        </div>

        {/* 본날 + 어디서 */}
        <div style={{ display: 'flex', gap: 16, marginTop: 16, flexWrap: 'wrap' }}>
          <div style={{ width: 170, flex: 'none' }}>
            <div style={labelStyle}>본 날짜</div>
            <input type="date" value={watchedAt} onChange={(e) => setWatchedAt(e.target.value)} style={{ ...inputStyle, padding: '8px 10px', fontSize: 13, colorScheme: 'dark' }} />
          </div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={labelStyle}>어디서 봤어요?</div>
            <ChipCloud
              options={PLACES[kind]}
              active={where ? [where] : []}
              onToggle={(p) => setWhere(where === p ? '' : p)}
              onAdd={(p) => setWhere(p)}
            />
          </div>
        </div>

        {/* 한줄평 */}
        <div style={{ marginTop: 16 }}>
          <div style={labelStyle}>한줄평</div>
          <input value={oneLiner} onChange={(e) => setOneLiner(e.target.value)} placeholder="한 줄이면 충분해요" style={inputStyle} />
        </div>

        {/* 접힘: 긴감상·명대사·사진 */}
        <button type="button" onClick={() => setExpanded((v) => !v)} style={{ marginTop: 14, fontSize: 12.5, fontWeight: 700, color: '#8b95a6', cursor: 'pointer', background: 'none', border: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          {expanded ? '접기 ▴' : '길게 쓰고 싶은 날 (감상 · 명대사 · 사진) ▾'}
        </button>
        {expanded && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12, animation: 'tk-fadeIn .2s' }}>
            <textarea value={longNote} onChange={(e) => setLongNote(e.target.value)} rows={4} placeholder="긴 감상을 자유롭게…" style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }} />
            <textarea value={quote} onChange={(e) => setQuote(e.target.value)} rows={2} placeholder="기억하고 싶은 명대사·문장 (줄바꿈으로 여러 개)" style={{ ...inputStyle, resize: 'vertical', fontStyle: 'italic' }} />
            {/* 내 사진 */}
            <div>
              <div style={labelStyle}>내 사진 <span style={{ fontWeight: 400, color: '#5c6c8c' }}>— 장면·인증샷 (상세에서 보여요)</span></div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {photos.map((p) => (
                  <div key={p.key} style={{ position: 'relative', width: 66, height: 66, borderRadius: 9, overflow: 'hidden', border: '1px solid #ffffff1c' }}>
                    <img src={p.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button type="button" onClick={() => removePhoto(p.key)} style={{ position: 'absolute', top: 2, right: 2, width: 20, height: 20, borderRadius: 6, background: 'rgba(6,9,15,.72)', color: '#e5786f', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer' }}><Trash2 size={12} /></button>
                  </div>
                ))}
                <label style={{ width: 66, height: 66, borderRadius: 9, border: '1.5px dashed #2a3854', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5c6c8c', cursor: 'pointer' }}>
                  <Plus size={18} />
                  <input type="file" accept="image/*" multiple hidden onChange={(e) => { addPhoto(e.target.files); e.target.value = ''; }} />
                </label>
              </div>
            </div>
          </div>
        )}

        {err && <div style={{ marginTop: 12, fontSize: 12.5, color: '#e5645c', fontWeight: 600 }}>{err}</div>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
          <button type="button" onClick={onClose} style={{ padding: '10px 18px', borderRadius: 999, fontSize: 13.5, fontWeight: 700, color: '#8b95a6', cursor: 'pointer', background: 'none', border: 'none' }}>취소</button>
          <button type="button" className="tk-press" onClick={save} style={{ padding: '10px 22px', borderRadius: 999, fontSize: 13.5, fontWeight: 800, background: 'var(--tk-accent)', color: '#231402', cursor: 'pointer', border: 'none' }}>{editingId ? '수정 완료' : '티켓 끊기'}</button>
        </div>
      </div>
    </div>
  );
}

function chip(active: boolean): React.CSSProperties {
  return {
    padding: '7px 14px', borderRadius: 999, fontSize: 13, fontWeight: 700, cursor: 'pointer',
    border: `1px solid ${active ? 'var(--tk-accent)' : '#2a3854'}`,
    background: active ? 'var(--tk-accent)' : 'transparent',
    color: active ? '#231402' : '#c3ccd9', userSelect: 'none', fontFamily: 'inherit',
  };
}

/** 프리셋 칩 + "직접 추가" 입력. active 에 있지만 옵션엔 없는 값(직접 추가분)도 칩으로 노출. */
function ChipCloud({ options, active, onToggle, onAdd }: {
  options: string[]; active: string[]; onToggle: (v: string) => void; onAdd: (v: string) => void;
}) {
  const [custom, setCustom] = useState('');
  const all = Array.from(new Set([...options, ...active]));
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
      {all.map((o) => (
        <button key={o} type="button" onClick={() => onToggle(o)} style={{ ...chip(active.includes(o)), fontSize: 12, padding: '6px 12px' }}>{o}</button>
      ))}
      <input
        value={custom}
        onChange={(e) => setCustom(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); const v = custom.trim(); if (v) { onAdd(v); setCustom(''); } } }}
        placeholder="+ 직접"
        style={{ width: 74, background: '#0b131f', border: '1px dashed #3a4a6b', borderRadius: 999, color: '#eef1f6', padding: '6px 12px', fontSize: 12, outline: 'none', fontFamily: 'inherit' }}
      />
    </div>
  );
}
const pillBtn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 13px', borderRadius: 999,
  border: '1px solid color-mix(in srgb, var(--tk-accent) 45%, transparent)', color: 'var(--tk-accent)',
  fontSize: 12, fontWeight: 700, cursor: 'pointer', background: 'none', whiteSpace: 'nowrap',
};

/** 별 5개, 좌/우 클릭으로 0.5 단위. */
function StarPicker({ rating, onChange }: { rating: number; onChange: (v: number) => void }) {
  return (
    <div style={{ display: 'flex' }}>
      {[1, 2, 3, 4, 5].map((i) => {
        const fill = rating >= i ? '100%' : rating >= i - 0.5 ? '50%' : '0%';
        return (
          <div key={i} style={{ position: 'relative', width: 33, height: 33, cursor: 'pointer' }}>
            <div style={{ position: 'absolute', inset: 0, fontSize: 27, lineHeight: '33px', textAlign: 'center', color: '#2a3854' }}>★</div>
            <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: fill, overflow: 'hidden' }}>
              <div style={{ fontSize: 27, lineHeight: '33px', width: 33, textAlign: 'center', color: 'var(--tk-accent)' }}>★</div>
            </div>
            <div onClick={() => onChange(i - 0.5)} style={{ position: 'absolute', left: 0, top: 0, width: '50%', height: '100%', zIndex: 2 }} />
            <div onClick={() => onChange(i)} style={{ position: 'absolute', right: 0, top: 0, width: '50%', height: '100%', zIndex: 2 }} />
          </div>
        );
      })}
      <div style={{ marginLeft: 10, alignSelf: 'center', fontSize: 13, fontWeight: 700, color: 'var(--tk-accent)', fontFamily: 'var(--tk-mono)' }}>{rating ? rating.toFixed(1) : ''}</div>
    </div>
  );
}
