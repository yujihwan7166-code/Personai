/**
 * 티켓 상세 — 2번 시안. 좌 스텁(그라데/포스터) + 절취선(반원 노치) + 우 RATED 스탬프.
 * 내 사진은 여기서만 스트립으로 표시(IndexedDB 로드). 수정·삭제 진입.
 */
import { useEffect, useState } from 'react';
import { X, Trash2 } from 'lucide-react';
import {
  KIND_CREATOR_LABEL, KIND_LABEL, type TicketEntry,
} from '@/lib/tickets/ticketStore';
import { getPhotoUrl } from '@/lib/tickets/photoStore';
import {
  KIND_EMOJI, gradientFor, palFor, fmtDot, weekdayKo, serialOf, starGlyph,
} from './ticketVisuals';

interface Props {
  entry: TicketEntry | null;
  allEntries: TicketEntry[];
  onClose: () => void;
  onEdit: (e: TicketEntry) => void;
  onDelete: (id: string) => void;
}

export function TicketDetailModal({ entry, allEntries, onClose, onEdit, onDelete }: Props) {
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);

  useEffect(() => {
    if (!entry) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [entry, onClose]);

  useEffect(() => {
    let alive = true;
    const urls: string[] = [];
    (async () => {
      const loaded: string[] = [];
      for (const id of entry?.photoIds ?? []) {
        const u = await getPhotoUrl(id);
        if (u) { urls.push(u); loaded.push(u); }
      }
      if (alive) setPhotoUrls(loaded); else urls.forEach(URL.revokeObjectURL);
    })();
    return () => { alive = false; urls.forEach(URL.revokeObjectURL); };
  }, [entry]);

  if (!entry) return null;
  const e = entry;
  const pal = palFor(e.title);
  const hasPoster = !!e.posterUrl;
  const serial = serialOf(allEntries, e.id);

  return (
    <div onMouseDown={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(6,9,15,.86)', backdropFilter: 'blur(5px)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'tk-fadeIn .22s ease', overflowY: 'auto' }}>
      <div onMouseDown={(ev) => ev.stopPropagation()} style={{ display: 'flex', maxWidth: 820, width: '100%', maxHeight: '90vh', animation: 'tk-ticketIn .32s cubic-bezier(.2,.8,.2,1)', filter: 'drop-shadow(0 30px 60px rgba(0,0,0,.6))' }}>
        {/* 좌 스텁 */}
        <div className="tk-scroll" style={{ flex: 1, minWidth: 0, background: hasPoster ? '#141f38' : `linear-gradient(160deg, ${pal[0]}, ${pal[1]})`, color: hasPoster ? '#eef1f6' : pal[2], borderRadius: '16px 0 0 16px', padding: '34px 34px 30px', position: 'relative', overflowY: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 20 }}>{KIND_EMOJI[e.kind]}</span>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', padding: '3px 10px', borderRadius: 20, background: '#00000030', border: '1px solid #ffffff22' }}>{KIND_LABEL[e.kind]}{e.genres?.[0] ? ` · ${e.genres[0]}` : ''}</span>
            {e.rewatch && <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: '#00000030' }}>다시 봄</span>}
          </div>
          <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-.03em', lineHeight: 1.12, marginTop: 20, wordBreak: 'keep-all' }}>{e.title}</div>
          <div style={{ fontSize: 15, fontWeight: 600, opacity: .85, marginTop: 10 }}>{KIND_CREATOR_LABEL[e.kind]} {e.creator}{e.year ? ` · ${e.year}` : ''}</div>
          <div style={{ height: 1, background: '#ffffff2e', margin: '24px 0' }} />
          {e.oneLiner && <div style={{ fontSize: 15, lineHeight: 1.6, opacity: .95 }}>“{e.oneLiner}”</div>}
          {(e.quotes ?? []).map((q, i) => (
            <div key={i} style={{ marginTop: 18, padding: '14px 16px', borderLeft: `3px solid ${hasPoster ? 'var(--tk-accent)' : pal[2]}`, background: '#00000026', borderRadius: '0 10px 10px 0', fontStyle: 'italic', fontSize: 15, lineHeight: 1.5 }}>"{q}"</div>
          ))}
          {e.longNote && <div style={{ marginTop: 18, fontSize: 14, lineHeight: 1.7, opacity: .9, whiteSpace: 'pre-wrap' }}>{e.longNote}</div>}
          {photoUrls.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', opacity: .6, marginBottom: 8 }}>내 사진</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {photoUrls.map((u, i) => (
                  <a key={i} href={u} target="_blank" rel="noreferrer" style={{ display: 'block', width: 92, height: 92, borderRadius: 10, overflow: 'hidden', border: '1px solid #ffffff2a' }}>
                    <img src={u} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </a>
                ))}
              </div>
            </div>
          )}
          <div style={{ marginTop: 24, fontFamily: 'var(--tk-mono)', fontSize: 10.5, opacity: .5, letterSpacing: '.1em' }}>TB · {fmtDot(e.watchedAt)} · {serial}</div>
        </div>

        {/* 절취선 */}
        <div style={{ position: 'relative', width: 0, borderLeft: '2px dashed #4a5468', background: '#0f1826' }}>
          <div style={{ position: 'absolute', top: -13, left: -13, width: 26, height: 26, borderRadius: '50%', background: '#06090f' }} />
          <div style={{ position: 'absolute', bottom: -13, left: -13, width: 26, height: 26, borderRadius: '50%', background: '#06090f' }} />
        </div>

        {/* 우 스텁 */}
        <div style={{ flex: '0 0 244px', background: '#0f1826', border: '1px solid #ffffff14', borderLeft: 'none', borderRadius: '0 16px 16px 0', padding: '28px 24px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.14em', color: '#6f7b8e', textTransform: 'uppercase' }}>Admit One</div>
          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 10.5, color: '#7d8798', fontWeight: 700, letterSpacing: '.08em' }}>관람일</div>
            <div style={{ fontFamily: 'var(--tk-mono)', fontSize: 19, fontWeight: 700, marginTop: 4 }}>{fmtDot(e.watchedAt)}</div>
            <div style={{ fontSize: 11.5, color: '#8b95a6' }}>{weekdayKo(e.watchedAt)}</div>
          </div>
          {e.where && (
            <div style={{ marginTop: 18 }}>
              <div style={{ fontSize: 10.5, color: '#7d8798', fontWeight: 700, letterSpacing: '.08em' }}>본 곳</div>
              <div style={{ fontSize: 16, fontWeight: 700, marginTop: 4 }}>{e.where}</div>
            </div>
          )}
          <div style={{ flex: 1 }} />
          <div style={{ alignSelf: 'center', margin: '20px 0', width: 104, height: 104, borderRadius: '50%', border: '3px double var(--tk-accent)', color: 'var(--tk-accent)', display: 'grid', placeItems: 'center', transform: 'rotate(-13deg)', animation: 'tk-stampIn .5s cubic-bezier(.2,.9,.3,1.3)' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.12em' }}>RATED</div>
              <div style={{ fontFamily: 'var(--tk-mono)', fontSize: 30, fontWeight: 700, lineHeight: 1 }}>{e.rating.toFixed(1)}</div>
              <div style={{ fontSize: 12, letterSpacing: 1 }}>{starGlyph(e.rating)}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={() => onEdit(e)} className="tk-lift" style={{ flex: 1, height: 42, borderRadius: 10, background: '#1c2942', border: '1px solid #ffffff1a', color: '#eef1f6', fontWeight: 700, fontSize: 13.5, cursor: 'pointer' }}>수정</button>
            <button type="button" onClick={() => onDelete(e.id)} style={{ height: 42, width: 44, borderRadius: 10, border: '1px solid #e5786f44', color: '#e5786f', display: 'grid', placeItems: 'center', background: 'none', cursor: 'pointer' }}><Trash2 size={16} /></button>
          </div>
          <button type="button" onClick={onClose} style={{ marginTop: 8, height: 38, borderRadius: 10, color: '#8b95a6', fontSize: 13, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>닫기</button>
        </div>
      </div>
    </div>
  );
}
