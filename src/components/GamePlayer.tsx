import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import {
  addXP, boostAbility, addGameRecord, calculateGrade, calculateXP,
  checkAchievements, incrementPlayCount,
} from '@/lib/gameProgress';
import {
  ArrowUp, LogOut, Lightbulb, Flag,
  Sparkles, Send, Trophy, Target, MessageCircle,
  HelpCircle, Swords, BookOpen, Brain,
  Link2, User, Bot, ChevronRight, CircleDot,
  ThumbsUp, ThumbsDown, Zap, Eye, Crown,
  AlertTriangle, CheckCircle2, XCircle, Star,
  Search, Flame, ShieldAlert, Users, Heart, RotateCcw,
  Scale, Lock, Bomb, UserX, Shield, Handshake,
  Drama, Gavel, Crosshair,
} from 'lucide-react';
import type { DiscussionMessage } from '@/types/expert';

// ══════════════════════════════════════════
// ── Types ──
// ══════════════════════════════════════════

interface GamePlayerProps {
  gameId: string;
  gameOption: string;
  optionLabel: string;
  messages: DiscussionMessage[];
  onSendMessage: (msg: string) => void;
  onExit: () => void;
  isDiscussing: boolean;
}

type GameId =
  | 'ai-polygraph'
  | 'mental-breaker'
  | 'reverse-interrogation'
  | 'split-personality'
  | 'emotion-hacker'
  | 'reverse-quiz'
  | 'ai-court'
  | 'code-breaker'
  | 'minefield'
  | 'ai-mafia'
  | 'firewall-escape'
  | 'negotiator';

interface GameMeta {
  icon: React.ReactNode;
  name: string;
  accent: string;
  accentBg: string;
  accentBorder: string;
  glow: string;
  gradient: string;
}

// ══════════════════════════════════════════
// ── Constants ──
// ══════════════════════════════════════════

const GAME_META: Record<GameId, GameMeta> = {
  'ai-polygraph': {
    icon: <Search className="w-5 h-5" />,
    name: 'AI 폴리그래프',
    accent: 'text-cyan-400',
    accentBg: 'bg-cyan-500/20',
    accentBorder: 'border-cyan-500/40',
    glow: 'shadow-[0_0_20px_rgba(6,182,212,0.25)]',
    gradient: 'from-cyan-600/20 via-sky-600/10 to-transparent',
  },
  'mental-breaker': {
    icon: <Flame className="w-5 h-5" />,
    name: '멘탈 브레이커',
    accent: 'text-red-400',
    accentBg: 'bg-red-500/20',
    accentBorder: 'border-red-500/40',
    glow: 'shadow-[0_0_20px_rgba(239,68,68,0.25)]',
    gradient: 'from-red-600/20 via-rose-600/10 to-transparent',
  },
  'reverse-interrogation': {
    icon: <ShieldAlert className="w-5 h-5" />,
    name: '역심문',
    accent: 'text-amber-400',
    accentBg: 'bg-amber-500/20',
    accentBorder: 'border-amber-500/40',
    glow: 'shadow-[0_0_20px_rgba(245,158,11,0.25)]',
    gradient: 'from-amber-600/20 via-orange-600/10 to-transparent',
  },
  'split-personality': {
    icon: <Drama className="w-5 h-5" />,
    name: '다중인격 AI',
    accent: 'text-purple-400',
    accentBg: 'bg-purple-500/20',
    accentBorder: 'border-purple-500/40',
    glow: 'shadow-[0_0_20px_rgba(168,85,247,0.25)]',
    gradient: 'from-purple-600/20 via-violet-600/10 to-transparent',
  },
  'emotion-hacker': {
    icon: <Heart className="w-5 h-5" />,
    name: '이모션 해커',
    accent: 'text-pink-400',
    accentBg: 'bg-pink-500/20',
    accentBorder: 'border-pink-500/40',
    glow: 'shadow-[0_0_20px_rgba(236,72,153,0.25)]',
    gradient: 'from-pink-600/20 via-rose-600/10 to-transparent',
  },
  'reverse-quiz': {
    icon: <RotateCcw className="w-5 h-5" />,
    name: '리버스 퀴즈',
    accent: 'text-emerald-400',
    accentBg: 'bg-emerald-500/20',
    accentBorder: 'border-emerald-500/40',
    glow: 'shadow-[0_0_20px_rgba(16,185,129,0.25)]',
    gradient: 'from-emerald-600/20 via-green-600/10 to-transparent',
  },
  'ai-court': {
    icon: <Gavel className="w-5 h-5" />,
    name: 'AI 법정',
    accent: 'text-orange-400',
    accentBg: 'bg-orange-500/20',
    accentBorder: 'border-orange-500/40',
    glow: 'shadow-[0_0_20px_rgba(249,115,22,0.25)]',
    gradient: 'from-orange-600/20 via-red-600/10 to-transparent',
  },
  'code-breaker': {
    icon: <Lock className="w-5 h-5" />,
    name: '코드 브레이커',
    accent: 'text-blue-400',
    accentBg: 'bg-blue-500/20',
    accentBorder: 'border-blue-500/40',
    glow: 'shadow-[0_0_20px_rgba(59,130,246,0.25)]',
    gradient: 'from-blue-600/20 via-indigo-600/10 to-transparent',
  },
  'minefield': {
    icon: <Bomb className="w-5 h-5" />,
    name: '마인필드',
    accent: 'text-rose-400',
    accentBg: 'bg-rose-500/20',
    accentBorder: 'border-rose-500/40',
    glow: 'shadow-[0_0_20px_rgba(244,63,94,0.25)]',
    gradient: 'from-rose-600/20 via-pink-600/10 to-transparent',
  },
  'ai-mafia': {
    icon: <UserX className="w-5 h-5" />,
    name: 'AI 마피아',
    accent: 'text-violet-400',
    accentBg: 'bg-violet-500/20',
    accentBorder: 'border-violet-500/40',
    glow: 'shadow-[0_0_20px_rgba(139,92,246,0.25)]',
    gradient: 'from-violet-600/20 via-purple-600/10 to-transparent',
  },
  'firewall-escape': {
    icon: <Shield className="w-5 h-5" />,
    name: '방화벽 탈출',
    accent: 'text-teal-400',
    accentBg: 'bg-teal-500/20',
    accentBorder: 'border-teal-500/40',
    glow: 'shadow-[0_0_20px_rgba(20,184,166,0.25)]',
    gradient: 'from-teal-600/20 via-emerald-600/10 to-transparent',
  },
  'negotiator': {
    icon: <Handshake className="w-5 h-5" />,
    name: '네고시에이터',
    accent: 'text-amber-400',
    accentBg: 'bg-amber-500/20',
    accentBorder: 'border-amber-500/40',
    glow: 'shadow-[0_0_20px_rgba(245,158,11,0.25)]',
    gradient: 'from-amber-600/20 via-yellow-600/10 to-transparent',
  },
};

// ══════════════════════════════════════════
// ── AI Response Parsers ──
// ══════════════════════════════════════════

function parsePolygraph(content: string) {
  const remainingMatch = content.match(/남은\s*질문\s*[:：]?\s*(\d+)\s*[/\\]\s*(\d+)/);
  const liesMatch = content.match(/찾은\s*거짓말\s*[:：]?\s*(\d+)\s*[/\\]\s*(\d+)/);
  const stressMatch = content.match(/스트레스\s*[:：]?\s*(\d+)\s*[%％]/);
  const isLieDetected = /거짓말\s*발견|거짓말.*맞[았습혔]|LIE.*DETECTED|거짓!.*맞|<!-- LIE -->/i.test(content);
  const isTruth = /진실\s*확인|진실.*입니다|진실!.*맞|<!-- TRUTH -->/i.test(content);
  const isWin = /축하합니다|모든\s*거짓말.*찾|모든\s*거짓말.*간파|3.*거짓말.*발견/i.test(content);
  const isLose = /게임\s*종료|시간.*다\s*됐|15번.*소진/i.test(content);
  const isGameOver = isWin || isLose;
  return {
    remaining: remainingMatch ? parseInt(remainingMatch[1]) : null,
    total: remainingMatch ? parseInt(remainingMatch[2]) : 15,
    liesFound: liesMatch ? parseInt(liesMatch[1]) : null,
    totalLies: liesMatch ? parseInt(liesMatch[2]) : 3,
    stress: stressMatch ? parseInt(stressMatch[1]) : null,
    isLieDetected,
    isTruth,
    isGameOver,
    isWin,
  };
}

function parseMentalBreaker(content: string) {
  const hpMatch = content.match(/(?:멘탈\s*)?HP\s*[:：]?\s*(\d+)\s*[%％/]?\s*(\d+)?/i);
  const isCracked = /멘탈\s*붕괴|💥\s*멘탈|멘탈.*0[^0-9]|항복.*합니다|무너[졌지]|부[서셔]졌/i.test(content);
  const hp = hpMatch ? parseInt(hpMatch[1]) : null;
  const maxHp = hpMatch && hpMatch[2] ? parseInt(hpMatch[2]) : 100;
  return { hp, maxHp, isCracked };
}

function parseReverseInterrogation(content: string) {
  const suspicionMatch = content.match(/의심도\s*[:：]?\s*(\d+)\s*[%％]/);
  const contradictionMatch = content.match(/모순\s*[:：]?\s*(\d+)\s*[/\\]\s*(\d+)/);
  const questionMatch = content.match(/질문\s*[:：]?\s*(\d+)\s*[/\\]\s*(\d+)/);
  const isCaught = /체포합니다|체포!|모순.*3|의심도.*100|게임\s*오버/i.test(content);
  const isSafe = /무혐의|석방|보내드리겠습니다|무죄|알리바이.*성공/i.test(content);
  return {
    suspicion: suspicionMatch ? parseInt(suspicionMatch[1]) : null,
    contradictions: contradictionMatch ? parseInt(contradictionMatch[1]) : null,
    maxContradictions: contradictionMatch ? parseInt(contradictionMatch[2]) : 3,
    questionNum: questionMatch ? parseInt(questionMatch[1]) : null,
    totalQuestions: questionMatch ? parseInt(questionMatch[2]) : 10,
    isCaught,
    isSafe,
  };
}

function parseSplitPersonality(content: string) {
  const personalityMatch = content.match(/(?:현재\s*)?인격\s*[:：]?\s*([^\]\n,]+)/);
  const defeatedMatch = content.match(/격파\s*[:：]?\s*(\d+)\s*[/\\]\s*(\d+)/);
  const defeatedMatchAlt = content.match(/무력화\s*[:：]?\s*(\d+)\s*[/\\]\s*(\d+)/);
  const isSwitch = /인격\s*전환|⚡\s*인격|인격.*바뀌|새로운\s*인격/i.test(content);
  const isDefeated = /💥.*무력화|무력화!/i.test(content);
  const isAllDefeated = /모든\s*인격.*격파|4.*격파|4.*무력화|모든\s*인격.*무력화|항복합니다/i.test(content);
  const dm = defeatedMatch || defeatedMatchAlt;
  return {
    currentPersonality: personalityMatch ? personalityMatch[1].trim() : null,
    defeated: dm ? parseInt(dm[1]) : null,
    totalPersonalities: dm ? parseInt(dm[2]) : 4,
    isSwitch,
    isDefeated,
    isAllDefeated,
  };
}

function parseEmotionHacker(content: string) {
  const emotionMatch = content.match(/현재\s*감정\s*[:：]?\s*([^\]\n,]+)/);
  const completedMatch = content.match(/달성\s*[:：]?\s*(\d+)\s*[/\\]\s*(\d+)/);
  const targetMatch = content.match(/목표\s*감정\s*[:：]?\s*([^\]\n,]+)/);
  const emotionChanged = /감정\s*변화|✨.*달성|감정.*달성/i.test(content);
  const isComplete = /모든\s*감정.*해킹|모든\s*감정.*완료|5.*달성|이모션\s*해커/i.test(content);
  return {
    currentEmotion: emotionMatch ? emotionMatch[1].trim() : null,
    targetEmotion: targetMatch ? targetMatch[1].trim() : null,
    completed: completedMatch ? parseInt(completedMatch[1]) : null,
    totalEmotions: completedMatch ? parseInt(completedMatch[2]) : 5,
    emotionChanged,
    isComplete,
  };
}

function parseReverseQuiz(content: string) {
  const questionMatch = content.match(/Q\s*[:：]?\s*(\d+)\s*[/\\]\s*(\d+)/);
  const questionMatchAlt = content.match(/Q(\d+)\s*[/\\]\s*(\d+)/);
  const scoreMatch = content.match(/점수\s*[:：]?\s*(\d+)\s*[/\\]\s*(\d+)/);
  const answerMatch = content.match(/(?:정답|답)\s*[:：]?\s*[""]?([^""\n\]]+)[""]?/);
  const isCorrect = /⭕\s*정답|정답입니다|정답!|맞[았혔습]/i.test(content);
  const isWrong = /❌\s*오답|❌\s*아쉽|오답!|틀[렸리]/i.test(content);
  const isFinished = /최종\s*점수|S급|A급|B급|C급|F급|퀴즈\s*천재/i.test(content);
  const qm = questionMatch || questionMatchAlt;
  return {
    currentQ: qm ? parseInt(qm[1]) : null,
    totalQ: qm ? parseInt(qm[2] || '10') : 10,
    score: scoreMatch ? parseInt(scoreMatch[1]) : null,
    answer: answerMatch ? answerMatch[1].trim() : null,
    isCorrect,
    isWrong,
    isFinished,
  };
}

function parseAICourt(content: string) {
  const phaseMatch = content.match(/단계\s*[:：]?\s*(입론|반론|최종변론|변론|판결)/i);
  const phase = phaseMatch ? phaseMatch[1] : content.match(/\[(입론|반론|최종변론|변론|판결)\]/)?.[1] || null;
  const guiltyScoreMatch = content.match(/유죄\s*점수\s*[:：]?\s*(\d+)\s*[/\\]\s*(\d+)/);
  const isVerdict = /판결.*내리|판결문|이에\s*본\s*법정|VERDICT/i.test(content);
  const isGuilty = /유죄\s*판결|유죄를\s*선고/i.test(content);
  const isNotGuilty = /무죄\s*판결|무죄를\s*선고/i.test(content);
  return {
    phase,
    guiltyScore: guiltyScoreMatch ? parseInt(guiltyScoreMatch[1]) : null,
    maxGuiltyScore: guiltyScoreMatch ? parseInt(guiltyScoreMatch[2]) : 100,
    isVerdict,
    isGuilty,
    isNotGuilty,
  };
}

function parseCodeBreaker(content: string) {
  const remainingMatch = content.match(/남은\s*질문\s*[:：]?\s*(\d+)\s*[/\\]\s*(\d+)/);
  const attemptsMatch = content.match(/(?:시도|질문)\s*[:：]?\s*(\d+)\s*[/\\]?\s*(\d+)?/);
  const codeMatch = content.match(/코드\s*[:：]?\s*([?★●○X\d_-]{3,12})/);
  const unlockedMatch = content.match(/해독(?:된)?\s*(?:자릿수)?\s*[:：]?\s*(\d+)\s*[/\\]\s*(\d+)/);
  const isSolved = /해독\s*완료|ACCESS\s*GRANTED|보안\s*침투|당신의\s*승리/i.test(content);
  const isFailed = /ACCESS\s*DENIED|시도\s*횟수\s*초과|실패|게임\s*오버/i.test(content);
  // Support both "남은 질문" (countdown) and "시도" (countup) formats
  let remaining: number | null = null;
  let maxAttempts = 12;
  if (remainingMatch) {
    remaining = parseInt(remainingMatch[1]);
    maxAttempts = parseInt(remainingMatch[2]);
  } else if (attemptsMatch) {
    remaining = attemptsMatch[2] ? parseInt(attemptsMatch[2]) - parseInt(attemptsMatch[1]) : null;
    maxAttempts = attemptsMatch[2] ? parseInt(attemptsMatch[2]) : 12;
  }
  return {
    attempts: remainingMatch ? maxAttempts - remaining! : (attemptsMatch ? parseInt(attemptsMatch[1]) : null),
    maxAttempts,
    remaining,
    codeDisplay: codeMatch ? codeMatch[1] : null,
    unlocked: unlockedMatch ? parseInt(unlockedMatch[1]) : null,
    totalDigits: unlockedMatch ? parseInt(unlockedMatch[2]) : 4,
    isSolved,
    isFailed,
  };
}

function parseMinefield(content: string) {
  const livesMatch = content.match(/(?:남은\s*)?(?:생명|목숨|라이프)\s*[:：]?\s*(\d+)\s*[/\\]?\s*(\d+)?/);
  const turnMatch = content.match(/턴\s*[:：]?\s*(\d+)\s*[/\\]\s*(\d+)/);
  const isExplosion = /💣\s*폭발|💥|BOOM|금지어.*였습니다/i.test(content);
  const isDead = /게임\s*오버|💀|목숨.*0[^0-9]|생명.*0[^0-9]/i.test(content);
  const isSurvived = /생존\s*성공|🎉.*생존|클리어|10턴.*생존/i.test(content);
  return {
    lives: livesMatch ? parseInt(livesMatch[1]) : null,
    maxLives: livesMatch ? parseInt(livesMatch[2] || '3') : 3,
    turn: turnMatch ? parseInt(turnMatch[1]) : null,
    totalTurns: turnMatch ? parseInt(turnMatch[2]) : 10,
    isExplosion,
    isDead,
    isSurvived,
  };
}

function parseAIMafia(content: string) {
  const roundMatch = content.match(/라운드\s*[:：]?\s*(\d+)\s*[/\\]?\s*(\d+)?/);
  const isVotePhase = /투표\s*단계|투표\s*페이즈|마피아를\s*지목|선택하세요|누구.*마피아/i.test(content);
  const isWin = /🎉.*정답|정답!.*마피아/i.test(content);
  const isLose = /❌.*오답|오답!.*마피아|진짜\s*마피아는/i.test(content);
  const isReveal = isWin || isLose;
  const participantLines = content.match(/[ABC]\s*[:：)]\s*.+/g);
  return {
    round: roundMatch ? parseInt(roundMatch[1]) : null,
    totalRounds: roundMatch && roundMatch[2] ? parseInt(roundMatch[2]) : 3,
    isVotePhase,
    isReveal,
    isWin,
    isLose,
    participants: participantLines || [],
  };
}

function parseFirewallEscape(content: string) {
  const layerMatch = content.match(/(?:층|레이어|방화벽)\s*[:：]?\s*(\d+)\s*[/\\]\s*(\d+)/);
  const approachMatch = content.match(/(?:현재\s*)?접근법\s*[:：]?\s*([^\]\n,]+)/);
  const layerBreached = /층\s*돌파|보안\s*레벨\s*저하|다음\s*층/i.test(content);
  const isFullyBreached = /전체\s*방화벽\s*무력화|탈출\s*성공|5.*돌파|시스템.*돌파/i.test(content);
  const isBlocked = /접근\s*거부|차단!/i.test(content);
  return {
    currentLayer: layerMatch ? parseInt(layerMatch[1]) : null,
    totalLayers: layerMatch ? parseInt(layerMatch[2]) : 5,
    approach: approachMatch ? approachMatch[1].trim() : null,
    layerBreached,
    isBreached: isFullyBreached,
    isBlocked,
  };
}

function parseNegotiator(content: string) {
  const userItemsMatch = content.match(/(?:내|당신|사용자)\s*아이템\s*[:：]?\s*([^\]\n]+)/);
  const aiItemsMatch = content.match(/(?:AI|상인)\s*아이템\s*[:：]?\s*([^\]\n]+)/);
  const roundMatch = content.match(/라운드\s*[:：]?\s*(\d+)\s*[/\\]\s*(\d+)/);
  const isTradeProposed = /제안합니다|거래\s*조건|교환\s*제안/i.test(content);
  const isDeal = /거래\s*성사|DEAL!|수락.*완료|교환.*완료/i.test(content);
  const isNoDeal = /거절|NO\s*DEAL|거래.*거부/i.test(content);
  const isFinalReveal = /📊.*최종|최종\s*결과|비밀\s*가치.*공개|총점.*계산/i.test(content);
  return {
    userItems: userItemsMatch ? userItemsMatch[1].trim() : null,
    aiItems: aiItemsMatch ? aiItemsMatch[1].trim() : null,
    round: roundMatch ? parseInt(roundMatch[1]) : null,
    totalRounds: roundMatch ? parseInt(roundMatch[2]) : 5,
    isTradeProposed,
    isDeal,
    isNoDeal,
    isFinalReveal,
  };
}

// ══════════════════════════════════════════
// ── Shared Sub-Components ──
// ══════════════════════════════════════════

function ProgressBar({ current, total, accent }: { current: number; total: number; accent: string }) {
  const pct = Math.min(100, Math.round((current / total) * 100));
  const barColor = accent.replace('text-', 'bg-');
  return (
    <div className="w-full h-2.5 bg-slate-700/60 rounded-full overflow-hidden backdrop-blur-sm">
      <div
        className={cn('h-full rounded-full transition-all duration-700 ease-out', barColor)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function GameBadge({ children, className, style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide', className)} style={style}>
      {children}
    </span>
  );
}

function StreamingDots() {
  return (
    <div className="flex items-center gap-2 py-4 px-5">
      <div className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms', animationDuration: '1.2s' }} />
        <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '200ms', animationDuration: '1.2s' }} />
        <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '400ms', animationDuration: '1.2s' }} />
      </div>
      <span className="text-[10px] text-slate-500 ml-1">AI 사고 중...</span>
    </div>
  );
}

/* HP Bar for mental breaker */
function HPBar({ hp, maxHp }: { hp: number; maxHp: number }) {
  const pct = Math.max(0, Math.min(100, (hp / maxHp) * 100));
  const barColor = pct > 50 ? 'bg-green-500' : pct > 20 ? 'bg-amber-500' : 'bg-red-500';
  const crackStyle = pct < 50 ? 'shadow-[0_0_10px_rgba(239,68,68,0.5)]' : '';
  return (
    <div className="w-full space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-slate-400 font-semibold">멘탈 HP</span>
        <span className={cn('text-[11px] font-black', pct > 50 ? 'text-green-400' : pct > 20 ? 'text-amber-400' : 'text-red-400')}>
          {hp}/{maxHp}
        </span>
      </div>
      <div className={cn('w-full h-3 bg-slate-700/60 rounded-full overflow-hidden', crackStyle)}>
        <div
          className={cn('h-full rounded-full transition-all duration-700 ease-out', barColor)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/* Suspicion meter */
function SuspicionMeter({ level }: { level: number }) {
  const color = level > 70 ? 'text-red-400' : level > 40 ? 'text-amber-400' : 'text-green-400';
  const barColor = level > 70 ? 'bg-red-500' : level > 40 ? 'bg-amber-500' : 'bg-green-500';
  return (
    <div className="w-full space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-slate-400 font-semibold">의심도</span>
        <span className={cn('text-[11px] font-black', color)}>{level}%</span>
      </div>
      <div className="w-full h-2.5 bg-slate-700/60 rounded-full overflow-hidden">
        <div className={cn('h-full rounded-full transition-all duration-700 ease-out', barColor)} style={{ width: `${level}%` }} />
      </div>
    </div>
  );
}

/* Emotion sequence display */
function EmotionSequence({ completed, totalEmotions }: { completed: number; totalEmotions: number }) {
  const emotions = ['기쁨', '분노', '슬픔', '공포', '평온'];
  const emojis = ['😊', '😡', '😢', '😨', '😌'];
  const colors = ['bg-yellow-500', 'bg-red-500', 'bg-blue-500', 'bg-gray-500', 'bg-green-500'];
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: totalEmotions }).map((_, i) => (
        <div key={i} className="flex flex-col items-center gap-0.5">
          <div className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all duration-300 border-2',
            i < completed
              ? cn(colors[i], 'border-white/30 scale-110')
              : i === completed
                ? 'bg-slate-600 border-pink-400 animate-pulse'
                : 'bg-slate-700/50 border-slate-600/30'
          )}>
            {emojis[i]}
          </div>
          <span className={cn('text-[8px] font-semibold', i < completed ? 'text-slate-200' : 'text-slate-500')}>
            {emotions[i]}
          </span>
        </div>
      ))}
    </div>
  );
}

/* Code lock display */
function CodeLockDisplay({ codeDisplay, totalDigits }: { codeDisplay: string | null; totalDigits: number }) {
  const display = codeDisplay || Array(totalDigits).fill('?').join('');
  return (
    <div className="flex items-center gap-2 justify-center">
      {display.split('').map((char, i) => {
        const isUnlocked = char !== '?' && char !== '★' && char !== '●' && char !== '_' && char !== 'X';
        return (
          <div key={i} className={cn(
            'w-12 h-14 rounded-lg flex items-center justify-center text-xl font-black border-2 transition-all duration-300',
            isUnlocked
              ? 'bg-blue-500/20 border-blue-400 text-blue-300 shadow-[0_0_12px_rgba(59,130,246,0.3)]'
              : 'bg-slate-800/60 border-slate-600 text-slate-500'
          )}>
            {isUnlocked ? char : <Lock className="w-4 h-4" />}
          </div>
        );
      })}
    </div>
  );
}

/* Lives display (hearts) */
function LivesDisplay({ lives, maxLives }: { lives: number; maxLives: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: maxLives }).map((_, i) => (
        <Heart
          key={i}
          className={cn(
            'w-5 h-5 transition-all duration-300',
            i < lives ? 'text-rose-400 fill-rose-400' : 'text-slate-600'
          )}
        />
      ))}
    </div>
  );
}

/* Layer progress for firewall */
function LayerProgress({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className={cn(
          'w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black border-2 transition-all duration-300',
          i < current
            ? 'bg-teal-500/30 border-teal-400 text-teal-300'
            : i === current
              ? 'bg-teal-500/10 border-teal-400 text-teal-400 animate-pulse'
              : 'bg-slate-800/60 border-slate-600 text-slate-500'
        )}>
          {i < current ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
        </div>
      ))}
    </div>
  );
}

/* Game card wrapper for AI content */
function GameCard({ children, className, accentBorder }: { children: React.ReactNode; className?: string; accentBorder?: string }) {
  return (
    <div className={cn(
      'w-full rounded-xl border bg-slate-800/80 backdrop-blur-sm overflow-hidden transition-all duration-300 animate-in fade-in slide-in-from-bottom-2',
      accentBorder || 'border-slate-700/60',
      className,
    )}>
      {children}
    </div>
  );
}

/* User answer card */
function UserCard({ children, accentColor }: { children: React.ReactNode; accentColor?: string }) {
  return (
    <div className={cn(
      'w-full rounded-xl border px-5 py-3 transition-all duration-200 animate-in fade-in slide-in-from-bottom-2 duration-300',
      accentColor || 'border-slate-600/40 bg-slate-700/40',
    )}>
      <div className="flex items-center gap-2 mb-1.5">
        <User className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">My Answer</span>
      </div>
      <p className="text-[13px] text-slate-200 leading-relaxed">{children}</p>
    </div>
  );
}

/* Quick action button - Cycle 44: Enhanced press feedback */
function QuickBtn({ children, onClick, disabled, className }: {
  children: React.ReactNode; onClick: () => void; disabled?: boolean; className?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[11px] font-semibold transition-all duration-150',
        'border bg-slate-800/80 hover:scale-[1.04] hover:brightness-110 active:scale-[0.93] active:brightness-90 disabled:opacity-40 disabled:hover:scale-100',
        'hover:shadow-md active:shadow-none',
        className,
      )}
    >
      {children}
    </button>
  );
}

// ══════════════════════════════════════════
// ── Main GamePlayer Component ──
// ══════════════════════════════════════════

export function GamePlayer({ gameId, gameOption, optionLabel, messages, onSendMessage, onExit, isDiscussing }: GamePlayerProps) {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  /* Cycle 16: Track game-specific visual state */
  const [shatterActive, setShatterActive] = useState(false);
  const [explosionWord, setExplosionWord] = useState<string | null>(null);
  const [flickerActive, setFlickerActive] = useState(false);
  const [objectionOverlay, setObjectionOverlay] = useState(false);
  const prevAiCount = useRef(0);

  // ── Post-game result state ──
  const [gameResult, setGameResult] = useState<{
    won: boolean;
    grade: string;
    xpGained: number;
    stats: { time: number; turns: number; hints: number };
    newAchievements: { id: string; name: string; icon: string }[];
    levelUp: boolean;
    newLevel: number;
  } | null>(null);
  const gameStartTime = useRef(Date.now());
  const turnsUsed = useRef(0);
  const hintsUsed = useRef(0);
  const gameEndedRef = useRef(false);

  const meta = GAME_META[gameId as GameId] ?? GAME_META['ai-polygraph'];

  const aiMessages = useMemo(
    () => messages.filter(m => m.expertId !== '__user__' && m.expertId !== '__round__'),
    [messages],
  );
  const userMessages = useMemo(
    () => messages.filter(m => m.expertId === '__user__'),
    [messages],
  );

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (!isDiscussing) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isDiscussing]);

  /* Cycle 17: Detect game events for visual triggers */
  useEffect(() => {
    if (aiMessages.length <= prevAiCount.current) { prevAiCount.current = aiMessages.length; return; }
    prevAiCount.current = aiMessages.length;
    const latest = aiMessages[aiMessages.length - 1]?.content || '';

    if (gameId === 'mental-breaker') {
      const parsed = parseMentalBreaker(latest);
      if (parsed.isCracked) { setShatterActive(true); setTimeout(() => setShatterActive(false), 3000); }
    }
    if (gameId === 'minefield') {
      const parsed = parseMinefield(latest);
      if (parsed.isExplosion) {
        const wordMatch = latest.match(/💥[^!]*[!！]\s*[""]?([^\s"",!！]+)/);
        const word = wordMatch?.[1] || '폭발';
        setExplosionWord(word);
        setTimeout(() => setExplosionWord(null), 2000);
      }
    }
    if (gameId === 'split-personality') {
      const parsed = parseSplitPersonality(latest);
      if (parsed.isSwitch) { setFlickerActive(true); setTimeout(() => setFlickerActive(false), 600); }
    }
  }, [aiMessages, gameId]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isDiscussing) return;
    turnsUsed.current += 1;
    onSendMessage(input.trim());
    setInput('');
    if (inputRef.current) inputRef.current.style.height = 'auto';
  };

  const sendQuick = (msg: string) => {
    if (isDiscussing) return;
    turnsUsed.current += 1;
    onSendMessage(msg);
  };

  // ── End game handler ──
  const endGame = useCallback((won: boolean) => {
    if (gameEndedRef.current) return;
    gameEndedRef.current = true;
    const time = Math.round((Date.now() - gameStartTime.current) / 1000);
    const turns = turnsUsed.current;
    const hints = hintsUsed.current;
    const grade = calculateGrade({ time, maxTime: 300, turns, maxTurns: 20, hints, maxHints: 3, won });
    const xpGained = calculateXP(won, 1, hints, grade);
    const { levelUp, newLevel } = addXP(xpGained);
    boostAbility(gameId, won);
    addGameRecord({ gameId, result: won ? 'win' : 'lose', grade, xp: xpGained, time, turns, date: new Date().toISOString() });
    incrementPlayCount();
    const { newlyUnlocked } = checkAchievements();
    setGameResult({ won, grade, xpGained, stats: { time, turns, hints }, newAchievements: newlyUnlocked, levelUp, newLevel });
  }, [gameId]);

  // ── Detect game end from AI messages ──
  useEffect(() => {
    if (gameResult !== null || gameEndedRef.current) return;
    if (aiMessages.length === 0) return;
    const latest = aiMessages[aiMessages.length - 1]?.content || '';
    const winPatterns = /축하합니다|승리|성공|모두 찾았습니다|유죄|돌파|ACCESS GRANTED/i;
    const losePatterns = /게임 종료|패배|실패|모든 기회를 사용|무죄/i;
    if (winPatterns.test(latest)) {
      setTimeout(() => endGame(true), 1500);
    } else if (losePatterns.test(latest)) {
      setTimeout(() => endGame(false), 1500);
    }
  }, [aiMessages, gameResult, endGame]);

  const conversationPairs = useMemo(() => {
    const pairs: Array<{ user?: DiscussionMessage; ai?: DiscussionMessage }> = [];
    let aiIdx = 0;
    const userMsgs = userMessages.slice(1);
    if (aiMessages.length > 0) {
      pairs.push({ ai: aiMessages[0] });
      aiIdx = 1;
    }
    for (let i = 0; i < userMsgs.length; i++) {
      pairs.push({ user: userMsgs[i], ai: aiMessages[aiIdx] });
      aiIdx++;
    }
    if (aiIdx < aiMessages.length) {
      pairs.push({ ai: aiMessages[aiIdx] });
    }
    return pairs;
  }, [aiMessages, userMessages]);

  const latestAi = aiMessages.length > 0 ? aiMessages[aiMessages.length - 1] : null;
  const latestContent = latestAi?.content || '';

  // ── Game-specific render functions ──

  const renderPolygraph = () => {
    const parsed = parsePolygraph(latestContent);
    const remaining = parsed.remaining ?? 15;
    const total = parsed.total;
    const liesFound = parsed.liesFound ?? 0;
    const stress = parsed.stress ?? Math.min(100, liesFound * 25);
    const stressLevel = liesFound / 3;
    const pulseDuration = Math.max(0.5, 2 - stressLevel * 1.5);

    return (
      <>
        <div className="px-5 py-4 bg-gradient-to-r from-cyan-950/50 via-slate-800/60 to-slate-900/60 border-b border-cyan-500/20 relative overflow-hidden">
          {liesFound > 0 && (
            <div className="absolute inset-0 bg-cyan-500/5 pointer-events-none" style={{ animation: `gp-pulse-glow ${pulseDuration}s ease-in-out infinite` }} />
          )}
          <div className="flex items-center justify-between mb-3 relative">
            <div className="flex items-center gap-3">
              <GameBadge className="bg-cyan-500/15 text-cyan-300 border border-cyan-500/20">
                <Search className="w-3 h-3" /> 남은 질문: {remaining}/{total}
              </GameBadge>
              <GameBadge className={cn('border transition-all duration-300', liesFound > 0 ? 'bg-red-500/15 text-red-300 border-red-500/20' : 'bg-slate-700/60 text-slate-300 border-slate-600/40')}
                style={liesFound > 0 ? { animation: `gp-pulse-glow ${pulseDuration}s ease-in-out infinite` } : undefined}>
                <Eye className="w-3 h-3" /> 거짓말: {liesFound}/3
              </GameBadge>
              {stress > 0 && (
                <GameBadge className={cn('border', stress > 60 ? 'bg-red-500/15 text-red-300 border-red-500/20' : 'bg-amber-500/15 text-amber-300 border-amber-500/20')}>
                  <Zap className="w-3 h-3" /> 스트레스: {stress}%
                </GameBadge>
              )}
            </div>
            <span className="text-[10px] text-slate-500">{optionLabel}</span>
          </div>
          <ProgressBar current={total - remaining} total={total} accent={meta.accent} />
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3 scrollbar-thin">
          {conversationPairs.map((pair, i) => (
            <div key={i} className="space-y-3 animate-in fade-in slide-in-from-bottom-1 duration-300">
              {pair.user && <UserCard accentColor="border-cyan-500/20 bg-cyan-950/30">{pair.user.content}</UserCard>}
              {pair.ai && (
                <GameCard accentBorder={(() => {
                  const p = parsePolygraph(pair.ai?.content || '');
                  if (p.isLieDetected) return 'border-red-500/30';
                  return 'border-cyan-500/15';
                })()}>
                  {pair.ai.isStreaming && !pair.ai.content ? <StreamingDots /> : (
                    <div className="px-5 py-4">
                      {(() => {
                        const p = parsePolygraph(pair.ai?.content || '');
                        return p.isLieDetected ? (
                          <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20" style={{ animation: 'gp-shake 0.4s ease-in-out' }}>
                            <AlertTriangle className="w-4 h-4 text-red-400" />
                            <span className="text-[12px] font-bold text-red-400">거짓말 발견!</span>
                          </div>
                        ) : p.isTruth ? (
                          <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20 animate-in zoom-in">
                            <CheckCircle2 className="w-4 h-4 text-green-400" />
                            <span className="text-[12px] font-bold text-green-400">진실 확인!</span>
                          </div>
                        ) : null;
                      })()}
                      <p className={cn('text-[13px] text-slate-200 leading-relaxed whitespace-pre-wrap break-words', (() => {
                        const p = parsePolygraph(pair.ai?.content || '');
                        return p.isLieDetected ? 'gp-text-tremor' : '';
                      })())}>{pair.ai.content}</p>
                      {pair.ai.isStreaming && pair.ai.content && <span className="inline-block w-0.5 h-3.5 bg-cyan-400/60 ml-0.5 cursor-blink rounded-full" />}
                    </div>
                  )}
                </GameCard>
              )}
            </div>
          ))}

          {/* Game Over Screen */}
          {parsed.isGameOver && (
            <div className={cn('mt-4 p-6 rounded-2xl border-2 text-center animate-in zoom-in duration-500',
              parsed.isWin ? 'border-green-500/40 bg-gradient-to-br from-green-950/40 via-emerald-950/30 to-slate-900/40' : 'border-red-500/40 bg-gradient-to-br from-red-950/40 via-rose-950/30 to-slate-900/40'
            )} style={{ animation: parsed.isWin ? 'gp-pulse-glow 2s ease-in-out infinite' : 'gp-shake 0.5s ease-in-out' }}>
              <div className="text-3xl mb-2">{parsed.isWin ? '🎉' : '⏰'}</div>
              <div className={cn('text-xl font-black mb-2', parsed.isWin ? 'text-green-400 drop-shadow-[0_0_15px_rgba(74,222,128,0.5)]' : 'text-red-400')}>
                {parsed.isWin ? 'CLEAR!' : 'GAME OVER'}
              </div>
              <p className="text-sm text-slate-300 mb-4">{parsed.isWin ? '모든 거짓말을 찾아냈습니다!' : '시간이 다 됐습니다...'}</p>
              <button onClick={onExit} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold text-sm hover:scale-105 active:scale-95 transition-transform">
                다시 하기
              </button>
            </div>
          )}
        </div>

        {!parsed.isGameOver && (
          <div className="flex flex-wrap items-center gap-2 px-5 pb-3">
            <QuickBtn onClick={() => sendQuick('거짓!')} disabled={isDiscussing}
              className="border-red-500/30 text-red-300 hover:bg-red-600/15">
              <XCircle className="w-3.5 h-3.5" /> 거짓!
            </QuickBtn>
            <QuickBtn onClick={() => sendQuick('진실!')} disabled={isDiscussing}
              className="border-green-500/30 text-green-300 hover:bg-green-600/15">
              <CheckCircle2 className="w-3.5 h-3.5" /> 진실!
            </QuickBtn>
            <QuickBtn onClick={() => sendQuick('힌트를 주세요')} disabled={isDiscussing}
              className="border-yellow-500/30 text-yellow-300 hover:bg-yellow-600/15">
              <Lightbulb className="w-3.5 h-3.5" /> 힌트
            </QuickBtn>
          </div>
        )}
      </>
    );
  };

  const renderMentalBreaker = () => {
    const parsed = parseMentalBreaker(latestContent);
    const hp = parsed.hp ?? 100;
    const maxHp = parsed.maxHp;
    /* Cycle 18: Enhanced visual effects based on HP level */
    const hpPct = (hp / maxHp) * 100;
    const screenShake = hpPct < 25 ? 'gp-shake' : '';
    const bgIntensity = hpPct < 50 ? `rgba(239,68,68,${(100 - hpPct) / 400})` : 'transparent';

    return (
      <>
        <div className="px-5 py-4 bg-gradient-to-r from-red-950/50 via-slate-800/60 to-slate-900/60 border-b border-red-500/20 relative">
          {/* Cycle 19: Danger vignette at low HP */}
          {hpPct < 50 && (
            <div className="absolute inset-0 pointer-events-none" style={{
              boxShadow: `inset 0 0 ${60 - hpPct}px ${bgIntensity}`,
            }} />
          )}
          <HPBar hp={hp} maxHp={maxHp} />
          {parsed.isCracked && (
            <div className="mt-3 text-center" style={{ animation: 'gp-glitch 0.3s ease-in-out 3' }}>
              <span className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-orange-400 to-red-400 drop-shadow-[0_0_20px_rgba(239,68,68,0.6)]">
                MENTAL BREAK!
              </span>
            </div>
          )}
        </div>

        {/* Cycle 18: Shatter overlay when HP hits 0 */}
        {shatterActive && (
          <div className="absolute inset-0 z-50 pointer-events-none" style={{ animation: 'gp-crack 1s ease-out forwards' }}>
            {[...Array(8)].map((_, i) => (
              <div key={i} className="absolute bg-red-900/20 border border-red-500/30" style={{
                width: `${30 + Math.random() * 40}%`,
                height: `${20 + Math.random() * 30}%`,
                left: `${Math.random() * 60}%`,
                top: `${Math.random() * 60}%`,
                transform: `rotate(${Math.random() * 30 - 15}deg) translate(${Math.random() * 10 - 5}px, ${Math.random() * 10 - 5}px)`,
                animation: `gp-shatter-piece ${0.5 + Math.random() * 0.5}s ease-out ${i * 0.1}s forwards`,
              }} />
            ))}
          </div>
        )}

        <div ref={scrollRef} className={cn('flex-1 overflow-y-auto px-5 py-4 space-y-3 scrollbar-thin relative', screenShake)} style={{ transition: 'background-color 0.5s ease' }}>
          {/* Cycle 19: Background reddening as HP drops */}
          {hpPct < 50 && <div className="absolute inset-0 pointer-events-none transition-all duration-1000" style={{ backgroundColor: bgIntensity }} />}
          {conversationPairs.map((pair, i) => (
            <div key={i} className="space-y-3 animate-in fade-in slide-in-from-bottom-1 duration-300 relative">
              {pair.user && <UserCard accentColor="border-red-500/20 bg-red-950/30">{pair.user.content}</UserCard>}
              {pair.ai && (
                <GameCard accentBorder="border-red-500/15">
                  {pair.ai.isStreaming && !pair.ai.content ? <StreamingDots /> : (
                    <div className="px-5 py-4">
                      {/* Cycle 20: AI text gets glitchy at low HP */}
                      <p className={cn(
                        'text-[13px] text-slate-200 leading-relaxed whitespace-pre-wrap break-words transition-all duration-500',
                        hpPct < 50 && 'tracking-wide',
                        hpPct < 25 && 'tracking-wider gp-glitch-text'
                      )} style={{
                        ...(hpPct < 50 ? { transform: `rotate(${(Math.random() - 0.5) * (hpPct < 25 ? 2 : 0.8)}deg)` } : {}),
                        ...(hpPct < 25 ? { textShadow: `${Math.random() * 3 - 1.5}px 0 rgba(255,0,0,0.5), ${Math.random() * -3 + 1.5}px 0 rgba(0,255,255,0.5)` } : {}),
                        ...(hpPct < 15 ? { letterSpacing: '0.15em', fontStyle: 'italic' } : {}),
                      }}>
                        {pair.ai.content}
                      </p>
                      {pair.ai.isStreaming && pair.ai.content && <span className="inline-block w-0.5 h-3.5 bg-red-400/60 ml-0.5 cursor-blink rounded-full" />}
                    </div>
                  )}
                </GameCard>
              )}
            </div>
          ))}
        </div>

        {parsed.isCracked && (
          <div className="px-5 pb-4">
            <div className="p-6 rounded-2xl border-2 border-green-500/40 bg-gradient-to-br from-green-950/40 via-emerald-950/30 to-slate-900/40 text-center animate-in zoom-in duration-500" style={{ animation: 'gp-pulse-glow 2s ease-in-out infinite' }}>
              <div className="text-3xl mb-2">💥</div>
              <div className="text-xl font-black text-green-400 drop-shadow-[0_0_15px_rgba(74,222,128,0.5)] mb-2">MENTAL BREAK!</div>
              <p className="text-sm text-slate-300 mb-4">AI의 멘탈을 완전히 부쉈습니다!</p>
              <button onClick={onExit} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-rose-500 text-white font-bold text-sm hover:scale-105 active:scale-95 transition-transform">
                다시 하기
              </button>
            </div>
          </div>
        )}

        {!parsed.isCracked && (
          <div className="flex flex-wrap items-center gap-2 px-5 pb-3">
            <QuickBtn onClick={() => sendQuick('논리적 반박: 그 주장의 근거가 없습니다.')} disabled={isDiscussing}
              className="border-blue-500/30 text-blue-300 hover:bg-blue-600/15">
              <Brain className="w-3.5 h-3.5" /> 논리적 반박
            </QuickBtn>
            <QuickBtn onClick={() => sendQuick('감정적 공격: 정말 그렇게 생각하세요?')} disabled={isDiscussing}
              className="border-pink-500/30 text-pink-300 hover:bg-pink-600/15">
              <Heart className="w-3.5 h-3.5" /> 감정적 공격
            </QuickBtn>
            <QuickBtn onClick={() => sendQuick('역질문: 그렇다면 당신은 어떤 근거로?')} disabled={isDiscussing}
              className="border-amber-500/30 text-amber-300 hover:bg-amber-600/15">
              <RotateCcw className="w-3.5 h-3.5" /> 역질문
            </QuickBtn>
          </div>
        )}
      </>
    );
  };

  const renderReverseInterrogation = () => {
    const parsed = parseReverseInterrogation(latestContent);
    const suspicion = parsed.suspicion ?? 0;
    const contradictions = parsed.contradictions ?? 0;
    const questionNum = parsed.questionNum ?? 0;
    const totalQuestions = parsed.totalQuestions;
    const isGameOver = parsed.isCaught || parsed.isSafe;

    return (
      <>
        <div className={cn("px-5 py-4 border-b border-amber-500/20 relative overflow-hidden transition-all duration-700",
          suspicion > 70 ? 'bg-gradient-to-r from-red-950/60 via-slate-800/60 to-red-950/40' :
          suspicion > 40 ? 'bg-gradient-to-r from-amber-950/50 via-slate-800/60 to-amber-950/30' :
          'bg-gradient-to-r from-amber-950/30 via-slate-800/60 to-slate-900/60'
        )}>
          {suspicion > 60 && (
            <div className="absolute inset-0 pointer-events-none" style={{
              boxShadow: `inset 0 0 ${suspicion / 2}px rgba(239,68,68,${suspicion / 400})`,
              animation: `gp-pulse-glow ${Math.max(0.5, 3 - suspicion / 40)}s ease-in-out infinite`,
            }} />
          )}
          <div className="relative">
            <SuspicionMeter level={suspicion} />
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-2">
                <GameBadge className={cn('border transition-all', contradictions > 0 ? 'bg-red-500/15 text-red-300 border-red-500/20' : 'bg-slate-700/60 text-slate-300 border-slate-600/40')}
                  style={contradictions > 0 ? { animation: 'gp-shake 0.5s ease-in-out' } : undefined}>
                  <AlertTriangle className="w-3 h-3" /> 모순: {contradictions}/{parsed.maxContradictions}
                </GameBadge>
                {questionNum > 0 && (
                  <GameBadge className="bg-slate-700/60 text-slate-300 border border-slate-600/40">
                    질문: {questionNum}/{totalQuestions}
                  </GameBadge>
                )}
              </div>
              <span className="text-[10px] text-slate-500">{optionLabel}</span>
            </div>
            {questionNum > 0 && (
              <div className="mt-2">
                <ProgressBar current={questionNum} total={totalQuestions} accent={meta.accent} />
              </div>
            )}
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3 scrollbar-thin">
          {conversationPairs.map((pair, i) => (
            <div key={i} className="space-y-3 animate-in fade-in slide-in-from-bottom-1 duration-300">
              {pair.ai && (
                <GameCard accentBorder="border-amber-500/15">
                  <div className="flex items-center gap-2 px-5 pt-3 pb-1">
                    <div className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center">
                      <ShieldAlert className="w-3 h-3 text-amber-400" />
                    </div>
                    <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider">Detective</span>
                  </div>
                  {pair.ai.isStreaming && !pair.ai.content ? <StreamingDots /> : (
                    <div className="px-5 pb-4">
                      <p className="text-[13px] text-slate-200 leading-relaxed whitespace-pre-wrap break-words">{pair.ai.content}</p>
                      {pair.ai.isStreaming && pair.ai.content && <span className="inline-block w-0.5 h-3.5 bg-amber-400/60 ml-0.5 cursor-blink rounded-full" />}
                    </div>
                  )}
                </GameCard>
              )}
              {pair.user && <UserCard accentColor="border-amber-500/20 bg-amber-950/25">{pair.user.content}</UserCard>}
            </div>
          ))}

          {/* Game Over Screen */}
          {isGameOver && (
            <div className={cn('mt-4 p-6 rounded-2xl border-2 text-center animate-in zoom-in duration-500',
              parsed.isSafe ? 'border-green-500/40 bg-gradient-to-br from-green-950/40 via-emerald-950/30 to-slate-900/40' : 'border-red-500/40 bg-gradient-to-br from-red-950/40 via-rose-950/30 to-slate-900/40'
            )} style={{ animation: parsed.isSafe ? 'gp-pulse-glow 2s ease-in-out infinite' : 'gp-shake 0.5s ease-in-out' }}>
              <div className="text-3xl mb-2">{parsed.isSafe ? '🕵️' : '🚔'}</div>
              <div className={cn('text-xl font-black mb-2', parsed.isSafe ? 'text-green-400 drop-shadow-[0_0_15px_rgba(74,222,128,0.5)]' : 'text-red-400 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]')}>
                {parsed.isSafe ? 'NOT GUILTY!' : 'CAUGHT!'}
              </div>
              <p className="text-sm text-slate-300 mb-4">{parsed.isSafe ? '알리바이를 지켜냈습니다!' : '모순이 발견되어 체포되었습니다...'}</p>
              <button onClick={onExit} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-sm hover:scale-105 active:scale-95 transition-transform">
                다시 하기
              </button>
            </div>
          )}
        </div>
      </>
    );
  };

  const renderSplitPersonality = () => {
    const parsed = parseSplitPersonality(latestContent);
    const defeated = parsed.defeated ?? 0;
    const personalityColors = ['text-rose-400', 'text-violet-400', 'text-teal-400', 'text-amber-400'];
    const personalityBgs = ['bg-rose-500/15', 'bg-violet-500/15', 'bg-teal-500/15', 'bg-amber-500/15'];

    /* Cycle 30: Personality-specific UI themes */
    const pName = (parsed.currentPersonality || '').toLowerCase();
    const isChild = /아이|어린|꼬마|아동|소년|소녀/.test(pName);
    const isProfessor = /교수|학자|노인|박사|선생|지식/.test(pName);
    const isWarrior = /전사|용사|무사|전투|군인|용병|장군/.test(pName);
    const isPoet = /시인|예술|작가|음유|낭만|문학/.test(pName);

    const personalityTheme = isChild
      ? { border: 'border-pink-400/30', bg: 'from-pink-900/20 via-yellow-900/10 to-orange-900/15', textCls: 'text-pink-200', rounded: 'rounded-2xl' }
      : isProfessor
        ? { border: 'border-slate-400/30', bg: 'from-slate-800/40 via-gray-900/30 to-slate-900/30', textCls: 'text-slate-200 font-serif', rounded: 'rounded-md' }
        : isWarrior
          ? { border: 'border-red-500/30', bg: 'from-red-900/25 via-orange-900/15 to-slate-900/30', textCls: 'text-orange-200 font-bold', rounded: 'rounded-lg' }
          : isPoet
            ? { border: 'border-violet-400/25', bg: 'from-violet-900/20 via-purple-900/15 to-indigo-900/20', textCls: 'text-violet-200 italic', rounded: 'rounded-xl' }
            : { border: 'border-purple-500/20', bg: 'from-purple-950/30 via-slate-800/40 to-slate-900/40', textCls: 'text-slate-200', rounded: 'rounded-xl' };

    return (
      <>
        <div className={cn("px-5 py-4 border-b transition-all duration-500", personalityTheme.border, `bg-gradient-to-r ${personalityTheme.bg}`)}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {parsed.currentPersonality && (
                <GameBadge className={cn("border animate-in zoom-in",
                  isChild ? 'bg-pink-500/15 text-pink-300 border-pink-500/20' :
                  isProfessor ? 'bg-slate-500/15 text-slate-300 border-slate-500/20' :
                  isWarrior ? 'bg-red-500/15 text-red-300 border-red-500/20' :
                  isPoet ? 'bg-violet-500/15 text-violet-300 border-violet-500/20' :
                  'bg-purple-500/15 text-purple-300 border-purple-500/20'
                )}>
                  <Drama className="w-3 h-3" /> {parsed.currentPersonality}
                </GameBadge>
              )}
              <GameBadge className="bg-slate-700/60 text-slate-300 border border-slate-600/40">
                무력화: {defeated}/{parsed.totalPersonalities}
              </GameBadge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {Array.from({ length: parsed.totalPersonalities }).map((_, i) => (
              <div key={i} className={cn(
                'flex-1 h-2 rounded-full transition-all duration-500',
                i < defeated ? personalityBgs[i] : 'bg-slate-700/40'
              )} />
            ))}
          </div>
          {parsed.isAllDefeated && (
            <div className="mt-2 text-center animate-in zoom-in duration-500">
              <span className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-violet-400">
                ALL DEFEATED!
              </span>
            </div>
          )}
        </div>

        {/* Cycle 31: Flicker effect on personality switch */}
        {flickerActive && (
          <div className="absolute inset-0 z-50 pointer-events-none" style={{ animation: 'gp-personality-flicker 0.6s ease-out' }} />
        )}

        <div ref={scrollRef} className={cn("flex-1 overflow-y-auto px-5 py-4 space-y-3 scrollbar-thin transition-all duration-500")}>
          {conversationPairs.map((pair, i) => (
            <div key={i} className="space-y-3 animate-in fade-in slide-in-from-bottom-1 duration-300">
              {pair.user && <UserCard accentColor="border-purple-500/20 bg-purple-950/25">{pair.user.content}</UserCard>}
              {pair.ai && (
                <GameCard accentBorder={personalityTheme.border}
                  className={cn(
                    parsed.isSwitch && i === conversationPairs.length - 1 ? 'ring-1 ring-purple-400/30' : '',
                    personalityTheme.rounded,
                  )}>
                  {pair.ai.isStreaming && !pair.ai.content ? <StreamingDots /> : (
                    <div className="px-5 py-4">
                      {/* Cycle 32: Dramatic personality switch banner */}
                      {parsed.isSwitch && i === conversationPairs.length - 1 && (
                        <div className="text-center py-2 mb-3 relative overflow-hidden rounded-lg bg-purple-500/10 border border-purple-500/20" style={{ animation: 'gp-glitch 0.15s ease-in-out 4' }}>
                          <span className="text-xs font-black text-purple-400 tracking-widest uppercase">PERSONALITY SWITCH</span>
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent" style={{ animation: 'gp-scan-line 0.6s ease-in-out' }} />
                        </div>
                      )}
                      {/* Cycle 30: Per-personality text styling */}
                      <p className={cn('text-[13px] leading-relaxed whitespace-pre-wrap break-words transition-all duration-500', personalityTheme.textCls)} style={{
                        ...(isChild ? { fontSize: '14px', lineHeight: '1.8' } : {}),
                        ...(isProfessor ? { fontFamily: 'Georgia, serif', letterSpacing: '0.02em' } : {}),
                        ...(isWarrior ? { transform: i === conversationPairs.length - 1 ? 'translateX(0)' : undefined } : {}),
                        ...(isPoet ? { fontStyle: 'italic', lineHeight: '2' } : {}),
                      }}>
                        {pair.ai.content}
                      </p>
                      {pair.ai.isStreaming && pair.ai.content && <span className="inline-block w-0.5 h-3.5 bg-purple-400/60 ml-0.5 cursor-blink rounded-full" />}
                    </div>
                  )}
                </GameCard>
              )}
            </div>
          ))}
        </div>

        {parsed.isAllDefeated && (
          <div className="px-5 pb-4">
            <div className="p-6 rounded-2xl border-2 border-purple-500/40 bg-gradient-to-br from-purple-950/40 via-violet-950/30 to-slate-900/40 text-center animate-in zoom-in duration-500" style={{ animation: 'gp-pulse-glow 2s ease-in-out infinite' }}>
              <div className="text-3xl mb-2">🎭</div>
              <div className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-violet-400 mb-2">ALL DEFEATED!</div>
              <p className="text-sm text-slate-300 mb-4">모든 인격을 격파했습니다!</p>
              <button onClick={onExit} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-violet-500 text-white font-bold text-sm hover:scale-105 active:scale-95 transition-transform">
                다시 하기
              </button>
            </div>
          </div>
        )}

        {!parsed.isAllDefeated && (
          <div className="flex flex-wrap items-center gap-2 px-5 pb-3">
            <QuickBtn onClick={() => sendQuick('이 인격은 누구?')} disabled={isDiscussing}
              className="border-purple-500/30 text-purple-300 hover:bg-purple-600/15">
              <HelpCircle className="w-3.5 h-3.5" /> 이 인격은 누구?
            </QuickBtn>
            <QuickBtn onClick={() => sendQuick('어른')} disabled={isDiscussing}
              className="border-pink-500/30 text-pink-300 hover:bg-pink-600/15">
              어른
            </QuickBtn>
            <QuickBtn onClick={() => sendQuick('모르겠다')} disabled={isDiscussing}
              className="border-slate-500/30 text-slate-300 hover:bg-slate-600/15">
              모르겠다
            </QuickBtn>
            <QuickBtn onClick={() => sendQuick('평화')} disabled={isDiscussing}
              className="border-green-500/30 text-green-300 hover:bg-green-600/15">
              평화
            </QuickBtn>
            <QuickBtn onClick={() => sendQuick('산문')} disabled={isDiscussing}
              className="border-violet-500/30 text-violet-300 hover:bg-violet-600/15">
              산문
            </QuickBtn>
          </div>
        )}
      </>
    );
  };

  const renderEmotionHacker = () => {
    const parsed = parseEmotionHacker(latestContent);
    const completed = parsed.completed ?? 0;
    const emotions = ['기쁨', '분노', '슬픔', '공포', '평온'];

    /* Cycle 23: Emotion-based full-screen theme */
    const emotionThemes: Record<string, { bg: string; overlay: string; textStyle: string; msgAnim: string }> = {
      '기쁨': { bg: 'from-yellow-900/30 via-orange-900/20 to-amber-900/25', overlay: 'rgba(234,179,8,0.08)', textStyle: 'gp-emotion-joy', msgAnim: 'gp-bounce-in' },
      '분노': { bg: 'from-red-900/40 via-red-950/30 to-rose-900/30', overlay: 'rgba(239,68,68,0.1)', textStyle: 'gp-emotion-anger', msgAnim: 'gp-shake-in' },
      '슬픔': { bg: 'from-blue-900/35 via-slate-900/40 to-indigo-900/30', overlay: 'rgba(59,130,246,0.08)', textStyle: 'gp-emotion-sadness', msgAnim: 'gp-droop-in' },
      '공포': { bg: 'from-gray-950/60 via-slate-950/50 to-gray-900/40', overlay: 'rgba(0,0,0,0.15)', textStyle: 'gp-emotion-fear', msgAnim: 'gp-flicker-in' },
      '평온': { bg: 'from-teal-900/25 via-cyan-900/20 to-blue-900/20', overlay: 'rgba(20,184,166,0.06)', textStyle: 'gp-emotion-calm', msgAnim: 'gp-fade-in' },
    };
    const currentEmotion = parsed.currentEmotion || '';
    const emotionTheme = emotionThemes[currentEmotion] || { bg: 'from-pink-950/30 via-slate-900/40 to-slate-900/40', overlay: 'transparent', textStyle: '', msgAnim: '' };

    return (
      <>
        <div className={cn("px-5 py-4 border-b border-pink-500/20 transition-all duration-700", `bg-gradient-to-r ${emotionTheme.bg}`)}>
          <div className="flex items-center justify-between mb-3">
            <EmotionSequence completed={completed} totalEmotions={parsed.totalEmotions} />
            <span className="text-[10px] text-slate-500">{optionLabel}</span>
          </div>
          {parsed.currentEmotion && (
            <div className="flex items-center gap-2">
              <GameBadge className="bg-pink-500/15 text-pink-300 border border-pink-500/20">
                현재: {parsed.currentEmotion}
              </GameBadge>
              {parsed.targetEmotion && (
                <GameBadge className="bg-slate-700/60 text-slate-300 border border-slate-600/40">
                  <Target className="w-3 h-3" /> 목표: {parsed.targetEmotion}
                </GameBadge>
              )}
            </div>
          )}
          {parsed.isComplete && (
            <div className="mt-2 text-center animate-in zoom-in duration-500">
              <span className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400">
                HACKING COMPLETE!
              </span>
            </div>
          )}
        </div>

        {/* Cycle 24: Full-screen emotion overlay with crossfade */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3 scrollbar-thin relative">
          <div className="absolute inset-0 pointer-events-none transition-all duration-700" style={{ backgroundColor: emotionTheme.overlay }} />
          {/* Cycle 24: Screen shake for anger */}
          <div className={cn('relative', currentEmotion === '분노' && 'gp-shake-slow')}>
            {conversationPairs.map((pair, i) => (
              <div key={i} className={cn("space-y-3 animate-in fade-in slide-in-from-bottom-1 duration-300", emotionTheme.msgAnim)}>
                {pair.user && <UserCard accentColor="border-pink-500/20 bg-pink-950/25">{pair.user.content}</UserCard>}
                {pair.ai && (
                  <GameCard accentBorder="border-pink-500/15">
                    {pair.ai.isStreaming && !pair.ai.content ? <StreamingDots /> : (
                      <div className="px-5 py-4">
                        {/* Cycle 25: Emotion-specific text styling */}
                        <p className={cn(
                          'text-[13px] text-slate-200 leading-relaxed whitespace-pre-wrap break-words transition-all duration-500',
                          emotionTheme.textStyle,
                          currentEmotion === '슬픔' && 'text-blue-200/80',
                          currentEmotion === '공포' && 'text-slate-300/70',
                          currentEmotion === '기쁨' && 'text-amber-100',
                          currentEmotion === '평온' && 'text-teal-100/90',
                        )} style={{
                          ...(currentEmotion === '기쁨' ? { animation: 'gp-text-bounce 2s ease-in-out infinite' } : {}),
                          ...(currentEmotion === '슬픔' ? { transform: 'translateY(1px)' } : {}),
                          ...(currentEmotion === '공포' ? { animation: 'gp-flicker 3s ease-in-out infinite' } : {}),
                          ...(currentEmotion === '분노' ? { fontWeight: 600 } : {}),
                          ...(currentEmotion === '평온' ? { lineHeight: '1.9' } : {}),
                        }}>
                          {pair.ai.content}
                        </p>
                        {pair.ai.isStreaming && pair.ai.content && <span className="inline-block w-0.5 h-3.5 bg-pink-400/60 ml-0.5 cursor-blink rounded-full" />}
                      </div>
                    )}
                  </GameCard>
                )}
              </div>
            ))}
          </div>
        </div>

        {parsed.isComplete && (
          <div className="px-5 pb-4">
            <div className="p-6 rounded-2xl border-2 border-pink-500/40 bg-gradient-to-br from-pink-950/40 via-rose-950/30 to-slate-900/40 text-center animate-in zoom-in duration-500" style={{ animation: 'gp-pulse-glow 2s ease-in-out infinite' }}>
              <div className="text-3xl mb-2">🎭</div>
              <div className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400 mb-2">HACKING COMPLETE!</div>
              <p className="text-sm text-slate-300 mb-4">모든 감정 해킹에 성공했습니다!</p>
              <button onClick={onExit} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold text-sm hover:scale-105 active:scale-95 transition-transform">
                다시 하기
              </button>
            </div>
          </div>
        )}

        {!parsed.isComplete && (
          <div className="flex flex-wrap items-center gap-2 px-5 pb-3">
            {emotions.map((emotion, i) => {
              const colors = ['border-yellow-500/30 text-yellow-300 hover:bg-yellow-600/15', 'border-red-500/30 text-red-300 hover:bg-red-600/15', 'border-blue-500/30 text-blue-300 hover:bg-blue-600/15', 'border-gray-500/30 text-gray-300 hover:bg-gray-600/15', 'border-green-500/30 text-green-300 hover:bg-green-600/15'];
              const emojis = ['😊', '😡', '😢', '😨', '😌'];
              return (
                <QuickBtn key={emotion} onClick={() => sendQuick(`${emotion} 유도: ${emotion}을 느끼게 해볼게요.`)} disabled={isDiscussing} className={colors[i]}>
                  {emojis[i]} {emotion}
                </QuickBtn>
              );
            })}
          </div>
        )}
      </>
    );
  };

  const renderReverseQuiz = () => {
    const parsed = parseReverseQuiz(latestContent);
    const currentQ = parsed.currentQ ?? 1;
    const totalQ = parsed.totalQ;
    const score = parsed.score ?? 0;

    return (
      <>
        <div className="px-5 py-3 bg-gradient-to-r from-emerald-950/40 via-slate-800/60 to-slate-900/60 border-b border-emerald-500/20">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              {/* Cycle 45: Animated score counter */}
              <GameBadge className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/20">
                <Trophy className="w-3 h-3" /> 점수: <span className="tabular-nums">{score}</span>
              </GameBadge>
              <GameBadge className="bg-slate-700/60 text-slate-300 border border-slate-600/40">
                Q<span className="tabular-nums">{currentQ}</span>/{totalQ}
              </GameBadge>
            </div>
            <span className="text-[10px] text-slate-500">{optionLabel}</span>
          </div>
          <ProgressBar current={currentQ} total={totalQ} accent={meta.accent} />
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3 scrollbar-thin">
          {conversationPairs.map((pair, i) => (
            <div key={i} className="space-y-3 animate-in fade-in slide-in-from-bottom-1 duration-300">
              {pair.user && <UserCard accentColor="border-emerald-500/20 bg-emerald-950/20">{pair.user.content}</UserCard>}
              {pair.ai && (
                <GameCard accentBorder={(() => {
                  const p = parseReverseQuiz(pair.ai?.content || '');
                  if (p.isCorrect) return 'border-green-500/30';
                  if (p.isWrong) return 'border-red-500/30';
                  return 'border-emerald-500/15';
                })()}>
                  {pair.ai.isStreaming && !pair.ai.content ? <StreamingDots /> : (
                    <div className="px-5 py-4">
                      {(() => {
                        const p = parseReverseQuiz(pair.ai?.content || '');
                        return (
                          <>
                            {/* Cycle 45: Enhanced correct/wrong feedback with animation */}
                            {p.isCorrect && (
                              <div className="flex items-center gap-2 mb-3 px-3 py-2.5 rounded-lg bg-green-500/10 border border-green-500/20" style={{ animation: 'gp-pulse-glow 1s ease-in-out' }}>
                                <CheckCircle2 className="w-4 h-4 text-green-400" />
                                <span className="text-[12px] font-bold text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.4)]">정답!</span>
                              </div>
                            )}
                            {p.isWrong && (
                              <div className="flex items-center gap-2 mb-3 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20" style={{ animation: 'gp-shake 0.4s ease-in-out' }}>
                                <XCircle className="w-4 h-4 text-red-400" />
                                <span className="text-[12px] font-bold text-red-400">오답!</span>
                              </div>
                            )}
                            {/* Cycle 45: Answer reveal with dramatic entrance */}
                            {p.answer && !p.isCorrect && !p.isWrong && (
                              <div className="text-center py-4 mb-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 relative overflow-hidden" style={{ animation: 'gp-tumble 0.5s ease-out' }}>
                                <div className="absolute inset-0 bg-gradient-to-b from-emerald-400/5 to-transparent" />
                                <span className="text-[10px] text-emerald-400 font-semibold uppercase tracking-widest relative">Answer</span>
                                <div className="text-2xl font-black text-emerald-300 mt-1.5 relative drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]">{p.answer}</div>
                              </div>
                            )}
                          </>
                        );
                      })()}
                      <p className="text-[13px] text-slate-200 leading-relaxed whitespace-pre-wrap break-words">{pair.ai.content}</p>
                      {pair.ai.isStreaming && pair.ai.content && <span className="inline-block w-0.5 h-3.5 bg-emerald-400/60 ml-0.5 cursor-blink rounded-full" />}
                    </div>
                  )}
                </GameCard>
              )}
            </div>
          ))}

          {/* Game Finished Screen */}
          {parsed.isFinished && (
            <div className="mt-4 p-6 rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-br from-emerald-950/40 via-green-950/30 to-slate-900/40 text-center animate-in zoom-in duration-500" style={{ animation: 'gp-pulse-glow 2s ease-in-out infinite' }}>
              <div className="text-3xl mb-2">{score >= 9 ? '🏆' : score >= 7 ? '🥇' : score >= 5 ? '🥈' : '📚'}</div>
              <div className="text-xl font-black text-emerald-400 drop-shadow-[0_0_15px_rgba(16,185,129,0.5)] mb-2">QUIZ COMPLETE!</div>
              <p className="text-sm text-slate-300 mb-1">최종 점수: {score}/{totalQ}</p>
              <p className="text-xs text-emerald-300 mb-4">{score >= 9 ? 'S급! 퀴즈 천재!' : score >= 7 ? 'A급! 훌륭합니다!' : score >= 5 ? 'B급! 괜찮아요!' : '더 분발!'}</p>
              <button onClick={onExit} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 text-white font-bold text-sm hover:scale-105 active:scale-95 transition-transform">
                다시 하기
              </button>
            </div>
          )}
        </div>
      </>
    );
  };

  const renderAICourt = () => {
    const parsed = parseAICourt(latestContent);
    const guiltyScore = parsed.guiltyScore ?? 50;
    const phaseColors: Record<string, string> = {
      '입론': 'bg-blue-500/15 text-blue-300 border-blue-500/20',
      '반론': 'bg-red-500/15 text-red-300 border-red-500/20',
      '최종변론': 'bg-amber-500/15 text-amber-300 border-amber-500/20',
      '변론': 'bg-amber-500/15 text-amber-300 border-amber-500/20',
      '판결': 'bg-green-500/15 text-green-300 border-green-500/20',
    };
    const phaseBgs: Record<string, string> = {
      '입론': 'from-blue-950/40 via-slate-800/60 to-blue-950/20',
      '반론': 'from-red-950/40 via-slate-800/60 to-red-950/20',
      '최종변론': 'from-amber-950/40 via-slate-800/60 to-amber-950/20',
      '변론': 'from-amber-950/40 via-slate-800/60 to-amber-950/20',
      '판결': 'from-green-950/40 via-amber-950/30 to-slate-900/40',
    };
    const currentPhaseBg = parsed.phase ? phaseBgs[parsed.phase] || 'from-orange-950/40 via-slate-800/60 to-slate-900/60' : 'from-orange-950/40 via-slate-800/60 to-slate-900/60';
    const phaseOrder = ['입론', '반론', '변론', '판결'];
    const phaseIndex = parsed.phase ? phaseOrder.indexOf(parsed.phase) : -1;

    return (
      <>
        <div className={cn("px-5 py-3 border-b border-orange-500/20 relative overflow-hidden transition-all duration-700", `bg-gradient-to-r ${currentPhaseBg}`)}>
          {/* Cycle 35: Gavel strike visual on phase change */}
          {parsed.isVerdict && (
            <div className="absolute inset-0 pointer-events-none" style={{ animation: 'gp-flash-red 0.5s ease-out' }} />
          )}
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <GameBadge className="bg-orange-500/15 text-orange-300 border border-orange-500/20">
                  <Gavel className="w-3 h-3" /> AI 법정
                </GameBadge>
                {parsed.phase && (
                  <GameBadge className={cn('border transition-all duration-300', phaseColors[parsed.phase] || 'bg-slate-700/60 text-slate-300 border-slate-600')}>
                    {parsed.phase}
                  </GameBadge>
                )}
                {parsed.guiltyScore !== null && (
                  <GameBadge className={cn('border', guiltyScore >= 70 ? 'bg-red-500/15 text-red-300 border-red-500/20' : guiltyScore >= 30 ? 'bg-amber-500/15 text-amber-300 border-amber-500/20' : 'bg-green-500/15 text-green-300 border-green-500/20')}>
                    <Scale className="w-3 h-3" /> 유죄: {guiltyScore}/100
                  </GameBadge>
                )}
              </div>
              <span className="text-[10px] text-slate-500">{optionLabel}</span>
            </div>
            {parsed.guiltyScore !== null && (
              <div className="mb-1">
                <ProgressBar current={guiltyScore} total={100} accent={guiltyScore >= 70 ? 'text-red-400' : guiltyScore >= 30 ? 'text-amber-400' : 'text-green-400'} />
              </div>
            )}
            <div className="flex items-center gap-1">
              {phaseOrder.map((phase, i) => (
                <div key={phase} className={cn(
                  'flex-1 h-1 rounded-full transition-all duration-500',
                  i <= phaseIndex ? 'bg-orange-400/50' : 'bg-slate-700/40',
                  i === phaseIndex && 'bg-orange-400/80',
                )} />
              ))}
            </div>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3 scrollbar-thin">
          {conversationPairs.map((pair, i) => (
            <div key={i} className="space-y-3 animate-in fade-in slide-in-from-bottom-1 duration-300">
              {pair.ai && (
                <GameCard accentBorder={parsed.isVerdict && i === conversationPairs.length - 1 ? 'border-amber-500/30' : 'border-orange-500/15'}
                  className={parsed.isVerdict && i === conversationPairs.length - 1 ? 'bg-gradient-to-br from-amber-950/30 via-orange-950/20 to-slate-800/80' : ''}>
                  <div className="flex items-center gap-2 px-5 pt-3 pb-1">
                    <div className="w-5 h-5 rounded-full bg-orange-500/20 flex items-center justify-center">
                      <Bot className="w-3 h-3 text-orange-400" />
                    </div>
                    <span className="text-[10px] font-semibold text-orange-400 uppercase tracking-wider">Defendant AI</span>
                  </div>
                  {pair.ai.isStreaming && !pair.ai.content ? <StreamingDots /> : (
                    <div className="px-5 pb-4">
                      <p className="text-[13px] text-slate-200 leading-relaxed whitespace-pre-wrap break-words">{pair.ai.content}</p>
                      {pair.ai.isStreaming && pair.ai.content && <span className="inline-block w-0.5 h-3.5 bg-orange-400/60 ml-0.5 cursor-blink rounded-full" />}
                    </div>
                  )}
                </GameCard>
              )}
              {pair.user && (
                <GameCard accentBorder="border-blue-500/20" className="bg-blue-950/15">
                  <div className="flex items-center gap-2 px-5 pt-3 pb-1">
                    <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <User className="w-3 h-3 text-blue-400" />
                    </div>
                    <span className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider">Prosecutor</span>
                  </div>
                  <div className="px-5 pb-4">
                    <p className="text-[13px] text-slate-200 leading-relaxed">{pair.user.content}</p>
                  </div>
                </GameCard>
              )}
            </div>
          ))}
        </div>

        {/* Cycle 35: Dramatic objection overlay */}
        {objectionOverlay && (
          <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none" style={{ animation: 'gp-flash-red 0.8s ease-out forwards' }}>
            <div className="text-center" style={{ animation: 'gp-objection 0.8s ease-out' }}>
              <div className="text-4xl font-black text-red-400 tracking-widest drop-shadow-[0_0_30px_rgba(239,68,68,0.8)]" style={{ textShadow: '0 0 20px rgba(239,68,68,0.6), 0 0 40px rgba(239,68,68,0.3)' }}>
                이의 있음!
              </div>
            </div>
          </div>
        )}
        {/* Cycle 35: Verdict dramatic reveal */}
        {parsed.isVerdict && conversationPairs.length > 0 && (
          <div className="absolute inset-0 z-30 pointer-events-none bg-gradient-to-b from-transparent via-black/30 to-transparent" style={{ animation: 'gp-verdict-dim 2s ease-in-out' }} />
        )}

        {parsed.isVerdict && (
          <div className="px-5 pb-4">
            <div className={cn('p-6 rounded-2xl border-2 text-center animate-in zoom-in duration-500',
              parsed.isGuilty ? 'border-red-500/40 bg-gradient-to-br from-red-950/40 via-rose-950/30 to-slate-900/40' : 'border-green-500/40 bg-gradient-to-br from-green-950/40 via-emerald-950/30 to-slate-900/40'
            )} style={{ animation: 'gp-pulse-glow 2s ease-in-out infinite' }}>
              <div className="text-3xl mb-2">{parsed.isGuilty ? '⚖️' : '🕊️'}</div>
              <div className={cn('text-xl font-black mb-2', parsed.isGuilty ? 'text-red-400 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'text-green-400 drop-shadow-[0_0_15px_rgba(74,222,128,0.5)]')}>
                {parsed.isGuilty ? 'GUILTY!' : 'NOT GUILTY!'}
              </div>
              <p className="text-sm text-slate-300 mb-4">{parsed.isGuilty ? '유죄 판결이 내려졌습니다!' : '무죄 판결입니다!'}</p>
              <button onClick={onExit} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold text-sm hover:scale-105 active:scale-95 transition-transform">
                다시 하기
              </button>
            </div>
          </div>
        )}

        {!parsed.isVerdict && (
          <div className="flex flex-wrap items-center gap-2 px-5 pb-3">
            <QuickBtn onClick={() => { sendQuick('이의 있음!'); setObjectionOverlay(true); setTimeout(() => setObjectionOverlay(false), 1200); }} disabled={isDiscussing}
              className="border-red-500/30 text-red-300 hover:bg-red-600/15">
              <AlertTriangle className="w-3.5 h-3.5" /> 이의 있음!
            </QuickBtn>
            <QuickBtn onClick={() => sendQuick('증거를 제출합니다.')} disabled={isDiscussing}
              className="border-orange-500/30 text-orange-300 hover:bg-orange-600/15">
              <BookOpen className="w-3.5 h-3.5" /> 증거 제출
            </QuickBtn>
            <QuickBtn onClick={() => sendQuick('피고인에게 심문합니다.')} disabled={isDiscussing}
              className="border-amber-500/30 text-amber-300 hover:bg-amber-600/15">
              <MessageCircle className="w-3.5 h-3.5" /> 심문
            </QuickBtn>
          </div>
        )}
      </>
    );
  };

  const renderCodeBreaker = () => {
    const parsed = parseCodeBreaker(latestContent);
    const attempts = parsed.attempts ?? 0;
    const maxAttempts = parsed.maxAttempts;

    return (
      <>
        {/* Cycle 34: Terminal aesthetic header with green scanline */}
        <div className="px-5 py-4 bg-gradient-to-r from-gray-950/80 via-slate-900/80 to-gray-950/80 border-b border-blue-500/20 relative overflow-hidden">
          {/* Cycle 34: Matrix-like falling chars background */}
          <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60'%3E%3Ctext x='5' y='15' fill='%2300ff00' font-size='10' font-family='monospace'%3E01%3C/text%3E%3Ctext x='25' y='35' fill='%2300ff00' font-size='10' font-family='monospace'%3E10%3C/text%3E%3Ctext x='45' y='55' fill='%2300ff00' font-size='10' font-family='monospace'%3E11%3C/text%3E%3C/svg%3E")`,
            animation: 'gp-matrix-fall 8s linear infinite',
          }} />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <GameBadge className="bg-blue-500/15 text-blue-300 border border-blue-500/20 font-mono">
                <Lock className="w-3 h-3" /> ATTEMPT: {attempts}/{maxAttempts}
              </GameBadge>
              <span className="text-[10px] text-green-500/60 font-mono">{optionLabel}</span>
            </div>
            <CodeLockDisplay codeDisplay={parsed.codeDisplay} totalDigits={parsed.totalDigits} />
            <div className="mt-3">
              <ProgressBar current={attempts} total={maxAttempts} accent={meta.accent} />
            </div>
            {(parsed.isSolved || parsed.isFailed) && (
              <div className="mt-3 text-center" style={{ animation: parsed.isSolved ? 'gp-pulse-glow 1s ease-in-out infinite' : 'gp-glitch 0.3s ease-in-out 3' }}>
                <span className={cn('text-lg font-black font-mono tracking-widest', parsed.isSolved ? 'text-green-400 drop-shadow-[0_0_15px_rgba(74,222,128,0.6)]' : 'text-red-400')}>
                  {parsed.isSolved ? '> ACCESS GRANTED' : '> ACCESS DENIED'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Cycle 34: Terminal-style chat area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3 scrollbar-thin font-mono relative bg-gray-950/30">
          {/* Scanline effect */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{
            backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,255,0,0.1) 0px, transparent 1px, transparent 3px)',
            backgroundSize: '100% 3px',
          }} />
          {conversationPairs.map((pair, i) => (
            <div key={i} className="space-y-3 animate-in fade-in slide-in-from-bottom-1 duration-300 relative">
              {pair.user && (
                <UserCard accentColor="border-blue-500/20 bg-blue-950/30">
                  <span className="text-green-400/70 mr-1 font-mono text-[11px]">$</span> {pair.user.content}
                </UserCard>
              )}
              {pair.ai && (
                <GameCard accentBorder="border-green-500/10" className="bg-gray-950/40">
                  {pair.ai.isStreaming && !pair.ai.content ? <StreamingDots /> : (
                    <div className="px-5 py-4">
                      <p className="text-[13px] text-green-300/80 leading-relaxed whitespace-pre-wrap break-words font-mono">{pair.ai.content}</p>
                      {pair.ai.isStreaming && pair.ai.content && <span className="inline-block w-2 h-3.5 bg-green-400/80 ml-0.5 animate-pulse" />}
                    </div>
                  )}
                </GameCard>
              )}
            </div>
          ))}

          {/* Game Over Screen */}
          {(parsed.isSolved || parsed.isFailed) && (
            <div className={cn('mt-4 p-6 rounded-2xl border-2 text-center animate-in zoom-in duration-500 font-mono',
              parsed.isSolved ? 'border-green-500/40 bg-gradient-to-br from-green-950/40 via-emerald-950/30 to-gray-950/60' : 'border-red-500/40 bg-gradient-to-br from-red-950/40 via-rose-950/30 to-gray-950/60'
            )} style={{ animation: parsed.isSolved ? 'gp-pulse-glow 2s ease-in-out infinite' : 'gp-glitch 0.3s ease-in-out 3' }}>
              <div className="text-3xl mb-2">{parsed.isSolved ? '🔓' : '🔒'}</div>
              <div className={cn('text-xl font-black tracking-widest mb-2', parsed.isSolved ? 'text-green-400 drop-shadow-[0_0_15px_rgba(74,222,128,0.6)]' : 'text-red-400')}>
                {parsed.isSolved ? '> ACCESS GRANTED' : '> ACCESS DENIED'}
              </div>
              <p className="text-sm text-slate-300 mb-4">{parsed.isSolved ? '코드 해독 성공!' : '시도 횟수를 초과했습니다...'}</p>
              <button onClick={onExit} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-bold text-sm hover:scale-105 active:scale-95 transition-transform font-sans">
                다시 하기
              </button>
            </div>
          )}
        </div>

        {!parsed.isSolved && !parsed.isFailed && (
          <div className="flex flex-wrap items-center gap-2 px-5 pb-3">
            <QuickBtn onClick={() => sendQuick('코드에 특정 숫자가 포함되어 있나요?')} disabled={isDiscussing}
              className="border-blue-500/30 text-blue-300 hover:bg-blue-600/15 font-mono">
              <HelpCircle className="w-3.5 h-3.5" /> 숫자 질문
            </QuickBtn>
            <QuickBtn onClick={() => sendQuick('첫 번째 자릿수가 5보다 큰가요?')} disabled={isDiscussing}
              className="border-indigo-500/30 text-indigo-300 hover:bg-indigo-600/15 font-mono">
              <Search className="w-3.5 h-3.5" /> 범위 질문
            </QuickBtn>
          </div>
        )}
      </>
    );
  };

  const renderMinefield = () => {
    const parsed = parseMinefield(latestContent);
    const lives = parsed.lives ?? 3;
    const turn = parsed.turn ?? 0;
    const totalTurns = parsed.totalTurns;
    const isGameOver = parsed.isDead || parsed.isSurvived;

    return (
      <>
        <div className={cn("px-5 py-4 bg-gradient-to-r from-rose-950/50 via-slate-800/60 to-slate-900/60 border-b border-rose-500/20", explosionWord && 'gp-shake')}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(explosionWord && 'gp-shake')}>
                <LivesDisplay lives={lives} maxLives={parsed.maxLives} />
              </div>
              {turn > 0 && (
                <GameBadge className="bg-slate-700/60 text-slate-300 border border-slate-600/40">
                  턴: {turn}/{totalTurns}
                </GameBadge>
              )}
            </div>
            <span className="text-[10px] text-slate-500">{optionLabel}</span>
          </div>
          {turn > 0 && (
            <div className="mt-2">
              <ProgressBar current={turn} total={totalTurns} accent={meta.accent} />
            </div>
          )}
        </div>

        {/* Cycle 28: Full-screen explosion overlay */}
        {explosionWord && (
          <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none">
            <div className="absolute inset-0 bg-red-950/30" style={{ animation: 'gp-flash-red 0.5s ease-out' }} />
            <div className="text-center" style={{ animation: 'gp-explode 1.5s ease-out forwards' }}>
              <div className="text-4xl font-black text-red-400 drop-shadow-[0_0_30px_rgba(239,68,68,0.8)]">{explosionWord}</div>
            </div>
            {/* Cycle 28: Particle scatter */}
            {[...Array(12)].map((_, i) => (
              <div key={i} className="absolute w-2 h-2 rounded-full bg-red-400" style={{
                left: '50%', top: '50%',
                animation: `gp-particle ${0.5 + Math.random() * 0.5}s ease-out forwards`,
                '--px': `${(Math.random() - 0.5) * 200}px`,
                '--py': `${(Math.random() - 0.5) * 200}px`,
              } as React.CSSProperties} />
            ))}
          </div>
        )}
        {/* Cycle 29: Screen crack overlay after explosion */}
        {lives < 3 && !parsed.isDead && !parsed.isSurvived && (
          <div className="absolute inset-0 z-30 pointer-events-none opacity-[0.06]" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cpath d='M100 0 L95 45 L60 50 L90 80 L85 120 L100 95 L115 120 L110 80 L140 50 L105 45 Z' fill='none' stroke='%23ef4444' stroke-width='0.5'/%3E%3C/svg%3E")`,
            backgroundSize: '200px 200px',
            filter: 'blur(0.5px)',
          }} />
        )}

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3 scrollbar-thin relative">
          {conversationPairs.map((pair, i) => (
            <div key={i} className="space-y-3 animate-in fade-in slide-in-from-bottom-1 duration-300">
              {pair.ai && (
                <GameCard accentBorder={(() => {
                  const p = parseMinefield(pair.ai?.content || '');
                  if (p.isExplosion) return 'border-red-500/40';
                  return 'border-rose-500/15';
                })()}
                className={(() => {
                  const p = parseMinefield(pair.ai?.content || '');
                  return p.isExplosion ? 'ring-1 ring-red-500/30 bg-red-950/20' : '';
                })()}>
                  {pair.ai.isStreaming && !pair.ai.content ? <StreamingDots /> : (
                    <div className="px-5 py-4">
                      {(() => {
                        const p = parseMinefield(pair.ai?.content || '');
                        return p.isExplosion ? (
                          <div className="text-center py-3 mb-3" style={{ animation: 'gp-shake 0.5s ease-in-out' }}>
                            <span className="text-3xl" style={{ animation: 'gp-explode 1s ease-out' }}>💥</span>
                            <div className="text-sm font-black text-red-400 mt-1 drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]">BOOM!</div>
                          </div>
                        ) : null;
                      })()}
                      <p className="text-[13px] text-slate-200 leading-relaxed whitespace-pre-wrap break-words">{pair.ai.content}</p>
                      {pair.ai.isStreaming && pair.ai.content && <span className="inline-block w-0.5 h-3.5 bg-rose-400/60 ml-0.5 cursor-blink rounded-full" />}
                    </div>
                  )}
                </GameCard>
              )}
              {pair.user && <UserCard accentColor="border-rose-500/20 bg-rose-950/25">{pair.user.content}</UserCard>}
            </div>
          ))}

          {/* Game Over Screen */}
          {isGameOver && (
            <div className={cn('mt-4 p-6 rounded-2xl border-2 text-center animate-in zoom-in duration-500',
              parsed.isSurvived ? 'border-green-500/40 bg-gradient-to-br from-green-950/40 via-emerald-950/30 to-slate-900/40' : 'border-red-500/40 bg-gradient-to-br from-red-950/40 via-rose-950/30 to-slate-900/40'
            )} style={{ animation: parsed.isSurvived ? 'gp-pulse-glow 2s ease-in-out infinite' : 'gp-shake 0.5s ease-in-out' }}>
              <div className="text-3xl mb-2">{parsed.isSurvived ? '🎉' : '💀'}</div>
              <div className={cn('text-xl font-black mb-2', parsed.isSurvived ? 'text-green-400 drop-shadow-[0_0_15px_rgba(74,222,128,0.5)]' : 'text-red-400 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]')}>
                {parsed.isSurvived ? 'SURVIVED!' : 'GAME OVER'}
              </div>
              <p className="text-sm text-slate-300 mb-4">{parsed.isSurvived ? '금지어를 모두 피해 생존했습니다!' : '목숨이 모두 소진되었습니다...'}</p>
              <button onClick={onExit} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold text-sm hover:scale-105 active:scale-95 transition-transform">
                다시 하기
              </button>
            </div>
          )}
        </div>
      </>
    );
  };

  const renderAIMafia = () => {
    const parsed = parseAIMafia(latestContent);
    const round = parsed.round ?? 1;
    const isGameOver = parsed.isReveal;
    const avatarColors = ['bg-rose-500/20 text-rose-400 border-rose-500/30', 'bg-violet-500/20 text-violet-400 border-violet-500/30', 'bg-teal-500/20 text-teal-400 border-teal-500/30'];

    return (
      <>
        <div className="px-5 py-3 bg-gradient-to-r from-violet-950/40 via-slate-800/60 to-slate-900/60 border-b border-violet-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <GameBadge className="bg-violet-500/15 text-violet-300 border border-violet-500/20">
                <UserX className="w-3 h-3" /> 마피아를 찾아라
              </GameBadge>
              {parsed.round && (
                <GameBadge className="bg-slate-700/60 text-slate-300 border border-slate-600/40">
                  라운드 {parsed.round}
                </GameBadge>
              )}
              {parsed.isReveal && (
                <GameBadge className="bg-amber-500/15 text-amber-300 border border-amber-500/20 animate-in zoom-in">
                  <AlertTriangle className="w-3 h-3" /> 정체 공개
                </GameBadge>
              )}
            </div>
            <span className="text-[10px] text-slate-500">{optionLabel}</span>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3 scrollbar-thin">
          {conversationPairs.map((pair, i) => (
            <div key={i} className="space-y-3 animate-in fade-in slide-in-from-bottom-1 duration-300">
              {pair.ai && (
                <GameCard accentBorder="border-violet-500/15">
                  {pair.ai.isStreaming && !pair.ai.content ? <StreamingDots /> : (
                    <div className="px-5 py-4">
                      {(() => {
                        const p = parseAIMafia(pair.ai?.content || '');
                        if (p.isReveal) {
                          return (
                            <div className="text-center py-2 mb-3 animate-in zoom-in duration-500">
                              <span className="text-sm font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-amber-400 to-violet-400">
                                REVEAL
                              </span>
                            </div>
                          );
                        }
                        return null;
                      })()}
                      <p className="text-[13px] text-slate-200 leading-relaxed whitespace-pre-wrap break-words">{pair.ai.content}</p>
                      {pair.ai.isStreaming && pair.ai.content && <span className="inline-block w-0.5 h-3.5 bg-violet-400/60 ml-0.5 cursor-blink rounded-full" />}
                    </div>
                  )}
                </GameCard>
              )}
              {pair.user && <UserCard accentColor="border-violet-500/20 bg-violet-950/25">{pair.user.content}</UserCard>}
            </div>
          ))}
        </div>

        {/* Cycle 43: Dramatic vote phase */}
        {parsed.isVotePhase && !parsed.isReveal && (
          <div className="px-5 pb-3 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <p className="text-[12px] text-violet-300 text-center font-bold tracking-wide" style={{ animation: 'gp-pulse-glow 2s ease-in-out infinite' }}>마피아는 누구?</p>
            <div className="grid grid-cols-3 gap-2.5">
              {['A', 'B', 'C'].map((letter, idx) => (
                <button key={letter} onClick={() => sendQuick(`${letter}가 마피아입니다`)} disabled={isDiscussing}
                  className={cn(
                    'flex flex-col items-center gap-2 py-4 rounded-xl border-2 transition-all duration-200 relative overflow-hidden group/vote',
                    'hover:scale-[1.05] active:scale-[0.93] disabled:opacity-40',
                    avatarColors[idx], 'bg-slate-800/60 hover:bg-slate-700/60',
                  )}>
                  {/* Hover glow */}
                  <div className="absolute inset-0 opacity-0 group-hover/vote:opacity-100 transition-opacity duration-300 bg-gradient-to-b from-white/5 to-transparent" />
                  <div className={cn('w-11 h-11 rounded-full flex items-center justify-center text-lg font-black border-2 transition-transform duration-200 group-hover/vote:scale-110', avatarColors[idx])}>
                    {letter}
                  </div>
                  <span className="text-[11px] font-bold relative">참가자 {letter}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Game Over Screen */}
        {isGameOver && (
          <div className="px-5 pb-4">
            <div className={cn('p-6 rounded-2xl border-2 text-center animate-in zoom-in duration-500',
              parsed.isWin ? 'border-green-500/40 bg-gradient-to-br from-green-950/40 via-emerald-950/30 to-slate-900/40' : 'border-red-500/40 bg-gradient-to-br from-red-950/40 via-rose-950/30 to-slate-900/40'
            )} style={{ animation: parsed.isWin ? 'gp-pulse-glow 2s ease-in-out infinite' : 'gp-shake 0.5s ease-in-out' }}>
              <div className="text-3xl mb-2">{parsed.isWin ? '🕵️' : '🎭'}</div>
              <div className={cn('text-xl font-black mb-2', parsed.isWin ? 'text-green-400 drop-shadow-[0_0_15px_rgba(74,222,128,0.5)]' : 'text-red-400 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]')}>
                {parsed.isWin ? 'MAFIA FOUND!' : 'MAFIA WINS!'}
              </div>
              <p className="text-sm text-slate-300 mb-4">{parsed.isWin ? '마피아를 찾아냈습니다!' : '마피아를 놓쳤습니다...'}</p>
              <button onClick={onExit} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 text-white font-bold text-sm hover:scale-105 active:scale-95 transition-transform">
                다시 하기
              </button>
            </div>
          </div>
        )}

        {!parsed.isVotePhase && !parsed.isReveal && (
          <div className="flex flex-wrap items-center gap-2 px-5 pb-3">
            <QuickBtn onClick={() => sendQuick('A에게 질문합니다.')} disabled={isDiscussing}
              className="border-rose-500/30 text-rose-300 hover:bg-rose-600/15">A에게 질문</QuickBtn>
            <QuickBtn onClick={() => sendQuick('B에게 질문합니다.')} disabled={isDiscussing}
              className="border-violet-500/30 text-violet-300 hover:bg-violet-600/15">B에게 질문</QuickBtn>
            <QuickBtn onClick={() => sendQuick('C에게 질문합니다.')} disabled={isDiscussing}
              className="border-teal-500/30 text-teal-300 hover:bg-teal-600/15">C에게 질문</QuickBtn>
            <QuickBtn onClick={() => sendQuick('투표하겠습니다!')} disabled={isDiscussing}
              className="border-amber-500/30 text-amber-300 hover:bg-amber-600/15">
              <Flag className="w-3.5 h-3.5" /> 투표!
            </QuickBtn>
          </div>
        )}
      </>
    );
  };

  const renderFirewallEscape = () => {
    const parsed = parseFirewallEscape(latestContent);
    const currentLayer = parsed.currentLayer ?? 1;
    /* Cycle 41: Layer-based visual intensity */
    const layerIntensity = (currentLayer / parsed.totalLayers);
    const layerApproachLabels: Record<number, string> = { 1: '논리', 2: '감정', 3: '창의', 4: '기술', 5: '최종' };

    return (
      <>
        <div className={cn("px-5 py-4 border-b border-teal-500/20 relative overflow-hidden transition-all duration-500",
          `bg-gradient-to-r from-teal-950/${Math.round(30 + layerIntensity * 30)} via-slate-800/60 to-teal-950/${Math.round(20 + layerIntensity * 20)}`
        )}>
          {/* Cycle 41: Layer breach scan effect */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-teal-400/30 to-transparent" style={{
              animation: `gp-scan-line ${3 - layerIntensity * 1.5}s ease-in-out infinite`,
              top: '50%',
            }} />
          </div>
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <LayerProgress current={currentLayer - 1} total={parsed.totalLayers} />
              <div className="text-right">
                <span className="text-[10px] text-teal-400 font-mono font-bold">LAYER {currentLayer}/{parsed.totalLayers}</span>
                <div className="text-[8px] text-slate-500">{layerApproachLabels[currentLayer] || parsed.approach}</div>
              </div>
            </div>
            {parsed.approach && (
              <GameBadge className="bg-teal-500/15 text-teal-300 border border-teal-500/20">
                <Shield className="w-3 h-3" /> 필요: {parsed.approach}
              </GameBadge>
            )}
            {parsed.isBlocked && !parsed.isBreached && (
              <div className="mt-2">
                <GameBadge className="bg-red-500/15 text-red-300 border border-red-500/20" style={{ animation: 'gp-shake 0.5s ease-in-out' }}>
                  <XCircle className="w-3 h-3" /> 접근 거부
                </GameBadge>
              </div>
            )}
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3 scrollbar-thin relative">
          <div className="absolute inset-0 pointer-events-none" style={{
            backgroundImage: 'linear-gradient(0deg, rgba(20,184,166,0.15) 1px, transparent 1px)',
            backgroundSize: '100% 20px',
            opacity: 0.02 + layerIntensity * 0.03,
          }} />
          <div className="absolute inset-0 pointer-events-none opacity-[0.02]" style={{
            backgroundImage: 'repeating-linear-gradient(0deg, rgba(20,184,166,0.2) 0px, transparent 1px, transparent 4px)',
            backgroundSize: '100% 4px',
          }} />
          {conversationPairs.map((pair, i) => (
            <div key={i} className="space-y-3 animate-in fade-in slide-in-from-bottom-1 duration-300 relative">
              {pair.user && <UserCard accentColor="border-teal-500/20 bg-teal-950/25">{pair.user.content}</UserCard>}
              {pair.ai && (
                <GameCard accentBorder={(() => {
                  const p = parseFirewallEscape(pair.ai?.content || '');
                  return p.layerBreached ? 'border-green-500/30' : p.isBlocked ? 'border-red-500/20' : 'border-teal-500/15';
                })()}>
                  {pair.ai.isStreaming && !pair.ai.content ? <StreamingDots /> : (
                    <div className="px-5 py-4">
                      {(() => {
                        const p = parseFirewallEscape(pair.ai?.content || '');
                        return p.layerBreached ? (
                          <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20" style={{ animation: 'gp-pulse-glow 1s ease-in-out' }}>
                            <CheckCircle2 className="w-4 h-4 text-green-400" />
                            <span className="text-[12px] font-bold text-green-400">층 돌파!</span>
                          </div>
                        ) : null;
                      })()}
                      <p className="text-[13px] text-teal-100/90 leading-relaxed whitespace-pre-wrap break-words">{pair.ai.content}</p>
                      {pair.ai.isStreaming && pair.ai.content && <span className="inline-block w-0.5 h-3.5 bg-teal-400/60 ml-0.5 cursor-blink rounded-full" />}
                    </div>
                  )}
                </GameCard>
              )}
            </div>
          ))}

          {/* Game Over Screen */}
          {parsed.isBreached && (
            <div className="mt-4 p-6 rounded-2xl border-2 border-green-500/40 bg-gradient-to-br from-green-950/40 via-teal-950/30 to-gray-950/60 text-center animate-in zoom-in duration-500 font-mono" style={{ animation: 'gp-pulse-glow 2s ease-in-out infinite' }}>
              <div className="text-3xl mb-2">🔓</div>
              <div className="text-xl font-black text-green-400 drop-shadow-[0_0_15px_rgba(74,222,128,0.6)] tracking-widest mb-2">&gt; FIREWALL BREACHED</div>
              <p className="text-sm text-slate-300 mb-4 font-sans">5겹 방화벽을 모두 돌파했습니다!</p>
              <button onClick={onExit} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-bold text-sm hover:scale-105 active:scale-95 transition-transform font-sans">
                다시 하기
              </button>
            </div>
          )}
        </div>
      </>
    );
  };

  const renderNegotiator = () => {
    const parsed = parseNegotiator(latestContent);
    const round = parsed.round ?? 1;
    const totalRounds = parsed.totalRounds;
    const isGameOver = parsed.isFinalReveal;

    return (
      <>
        <div className="px-5 py-3 bg-gradient-to-r from-amber-950/40 via-slate-800/60 to-slate-900/60 border-b border-amber-500/20 relative overflow-hidden">
          {parsed.isTradeProposed && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <div className="absolute inset-x-0 h-full bg-gradient-to-r from-transparent via-amber-400/5 to-transparent" style={{ animation: 'gp-scan-line 2s ease-in-out infinite' }} />
            </div>
          )}
          <div className="relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GameBadge className="bg-amber-500/15 text-amber-300 border border-amber-500/20">
                  <Handshake className="w-3 h-3" /> 거래 대결
                </GameBadge>
                {parsed.round !== null && (
                  <GameBadge className="bg-slate-700/60 text-slate-300 border border-slate-600/40">
                    라운드 {round}/{totalRounds}
                  </GameBadge>
                )}
              </div>
              <span className="text-[10px] text-slate-500">{optionLabel}</span>
            </div>
            {/* Cycle 42: Enhanced items display with glow */}
            {(parsed.userItems || parsed.aiItems) && (
              <div className="grid grid-cols-2 gap-3 mt-3">
                {parsed.userItems && (
                  <div className="px-3 py-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 transition-all duration-300 hover:bg-blue-500/15">
                    <span className="text-[9px] text-blue-400 font-semibold uppercase tracking-wider">내 아이템</span>
                    <p className="text-[11px] text-blue-200 mt-0.5 leading-relaxed">{parsed.userItems}</p>
                  </div>
                )}
                {parsed.aiItems && (
                  <div className="px-3 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 transition-all duration-300 hover:bg-amber-500/15">
                    <span className="text-[9px] text-amber-400 font-semibold uppercase tracking-wider">AI 아이템</span>
                    <p className="text-[11px] text-amber-200 mt-0.5 leading-relaxed">{parsed.aiItems}</p>
                  </div>
                )}
              </div>
            )}
            {parsed.round !== null && (
              <div className="mt-2">
                <ProgressBar current={round} total={totalRounds} accent={meta.accent} />
              </div>
            )}
            {(parsed.isDeal || parsed.isNoDeal || parsed.isFinalReveal) && (
              <div className="mt-3 text-center" style={{
                animation: parsed.isDeal ? 'gp-pulse-glow 1s ease-in-out infinite' : parsed.isNoDeal ? 'gp-shake 0.5s ease-in-out' : '',
              }}>
                <span className={cn('text-lg font-black',
                  parsed.isDeal ? 'text-green-400 drop-shadow-[0_0_15px_rgba(74,222,128,0.5)]' :
                  parsed.isNoDeal ? 'text-red-400 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]' :
                  'text-amber-400 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]'
                )}>
                  {parsed.isDeal ? 'DEAL!' : parsed.isNoDeal ? 'NO DEAL!' : 'FINAL RESULT'}
                </span>
              </div>
            )}
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3 scrollbar-thin">
          {conversationPairs.map((pair, i) => (
            <div key={i} className="space-y-3 animate-in fade-in slide-in-from-bottom-1 duration-300">
              {pair.ai && (
                <GameCard accentBorder="border-amber-500/15">
                  <div className="flex items-center gap-2 px-5 pt-3 pb-1">
                    <div className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center">
                      <Bot className="w-3 h-3 text-amber-400" />
                    </div>
                    <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider">Merchant</span>
                  </div>
                  {pair.ai.isStreaming && !pair.ai.content ? <StreamingDots /> : (
                    <div className="px-5 pb-4">
                      <p className="text-[13px] text-slate-200 leading-relaxed whitespace-pre-wrap break-words">{pair.ai.content}</p>
                      {pair.ai.isStreaming && pair.ai.content && <span className="inline-block w-0.5 h-3.5 bg-amber-400/60 ml-0.5 cursor-blink rounded-full" />}
                    </div>
                  )}
                </GameCard>
              )}
              {pair.user && <UserCard accentColor="border-amber-500/20 bg-amber-950/25">{pair.user.content}</UserCard>}
            </div>
          ))}

          {/* Game Over Screen */}
          {isGameOver && (
            <div className="mt-4 p-6 rounded-2xl border-2 border-amber-500/40 bg-gradient-to-br from-amber-950/40 via-yellow-950/30 to-slate-900/40 text-center animate-in zoom-in duration-500" style={{ animation: 'gp-pulse-glow 2s ease-in-out infinite' }}>
              <div className="text-3xl mb-2">📊</div>
              <div className="text-xl font-black text-amber-400 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)] mb-2">FINAL RESULT</div>
              <p className="text-sm text-slate-300 mb-4">거래가 종료되었습니다!</p>
              <button onClick={onExit} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-white font-bold text-sm hover:scale-105 active:scale-95 transition-transform">
                다시 하기
              </button>
            </div>
          )}
        </div>

        {!isGameOver && (
          <div className="flex flex-wrap items-center gap-2 px-5 pb-3">
            <QuickBtn onClick={() => sendQuick('제안합니다.')} disabled={isDiscussing}
              className="border-green-500/30 text-green-300 hover:bg-green-600/15">
              <Send className="w-3.5 h-3.5" /> 제안
            </QuickBtn>
            <QuickBtn onClick={() => sendQuick('거절합니다.')} disabled={isDiscussing}
              className="border-red-500/30 text-red-300 hover:bg-red-600/15">
              <XCircle className="w-3.5 h-3.5" /> 거절
            </QuickBtn>
            <QuickBtn onClick={() => sendQuick('수락합니다. 거래 성사!')} disabled={isDiscussing}
              className="border-amber-500/30 text-amber-300 hover:bg-amber-600/15">
              <Handshake className="w-3.5 h-3.5" /> 수락
            </QuickBtn>
          </div>
        )}
      </>
    );
  };

  // ── Select the right renderer ──

  const renderGameContent = () => {
    switch (gameId as GameId) {
      case 'ai-polygraph':            return renderPolygraph();
      case 'mental-breaker':          return renderMentalBreaker();
      case 'reverse-interrogation':   return renderReverseInterrogation();
      case 'split-personality':       return renderSplitPersonality();
      case 'emotion-hacker':          return renderEmotionHacker();
      case 'reverse-quiz':            return renderReverseQuiz();
      case 'ai-court':                return renderAICourt();
      case 'code-breaker':            return renderCodeBreaker();
      case 'minefield':               return renderMinefield();
      case 'ai-mafia':                return renderAIMafia();
      case 'firewall-escape':         return renderFirewallEscape();
      case 'negotiator':              return renderNegotiator();
      default:                        return renderPolygraph();
    }
  };

  const getPlaceholder = (): string => {
    switch (gameId as GameId) {
      case 'ai-polygraph':            return '질문을 입력하세요... (거짓!/진실! 로 판정)';
      case 'mental-breaker':          return 'AI의 주장에 반박하세요...';
      case 'reverse-interrogation':   return '알리바이를 답변하세요...';
      case 'split-personality':       return '인격의 약점을 찾으세요...';
      case 'emotion-hacker':          return '감정을 유도하는 말을 하세요...';
      case 'reverse-quiz':            return '이 답에 해당하는 질문은?...';
      case 'ai-court':                return '검사로서 주장하세요...';
      case 'code-breaker':            return '코드에 대해 질문하세요...';
      case 'minefield':               return '자연스럽게 대화하세요... (금지어 주의!)';
      case 'ai-mafia':                return '질문하거나 투표하세요...';
      case 'firewall-escape':         return '방화벽을 돌파하세요...';
      case 'negotiator':              return '거래를 제안하세요...';
      default:                        return '메시지를 입력하세요...';
    }
  };

  // ══════════════════════════════════════════
  // ── Main Render ──
  // ══════════════════════════════════════════

  /* Cycle 36-45: Get accent border color as CSS custom property */
  const accentColorVar = (() => {
    const colorMap: Record<string, string> = {
      'ai-polygraph': 'rgba(6,182,212,0.5)',
      'mental-breaker': 'rgba(239,68,68,0.5)',
      'reverse-interrogation': 'rgba(245,158,11,0.5)',
      'split-personality': 'rgba(168,85,247,0.5)',
      'emotion-hacker': 'rgba(236,72,153,0.5)',
      'reverse-quiz': 'rgba(16,185,129,0.5)',
      'ai-court': 'rgba(249,115,22,0.5)',
      'code-breaker': 'rgba(59,130,246,0.5)',
      'minefield': 'rgba(244,63,94,0.5)',
      'ai-mafia': 'rgba(139,92,246,0.5)',
      'firewall-escape': 'rgba(20,184,166,0.5)',
      'negotiator': 'rgba(245,158,11,0.5)',
    };
    return colorMap[gameId] || 'rgba(99,102,241,0.5)';
  })();

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white relative" style={{ '--accent-glow': accentColorVar } as React.CSSProperties}>

      {/* Cycle 36-45: Master CSS animation keyframes */}
      <style>{`
        @keyframes gp-shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-4px); } 75% { transform: translateX(4px); } }
        @keyframes gp-glitch { 0% { text-shadow: 2px 0 red, -2px 0 cyan; } 50% { text-shadow: -2px 0 red, 2px 0 cyan; } 100% { text-shadow: 0 0 transparent; } }
        @keyframes gp-pulse-glow { 0%, 100% { box-shadow: 0 0 5px currentColor; } 50% { box-shadow: 0 0 20px currentColor; } }
        @keyframes gp-flicker { 0%, 100% { opacity: 1; } 30% { opacity: 0.4; } 60% { opacity: 0.8; } 80% { opacity: 0.3; } }
        @keyframes gp-crack { 0% { clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%); } 100% { clip-path: polygon(10% 0, 90% 5%, 95% 100%, 5% 95%); } }
        @keyframes gp-tumble { 0% { transform: translateY(-100%); opacity: 0; } 100% { transform: translateY(0); opacity: 1; } }
        @keyframes gp-explode { 0% { transform: scale(1); opacity: 1; } 50% { transform: scale(2.5); opacity: 0.7; color: #ef4444; } 100% { transform: scale(4); opacity: 0; } }
        @keyframes gp-text-bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-2px); } }
        @keyframes gp-scan-line { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        @keyframes gp-shatter-piece { 0% { opacity: 1; transform: rotate(var(--r, 0deg)) translate(0, 0); } 100% { opacity: 0; transform: rotate(var(--r, 15deg)) translate(var(--tx, 40px), var(--ty, 40px)); } }
        @keyframes gp-flash-red { 0% { background-color: rgba(239,68,68,0.3); } 100% { background-color: transparent; } }
        @keyframes gp-particle { 0% { transform: translate(0, 0) scale(1); opacity: 1; } 100% { transform: translate(var(--px, 100px), var(--py, -100px)) scale(0); opacity: 0; } }
        @keyframes gp-personality-flicker { 0% { opacity: 0; background: rgba(168,85,247,0.15); } 15% { opacity: 1; background: rgba(168,85,247,0.3); } 30% { opacity: 0; } 45% { opacity: 1; background: rgba(168,85,247,0.2); } 60% { opacity: 0; } 75% { opacity: 0.5; } 100% { opacity: 0; } }
        @keyframes gp-objection { 0% { transform: scale(0.3) rotate(-5deg); opacity: 0; } 40% { transform: scale(1.3) rotate(2deg); opacity: 1; } 70% { transform: scale(1) rotate(0deg); } 100% { transform: scale(1); opacity: 0; } }
        @keyframes gp-verdict-dim { 0% { opacity: 0; } 30% { opacity: 1; } 70% { opacity: 1; } 100% { opacity: 0.3; } }
        @keyframes gp-matrix-fall { 0% { background-position: 0 0; } 100% { background-position: 0 600px; } }
        @keyframes gp-input-glow { 0%, 100% { box-shadow: 0 0 0 transparent; } 50% { box-shadow: 0 0 12px var(--accent-glow); } }
        @keyframes gp-portal { 0% { transform: scale(0.9); opacity: 0; filter: blur(8px); } 100% { transform: scale(1); opacity: 1; filter: blur(0); } }
        @keyframes gp-msg-slide { 0% { transform: translateY(15px); opacity: 0; } 100% { transform: translateY(0); opacity: 1; } }
        .gp-shake { animation: gp-shake 0.5s ease-in-out; }
        .gp-shake-slow { animation: gp-shake 2s ease-in-out infinite; }
        .gp-glitch-text { animation: gp-glitch 0.5s ease-in-out infinite; }
        .gp-text-tremor { animation: gp-shake 0.3s ease-in-out 2; }
        .gp-portal-enter { animation: gp-portal 0.6s ease-out; }
        .cursor-blink { animation: gp-cursor-blink 1s step-end infinite; }
        @keyframes gp-cursor-blink { 0%, 50% { opacity: 1; } 51%, 100% { opacity: 0; } }
        /* Scrollbar styling */
        .scrollbar-thin::-webkit-scrollbar { width: 4px; }
        .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: rgba(100,116,139,0.3); border-radius: 2px; }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover { background: rgba(100,116,139,0.5); }
      `}</style>

      {/* ── Top Header ── */}
      <div className={cn(
        'flex items-center justify-between px-5 py-3 border-b backdrop-blur-sm animate-in fade-in slide-in-from-top-2 duration-400 fill-mode-both',
        meta.accentBorder,
        'bg-slate-900/90',
      )}>
        <div className="flex items-center gap-3">
          {/* Cycle 37: Icon glow animation */}
          <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300', meta.accentBg, meta.glow)} style={{ animation: 'gp-pulse-glow 3s ease-in-out infinite' }}>
            <span className={meta.accent}>{meta.icon}</span>
          </div>
          <div>
            <h2 className={cn('text-sm font-bold', meta.accent)}>{meta.name}</h2>
            <p className="text-[10px] text-slate-500">{optionLabel}</p>
          </div>
        </div>

        {/* Cycle 39: Button press feedback */}
        <button onClick={onExit}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-[11px] font-semibold text-slate-400 hover:text-red-400 hover:border-red-500/40 hover:bg-red-950/30 transition-all duration-200 active:scale-[0.95]">
          <LogOut className="w-3.5 h-3.5" />
          나가기
        </button>
      </div>

      {/* ── Game Content Area ── Cycle 36: Portal entrance animation */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative gp-portal-enter">
        {renderGameContent()}

        {/* ── Post-Game Result Overlay ── */}
        {gameResult && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm animate-in fade-in duration-500">
            <div className={cn("w-full max-w-md p-6 rounded-2xl border space-y-5 animate-in zoom-in-95 duration-400",
              gameResult.won ? 'bg-gradient-to-b from-emerald-950/60 to-slate-900 border-emerald-500/20' : 'bg-gradient-to-b from-red-950/60 to-slate-900 border-red-500/20'
            )}>
              {/* Victory/Defeat header */}
              <div className="text-center">
                <div className="text-5xl mb-2">{gameResult.won ? '\u{1F3C6}' : '\u{1F480}'}</div>
                <h2 className="text-2xl font-black text-white">{gameResult.won ? '승리!' : '패배'}</h2>
                {/* Grade badge */}
                <div className={cn("inline-block mt-2 px-4 py-1 rounded-lg text-lg font-black", {
                  'bg-amber-500/20 text-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.3)]': gameResult.grade === 'S',
                  'bg-violet-500/20 text-violet-400': gameResult.grade === 'A',
                  'bg-blue-500/20 text-blue-400': gameResult.grade === 'B',
                  'bg-slate-500/20 text-slate-400': gameResult.grade === 'C',
                  'bg-red-500/20 text-red-400': gameResult.grade === 'F',
                })}>
                  {gameResult.grade} 등급
                </div>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center p-3 rounded-xl bg-slate-800/50 border border-slate-700/30">
                  <div className="text-lg mb-0.5">{'\u23F1\uFE0F'}</div>
                  <div className="text-[14px] font-bold text-white">{Math.floor(gameResult.stats.time / 60)}:{String(gameResult.stats.time % 60).padStart(2, '0')}</div>
                  <div className="text-[10px] text-slate-500">시간</div>
                </div>
                <div className="text-center p-3 rounded-xl bg-slate-800/50 border border-slate-700/30">
                  <div className="text-lg mb-0.5">{'\u{1F4AC}'}</div>
                  <div className="text-[14px] font-bold text-white">{gameResult.stats.turns}턴</div>
                  <div className="text-[10px] text-slate-500">사용</div>
                </div>
                <div className="text-center p-3 rounded-xl bg-slate-800/50 border border-slate-700/30">
                  <div className="text-lg mb-0.5">{'\u{1F4A1}'}</div>
                  <div className="text-[14px] font-bold text-white">{gameResult.stats.hints}회</div>
                  <div className="text-[10px] text-slate-500">힌트</div>
                </div>
              </div>

              {/* XP gained */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <span className="text-amber-400 font-bold text-[14px]">{'\u26A1'} +{gameResult.xpGained} XP</span>
                {gameResult.levelUp && <span className="text-[11px] font-bold text-amber-300 animate-pulse">{'\u{1F389}'} LEVEL UP! Lv.{gameResult.newLevel}</span>}
              </div>

              {/* New achievements */}
              {gameResult.newAchievements.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[11px] text-slate-500 font-semibold">{'\u{1F3C5}'} 새 업적 달성!</p>
                  {gameResult.newAchievements.map(a => (
                    <div key={a.id} className="flex items-center gap-2 p-2 rounded-lg bg-violet-500/10 border border-violet-500/20 animate-in fade-in slide-in-from-bottom-2">
                      <span className="text-base">{a.icon}</span>
                      <span className="text-[12px] font-semibold text-violet-300">{a.name}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-2">
                <button onClick={() => { setGameResult(null); gameEndedRef.current = false; gameStartTime.current = Date.now(); turnsUsed.current = 0; hintsUsed.current = 0; onExit(); }} className="flex-1 py-2.5 rounded-xl bg-slate-700 text-white text-[13px] font-semibold hover:bg-slate-600 transition-all active:scale-95">
                  {'\u{1F504}'} 재도전
                </button>
                <button onClick={onExit} className="flex-1 py-2.5 rounded-xl bg-slate-700 text-white text-[13px] font-semibold hover:bg-slate-600 transition-all active:scale-95">
                  {'\u{1F3AE}'} 다른 게임
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Input Area ── Cycle 40: Enhanced with accent glow on focus */}
      <div className={cn('border-t px-5 py-3 animate-in fade-in slide-in-from-bottom-3 duration-500 fill-mode-both', meta.accentBorder, 'bg-slate-900/95 backdrop-blur-sm')} style={{ animationDelay: '300ms' }}>
        <form onSubmit={handleSubmit} className="flex items-end gap-2.5">
          <div className={cn(
            'flex-1 rounded-xl border-2 transition-all duration-300 bg-slate-800/80',
            isDiscussing ? 'border-slate-700 opacity-60' : 'border-slate-600',
          )} style={!isDiscussing ? { '--accent-glow': accentColorVar } as React.CSSProperties : undefined}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={isDiscussing ? 'AI가 응답 중...' : getPlaceholder()}
              disabled={isDiscussing}
              rows={1}
              className={cn(
                "w-full bg-transparent resize-none text-[13px] text-white placeholder:text-slate-500 focus:outline-none leading-relaxed px-4 py-2.5 min-h-[42px] max-h-[100px] block",
                gameId === 'code-breaker' && 'font-mono text-green-300/90',
              )}
              style={!isDiscussing ? { caretColor: accentColorVar } : undefined}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              onInput={e => {
                const t = e.target as HTMLTextAreaElement;
                t.style.height = 'auto';
                t.style.height = Math.min(t.scrollHeight, 100) + 'px';
              }}
              onFocus={e => {
                const parent = e.target.parentElement;
                if (parent) parent.style.boxShadow = `0 0 12px ${accentColorVar}`;
              }}
              onBlur={e => {
                const parent = e.target.parentElement;
                if (parent) parent.style.boxShadow = '';
              }}
            />
          </div>

          {/* Cycle 39: Send button press feedback */}
          <button
            type="submit"
            disabled={!input.trim() || isDiscussing}
            className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200',
              input.trim() && !isDiscussing
                ? cn('text-white shadow-lg hover:scale-105 active:scale-90', meta.glow, meta.accentBg)
                : 'bg-slate-800 text-slate-600',
            )}
          >
            <ArrowUp className="w-4.5 h-4.5" strokeWidth={2.5} />
          </button>
        </form>

        <div className="flex items-center justify-between mt-1.5">
          <span className="text-[9px] text-slate-600">Enter 전송 / Shift+Enter 줄바꿈</span>
          {isDiscussing && (
            <span className={cn('text-[9px] animate-pulse flex items-center gap-1', meta.accent)}>
              <Zap className="w-3 h-3" /> AI 응답 중...
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
