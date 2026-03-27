import { useState, useRef, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  ArrowUp, LogOut, Lightbulb, Flag, SkipForward,
  Sparkles, Send, Trophy, Target, MessageCircle,
  HelpCircle, Swords, Clapperboard, BookOpen, Brain,
  Link2, User, Bot, ChevronRight,
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
  | 'twenty-questions'
  | 'liar-game'
  | 'story-relay'
  | 'trivia-quiz'
  | 'word-chain'
  | 'personality-test'
  | 'debate-arena'
  | 'emoji-movie';

interface GameMeta {
  icon: string;
  name: string;
  accent: string;       // tailwind text color
  accentBg: string;     // tailwind bg color
  accentBorder: string; // tailwind border color
  glow: string;         // box-shadow glow class
}

// ══════════════════════════════════════════
// ── Constants ──
// ══════════════════════════════════════════

const GAME_META: Record<GameId, GameMeta> = {
  'twenty-questions': { icon: '🤔', name: '스무고개', accent: 'text-blue-400', accentBg: 'bg-blue-500/20', accentBorder: 'border-blue-500/40', glow: 'shadow-[0_0_20px_rgba(59,130,246,0.25)]' },
  'liar-game':        { icon: '🤥', name: '라이어 게임', accent: 'text-red-400', accentBg: 'bg-red-500/20', accentBorder: 'border-red-500/40', glow: 'shadow-[0_0_20px_rgba(239,68,68,0.25)]' },
  'story-relay':      { icon: '📖', name: '이야기 이어쓰기', accent: 'text-purple-400', accentBg: 'bg-purple-500/20', accentBorder: 'border-purple-500/40', glow: 'shadow-[0_0_20px_rgba(168,85,247,0.25)]' },
  'trivia-quiz':      { icon: '🧠', name: 'AI 퀴즈쇼', accent: 'text-amber-400', accentBg: 'bg-amber-500/20', accentBorder: 'border-amber-500/40', glow: 'shadow-[0_0_20px_rgba(245,158,11,0.25)]' },
  'word-chain':       { icon: '🔤', name: '끝말잇기 배틀', accent: 'text-emerald-400', accentBg: 'bg-emerald-500/20', accentBorder: 'border-emerald-500/40', glow: 'shadow-[0_0_20px_rgba(16,185,129,0.25)]' },
  'personality-test':  { icon: '🪞', name: '성격 테스트', accent: 'text-pink-400', accentBg: 'bg-pink-500/20', accentBorder: 'border-pink-500/40', glow: 'shadow-[0_0_20px_rgba(236,72,153,0.25)]' },
  'debate-arena':     { icon: '⚔️', name: '디베이트 아레나', accent: 'text-orange-400', accentBg: 'bg-orange-500/20', accentBorder: 'border-orange-500/40', glow: 'shadow-[0_0_20px_rgba(249,115,22,0.25)]' },
  'emoji-movie':      { icon: '🎬', name: '이모지 영화 퀴즈', accent: 'text-cyan-400', accentBg: 'bg-cyan-500/20', accentBorder: 'border-cyan-500/40', glow: 'shadow-[0_0_20px_rgba(6,182,212,0.25)]' },
};

// ══════════════════════════════════════════
// ── AI Response Parsers ──
// ══════════════════════════════════════════

function parseTwentyQuestions(content: string) {
  const remaining = content.match(/남은\s*질문\s*[:：]?\s*(\d+)\s*\/\s*(\d+)/);
  const isCorrect = /축하|정답|맞[았히]/.test(content);
  const isGameOver = /정답을?\s*(공개|알려)|게임\s*(종료|끝)|아쉽/.test(content);
  const isYes = /^\s*(네|예|맞|✅|⭕)/m.test(content);
  const isNo = /^\s*(아니|❌|✖)/m.test(content);
  return {
    remaining: remaining ? parseInt(remaining[1]) : null,
    total: remaining ? parseInt(remaining[2]) : 20,
    isCorrect,
    isGameOver,
    isYes,
    isNo,
  };
}

function parseLiarGame(content: string) {
  const participants = content.match(/([ABC])\s*[:)]\s*[""]?(.+?)[""]?\s*(?=\n|[ABC]\s*[:)]|$)/g);
  const isVotePhase = /누가\s*라이어|선택하세요|라이어를?\s*찾/i.test(content);
  const isReveal = /정답|라이어는|공개/i.test(content);
  const roundMatch = content.match(/라운드\s*[:：]?\s*(\d+)/);
  return { participants: participants || [], isVotePhase, isReveal, round: roundMatch ? parseInt(roundMatch[1]) : null };
}

function parseStoryRelay(content: string) {
  const turnMatch = content.match(/(\d+)\s*\/\s*(\d+)\s*턴/);
  const isEnding = /결말|끝|마무리|THE\s*END/i.test(content);
  return { turn: turnMatch ? parseInt(turnMatch[1]) : null, totalTurns: turnMatch ? parseInt(turnMatch[2]) : 10, isEnding };
}

function parseTriviaQuiz(content: string) {
  const scoreMatch = content.match(/점수\s*[:：]?\s*(\d+)\s*\/?\s*(\d+)?/);
  const questionMatch = content.match(/Q\s*(\d+)\s*\/?\s*(\d+)?/);
  const options = content.match(/[A-D]\)\s*.+/g);
  const isCorrect = /정답|맞[았히]|⭕|✅/.test(content);
  const isWrong = /오답|틀[렸리]|❌|아쉽/.test(content);
  const difficultyMatch = content.match(/난이도\s*[:：]?\s*(⭐+|[★☆]+|\d)/);
  return {
    score: scoreMatch ? parseInt(scoreMatch[1]) : null,
    totalQuestions: questionMatch ? parseInt(questionMatch[2] || '10') : 10,
    currentQuestion: questionMatch ? parseInt(questionMatch[1]) : null,
    options: options || [],
    isCorrect, isWrong,
    difficulty: difficultyMatch ? difficultyMatch[1] : null,
  };
}

function parseWordChain(content: string) {
  const turnMatch = content.match(/턴\s*[:：]?\s*(\d+)/);
  const wordsUsedMatch = content.match(/사용된?\s*단어\s*[:：]?\s*(\d+)/);
  const lastWord = content.match(/(?:^|\n)\s*(?:🤖|AI|나)\s*[:：]?\s*(\S+)\s*$/m);
  const nextChar = content.match(/다음\s*글자\s*[:：]?\s*[""]?(\S)[""]?/);
  const isLose = /패배|졌|게임\s*오버|이미\s*나온|틀[렸리]/i.test(content);
  const isWin = /승리|이겼|축하/i.test(content);
  return {
    turn: turnMatch ? parseInt(turnMatch[1]) : null,
    wordsUsed: wordsUsedMatch ? parseInt(wordsUsedMatch[1]) : null,
    lastWord: lastWord ? lastWord[1] : null,
    nextChar: nextChar ? nextChar[1] : null,
    isLose, isWin,
  };
}

function parsePersonalityTest(content: string) {
  const questionMatch = content.match(/Q\s*(\d+)\s*\/?\s*(\d+)?/);
  const options = content.match(/[A-D]\)\s*.+/g);
  const isResult = /결과|분석|유형\s*[:：]|당신은/i.test(content);
  const mbtiMatch = content.match(/[EI][NS][TF][JP]/);
  return {
    currentQuestion: questionMatch ? parseInt(questionMatch[1]) : null,
    totalQuestions: questionMatch ? parseInt(questionMatch[2] || '10') : 10,
    options: options || [],
    isResult,
    mbtiType: mbtiMatch ? mbtiMatch[0] : null,
  };
}

function parseDebateArena(content: string) {
  const roundMatch = content.match(/(?:ROUND|라운드)\s*(\d+)\s*\/?\s*(\d+)?/i);
  const phaseMatch = content.match(/(?:입론|반박|최종\s*변론|판정)/);
  const isJudgment = /판정|심판|승[패자리]|결과/i.test(content);
  const scoreMatch = content.match(/(\d+)\s*[:：]\s*(\d+)/);
  return {
    round: roundMatch ? parseInt(roundMatch[1]) : null,
    totalRounds: roundMatch ? parseInt(roundMatch[2] || '3') : 3,
    phase: phaseMatch ? phaseMatch[0] : null,
    isJudgment,
    userScore: scoreMatch ? parseInt(scoreMatch[1]) : null,
    aiScore: scoreMatch ? parseInt(scoreMatch[2]) : null,
  };
}

function parseEmojiMovie(content: string) {
  const scoreMatch = content.match(/(\d+)\s*\/?\s*(\d+)\s*정답/);
  const emojiLine = content.match(/(?:^|\n)\s*((?:[\p{Emoji_Presentation}\p{Extended_Pictographic}]\s*){2,})\s*$/mu);
  const isCorrect = /정답|맞[았히]|⭕|✅/.test(content);
  const isWrong = /오답|틀[렸리]|❌|아닙니다|아쉽/.test(content);
  const hintGiven = /힌트|단서/i.test(content);
  return {
    score: scoreMatch ? parseInt(scoreMatch[1]) : null,
    total: scoreMatch ? parseInt(scoreMatch[2]) : 10,
    emojis: emojiLine ? emojiLine[1].trim() : null,
    isCorrect, isWrong, hintGiven,
  };
}

// ══════════════════════════════════════════
// ── Shared Sub-Components ──
// ══════════════════════════════════════════

function ProgressBar({ current, total, accent }: { current: number; total: number; accent: string }) {
  const pct = Math.min(100, Math.round((current / total) * 100));
  const barColor = accent.replace('text-', 'bg-');
  return (
    <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
      <div
        className={cn('h-full rounded-full transition-all duration-500 ease-out', barColor)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function GameBadge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide', className)}>
      {children}
    </span>
  );
}

function StreamingDots() {
  return (
    <div className="flex items-center gap-1.5 py-3 px-4">
      <span className="typing-dot w-2 h-2 rounded-full bg-slate-500" />
      <span className="typing-dot w-2 h-2 rounded-full bg-slate-500" />
      <span className="typing-dot w-2 h-2 rounded-full bg-slate-500" />
    </div>
  );
}

// ══════════════════════════════════════════
// ── Main GamePlayer Component ──
// ══════════════════════════════════════════

export function GamePlayer({ gameId, gameOption, optionLabel, messages, onSendMessage, onExit, isDiscussing }: GamePlayerProps) {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const meta = GAME_META[gameId as GameId] ?? GAME_META['twenty-questions'];

  // Filter to AI-only messages (excluding the initial user "game start" message)
  const aiMessages = useMemo(
    () => messages.filter(m => m.expertId !== '__user__' && m.expertId !== '__round__'),
    [messages],
  );
  const userMessages = useMemo(
    () => messages.filter(m => m.expertId === '__user__'),
    [messages],
  );

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input after AI finishes
  useEffect(() => {
    if (!isDiscussing) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isDiscussing]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isDiscussing) return;
    onSendMessage(input.trim());
    setInput('');
    if (inputRef.current) inputRef.current.style.height = 'auto';
  };

  const sendQuick = (msg: string) => {
    if (isDiscussing) return;
    onSendMessage(msg);
  };

  // Build conversation pairs for display: interleave user + AI messages
  const conversationPairs = useMemo(() => {
    const pairs: Array<{ user?: DiscussionMessage; ai?: DiscussionMessage }> = [];
    let aiIdx = 0;
    // Skip the first user message (game start prompt) — it's just a UI indicator
    const userMsgs = userMessages.slice(1);
    // First AI message is always present (game intro)
    if (aiMessages.length > 0) {
      pairs.push({ ai: aiMessages[0] });
      aiIdx = 1;
    }
    for (let i = 0; i < userMsgs.length; i++) {
      pairs.push({ user: userMsgs[i], ai: aiMessages[aiIdx] });
      aiIdx++;
    }
    // If AI has one more streaming/pending message
    if (aiIdx < aiMessages.length) {
      pairs.push({ ai: aiMessages[aiIdx] });
    }
    return pairs;
  }, [aiMessages, userMessages]);

  // Parse latest AI response for game state
  const latestAi = aiMessages.length > 0 ? aiMessages[aiMessages.length - 1] : null;
  const latestContent = latestAi?.content || '';

  // ── Game-specific render functions ──

  const renderTwentyQuestions = () => {
    const parsed = parseTwentyQuestions(latestContent);
    const remaining = parsed.remaining ?? 20;
    const total = parsed.total;
    const used = total - remaining;

    return (
      <>
        {/* Status bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-slate-800/60 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <GameBadge className="bg-blue-500/20 text-blue-300">
              <Target className="w-3 h-3" /> 남은 질문: {remaining}/{total}
            </GameBadge>
            {parsed.isCorrect && <GameBadge className="bg-green-500/20 text-green-300">정답!</GameBadge>}
            {parsed.isGameOver && !parsed.isCorrect && <GameBadge className="bg-red-500/20 text-red-300">게임 오버</GameBadge>}
          </div>
          <span className="text-[10px] text-slate-500">카테고리: {optionLabel}</span>
        </div>

        {/* Progress */}
        <div className="px-4 pt-3 pb-1">
          <ProgressBar current={used} total={total} accent={meta.accent} />
          <div className="flex justify-between mt-1">
            <span className="text-[9px] text-slate-500">{used}번 질문</span>
            <span className="text-[9px] text-slate-500">{Math.round((used / total) * 100)}%</span>
          </div>
        </div>

        {/* Conversation */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scrollbar-thin">
          {conversationPairs.map((pair, i) => (
            <div key={i} className="space-y-2">
              {pair.user && (
                <div className="flex justify-end">
                  <div className="max-w-[80%] bg-blue-600/30 border border-blue-500/30 rounded-2xl rounded-br-md px-4 py-2.5">
                    <p className="text-[13px] text-blue-100 leading-relaxed">{pair.user.content}</p>
                  </div>
                </div>
              )}
              {pair.ai && (
                <div className="flex justify-start">
                  <div className="max-w-[85%] bg-slate-800 border border-slate-700 rounded-2xl rounded-bl-md px-4 py-2.5">
                    {pair.ai.isStreaming && !pair.ai.content ? (
                      <StreamingDots />
                    ) : (
                      <div className="space-y-1">
                        {(() => {
                          const p = parseTwentyQuestions(pair.ai.content);
                          return (
                            <>
                              {p.isYes && <span className="inline-block px-2 py-0.5 rounded bg-green-500/20 text-green-300 text-[10px] font-bold mb-1">YES</span>}
                              {p.isNo && <span className="inline-block px-2 py-0.5 rounded bg-red-500/20 text-red-300 text-[10px] font-bold mb-1">NO</span>}
                              <p className="text-[13px] text-slate-200 leading-relaxed whitespace-pre-wrap">{pair.ai.content}</p>
                            </>
                          );
                        })()}
                      </div>
                    )}
                    {pair.ai.isStreaming && pair.ai.content && (
                      <span className="inline-block w-0.5 h-3.5 bg-blue-400/60 ml-0.5 cursor-blink rounded-full" />
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Quick actions */}
        {!parsed.isGameOver && !parsed.isCorrect && (
          <div className="flex items-center gap-2 px-4 pb-2">
            <button onClick={() => sendQuick('힌트를 주세요')} disabled={isDiscussing}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-[11px] text-yellow-300 hover:bg-slate-700 transition-all disabled:opacity-40">
              <Lightbulb className="w-3 h-3" /> 힌트
            </button>
            <button onClick={() => sendQuick('포기합니다. 정답을 알려주세요.')} disabled={isDiscussing}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-[11px] text-red-300 hover:bg-slate-700 transition-all disabled:opacity-40">
              <Flag className="w-3 h-3" /> 포기
            </button>
          </div>
        )}
      </>
    );
  };

  const renderLiarGame = () => {
    const parsed = parseLiarGame(latestContent);

    return (
      <>
        {/* Status bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-slate-800/60 border-b border-slate-700/50">
          <GameBadge className="bg-red-500/20 text-red-300">
            <HelpCircle className="w-3 h-3" /> 주제: ???
          </GameBadge>
          {parsed.isReveal && <GameBadge className="bg-amber-500/20 text-amber-300">결과 공개</GameBadge>}
          <span className="text-[10px] text-slate-500">카테고리: {optionLabel}</span>
        </div>

        {/* Conversation */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scrollbar-thin">
          {conversationPairs.map((pair, i) => (
            <div key={i} className="space-y-2">
              {pair.ai && (
                <div className="flex justify-start">
                  <div className="max-w-[90%] bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3">
                    {pair.ai.isStreaming && !pair.ai.content ? (
                      <StreamingDots />
                    ) : (
                      <>
                        <p className="text-[13px] text-slate-200 leading-relaxed whitespace-pre-wrap">{pair.ai.content}</p>
                        {pair.ai.isStreaming && pair.ai.content && (
                          <span className="inline-block w-0.5 h-3.5 bg-red-400/60 ml-0.5 cursor-blink rounded-full" />
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
              {pair.user && (
                <div className="flex justify-end">
                  <div className="max-w-[80%] bg-red-600/30 border border-red-500/30 rounded-2xl rounded-br-md px-4 py-2.5">
                    <p className="text-[13px] text-red-100 leading-relaxed">{pair.user.content}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Vote buttons when in vote phase */}
        {parsed.isVotePhase && !parsed.isReveal && (
          <div className="px-4 pb-2 space-y-2">
            <p className="text-[11px] text-slate-400 text-center">라이어는 누구일까요?</p>
            <div className="flex items-center gap-2 justify-center">
              {['A', 'B', 'C'].map(letter => (
                <button key={letter} onClick={() => sendQuick(`${letter}가 라이어입니다`)} disabled={isDiscussing}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-slate-800 border border-red-500/30 text-red-300 text-[13px] font-bold hover:bg-red-600/20 hover:border-red-400 transition-all disabled:opacity-40">
                  <User className="w-3.5 h-3.5" /> {letter}
                </button>
              ))}
            </div>
            <button onClick={() => sendQuick('추가 질문이 있습니다. 참가자들에게 더 물어봐 주세요.')} disabled={isDiscussing}
              className="w-full flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700 text-[11px] text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-all disabled:opacity-40">
              <MessageCircle className="w-3 h-3" /> 추가 질문하기
            </button>
          </div>
        )}
      </>
    );
  };

  const renderStoryRelay = () => {
    const parsed = parseStoryRelay(latestContent);
    const turn = parsed.turn ?? Math.max(1, Math.ceil(conversationPairs.length));
    const totalTurns = parsed.totalTurns;

    return (
      <>
        {/* Status bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-slate-800/60 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <GameBadge className="bg-purple-500/20 text-purple-300">
              <BookOpen className="w-3 h-3" /> {turn}/{totalTurns}턴
            </GameBadge>
            {parsed.isEnding && <GameBadge className="bg-amber-500/20 text-amber-300">완결</GameBadge>}
          </div>
          <span className="text-[10px] text-slate-500">장르: {optionLabel}</span>
        </div>

        {/* Progress */}
        <div className="px-4 pt-3 pb-1">
          <ProgressBar current={turn} total={totalTurns} accent={meta.accent} />
        </div>

        {/* Story flow */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scrollbar-thin">
          {conversationPairs.map((pair, i) => (
            <div key={i} className="space-y-2">
              {pair.ai && (
                <div className="flex items-start gap-2">
                  <div className="shrink-0 w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center mt-0.5">
                    <Bot className="w-3.5 h-3.5 text-purple-400" />
                  </div>
                  <div className="flex-1 bg-slate-800/80 border border-purple-500/20 rounded-xl px-4 py-2.5">
                    {pair.ai.isStreaming && !pair.ai.content ? (
                      <StreamingDots />
                    ) : (
                      <>
                        <p className="text-[13px] text-purple-100 leading-relaxed whitespace-pre-wrap italic">{pair.ai.content}</p>
                        {pair.ai.isStreaming && pair.ai.content && (
                          <span className="inline-block w-0.5 h-3.5 bg-purple-400/60 ml-0.5 cursor-blink rounded-full" />
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
              {pair.user && (
                <div className="flex items-start gap-2 justify-end">
                  <div className="flex-1 text-right">
                    <div className="inline-block bg-purple-600/25 border border-purple-500/30 rounded-xl px-4 py-2.5 max-w-[85%]">
                      <p className="text-[13px] text-purple-100 leading-relaxed italic text-left">{pair.user.content}</p>
                    </div>
                  </div>
                  <div className="shrink-0 w-6 h-6 rounded-full bg-purple-600/30 flex items-center justify-center mt-0.5">
                    <User className="w-3.5 h-3.5 text-purple-300" />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Quick: Let AI continue */}
        {!parsed.isEnding && (
          <div className="flex items-center gap-2 px-4 pb-2">
            <button onClick={() => sendQuick('AI에게 맡기기 - 자유롭게 이야기를 이어가 주세요')} disabled={isDiscussing}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 border border-purple-500/30 text-[11px] text-purple-300 hover:bg-purple-600/20 transition-all disabled:opacity-40">
              <Sparkles className="w-3 h-3" /> AI에게 맡기기
            </button>
          </div>
        )}
      </>
    );
  };

  const renderTriviaQuiz = () => {
    const parsed = parseTriviaQuiz(latestContent);
    const score = parsed.score ?? 0;
    const currentQ = parsed.currentQuestion ?? 1;
    const totalQ = parsed.totalQuestions;

    return (
      <>
        {/* Status bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-slate-800/60 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <GameBadge className="bg-amber-500/20 text-amber-300">
              <Trophy className="w-3 h-3" /> 점수: {score}
            </GameBadge>
            <GameBadge className="bg-slate-700 text-slate-300">
              Q{currentQ}/{totalQ}
            </GameBadge>
            {parsed.difficulty && (
              <span className="text-[11px] text-amber-400">{parsed.difficulty}</span>
            )}
          </div>
          <span className="text-[10px] text-slate-500">분야: {optionLabel}</span>
        </div>

        {/* Progress */}
        <div className="px-4 pt-3 pb-1">
          <ProgressBar current={currentQ} total={totalQ} accent={meta.accent} />
        </div>

        {/* Quiz content */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scrollbar-thin">
          {conversationPairs.map((pair, i) => (
            <div key={i} className="space-y-2">
              {pair.user && (
                <div className="flex justify-end">
                  <div className="max-w-[75%] bg-amber-600/25 border border-amber-500/30 rounded-2xl rounded-br-md px-4 py-2.5">
                    <p className="text-[13px] text-amber-100">{pair.user.content}</p>
                  </div>
                </div>
              )}
              {pair.ai && (
                <div className="flex justify-start">
                  <div className={cn(
                    'max-w-[90%] rounded-2xl rounded-bl-md px-4 py-3 border',
                    'bg-slate-800 border-slate-700',
                  )}>
                    {pair.ai.isStreaming && !pair.ai.content ? (
                      <StreamingDots />
                    ) : (
                      <>
                        <p className="text-[13px] text-slate-200 leading-relaxed whitespace-pre-wrap">{pair.ai.content}</p>
                        {pair.ai.isStreaming && pair.ai.content && (
                          <span className="inline-block w-0.5 h-3.5 bg-amber-400/60 ml-0.5 cursor-blink rounded-full" />
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Quick answer buttons */}
        {parsed.options.length > 0 && !parsed.isCorrect && !parsed.isWrong && (
          <div className="grid grid-cols-2 gap-2 px-4 pb-2">
            {parsed.options.map((opt, i) => {
              const letter = opt.charAt(0);
              return (
                <button key={i} onClick={() => sendQuick(letter)} disabled={isDiscussing}
                  className="text-left px-4 py-2.5 rounded-xl bg-slate-800 border border-amber-500/20 text-[12px] text-slate-200 hover:bg-amber-600/20 hover:border-amber-400/40 transition-all disabled:opacity-40">
                  {opt}
                </button>
              );
            })}
          </div>
        )}
      </>
    );
  };

  const renderWordChain = () => {
    const parsed = parseWordChain(latestContent);
    const turn = parsed.turn ?? Math.max(1, conversationPairs.length);

    return (
      <>
        {/* Status bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-slate-800/60 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <GameBadge className="bg-emerald-500/20 text-emerald-300">
              <Link2 className="w-3 h-3" /> 턴: {turn}
            </GameBadge>
            {parsed.wordsUsed && (
              <GameBadge className="bg-slate-700 text-slate-300">
                사용 단어: {parsed.wordsUsed}개
              </GameBadge>
            )}
            {parsed.isWin && <GameBadge className="bg-green-500/20 text-green-300">승리!</GameBadge>}
            {parsed.isLose && <GameBadge className="bg-red-500/20 text-red-300">패배</GameBadge>}
          </div>
          <span className="text-[10px] text-slate-500">주제: {optionLabel}</span>
        </div>

        {/* Next char indicator */}
        {parsed.nextChar && (
          <div className="flex items-center justify-center py-3 bg-slate-800/40">
            <span className="text-[11px] text-slate-400 mr-2">다음 글자:</span>
            <span className="text-2xl font-black text-emerald-400 bg-emerald-500/10 px-4 py-1 rounded-xl border border-emerald-500/30">
              "{parsed.nextChar}"
            </span>
          </div>
        )}

        {/* Word chain flow */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2 scrollbar-thin">
          {conversationPairs.map((pair, i) => (
            <div key={i} className="space-y-2">
              {pair.ai && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-emerald-400 font-bold w-6 shrink-0">AI</span>
                  <div className="bg-slate-800 border border-emerald-500/20 rounded-xl px-4 py-2">
                    {pair.ai.isStreaming && !pair.ai.content ? (
                      <StreamingDots />
                    ) : (
                      <>
                        <p className="text-[13px] text-slate-200 whitespace-pre-wrap">{pair.ai.content}</p>
                        {pair.ai.isStreaming && pair.ai.content && (
                          <span className="inline-block w-0.5 h-3.5 bg-emerald-400/60 ml-0.5 cursor-blink rounded-full" />
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
              {pair.user && (
                <div className="flex items-center gap-2 justify-end">
                  <div className="bg-emerald-600/25 border border-emerald-500/30 rounded-xl px-4 py-2">
                    <p className="text-[13px] text-emerald-100">{pair.user.content}</p>
                  </div>
                  <span className="text-[11px] text-emerald-300 font-bold w-6 shrink-0 text-right">나</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </>
    );
  };

  const renderPersonalityTest = () => {
    const parsed = parsePersonalityTest(latestContent);
    const currentQ = parsed.currentQuestion ?? 1;
    const totalQ = parsed.totalQuestions;

    return (
      <>
        {/* Status bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-slate-800/60 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            {!parsed.isResult ? (
              <GameBadge className="bg-pink-500/20 text-pink-300">
                Q{currentQ}/{totalQ}
              </GameBadge>
            ) : (
              <GameBadge className="bg-pink-500/20 text-pink-300">
                <Sparkles className="w-3 h-3" /> 결과 분석
              </GameBadge>
            )}
            {parsed.mbtiType && (
              <span className="text-sm font-black text-pink-300 tracking-widest">{parsed.mbtiType}</span>
            )}
          </div>
          <span className="text-[10px] text-slate-500">유형: {optionLabel}</span>
        </div>

        {/* Progress */}
        {!parsed.isResult && (
          <div className="px-4 pt-3 pb-1">
            <ProgressBar current={currentQ} total={totalQ} accent={meta.accent} />
          </div>
        )}

        {/* Content */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scrollbar-thin">
          {conversationPairs.map((pair, i) => (
            <div key={i} className="space-y-2">
              {pair.user && (
                <div className="flex justify-end">
                  <div className="max-w-[75%] bg-pink-600/25 border border-pink-500/30 rounded-2xl rounded-br-md px-4 py-2.5">
                    <p className="text-[13px] text-pink-100">{pair.user.content}</p>
                  </div>
                </div>
              )}
              {pair.ai && (
                <div className="flex justify-start">
                  <div className={cn(
                    'max-w-[90%] rounded-2xl rounded-bl-md px-4 py-3 border',
                    parsed.isResult && i === conversationPairs.length - 1
                      ? 'bg-gradient-to-br from-pink-900/40 to-purple-900/40 border-pink-500/30'
                      : 'bg-slate-800 border-slate-700',
                  )}>
                    {pair.ai.isStreaming && !pair.ai.content ? (
                      <StreamingDots />
                    ) : (
                      <>
                        <p className="text-[13px] text-slate-200 leading-relaxed whitespace-pre-wrap">{pair.ai.content}</p>
                        {pair.ai.isStreaming && pair.ai.content && (
                          <span className="inline-block w-0.5 h-3.5 bg-pink-400/60 ml-0.5 cursor-blink rounded-full" />
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Quick option buttons */}
        {parsed.options.length > 0 && !parsed.isResult && (
          <div className="space-y-1.5 px-4 pb-2">
            {parsed.options.map((opt, i) => {
              const letter = opt.charAt(0);
              return (
                <button key={i} onClick={() => sendQuick(letter)} disabled={isDiscussing}
                  className="w-full text-left px-4 py-2.5 rounded-xl bg-slate-800 border border-pink-500/20 text-[12px] text-slate-200 hover:bg-pink-600/15 hover:border-pink-400/40 transition-all disabled:opacity-40">
                  {opt}
                </button>
              );
            })}
          </div>
        )}
      </>
    );
  };

  const renderDebateArena = () => {
    const parsed = parseDebateArena(latestContent);
    const round = parsed.round ?? 1;
    const totalRounds = parsed.totalRounds;

    return (
      <>
        {/* Status bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-slate-800/60 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <GameBadge className="bg-orange-500/20 text-orange-300">
              <Swords className="w-3 h-3" /> ROUND {round}/{totalRounds}
            </GameBadge>
            {parsed.phase && (
              <GameBadge className="bg-slate-700 text-slate-300">{parsed.phase}</GameBadge>
            )}
            {parsed.isJudgment && (
              <GameBadge className="bg-amber-500/20 text-amber-300">
                <Trophy className="w-3 h-3" /> 판정
              </GameBadge>
            )}
          </div>
          <span className="text-[10px] text-slate-500">주제: {optionLabel}</span>
        </div>

        {/* Round progress */}
        <div className="px-4 pt-3 pb-1">
          <ProgressBar current={round} total={totalRounds} accent={meta.accent} />
        </div>

        {/* Debate flow */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scrollbar-thin">
          {conversationPairs.map((pair, i) => (
            <div key={i} className="space-y-2">
              {pair.ai && (
                <div className="flex items-start gap-2">
                  <div className="shrink-0 w-6 h-6 rounded-full bg-orange-500/20 flex items-center justify-center mt-0.5">
                    <Bot className="w-3.5 h-3.5 text-orange-400" />
                  </div>
                  <div className={cn(
                    'flex-1 rounded-2xl px-4 py-3 border',
                    parsed.isJudgment && i === conversationPairs.length - 1
                      ? 'bg-gradient-to-br from-amber-900/30 to-orange-900/30 border-amber-500/30'
                      : 'bg-slate-800 border-orange-500/20',
                  )}>
                    {pair.ai.isStreaming && !pair.ai.content ? (
                      <StreamingDots />
                    ) : (
                      <>
                        <p className="text-[13px] text-slate-200 leading-relaxed whitespace-pre-wrap">{pair.ai.content}</p>
                        {pair.ai.isStreaming && pair.ai.content && (
                          <span className="inline-block w-0.5 h-3.5 bg-orange-400/60 ml-0.5 cursor-blink rounded-full" />
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
              {pair.user && (
                <div className="flex items-start gap-2 justify-end">
                  <div className="max-w-[85%] bg-orange-600/25 border border-orange-500/30 rounded-2xl rounded-br-md px-4 py-2.5">
                    <p className="text-[13px] text-orange-100 leading-relaxed">{pair.user.content}</p>
                  </div>
                  <div className="shrink-0 w-6 h-6 rounded-full bg-orange-600/30 flex items-center justify-center mt-0.5">
                    <User className="w-3.5 h-3.5 text-orange-300" />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </>
    );
  };

  const renderEmojiMovie = () => {
    const parsed = parseEmojiMovie(latestContent);
    const score = parsed.score ?? 0;
    const total = parsed.total;

    return (
      <>
        {/* Status bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-slate-800/60 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <GameBadge className="bg-cyan-500/20 text-cyan-300">
              <Trophy className="w-3 h-3" /> {score}/{total} 정답
            </GameBadge>
          </div>
          <span className="text-[10px] text-slate-500">난이도: {optionLabel}</span>
        </div>

        {/* Content */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3 scrollbar-thin">
          {conversationPairs.map((pair, i) => (
            <div key={i} className="space-y-2">
              {pair.user && (
                <div className="flex justify-end">
                  <div className="max-w-[75%] bg-cyan-600/25 border border-cyan-500/30 rounded-2xl rounded-br-md px-4 py-2.5">
                    <p className="text-[13px] text-cyan-100">{pair.user.content}</p>
                  </div>
                </div>
              )}
              {pair.ai && (
                <div className="flex justify-start">
                  <div className="max-w-[90%] bg-slate-800 border border-slate-700 rounded-2xl rounded-bl-md px-4 py-3">
                    {pair.ai.isStreaming && !pair.ai.content ? (
                      <StreamingDots />
                    ) : (
                      <>
                        {/* Extract and display emojis prominently */}
                        {(() => {
                          const ep = parseEmojiMovie(pair.ai.content);
                          if (ep.emojis) {
                            return (
                              <div className="text-center py-3 mb-2">
                                <span className="text-4xl tracking-[0.3em]">{ep.emojis}</span>
                              </div>
                            );
                          }
                          return null;
                        })()}
                        <p className="text-[13px] text-slate-200 leading-relaxed whitespace-pre-wrap">{pair.ai.content}</p>
                        {pair.ai.isStreaming && pair.ai.content && (
                          <span className="inline-block w-0.5 h-3.5 bg-cyan-400/60 ml-0.5 cursor-blink rounded-full" />
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-2 px-4 pb-2">
          <button onClick={() => sendQuick('힌트를 주세요')} disabled={isDiscussing}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 border border-cyan-500/30 text-[11px] text-yellow-300 hover:bg-slate-700 transition-all disabled:opacity-40">
            <Lightbulb className="w-3 h-3" /> 힌트
          </button>
          <button onClick={() => sendQuick('패스! 다음 문제로 넘어가 주세요.')} disabled={isDiscussing}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 border border-cyan-500/30 text-[11px] text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-all disabled:opacity-40">
            <SkipForward className="w-3 h-3" /> 패스
          </button>
        </div>
      </>
    );
  };

  // ── Select the right renderer ──

  const renderGameContent = () => {
    switch (gameId as GameId) {
      case 'twenty-questions':  return renderTwentyQuestions();
      case 'liar-game':         return renderLiarGame();
      case 'story-relay':       return renderStoryRelay();
      case 'trivia-quiz':       return renderTriviaQuiz();
      case 'word-chain':        return renderWordChain();
      case 'personality-test':  return renderPersonalityTest();
      case 'debate-arena':      return renderDebateArena();
      case 'emoji-movie':       return renderEmojiMovie();
      default:                  return renderTwentyQuestions();
    }
  };

  // Placeholder text per game
  const getPlaceholder = (): string => {
    switch (gameId as GameId) {
      case 'twenty-questions':  return '예/아니오로 답할 수 있는 질문을 하세요...';
      case 'liar-game':         return '라이어를 지목하거나 질문하세요...';
      case 'story-relay':       return '다음 문장을 이어서 써보세요...';
      case 'trivia-quiz':       return '정답을 입력하세요 (A, B, C, D)...';
      case 'word-chain':        return '단어를 입력하세요...';
      case 'personality-test':  return '선택지를 골라주세요 (A, B, C)...';
      case 'debate-arena':      return '당신의 주장을 입력하세요...';
      case 'emoji-movie':       return '영화 제목을 입력하세요...';
      default:                  return '메시지를 입력하세요...';
    }
  };

  // ══════════════════════════════════════════
  // ── Main Render ──
  // ══════════════════════════════════════════

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white">

      {/* ── Top Header ── */}
      <div className={cn(
        'flex items-center justify-between px-4 py-3 border-b backdrop-blur-sm',
        meta.accentBorder,
        'bg-slate-900/90',
      )}>
        <div className="flex items-center gap-3">
          <span className="text-xl">{meta.icon}</span>
          <div>
            <h2 className={cn('text-sm font-bold', meta.accent)}>{meta.name}</h2>
            <p className="text-[10px] text-slate-500">{optionLabel}</p>
          </div>
        </div>

        <button onClick={onExit}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-[11px] text-slate-400 hover:text-red-400 hover:border-red-500/40 hover:bg-red-950/30 transition-all">
          <LogOut className="w-3.5 h-3.5" />
          나가기
        </button>
      </div>

      {/* ── Game Content Area ── */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {renderGameContent()}
      </div>

      {/* ── Input Area ── */}
      <div className={cn('border-t px-4 py-3', meta.accentBorder, 'bg-slate-900/95')}>
        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          <div className={cn(
            'flex-1 rounded-xl border-2 transition-all duration-200 bg-slate-800',
            isDiscussing ? 'border-slate-700 opacity-60' : 'border-slate-600 focus-within:border-opacity-100',
            `focus-within:${meta.accentBorder}`,
          )}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={isDiscussing ? 'AI가 응답 중...' : getPlaceholder()}
              disabled={isDiscussing}
              rows={1}
              className="w-full bg-transparent resize-none text-[13px] text-white placeholder:text-slate-500 focus:outline-none leading-relaxed px-4 py-2.5 min-h-[40px] max-h-[100px] block"
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
            />
          </div>

          <button
            type="submit"
            disabled={!input.trim() || isDiscussing}
            className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-150',
              input.trim() && !isDiscussing
                ? cn('text-white shadow-lg', meta.glow, meta.accentBg, 'hover:opacity-80')
                : 'bg-slate-800 text-slate-600',
            )}
          >
            <ArrowUp className="w-4.5 h-4.5" strokeWidth={2.5} />
          </button>
        </form>

        <div className="flex items-center justify-between mt-1.5">
          <span className="text-[9px] text-slate-600">Enter 전송 / Shift+Enter 줄바꿈</span>
          {isDiscussing && (
            <span className={cn('text-[9px] animate-pulse', meta.accent)}>AI 응답 중...</span>
          )}
        </div>
      </div>
    </div>
  );
}
