/**
 * 발자취 지도 — 장소가 붙은 기록들을 지도에 핀으로.
 *
 * 기록(DayMoment)의 place 를 Nominatim 으로 지오코딩 → Leaflet + CartoDB Positron 타일에 원형 마커.
 * 같은 장소는 하나의 핀으로 묶고(방문 횟수), 팝업에 방문 기록·사진.
 * 타일은 전세계라 국내·해외 모두 표시. 국내 정밀도는 이후 네이버 프록시로 보강.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { daylogStore } from '@/services/daylogStore';
import { cachedLatLng, geocode, type LatLng } from '@/lib/daylog/geocode';
import { DAYLOG_CHANGED, MOMENT_KIND_META, type DayMoment } from '@/types/daylog';

const KOREA_CENTER: [number, number] = [36.5, 127.8];

interface PlaceGroup {
  key: string;
  place: string;
  items: DayMoment[];
  tint: string;
}

const escapeHtml = (s: string): string =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

function groupByPlace(moments: DayMoment[]): PlaceGroup[] {
  const map = new Map<string, PlaceGroup>();
  for (const m of moments) {
    if (!m.place) continue;
    const key = m.place.trim().toLowerCase();
    const g = map.get(key);
    if (g) g.items.push(m);
    else map.set(key, { key, place: m.place.trim(), items: [m], tint: MOMENT_KIND_META[m.kind].tint });
  }
  return [...map.values()];
}

function popupHtml(g: PlaceGroup): string {
  const visits = g.items
    .slice(0, 6)
    .map((m) => {
      const meta = MOMENT_KIND_META[m.kind];
      const thumb = m.photo
        ? `<img src="${m.photo}" alt="" style="width:100%;height:64px;object-fit:cover;border-radius:6px;margin-top:4px" />`
        : '';
      return `<div style="margin-top:6px">
        <div style="font-size:11px;color:#8a7f74">${escapeHtml(m.date)} · ${meta.emoji} ${escapeHtml(meta.label)}</div>
        <div style="font-size:13px;color:#2a241f">${escapeHtml(m.text)}</div>
        ${thumb}
      </div>`;
    })
    .join('');
  const more = g.items.length > 6 ? `<div style="font-size:11px;color:#8a7f74;margin-top:6px">외 ${g.items.length - 6}건</div>` : '';
  return `<div style="min-width:180px;max-width:220px;font-family:inherit">
    <div style="font-weight:700;font-size:14px;color:#2a241f">${escapeHtml(g.place)}</div>
    <div style="font-size:11px;color:#8a7f74">방문 ${g.items.length}회</div>
    ${visits}${more}
  </div>`;
}

interface DaylogMapProps {
  /** 제어형: 지정하면 이 기록들만 그린다 (여행 상세). 없으면 전체 발자취를 스스로 구독. */
  moments?: DayMoment[];
  /** 방문 순서대로 핀을 잇는 경로선 표시 (여행용). */
  route?: boolean;
  /** 헤더(발자취 제목·개수) 표시 여부. */
  showHeader?: boolean;
  /** 지도 높이 Tailwind 클래스. */
  heightClass?: string;
}

export function DaylogMap({ moments: momentsProp, route = false, showHeader = true, heightClass = 'h-[520px]' }: DaylogMapProps = {}) {
  const controlled = momentsProp !== undefined;
  const mapRef = useRef<HTMLDivElement>(null);
  const mapObj = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const [selfMoments, setSelfMoments] = useState<DayMoment[]>(() => daylogStore.withPlace());
  const moments = momentsProp ?? selfMoments;
  const [coords, setCoords] = useState<Record<string, LatLng>>({});
  const [resolving, setResolving] = useState(0);

  const groups = useMemo(() => groupByPlace(moments), [moments]);

  // 기록 변경 구독 (비제어형일 때만)
  useEffect(() => {
    if (controlled) return;
    const sync = () => setSelfMoments(daylogStore.withPlace());
    window.addEventListener(DAYLOG_CHANGED, sync);
    return () => window.removeEventListener(DAYLOG_CHANGED, sync);
  }, [controlled]);

  // 지도 1회 초기화
  useEffect(() => {
    if (!mapRef.current || mapObj.current) return;
    const map = L.map(mapRef.current, { center: KOREA_CENTER, zoom: 7, scrollWheelZoom: true });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      maxZoom: 19,
    }).addTo(map);
    layer.current = L.layerGroup().addTo(map);
    mapObj.current = map;
    // 탭 전환 직후 컨테이너 크기 확정 보정
    window.requestAnimationFrame(() => map.invalidateSize());
    return () => {
      map.remove();
      mapObj.current = null;
      layer.current = null;
    };
  }, []);

  // 장소 지오코딩 (캐시 우선, 미해결만 순차 조회)
  useEffect(() => {
    let cancelled = false;
    const next: Record<string, LatLng> = {};
    const pending: PlaceGroup[] = [];
    for (const g of groups) {
      const hit = cachedLatLng(g.place);
      if (hit) next[g.key] = hit;
      else pending.push(g);
    }
    setCoords((prev) => ({ ...prev, ...next }));

    if (pending.length === 0) return;
    setResolving(pending.length);
    (async () => {
      for (const g of pending) {
        if (cancelled) return;
        const ll = await geocode(g.place);
        if (cancelled) return;
        setResolving((n) => n - 1);
        if (ll) setCoords((prev) => ({ ...prev, [g.key]: ll }));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [groups]);

  // 마커 렌더 + 뷰 맞춤
  useEffect(() => {
    const map = mapObj.current;
    const lg = layer.current;
    if (!map || !lg) return;
    lg.clearLayers();

    // 경로선: 방문(첫 기록) 시각 순으로 정렬해 해결된 좌표를 잇는다
    if (route) {
      const ordered = [...groups]
        .filter((g) => coords[g.key])
        .sort((a, b) => {
          const ka = `${a.items[0].date} ${a.items[0].time}`;
          const kb = `${b.items[0].date} ${b.items[0].time}`;
          return ka.localeCompare(kb);
        })
        .map((g) => [coords[g.key].lat, coords[g.key].lng] as [number, number]);
      if (ordered.length > 1) {
        L.polyline(ordered, { color: 'hsl(17 55% 49%)', weight: 2.5, opacity: 0.6, dashArray: '2 6' }).addTo(lg);
      }
    }

    const pts: [number, number][] = [];
    for (const g of groups) {
      const ll = coords[g.key];
      if (!ll) continue;
      pts.push([ll.lat, ll.lng]);
      const marker = L.circleMarker([ll.lat, ll.lng], {
        radius: Math.min(7 + g.items.length, 16),
        color: g.tint,
        weight: 2,
        fillColor: g.tint,
        fillOpacity: 0.55,
      });
      marker.bindPopup(popupHtml(g));
      marker.bindTooltip(g.place, { direction: 'top', offset: [0, -4] });
      lg.addLayer(marker);
    }
    if (pts.length > 0) {
      map.fitBounds(L.latLngBounds(pts).pad(0.25), { maxZoom: 14, animate: false });
    }
  }, [groups, coords, route]);

  const pinnedCount = groups.filter((g) => coords[g.key]).length;

  return (
    <div className="flex flex-col gap-3">
      {(showHeader || resolving > 0) && (
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            {showHeader && (
              <>
                <MapPin className="h-4 w-4 text-[hsl(var(--cream-accent))]" />
                <h2 className="text-[15px] font-bold text-[hsl(var(--cream-ink))]/85">발자취</h2>
                <span className="text-[11px] tabular-nums text-[hsl(var(--cream-muted))]/70">
                  {groups.length}곳 · 핀 {pinnedCount}
                </span>
              </>
            )}
          </div>
          {resolving > 0 && (
            <span className="flex items-center gap-1.5 text-[11px] text-[hsl(var(--cream-muted))]/75">
              <Loader2 className="h-3 w-3 animate-spin" /> 위치 찾는 중 {resolving}
            </span>
          )}
        </div>
      )}

      {/* 지도 컨테이너는 항상 렌더 (초기화 안정) + 빈 상태는 오버레이 */}
      <div className="relative">
        <div
          ref={mapRef}
          className={cn('w-full overflow-hidden rounded-[26px] border border-[hsl(var(--cream-line))] bg-[hsl(var(--cream-panel))]', heightClass)}
          style={{ zIndex: 0 }}
        />
        {groups.length === 0 && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center rounded-[26px] bg-[hsl(var(--cream-card))]/80 text-center">
            <p className="text-[13.5px] text-[hsl(var(--cream-muted))]">아직 장소가 붙은 기록이 없어요.</p>
            <p className="mt-1.5 max-w-[280px] text-[12px] text-[hsl(var(--cream-muted))]/70">
              "홍대 카페 갔다", "스타벅스에서 커피"처럼 장소를 적으면 여기 지도에 핀이 찍혀요.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
