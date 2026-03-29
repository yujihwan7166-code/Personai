// ══════════════════════════════════════════
// ── Game Progress Store (localStorage) ──
// ══════════════════════════════════════════

// XP and Level
export function getPlayerXP(): number {
  return parseInt(localStorage.getItem('game-player-xp') || '0');
}

export function addXP(amount: number): { newXP: number; levelUp: boolean; newLevel: number } {
  const old = getPlayerXP();
  const oldLevel = Math.floor(old / 1000) + 1;
  const newXP = old + amount;
  localStorage.setItem('game-player-xp', String(newXP));
  const newLevel = Math.floor(newXP / 1000) + 1;
  return { newXP, levelUp: newLevel > oldLevel, newLevel };
}

export function getPlayerLevel(): number {
  return Math.floor(getPlayerXP() / 1000) + 1;
}

// Ability stats (radar chart) - 논리력/창의력/언어력/심리전/관찰력
export interface AbilityStats {
  logic: number;
  creativity: number;
  language: number;
  psychology: number;
  observation: number;
}

export function getAbilityStats(): AbilityStats {
  const stored = localStorage.getItem('game-ability-stats');
  return stored
    ? JSON.parse(stored)
    : { logic: 10, creativity: 10, language: 10, psychology: 10, observation: 10 };
}

// Map each game to which ability it boosts
const GAME_ABILITY_MAP: Record<string, keyof AbilityStats> = {
  'ai-polygraph': 'observation',
  'mental-breaker': 'psychology',
  'reverse-interrogation': 'psychology',
  'split-personality': 'observation',
  'emotion-hacker': 'psychology',
  'reverse-quiz': 'language',
  'ai-court': 'logic',
  'code-breaker': 'logic',
  'minefield': 'language',
  'ai-mafia': 'observation',
  'firewall-escape': 'creativity',
  'negotiator': 'creativity',
};

export function boostAbility(gameId: string, won: boolean): AbilityStats {
  const stats = getAbilityStats();
  const key = GAME_ABILITY_MAP[gameId];
  if (key && won) {
    stats[key] = Math.min(100, stats[key] + 5);
  } else if (key) {
    stats[key] = Math.min(100, stats[key] + 2);
  }
  localStorage.setItem('game-ability-stats', JSON.stringify(stats));
  return stats;
}

// Game history
export interface GameRecord {
  gameId: string;
  result: 'win' | 'lose';
  grade: string;
  xp: number;
  time: number;
  turns: number;
  date: string;
}

export function addGameRecord(record: GameRecord) {
  const records = getGameRecords();
  records.unshift(record);
  if (records.length > 50) records.pop();
  localStorage.setItem('game-records', JSON.stringify(records));
}

export function getGameRecords(): GameRecord[] {
  const stored = localStorage.getItem('game-records');
  return stored ? JSON.parse(stored) : [];
}

export function getGameStats(gameId?: string) {
  const records = gameId
    ? getGameRecords().filter(r => r.gameId === gameId)
    : getGameRecords();
  const wins = records.filter(r => r.result === 'win').length;
  return {
    total: records.length,
    wins,
    losses: records.length - wins,
    winRate: records.length ? Math.round((wins / records.length) * 100) : 0,
  };
}

export function getBestGrade(gameId: string): string | null {
  const records = getGameRecords().filter(r => r.gameId === gameId);
  const gradeOrder = ['S', 'A', 'B', 'C', 'F'];
  let best: string | null = null;
  for (const r of records) {
    if (!best || gradeOrder.indexOf(r.grade) < gradeOrder.indexOf(best)) best = r.grade;
  }
  return best;
}

// Grade calculation
export function calculateGrade(stats: {
  time: number;
  maxTime: number;
  turns: number;
  maxTurns: number;
  hints: number;
  maxHints: number;
  won: boolean;
}): string {
  if (!stats.won) return 'F';
  let score = 100;
  score -= (stats.hints / Math.max(1, stats.maxHints)) * 20;
  score -= (stats.turns / Math.max(1, stats.maxTurns)) * 20;
  score -= (stats.time / Math.max(1, stats.maxTime)) * 20;
  if (score >= 90) return 'S';
  if (score >= 75) return 'A';
  if (score >= 55) return 'B';
  if (score >= 35) return 'C';
  return 'F';
}

// XP calculation
export function calculateXP(
  won: boolean,
  difficulty: number,
  hintsUsed: number,
  grade: string,
): number {
  let xp = 100; // base
  if (won) xp += 150;
  if (won && difficulty === 2) xp += 100; // hard mode bonus
  if (won && hintsUsed === 0) xp += 50; // no hints bonus
  if (grade === 'S') xp += 100;
  else if (grade === 'A') xp += 50;
  return xp;
}

// Achievements
export interface Achievement {
  id: string;
  name: string;
  desc: string;
  icon: string;
  condition: (records: GameRecord[]) => boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first-win',
    name: '첫 승리',
    desc: '첫 게임에서 승리',
    icon: '\u{1F3AF}',
    condition: r => r.some(x => x.result === 'win'),
  },
  {
    id: 'streak-3',
    name: '3연승',
    desc: '연속 3판 승리',
    icon: '\u{1F525}',
    condition: r => {
      let s = 0;
      for (const x of r) {
        if (x.result === 'win') s++;
        else s = 0;
        if (s >= 3) return true;
      }
      return false;
    },
  },
  {
    id: 'brain-full',
    name: '두뇌 풀가동',
    desc: '5종류 이상 게임 플레이',
    icon: '\u{1F9E0}',
    condition: r => new Set(r.map(x => x.gameId)).size >= 5,
  },
  {
    id: 'speedrun',
    name: '스피드런',
    desc: '2분 내 게임 클리어',
    icon: '\u26A1',
    condition: r => r.some(x => x.result === 'win' && x.time <= 120),
  },
  {
    id: 'perfect-detective',
    name: '완벽한 탐정',
    desc: '폴리그래프 S등급 달성',
    icon: '\u{1F575}\uFE0F',
    condition: r => r.some(x => x.gameId === 'ai-polygraph' && x.grade === 'S'),
  },
  {
    id: 'mental-destroyer',
    name: '멘탈 파괴자',
    desc: '멘탈 브레이커 3회 승리',
    icon: '\u{1F480}',
    condition: r =>
      r.filter(x => x.gameId === 'mental-breaker' && x.result === 'win').length >= 3,
  },
  {
    id: 'justice',
    name: '정의 구현',
    desc: 'AI 법정 유죄 판결',
    icon: '\u2696\uFE0F',
    condition: r => r.some(x => x.gameId === 'ai-court' && x.result === 'win'),
  },
  {
    id: 'hacker',
    name: '해커',
    desc: '코드 브레이커 S등급',
    icon: '\u{1F510}',
    condition: r => r.some(x => x.gameId === 'code-breaker' && x.grade === 'S'),
  },
  {
    id: 'identity-master',
    name: '인격 파악자',
    desc: '다중인격 AI 승리',
    icon: '\u{1F3AD}',
    condition: r => r.some(x => x.gameId === 'split-personality' && x.result === 'win'),
  },
  {
    id: 'grandmaster',
    name: '그랜드마스터',
    desc: '모든 게임 1회 이상 승리',
    icon: '\u{1F451}',
    condition: r => {
      const games = [
        'ai-polygraph',
        'mental-breaker',
        'reverse-interrogation',
        'split-personality',
        'emotion-hacker',
        'reverse-quiz',
        'ai-court',
        'code-breaker',
        'minefield',
        'ai-mafia',
        'firewall-escape',
        'negotiator',
      ];
      return games.every(g => r.some(x => x.gameId === g && x.result === 'win'));
    },
  },
];

export function getUnlockedAchievements(): string[] {
  const stored = localStorage.getItem('game-achievements');
  return stored ? JSON.parse(stored) : [];
}

export function checkAchievements(): { newlyUnlocked: Achievement[] } {
  const records = getGameRecords();
  const unlocked = getUnlockedAchievements();
  const newlyUnlocked: Achievement[] = [];
  for (const ach of ACHIEVEMENTS) {
    if (!unlocked.includes(ach.id) && ach.condition(records)) {
      unlocked.push(ach.id);
      newlyUnlocked.push(ach);
    }
  }
  localStorage.setItem('game-achievements', JSON.stringify(unlocked));
  return { newlyUnlocked };
}

// Daily challenge
export interface DailyChallenge {
  game: string;
  mission: string;
  xp: number;
}

const DAILY_CHALLENGES: DailyChallenge[] = [
  { game: 'ai-court', mission: 'AI 법정에서 유죄 판결 받기', xp: 500 },
  { game: 'mental-breaker', mission: '멘탈 브레이커에서 승리', xp: 400 },
  { game: 'ai-polygraph', mission: 'AI 폴리그래프 승리', xp: 600 },
  { game: 'reverse-interrogation', mission: '역심문에서 무혐의 달성', xp: 450 },
  { game: 'ai-mafia', mission: 'AI 마피아에서 마피아 찾기', xp: 350 },
  { game: 'code-breaker', mission: '코드 브레이커 클리어', xp: 550 },
  { game: 'firewall-escape', mission: '방화벽 5층 돌파', xp: 600 },
  { game: 'negotiator', mission: '네고시에이터에서 승리', xp: 400 },
  { game: 'reverse-quiz', mission: '리버스 퀴즈 7점 이상', xp: 350 },
  { game: 'emotion-hacker', mission: '이모션 해커 클리어', xp: 450 },
  { game: 'minefield', mission: '마인필드 생존', xp: 400 },
  { game: 'split-personality', mission: '다중인격 AI 전 인격 격파', xp: 500 },
];

export function getTodayChallenge(): DailyChallenge {
  return DAILY_CHALLENGES[new Date().getDate() % DAILY_CHALLENGES.length];
}

export function isChallengeCompleted(): boolean {
  const key = `challenge-${new Date().toDateString()}`;
  return localStorage.getItem(key) === 'done';
}

export function completeChallenge() {
  localStorage.setItem(`challenge-${new Date().toDateString()}`, 'done');
}

// Play count tracking
export function incrementPlayCount() {
  const total = parseInt(localStorage.getItem('game-total-plays') || '0') + 1;
  localStorage.setItem('game-total-plays', String(total));
  const todayKey = `game-plays-${new Date().toDateString()}`;
  const today = parseInt(localStorage.getItem(todayKey) || '0') + 1;
  localStorage.setItem(todayKey, String(today));
}

// Level rewards
export const LEVEL_REWARDS = [
  { level: 3, reward: '"초심자" 칭호', icon: '\u{1F331}' },
  { level: 5, reward: '어려움 난이도 해금', icon: '\u{1F525}' },
  { level: 10, reward: '골드 프레임', icon: '\u2728' },
  { level: 15, reward: '히든 게임 모드', icon: '\u{1F3AD}' },
  { level: 20, reward: '"마스터" 칭호', icon: '\u{1F451}' },
];

export function getPlayerTitle(): string {
  const level = getPlayerLevel();
  if (level >= 20) return '마스터';
  if (level >= 15) return '전략가';
  if (level >= 10) return '도전자';
  if (level >= 5) return '탐험가';
  if (level >= 3) return '초심자';
  return '뉴비';
}
