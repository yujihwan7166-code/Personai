import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { question, expertSystemPrompt, previousResponses } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const messages: Array<{ role: string; content: string }> = [
      { role: "system", content: expertSystemPrompt },
    ];

    // Add context from previous experts' responses
    if (previousResponses && previousResponses.length > 0) {
      const context = previousResponses
        .map((r: { name: string; content: string }) => `[${r.name}의 의견]: ${r.content}`)
        .join('\n\n');
      messages.push({
        role: "user",
        content: `다음은 다른 전문가들의 의견입니다:\n\n${context}\n\n사용자의 질문: ${question}\n\n위 의견들을 참고하여 당신의 전문적 관점에서 토론에 참여하세요. 동의하거나 반박하면서 깊이 있는 논의를 해주세요. 답변은 3-4문단으로 해주세요.`,
      });
    } else {
      messages.push({
        role: "user",
        content: `사용자의 질문: ${question}\n\n당신의 전문적 관점에서 이 질문에 대해 분석하고 의견을 제시해주세요. 답변은 3-4문단으로 해주세요.`,
      });
    }

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
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "크레딧이 부족합니다." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI 게이트웨이 오류" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("expert-discuss error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
