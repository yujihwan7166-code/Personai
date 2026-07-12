/**
 * 여행 지도 — 번호 핀 + DAY별 색 경로선 (트리플 문법: 카드 번호 = 핀 번호 = 방문 순서).
 *
 * Leaflet + CartoDB Positron (전세계 무료 타일). 마커는 이미지 에셋 없는 divIcon
 * (번들러 마커 이미지 깨짐 이슈 회피). 장소 → 좌표는 Nominatim, 캐시 우선·요청 직렬화.
 * 같은 group(=같은 DAY) 핀들은 배열 순서대로 점선 경로로 이어진다.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { cachedLatLng, geocode, isCachedMiss, type LatLng } from '@/lib/travel/geocode';
import { escapeHtml } from '@/lib/travel/format';

export interface MapPin {
  id: string;
  /** 지오코딩 키 (장소 이름). */
  place: string;
  /** 핀 배지 숫자 — 없으면 점으로 렌더. */
  number?: number;
  /** 핀·경로 색 (CSS color). */
  color: string;
  /** 같은 group 끼리 배열 순서대로 경로선 연결 (예: 날짜). 없으면 연결 안 함. */
  group?: string;
  /** 팝업 HTML — 호출부에서 escape 해서 전달. */
  popup?: string;
  tooltip?: string;
}

const KOREA_CENTER: [number, number] = [36.5, 127.8];

const pinIcon = (color: string, number?: number): L.DivIcon => {
  const size = number !== undefined ? 24 : 14;
  const label = number !== undefined ? String(number) : '';
  return L.divIcon({
    className: '',
    html: `<div style="display:flex;align-items:center;justify-content:center;width:${size}px;height:${size}px;border-radius:9999px;background:${color};color:#fff;font-size:11.5px;font-weight:700;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35);font-variant-numeric:tabular-nums">${label}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

interface TravelMapProps {
  pins: MapPin[];
  className?: string;
  heightClass?: string;
  /** 핀이 하나도 없을 때 오버레이 안내 문구. */
  emptyText?: string;
  /** 핀이 없을 때 지도 중심으로 쓸 장소 (예: 여행 목적지). */
  fallbackPlace?: string;
}

export function TravelMap({ pins, className, heightClass = 'h-[420px]', emptyText, fallbackPlace }: TravelMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapObj = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const lastFitKey = useRef('');
  const [coords, setCoords] = useState<Record<string, LatLng>>({});
  const [resolving, setResolving] = useState(0);
  const [misses, setMisses] = useState<string[]>([]);

  /** place 기준 고유 목록 (지오코딩 대상). */
  const places = useMemo(() => {
    const set = new Set<string>();
    for (const p of pins) if (p.place.trim()) set.add(p.place.trim());
    return [...set];
  }, [pins]);

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
    window.requestAnimationFrame(() => map.invalidateSize());
    return () => {
      map.remove();
      mapObj.current = null;
      layer.current = null;
    };
  }, []);

  // 지오코딩 — 캐시 우선, 미해결만 순차 조회. 못 찾은 장소는 misses 로 사용자에게 알린다.
  useEffect(() => {
    let cancelled = false;
    const next: Record<string, LatLng> = {};
    const knownMisses: string[] = [];
    const pending: string[] = [];
    for (const place of places) {
      const hit = cachedLatLng(place);
      if (hit) next[place] = hit;
      else if (isCachedMiss(place)) knownMisses.push(place);
      else pending.push(place);
    }
    if (Object.keys(next).length > 0) setCoords((prev) => ({ ...prev, ...next }));
    setMisses(knownMisses);

    if (pending.length === 0) return;
    setResolving(pending.length);
    (async () => {
      for (const place of pending) {
        if (cancelled) return;
        const ll = await geocode(place);
        if (cancelled) return;
        setResolving((n) => Math.max(0, n - 1));
        if (ll) setCoords((prev) => ({ ...prev, [place]: ll }));
        else setMisses((prev) => (prev.includes(place) ? prev : [...prev, place]));
      }
    })();

    return () => {
      cancelled = true;
      setResolving(0);
    };
  }, [places]);

  // 핀이 하나도 안 잡혔을 때 — 목적지(fallbackPlace)로 지도 중심 이동
  useEffect(() => {
    if (!fallbackPlace || places.length > 0) return;
    let cancelled = false;
    (async () => {
      const ll = await geocode(fallbackPlace);
      if (cancelled || !ll) return;
      mapObj.current?.setView([ll.lat, ll.lng], 11, { animate: false });
    })();
    return () => {
      cancelled = true;
    };
  }, [fallbackPlace, places.length]);

  // 마커 + 경로선 렌더
  useEffect(() => {
    const map = mapObj.current;
    const lg = layer.current;
    if (!map || !lg) return;
    lg.clearLayers();

    // 경로선 — group 별로 배열 순서 유지하며 연결
    const byGroup = new Map<string, { color: string; pts: [number, number][] }>();
    for (const p of pins) {
      if (!p.group) continue;
      const ll = coords[p.place.trim()];
      if (!ll) continue;
      const g = byGroup.get(p.group) ?? { color: p.color, pts: [] };
      g.pts.push([ll.lat, ll.lng]);
      byGroup.set(p.group, g);
    }
    for (const { color, pts } of byGroup.values()) {
      if (pts.length > 1) {
        L.polyline(pts, { color, weight: 2.5, opacity: 0.65, dashArray: '3 7' }).addTo(lg);
      }
    }

    const bounds: [number, number][] = [];
    for (const p of pins) {
      const ll = coords[p.place.trim()];
      if (!ll) continue;
      bounds.push([ll.lat, ll.lng]);
      const marker = L.marker([ll.lat, ll.lng], { icon: pinIcon(p.color, p.number) });
      if (p.popup) marker.bindPopup(p.popup);
      // tooltip 은 Leaflet 이 innerHTML 로 렌더 — 사용자 입력이므로 이스케이프 필수
      if (p.tooltip) marker.bindTooltip(escapeHtml(p.tooltip), { direction: 'top', offset: [0, -10] });
      lg.addLayer(marker);
    }
    // 해결된 좌표 집합이 바뀌었을 때만 fitBounds — 사용자가 이동해 둔 뷰포트를 매 렌더마다 리셋하지 않게
    const fitKey = pins
      .map((p) => p.place.trim())
      .filter((pl) => coords[pl])
      .sort()
      .join('|');
    if (bounds.length > 0 && fitKey !== lastFitKey.current) {
      lastFitKey.current = fitKey;
      map.fitBounds(L.latLngBounds(bounds).pad(0.25), { maxZoom: 14, animate: false });
    }
  }, [pins, coords]);

  const hasAny = pins.some((p) => p.place.trim());

  return (
    <div className={cn('relative', className)}>
      <div
        ref={mapRef}
        className={cn('w-full overflow-hidden rounded-2xl border border-[hsl(var(--hairline))] bg-[hsl(var(--surface-3))]', heightClass)}
        style={{ zIndex: 0 }}
      />
      {resolving > 0 && (
        <span className="absolute right-3 top-3 z-[5] flex items-center gap-1.5 rounded-full bg-[hsl(var(--surface-1))]/90 px-2.5 py-1 text-[11px] text-muted-foreground shadow-sm">
          <Loader2 className="h-3 w-3 animate-spin text-[hsl(var(--travel-teal))]" /> 위치 찾는 중 {resolving}
        </span>
      )}
      {!hasAny && emptyText && (
        <div className="pointer-events-none absolute inset-0 z-[5] flex items-center justify-center rounded-2xl bg-[hsl(var(--surface-1))]/80 px-6 text-center">
          <p className="max-w-[300px] text-[12.5px] leading-relaxed text-muted-foreground">{emptyText}</p>
        </div>
      )}
      {/* 못 찾은 장소 — 조용히 빠뜨리지 않고 알려준다 (핀 번호와 지도 대조 혼란 방지) */}
      {misses.length > 0 && (
        <p className="mt-1.5 px-1 text-[11px] leading-relaxed text-muted-foreground/75">
          위치를 못 찾은 곳: {misses.slice(0, 3).join(', ')}
          {misses.length > 3 && ` 외 ${misses.length - 3}곳`}
          <span className="text-muted-foreground/55"> — 도시·지역 이름을 함께 적으면 더 잘 찾아요</span>
        </p>
      )}
    </div>
  );
}
