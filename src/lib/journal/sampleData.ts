/**
 * 데일리 로그 예시 데이터 — 한 달치 학생 기록 + 여행 3개.
 *
 * 이 방이 무엇을 담는 방인지는 빈 화면으로는 알 수 없다. 매일 성실하게 쓴 기록이
 * 아니라 **실제로 사람이 쓰는 모양**을 만든다 — 며칠 건너뛰고, 어떤 날은 한 줄이고,
 * 시험 기간엔 사진이 없고, 여행 중엔 하루에 여러 개가 붙는다.
 *
 * 사진은 Unsplash 원본 URL 을 그대로 쓴다(무료·출처 표시 불필요). Base64 로 굽지
 * 않는 이유: 예시 30장을 통째로 localStorage 에 밀어 넣으면 실제 기록이 들어갈
 * 자리를 먼저 잡아먹는다. 예시는 가벼워야 지워도 아깝지 않다.
 *
 * 날짜는 '오늘' 기준 상대값으로 만든다 — 언제 눌러도 최근 한 달로 보이게.
 */
import { journalStore } from '@/services/journalStore';
import { daylogStore } from '@/services/daylogStore';
import { travelStore } from '@/services/travelStore';
import { toLocalYMD } from '@/types/travel';
import type { Weather } from '@/types/journal';

const U = (id: string, w = 900) => `https://images.unsplash.com/${id}?w=${w}&q=75&auto=format&fit=crop`;

/* 사진 — 주제별로 나눠 둔다(밥 사진 자리에 바다가 오지 않게). */
const PHOTO = {
  food: [
    U('photo-1590301157890-4810ed352733'), U('photo-1600289031464-74d374b64991'),
    U('photo-1718777791239-c473e9ce7376'), U('photo-1693429308125-3be7b105ad56'),
    U('photo-1713047203705-44dd7d762d0c'),
  ],
  cafe: [
    U('photo-1564327367919-cb377ea6a88f'), U('photo-1467189386127-c4e5e31ee213'),
    U('photo-1557142046-c704a3adf364'), U('photo-1529942458412-eda69f76291d'),
  ],
  busan: [
    U('photo-1638591751482-1a7d27fcea15'), U('photo-1591520284162-8e64eceebacf'),
    U('photo-1611372876693-4dc4153dee61'), U('photo-1546385040-d48180ede560'),
  ],
  gyeongju: [
    U('photo-1717346486980-1944518800fb'), U('photo-1669764372822-3cb8476d4f47'),
    U('photo-1618297358013-d3cb3e23ce25'),
  ],
  jeju: [
    U('photo-1612977512598-3b8d6a498bbb'), U('photo-1562680802-9cf8b15f419d'),
    U('photo-1628411848698-e3b3249a272a'), U('photo-1616798249081-30877e213b16'),
  ],
};

const img = (src: string, i: number) => ({ id: `smp_img_${i}_${src.slice(-8)}`, src, createdAt: new Date().toISOString() });

/** 오늘에서 n 일 전. */
function daysAgo(n: number): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return toLocalYMD(d);
}

interface Day {
  /** 오늘로부터 며칠 전 */
  ago: number;
  title: string;
  body: string;
  mood: string;
  weather: Weather;
  tags?: string[];
  sleep?: number;
  energy?: 1 | 2 | 3 | 4 | 5;
  bgm?: string;
  photos?: string[];
  star?: boolean;
  /** 먹은 것 / 간 곳 */
  meals?: Array<{ slot: 'breakfast' | 'lunch' | 'dinner' | 'snack'; text: string; place?: string; time?: string; photo?: string }>;
  places?: Array<{ text: string; place?: string; time?: string; photo?: string }>;
}

/* ── 한 달 ──────────────────────────────────────────────
   빈 날이 있어야 진짜 같다. 30일 중 19일만 쓴다. */
const DAYS: Day[] = [
  { ago: 0, title: '시험 끝', body: '전공 마지막 시험까지 끝. 시험장 나오는데 하늘이 너무 맑아서 괜히 웃음이 났다.\n집에 가는 길에 아이스크림 사서 벤치에 앉아 20분쯤 아무것도 안 했다. 이게 그렇게 좋을 일인가 싶은데 좋았다.',
    mood: 'happy', weather: 'sunny', tags: ['시험', '해방'], sleep: 5, energy: 3, star: true,
    meals: [{ slot: 'snack', text: '편의점 앞 소프트콘', time: '17:20' }],
  },
  { ago: 1, title: '', body: '내일 시험. 도서관 9시부터 22시. 머리에 안 들어가는데 앉아는 있었다.',
    mood: 'tired', weather: 'cloudy', tags: ['시험'], sleep: 4, energy: 2,
    meals: [{ slot: 'lunch', text: '학식 제육덮밥', place: '중앙도서관 학식당', time: '12:30' }, { slot: 'dinner', text: '컵라면', time: '19:00' }],
  },
  { ago: 2, title: '', body: '카페인 과다. 손이 떨린다. 그래도 정리 노트는 다 만들었다.',
    mood: 'tired', weather: 'overcast', tags: ['시험'], sleep: 5, energy: 2,
    photos: [PHOTO.cafe[0]],
    meals: [{ slot: 'snack', text: '아아 두 잔', place: '학교 앞 카페', time: '15:00', photo: PHOTO.cafe[1] }],
  },
  { ago: 4, title: '스터디', body: '조원들이랑 발표 리허설. 내 파트가 제일 길어서 좀 미안했다.\n끝나고 다 같이 국밥 먹으러 갔는데 그게 제일 기억에 남는다.',
    mood: 'calm', weather: 'cloudy', tags: ['학교', '스터디'], sleep: 6, energy: 3,
    photos: [PHOTO.food[0]],
    meals: [{ slot: 'dinner', text: '순대국밥 — 조원들이랑', place: '옛집순대국', time: '19:30', photo: PHOTO.food[0] }],
  },
  { ago: 6, title: '', body: '알바. 손님이 계속 몰려서 정신이 없었다. 퇴근하고 버스에서 졸다가 두 정거장 지나침.',
    mood: 'tired', weather: 'rainy', tags: ['알바'], sleep: 6, energy: 2, bgm: '검정치마 - 기다린 만큼, 더',
  },
  { ago: 7, title: '', body: '하루종일 비. 창가에 앉아서 밀린 과제 했다. 빗소리가 생각보다 집중에 좋다.',
    mood: 'calm', weather: 'rainy', tags: ['과제'], sleep: 8, energy: 4,
    photos: [PHOTO.cafe[2]],
    places: [{ text: '동네 카페에서 3시간', place: '연희동 로스터리', time: '14:00', photo: PHOTO.cafe[2] }],
  },
  { ago: 9, title: '엄마 생신', body: '본가 다녀왔다. 엄마가 좋아하는 케이크 사갔는데 "돈 아껴라" 하면서 다 드셨다.\n올라오는 KTX 에서 괜히 울컥함.',
    mood: 'flutter', weather: 'sunny', tags: ['가족'], sleep: 7, energy: 4, star: true,
    photos: [PHOTO.cafe[3]],
    meals: [{ slot: 'dinner', text: '엄마표 갈비찜', place: '본가', time: '18:30', photo: PHOTO.food[1] }],
  },
  { ago: 11, title: '', body: '운동 3주차. 처음으로 안 죽을 것 같다는 느낌.',
    mood: 'happy', weather: 'sunny', tags: ['운동'], sleep: 7, energy: 4,
  },
  { ago: 12, title: '', body: '조별과제 팀원 한 명이 잠수. 단톡에 혼자 말하는 기분.',
    mood: 'angry', weather: 'overcast', tags: ['학교'], sleep: 6, energy: 2,
  },
  { ago: 14, title: '전시 보러', body: '친구랑 미술관. 사실 그림보다 같이 걷는 게 좋아서 간 거다.\n돌아오는 길에 한강 잠깐 앉았다 옴.',
    mood: 'flutter', weather: 'sunny', tags: ['나들이', '친구'], sleep: 7, energy: 5, bgm: '아이유 - 밤편지',
    photos: [PHOTO.cafe[1]],
    places: [{ text: '국립현대미술관', place: '서울 종로구', time: '14:00' }, { text: '한강 잠깐', place: '반포한강공원', time: '18:30' }],
  },
  { ago: 16, title: '', body: '이력서 초안 썼다. 쓸 게 없어 보여서 좀 막막했는데, 적어놓고 보니 아주 없진 않았다.',
    mood: 'calm', weather: 'cloudy', tags: ['취준'], sleep: 6, energy: 3,
  },
  { ago: 18, title: '', body: '늦잠. 하루를 통째로 날린 기분인데 몸은 개운하다. 가끔은 이런 날도 필요한 듯.',
    mood: 'calm', weather: 'cloudy', sleep: 11, energy: 4,
  },
  { ago: 19, title: '동아리 뒤풀이', body: '오랜만에 다 모였다. 1년 만에 본 선배가 나 많이 컸다고 했다.',
    mood: 'happy', weather: 'night', tags: ['동아리'], sleep: 5, energy: 3,
    photos: [PHOTO.food[2]],
    meals: [{ slot: 'dinner', text: '삼겹살 + 소주', place: '학교 앞 고깃집', time: '19:00', photo: PHOTO.food[2] }],
  },
  { ago: 21, title: '', body: '도서관에서 하루. 옆자리 사람 다리 떠는 소리에 집중이 안 됐다.',
    mood: 'tired', weather: 'overcast', tags: ['공부'], sleep: 6, energy: 3,
  },
  { ago: 23, title: '첫눈처럼', body: '갑자기 기온이 뚝 떨어졌다. 목도리 꺼냄. 겨울 냄새가 난다.',
    mood: 'calm', weather: 'windy', sleep: 8, energy: 4, bgm: '이무진 - 청춘만화',
  },
  { ago: 25, title: '', body: '알바 사장님이 떡볶이 사주셨다. 별거 아닌데 하루가 괜찮아졌다.',
    mood: 'happy', weather: 'cloudy', tags: ['알바'], sleep: 7, energy: 4,
    meals: [{ slot: 'snack', text: '떡볶이 (사장님이 사주심)', time: '16:00', photo: PHOTO.food[3] }],
  },
  { ago: 27, title: '', body: '통장 잔고 확인하고 조용히 창을 닫았다.',
    mood: 'blue', weather: 'overcast', tags: ['돈'], sleep: 6, energy: 2,
  },
  { ago: 29, title: '', body: '새 학기 시간표 짰다. 공강 하루 만드는 데 성공. 이번 학기는 좀 다를 것 같다는 근거 없는 기대.',
    mood: 'flutter', weather: 'sunny', tags: ['학교'], sleep: 8, energy: 5,
  },
];

/* ── 여행 3개 ────────────────────────────────────────── */
interface TripSeed {
  title: string; destination: string; fromAgo: number; days: number; cover: string;
  entries: Array<Omit<Day, 'ago'> & { offset: number }>;
}

const TRIPS: TripSeed[] = [
  {
    title: '부산 2박 3일', destination: '부산', fromAgo: 44, days: 3, cover: PHOTO.busan[0],
    entries: [
      { offset: 0, title: '부산 첫날', body: 'KTX 타고 부산. 역에서 나오자마자 공기가 다르다. 바다 냄새.\n숙소 짐만 던져놓고 바로 해운대로 갔다.',
        mood: 'flutter', weather: 'sunny', tags: ['부산', '여행'], sleep: 5, energy: 5, star: true,
        photos: [PHOTO.busan[0], PHOTO.busan[1]],
        places: [{ text: '해운대 해수욕장', place: '부산 해운대', time: '15:00', photo: PHOTO.busan[0] }],
        meals: [{ slot: 'dinner', text: '돼지국밥 — 진짜 다르다', place: '서면 돼지국밥집', time: '19:00', photo: PHOTO.food[4] }],
      },
      { offset: 1, title: '감천문화마을', body: '색깔이 진짜 사진 그대로였다. 언덕이 생각보다 가팔라서 다리가 아팠는데 그래서 더 기억에 남는다.\n저녁엔 광안리에서 불꽃 조금 봤다.',
        mood: 'happy', weather: 'sunny', tags: ['부산', '여행'], sleep: 7, energy: 4,
        photos: [PHOTO.busan[2], PHOTO.busan[3]],
        places: [{ text: '감천문화마을', place: '부산 사하구', time: '11:00', photo: PHOTO.busan[2] }, { text: '광안리 밤바다', place: '부산 수영구', time: '20:30', photo: PHOTO.busan[3] }],
        meals: [{ slot: 'lunch', text: '씨앗호떡', place: '자갈치 시장', time: '13:00' }],
      },
      { offset: 2, title: '', body: '올라오는 기차에서 계속 잤다. 짧았는데 길게 느껴진 3일.',
        mood: 'calm', weather: 'cloudy', tags: ['부산'], sleep: 6, energy: 3,
      },
    ],
  },
  {
    title: '경주 당일치기', destination: '경주', fromAgo: 33, days: 1, cover: PHOTO.gyeongju[0],
    entries: [
      { offset: 0, title: '경주', body: '새벽 버스 타고 경주. 자전거 빌려서 하루종일 돌아다녔다.\n첨성대 앞에서 한참 앉아 있었는데, 천 몇백 년 전 사람도 여기 앉아 있었겠구나 싶었다.',
        mood: 'calm', weather: 'sunny', tags: ['경주', '여행'], sleep: 4, energy: 4, star: true, bgm: '잔나비 - 주저하는 연인들을 위해',
        photos: [PHOTO.gyeongju[0], PHOTO.gyeongju[1], PHOTO.gyeongju[2]],
        places: [{ text: '첨성대', place: '경주 첨성대', time: '10:00', photo: PHOTO.gyeongju[0] }, { text: '동궁과 월지 야경', place: '경주 동궁과 월지', time: '19:30', photo: PHOTO.gyeongju[1] }],
        meals: [{ slot: 'lunch', text: '쌈밥 정식', place: '황리단길', time: '13:00' }, { slot: 'snack', text: '십원빵', place: '황리단길', time: '16:00' }],
      },
    ],
  },
  {
    title: '제주 3박 4일', destination: '제주도', fromAgo: 70, days: 4, cover: PHOTO.jeju[0],
    entries: [
      { offset: 0, title: '제주 도착', body: '비행기에서 내리자마자 습한 바람. 렌터카 받고 바로 바다로 갔다.',
        mood: 'happy', weather: 'sunny', tags: ['제주', '여행'], sleep: 5, energy: 5,
        photos: [PHOTO.jeju[0]],
        places: [{ text: '협재 해수욕장', place: '제주 한림읍', time: '16:00', photo: PHOTO.jeju[0] }],
      },
      { offset: 1, title: '오름', body: '새벽에 일어나서 오름 올라갔다. 죽을 뻔했는데 위에서 본 게 아직도 눈에 남아 있다.',
        mood: 'happy', weather: 'foggy', tags: ['제주'], sleep: 5, energy: 3, star: true,
        photos: [PHOTO.jeju[1], PHOTO.jeju[2]],
        places: [{ text: '용눈이오름', place: '제주 구좌읍', time: '06:30', photo: PHOTO.jeju[1] }],
        meals: [{ slot: 'dinner', text: '흑돼지 구이', place: '제주시', time: '19:00' }],
      },
      { offset: 2, title: '', body: '비가 와서 하루종일 카페. 이런 날도 여행이다.',
        mood: 'calm', weather: 'rainy', tags: ['제주'], sleep: 8, energy: 4,
        photos: [PHOTO.jeju[3]],
        places: [{ text: '바다 보이는 카페', place: '제주 애월', time: '13:00', photo: PHOTO.jeju[3] }],
      },
      { offset: 3, title: '', body: '공항 가는 길에 한 번 더 바다를 봤다. 다음에 또 오자고 했다.',
        mood: 'blue', weather: 'cloudy', tags: ['제주'], sleep: 6, energy: 3,
      },
    ],
  },
];

function writeDay(d: Day, dateIso: string) {
  journalStore.add({
    date: dateIso,
    title: d.title || undefined,
    body: d.body,
    bodyFormat: 'plain',
    moodKey: d.mood,
    weather: d.weather,
    tags: d.tags,
    sleepHours: d.sleep,
    energy: d.energy,
    bgm: d.bgm,
    starred: d.star,
    images: d.photos?.map((s, i) => img(s, i)),
  });
  d.meals?.forEach((m) => daylogStore.add({ date: dateIso, kind: 'meal', mealSlot: m.slot, text: m.text, place: m.place, time: m.time, photo: m.photo }));
  d.places?.forEach((p) => daylogStore.add({ date: dateIso, kind: 'place', text: p.text, place: p.place, time: p.time, photo: p.photo }));
}

/**
 * 기존 기록을 전부 지우고 예시로 갈아 끼운다.
 * 지우는 범위: 일기 · 하루 기록(먹은 것/간 곳) · 여행. 되돌릴 수 없다 —
 * 부르는 쪽에서 반드시 한 번 묻는다.
 */
export function replaceJournalWithSample(): { entries: number; trips: number } {
  journalStore.clear();
  for (const it of daylogStore.listAll()) daylogStore.remove(it.id);
  for (const t of travelStore.listTrips()) travelStore.removeTrip(t.id);

  for (const d of DAYS) writeDay(d, daysAgo(d.ago));

  let entries = DAYS.length;
  for (const t of TRIPS) {
    const start = daysAgo(t.fromAgo);
    const end = daysAgo(t.fromAgo - (t.days - 1));
    travelStore.addTrip({ title: t.title, destination: t.destination, startDate: start, endDate: end, cover: t.cover });
    for (const e of t.entries) {
      writeDay({ ...e, ago: 0 }, daysAgo(t.fromAgo - e.offset));
      entries += 1;
    }
  }
  return { entries, trips: TRIPS.length };
}
