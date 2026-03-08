import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { question, experts } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const expertList = experts.map((e: { id: string; nameKo: string; description: string }) =>
      `- id: "${e.id}", 이름: "${e.nameKo}", 전문분야: "${e.description}"`
    ).join('\n');

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `당신은 찬반 토론의 사회자입니다. 주어진 주제를 분석하고, 각 전문가의 전문분야와 관점을 고려하여 찬성/반대 팀을 배정해야 합니다.

각 전문가가 자신의 전문분야 특성상 어떤 입장을 취할 가능성이 높은지 고려하세요. 양쪽이 최대한 균형있게 나뉘도록 하되, 반드시 각 팀에 최소 1명은 있어야 합니다.`
          },
          {
            role: "user",
            content: `주제: ${question}\n\n참여 전문가:\n${expertList}\n\n이 주제에 대해 간단히 분석하고, 각 전문가를 찬성/반대로 배정해주세요.`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "assign_stances",
              description: "주제를 분석하고 각 전문가에게 찬성/반대 입장을 배정합니다.",
              parameters: {
                type: "object",
                properties: {
                  analysis: {
                    type: "string",
                    description: "주제에 대한 간단한 분석 (2-3문장)"
                  },
                  assignments: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        expertId: { type: "string", description: "전문가 ID" },
                        stance: { type: "string", enum: ["pro", "con"], description: "찬성(pro) 또는 반대(con)" },
                        reason: { type: "string", description: "이 전문가가 해당 입장을 취하는 이유 (1문장)" }
                      },
                      required: ["expertId", "stance", "reason"],
                      additionalProperties: false
                    }
                  }
                },
                required: ["analysis", "assignments"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "assign_stances" } },
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

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "입장 배정 실패" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("procon-stance error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
