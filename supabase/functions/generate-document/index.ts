import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

interface GenerateDocumentExpert {
  nameKo: string;
  description: string;
}

interface GenerateDocumentRequest {
  question: string;
  experts?: GenerateDocumentExpert[];
  discussionContext?: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { question, experts, discussionContext } = await req.json() as GenerateDocumentRequest;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const expertInfo = experts?.length
      ? `\n\n李몄뿬 ?꾨Ц媛 愿??\n${experts.map((expert) => `- ${expert.nameKo} (${expert.description})`).join('\n')}`
      : '';

    const discussionInfo = discussionContext
      ? `\n\n?댁쟾 ?좊줎 ?댁슜??李멸퀬?섏뿬 臾몄꽌瑜??묒꽦?댁＜?몄슂:\n${discussionContext}`
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
          { role: "user", content: `?ㅼ쓬 二쇱젣濡??꾨젅?좏뀒?댁뀡 臾몄꽌瑜?留뚮뱾?댁＜?몄슂: ${question}` },
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
        return new Response(JSON.stringify({ error: "?붿껌???덈Т 留롮뒿?덈떎. ?좎떆 ???ㅼ떆 ?쒕룄?댁＜?몄슂." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "?щ젅?㏃씠 遺議깊빀?덈떎." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI 寃뚯씠?몄썾???ㅻ쪟" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "臾몄꽌 ?앹꽦 ?ㅽ뙣" }), {
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
