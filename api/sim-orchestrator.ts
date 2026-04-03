import type { VercelRequest, VercelResponse } from '@vercel/node';
import { buildGeminiUrl, extractGeminiText, extractJsonObject } from './_lib/gemini.js';

interface SimulationRole {
  name: string;
  focus: string;
}

interface SimulationScenarioRequest {
  name: string;
  userRole: string;
  roles: SimulationRole[];
  gaugeLabel: string;
  verdictOptions: string[];
}

interface ConversationEntry {
  speaker: string;
  content: string;
}

interface CurrentPhase {
  index: number;
  totalPhases: number;
  name: string;
  role: SimulationRole;
}

interface SimOrchestratorRequestBody {
  scenario?: SimulationScenarioRequest;
  intensity?: number;
  conversationHistory?: ConversationEntry[];
  turnCount?: number;
  mode?: string;
  currentPhase?: CurrentPhase;
}

interface OrchestratorResult {
  next_speaker: string | null;
  speak_direction: string;
  follow_up_speaker: string | null;
  follow_up_direction: string | null;
  user_choices: string[];
  phase: 'ongoing' | 'wrapping_up' | 'final';
  next_phase?: boolean;
  phase_summary?: string;
  reason?: string;
}

const DEFAULT_MODEL = 'gemini-2.5-flash-lite';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  const { scenario, intensity, conversationHistory, turnCount, mode, currentPhase } =
    (req.body || {}) as SimOrchestratorRequestBody;

  if (!scenario || !Array.isArray(conversationHistory)) {
    return res.status(400).json({ error: 'scenario and conversationHistory required' });
  }

  const fallback =
    mode === 'consultation' && currentPhase
      ? buildConsultationFallback(currentPhase, conversationHistory)
      : buildRoleplayFallback(scenario, conversationHistory, turnCount ?? conversationHistory.length);

  const prompt =
    mode === 'consultation' && currentPhase
      ? buildConsultationPrompt(scenario, currentPhase, conversationHistory, intensity ?? 5)
      : buildRoleplayPrompt(scenario, conversationHistory, turnCount ?? conversationHistory.length, intensity ?? 5);

  try {
    const geminiRes = await fetch(buildGeminiUrl(DEFAULT_MODEL, apiKey), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.35,
          maxOutputTokens: 1024,
        },
      }),
    });

    if (!geminiRes.ok) {
      return res.status(200).json({ ...fallback, reason: 'upstream error' });
    }

    const payload = await geminiRes.json();
    const rawText = extractGeminiText(payload);
    const parsed = extractJsonObject<Partial<OrchestratorResult>>(rawText);

    if (!parsed) {
      return res.status(200).json({ ...fallback, reason: 'parse error' });
    }

    return res.status(200).json(normalizeResult(parsed, fallback));
  } catch {
    return res.status(200).json({ ...fallback, reason: 'exception' });
  }
}

function normalizeResult(
  parsed: Partial<OrchestratorResult>,
  fallback: OrchestratorResult,
): OrchestratorResult {
  const phase =
    parsed.phase === 'final' || parsed.phase === 'wrapping_up' || parsed.phase === 'ongoing'
      ? parsed.phase
      : fallback.phase;

  return {
    next_speaker:
      typeof parsed.next_speaker === 'string' || parsed.next_speaker === null
        ? parsed.next_speaker
        : fallback.next_speaker,
    speak_direction:
      typeof parsed.speak_direction === 'string' && parsed.speak_direction.trim()
        ? parsed.speak_direction.trim()
        : fallback.speak_direction,
    follow_up_speaker:
      typeof parsed.follow_up_speaker === 'string' || parsed.follow_up_speaker === null
        ? parsed.follow_up_speaker
        : fallback.follow_up_speaker,
    follow_up_direction:
      typeof parsed.follow_up_direction === 'string' || parsed.follow_up_direction === null
        ? parsed.follow_up_direction
        : fallback.follow_up_direction,
    user_choices: Array.isArray(parsed.user_choices)
      ? parsed.user_choices.filter((choice): choice is string => typeof choice === 'string')
      : fallback.user_choices,
    phase,
    next_phase: typeof parsed.next_phase === 'boolean' ? parsed.next_phase : fallback.next_phase,
    phase_summary:
      typeof parsed.phase_summary === 'string' && parsed.phase_summary.trim()
        ? parsed.phase_summary.trim()
        : fallback.phase_summary,
    reason:
      typeof parsed.reason === 'string' && parsed.reason.trim() ? parsed.reason.trim() : fallback.reason,
  };
}

function buildConsultationFallback(
  currentPhase: CurrentPhase,
  conversationHistory: ConversationEntry[],
): OrchestratorResult {
  const roleTurns = conversationHistory.filter((entry) => entry.speaker === currentPhase.role.name).length;
  const userTurns = Math.max(0, conversationHistory.length - roleTurns);
  const enoughInfo = roleTurns >= 1 && userTurns >= 2;

  return {
    next_speaker: currentPhase.role.name,
    speak_direction: enoughInfo
      ? '지금까지 들은 내용을 짧게 정리하고, 다음 단계로 넘길지 판단해 주세요.'
      : `${currentPhase.role.focus} 관점에서 가장 중요한 확인 질문을 한두 가지 해주세요.`,
    follow_up_speaker: null,
    follow_up_direction: null,
    user_choices: [],
    phase: 'ongoing',
    next_phase: enoughInfo,
    phase_summary: enoughInfo
      ? `${currentPhase.role.name} 단계에서 필요한 핵심 정보를 대체로 확인했습니다.`
      : '',
    reason: enoughInfo ? 'fallback phase advance' : 'fallback continue current phase',
  };
}

function buildRoleplayFallback(
  scenario: SimulationScenarioRequest,
  conversationHistory: ConversationEntry[],
  turnCount: number,
): OrchestratorResult {
  const roleNames = scenario.roles.map((role) => role.name);
  const lastRoleSpeaker = [...conversationHistory]
    .reverse()
    .find((entry) => roleNames.includes(entry.speaker))?.speaker;
  const lastIndex = lastRoleSpeaker ? roleNames.indexOf(lastRoleSpeaker) : -1;
  const nextIndex = roleNames.length > 0 ? (lastIndex + 1 + roleNames.length) % roleNames.length : 0;
  const phase: OrchestratorResult['phase'] =
    turnCount >= 12 ? 'final' : turnCount >= 8 ? 'wrapping_up' : 'ongoing';

  return {
    next_speaker: phase === 'final' ? null : roleNames[nextIndex] ?? null,
    speak_direction:
      phase === 'wrapping_up'
        ? '지금까지의 흐름을 바탕으로 핵심 평가와 최종 의견에 가까운 발언을 해주세요.'
        : '직전 대화에 자연스럽게 반응하면서, 자신의 관점에서 가장 중요한 질문이나 피드백을 말해주세요.',
    follow_up_speaker: null,
    follow_up_direction: null,
    user_choices: [],
    phase,
    reason: 'fallback round robin',
  };
}

function buildConsultationPrompt(
  scenario: SimulationScenarioRequest,
  currentPhase: CurrentPhase,
  conversationHistory: ConversationEntry[],
  intensity: number,
) {
  return `You are an orchestrator for a Korean consultation simulation.

Return JSON only.

Scenario: ${scenario.name}
User role: ${scenario.userRole}
Current phase: ${currentPhase.index + 1}/${currentPhase.totalPhases} - ${currentPhase.name}
Current expert: ${currentPhase.role.name}
Current expert focus: ${currentPhase.role.focus}
Intensity: ${intensity}/10

Conversation history:
${formatConversation(conversationHistory)}

Decide whether the current expert has enough information to move to the next phase.
If not, keep the same expert speaking and ask for the most useful next question.
If yes, set next_phase to true and write a short phase_summary.

Respond with JSON:
{
  "next_speaker": "${currentPhase.role.name}",
  "speak_direction": "the next question or wrap-up direction in Korean",
  "follow_up_speaker": null,
  "follow_up_direction": null,
  "user_choices": [],
  "phase": "ongoing",
  "next_phase": false,
  "phase_summary": "short Korean summary",
  "reason": "short reason"
}`;
}

function buildRoleplayPrompt(
  scenario: SimulationScenarioRequest,
  conversationHistory: ConversationEntry[],
  turnCount: number,
  intensity: number,
) {
  return `You are an orchestrator for a Korean multi-party roleplay simulation.

Return JSON only.

Scenario: ${scenario.name}
User role: ${scenario.userRole}
Participants: ${scenario.roles.map((role) => `${role.name}(${role.focus})`).join(', ')}
Intensity: ${intensity}/10
Turn count: ${turnCount}

Conversation history:
${formatConversation(conversationHistory)}

Choose the next AI role who should speak.
Avoid repeating the exact same role unless it is clearly necessary.
Use phase="ongoing" for normal progress, "wrapping_up" when the discussion is nearing conclusion,
and "final" only when the discussion should move to final verdicts.

Respond with JSON:
{
  "next_speaker": "one of ${scenario.roles.map((role) => role.name).join(', ')} or null",
  "speak_direction": "the next speaking direction in Korean",
  "follow_up_speaker": null,
  "follow_up_direction": null,
  "user_choices": [],
  "phase": "ongoing",
  "reason": "short reason"
}`;
}

function formatConversation(conversationHistory: ConversationEntry[]) {
  if (conversationHistory.length === 0) {
    return '(no conversation yet)';
  }

  return conversationHistory.map((entry) => `[${entry.speaker}] ${entry.content}`).join('\n');
}
