import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { question, experts, discussionContext } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const expertInfo = experts?.length
      ? `\n\n참여 전문가 관점:\n${experts.map((e: any) => `- ${e.nameKo} (${e.description})`).join('\n')}`
      : '';

    const discussionInfo = discussionContext
      ? `\n\n이전 토론 내용을 참고하여 문서를 작성해주세요:\n${discussionContext}`
      : '';

    const systemPrompt = `You are a professional document/presentation generator. Create structured, visually appealing slide content in Korean.

Given a topic, generate a presentation document with 6-10 slides. Each slide must have:
- title: slide title
- content: array of bullet points or paragraphs
- type: one of "title", "content", "comparison", "summary", "quote"
- icon: an emoji that represents the slide
- notes: speaker notes (optional)

Also include:
- Overall title and subtitle
- Expert insights if experts are provided (each expert gives a 1-sentence perspective)

Use the generate_document function to return the structured data.${expertInfo}${discussionInfo}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `다음 주제로 프레젠테이션 문서를 만들어주세요: ${question}` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_document",
              description: "Generate a structured presentation document",
              parameters: {
                type: "object",
                properties: {
                  title: { type: "string", description: "Document main title" },
                  subtitle: { type: "string", description: "Document subtitle" },
                  slides: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        content: { type: "array", items: { type: "string" } },
                        type: { type: "string", enum: ["title", "content", "comparison", "summary", "quote"] },
                        icon: { type: "string" },
                        notes: { type: "string" },
                      },
                      required: ["title", "content", "type"],
                      additionalProperties: false,
                    },
                  },
                  expertInsights: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        expertName: { type: "string" },
                        insight: { type: "string" },
                      },
                      required: ["expertName", "insight"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["title", "subtitle", "slides"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_document" } },
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
      return new Response(JSON.stringify({ error: "문서 생성 실패" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const document = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify(document), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-document error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
