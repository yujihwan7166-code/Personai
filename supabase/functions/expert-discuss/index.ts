import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { question, expertSystemPrompt, previousResponses, round } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const messages: Array<{ role: string; content: string }> = [
      { role: "system", content: expertSystemPrompt },
    ];

    const context = previousResponses?.length
      ? previousResponses.map((r: { name: string; content: string }) => `[${r.name}의 의견]: ${r.content}`).join('\n\n')
      : '';

    let userPrompt = '';

    if (round === 'initial') {
      if (context) {
        userPrompt = `사용자의 질문: ${question}\n\n다른 전문가들이 이미 의견을 냈습니다:\n\n${context}\n\n이들의 의견을 참고하되, 당신만의 고유한 관점에서 분석해주세요. 동의하는 부분과 다른 시각이 있다면 자연스럽게 언급해주세요. 답변은 2-3문단으로 해주세요.`;
      } else {
        userPrompt = `사용자의 질문: ${question}\n\n당신의 전문적 관점에서 이 질문에 대해 분석하고 의견을 제시해주세요. 답변은 2-3문단으로 해주세요.`;
      }
    } else if (round === 'rebuttal') {
      userPrompt = `사용자의 질문: ${question}\n\n지금까지의 토론 내용입니다:\n\n${context}\n\n이제 2라운드입니다. 다른 참여자들의 의견에 대해 직접적으로 반응해주세요:\n- 동의하는 의견이 있다면 구체적으로 누구의 어떤 주장에 동의하는지 밝혀주세요\n- 반대하는 의견이 있다면 논리적으로 반박해주세요\n- 새로운 논점이나 놓친 관점이 있다면 제시해주세요\n\n자연스러운 토론처럼 다른 참여자의 이름을 직접 언급하며 대화하듯 답변해주세요. 2-3문단으로 해주세요.`;
    } else if (round === 'final') {
      userPrompt = `사용자의 질문: ${question}\n\n지금까지의 전체 토론 내용입니다:\n\n${context}\n\n이제 마지막 3라운드입니다. 토론을 통해:\n- 당신의 입장이 변했다면 왜 변했는지 설명해주세요\n- 입장이 유지된다면 토론을 통해 더 강화된 근거를 제시해주세요\n- 핵심적인 한 가지 메시지로 당신의 최종 의견을 정리해주세요\n\n간결하게 1-2문단으로 마무리해주세요.`;
    } else {
      // fallback (summary etc)
      userPrompt = `사용자의 질문: ${question}\n\n${context ? `토론 내용:\n\n${context}\n\n` : ''}당신의 전문적 관점에서 답변해주세요.`;
    }

    messages.push({ role: "user", content: userPrompt });

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages,
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "크레딧이 부족합니다." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI 게이트웨이 오류" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("expert-discuss error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
