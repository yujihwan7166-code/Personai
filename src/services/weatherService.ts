/**
 * 날씨 + 미세먼지 — Open-Meteo (키 불필요, 무료).
 *
 * 홈 히어로 우상단 TodayCluster 데이터 소스. 홈은 하루에도 수십 번 열리므로
 * localStorage 30분 캐시로 네트워크를 아낌. 위치는 서울 고정 기본값 —
 * 홈 첫 화면에서 위치 권한 팝업을 띄우는 건 UX 해악이라 의도적으로 안 물음.
 * (추후 설정에서 도시 변경 가능하게 확장 여지.)
 */

export interface WeatherNow {
  /** 기온 (°C, 반올림). */
  temp: number;
  /** WMO weather code → 요약 라벨 (맑음/구름/비/눈/안개…). */
  label: string;
  /** lucide 아이콘 키 — TodayCluster 에서 매핑. */
  icon: 'sun' | 'cloud-sun' | 'cloud' | 'fog' | 'rain' | 'snow' | 'storm';
  /** 미세먼지(PM10) 등급 라벨 + 색. null 이면 데이터 없음. */
  dust: { label: string; color: string } | null;
  /** epoch ms — 캐시 시각. */
  at: number;
}

const CACHE_KEY = 'personai.weather.cache';
const CACHE_TTL = 30 * 60 * 1000;
// 서울 시청 좌표 — 기본값.
const LAT = 37.5665;
const LON = 126.978;

/** WMO code → 라벨·아이콘. https://open-meteo.com/en/docs (weather_code) */
function classify(code: number): { label: string; icon: WeatherNow['icon'] } {
  if (code === 0) return { label: '맑음', icon: 'sun' };
  if (code <= 2) return { label: '구름 조금', icon: 'cloud-sun' };
  if (code === 3) return { label: '흐림', icon: 'cloud' };
  if (code <= 48) return { label: '안개', icon: 'fog' };
  if (code <= 67) return { label: '비', icon: 'rain' };
  if (code <= 77) return { label: '눈', icon: 'snow' };
  if (code <= 82) return { label: '소나기', icon: 'rain' };
  if (code <= 86) return { label: '눈', icon: 'snow' };
  return { label: '뇌우', icon: 'storm' };
}

/** PM10 (µg/m³) → 한국 환경부 4등급. */
function dustGrade(pm10: number): { label: string; color: string } {
  if (pm10 <= 30) return { label: '미세 좋음', color: '#2f9e6e' };
  if (pm10 <= 80) return { label: '미세 보통', color: '#4a7ddd' };
  if (pm10 <= 150) return { label: '미세 나쁨', color: '#d97706' };
  return { label: '미세 매우나쁨', color: '#dc2626' };
}

function readCache(): WeatherNow | null {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WeatherNow;
    if (Date.now() - parsed.at > CACHE_TTL) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function fetchWeatherNow(): Promise<WeatherNow | null> {
  const cached = readCache();
  if (cached) return cached;

  try {
    const [wRes, aRes] = await Promise.all([
      fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=temperature_2m,weather_code&timezone=Asia%2FSeoul`,
      ),
      fetch(
        `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${LAT}&longitude=${LON}&current=pm10&timezone=Asia%2FSeoul`,
      ).catch(() => null),
    ]);
    if (!wRes.ok) return null;
    const w = await wRes.json();
    const temp = Math.round(w?.current?.temperature_2m);
    const code = Number(w?.current?.weather_code ?? 3);
    if (!Number.isFinite(temp)) return null;

    let dust: WeatherNow['dust'] = null;
    if (aRes?.ok) {
      const a = await aRes.json();
      const pm10 = Number(a?.current?.pm10);
      if (Number.isFinite(pm10)) dust = dustGrade(pm10);
    }

    const { label, icon } = classify(code);
    const result: WeatherNow = { temp, label, icon, dust, at: Date.now() };
    try {
      window.localStorage.setItem(CACHE_KEY, JSON.stringify(result));
    } catch {
      /* noop */
    }
    return result;
  } catch {
    return null;
  }
}
