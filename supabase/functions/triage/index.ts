import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const RED_FLAG_SYMPTOMS: Record<string, number> = {
  "chest pain": 35,
  "shortness of breath": 30,
  "difficulty breathing": 30,
  "severe headache": 25,
  "loss of consciousness": 40,
  "fainting": 25,
  "seizure": 35,
  "stroke symptoms": 40,
  "slurred speech": 30,
  "weakness on one side": 35,
  "severe abdominal pain": 25,
  "vomiting blood": 35,
  "blood in stool": 25,
  "high fever": 15,
  "stiff neck": 25,
  "rash with fever": 20,
  "suicidal thoughts": 40,
  "severe bleeding": 40,
};

function computeRule(input: any) {
  const symptoms: string[] = (input.symptoms || []).map((s: string) =>
    s.toLowerCase().trim(),
  );
  const severity: number = Math.min(10, Math.max(1, input.severity || 5));
  const age: number = input.age || 30;
  const duration: number = input.duration_days || 1;
  const vitals = input.vitals || {};

  let score = 0;
  const breakdown: Record<string, number> = {};
  const redFlags: string[] = [];

  // severity
  const sevPts = severity * 4;
  score += sevPts;
  breakdown["severity"] = sevPts;

  // red flags
  for (const sym of symptoms) {
    for (const [flag, pts] of Object.entries(RED_FLAG_SYMPTOMS)) {
      if (sym.includes(flag)) {
        score += pts;
        redFlags.push(flag);
        breakdown[`red_flag:${flag}`] = pts;
      }
    }
  }

  // age extremes
  if (age >= 65) {
    score += 10;
    breakdown["age_65+"] = 10;
  } else if (age <= 5) {
    score += 12;
    breakdown["age_<=5"] = 12;
  }

  // vitals
  const hr = Number(vitals.heart_rate);
  const sbp = Number(vitals.systolic_bp);
  const temp = Number(vitals.temperature_c);
  const spo2 = Number(vitals.spo2);
  const rr = Number(vitals.respiratory_rate);

  if (hr && (hr > 120 || hr < 40)) {
    score += 15;
    breakdown["abnormal_hr"] = 15;
  }
  if (sbp && (sbp < 90 || sbp > 180)) {
    score += 15;
    breakdown["abnormal_bp"] = 15;
  }
  if (temp && (temp >= 39.5 || temp <= 35)) {
    score += 12;
    breakdown["abnormal_temp"] = 12;
  }
  if (spo2 && spo2 < 92) {
    score += 20;
    breakdown["low_spo2"] = 20;
    redFlags.push("low oxygen saturation");
  }
  if (rr && (rr > 24 || rr < 10)) {
    score += 10;
    breakdown["abnormal_rr"] = 10;
  }

  // duration
  if (duration >= 14) {
    score += 5;
    breakdown["chronic"] = 5;
  }

  score = Math.min(100, Math.round(score));

  let level: "low" | "moderate" | "high" | "critical";
  if (score >= 75) level = "critical";
  else if (score >= 50) level = "high";
  else if (score >= 25) level = "moderate";
  else level = "low";

  return { score, level, redFlags: [...new Set(redFlags)], breakdown };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const input = await req.json();

    if (!input.chief_complaint || !Array.isArray(input.symptoms)) {
      return new Response(
        JSON.stringify({ error: "chief_complaint and symptoms[] required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const rule = computeRule(input);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    let aiData: {
      ai_summary: string;
      differentials: { condition: string; likelihood: string; rationale: string }[];
      recommended_actions: string[];
    } = {
      ai_summary: "AI explanation unavailable.",
      differentials: [],
      recommended_actions: [],
    };

    if (LOVABLE_API_KEY) {
      const systemPrompt = `You are a clinical decision support assistant. You DO NOT diagnose. You provide differential considerations and triage suggestions to assist a licensed clinician. Always include the disclaimer that this is not a medical diagnosis. Be concise and structured.`;

      const userPrompt = `Patient case:
- Chief complaint: ${input.chief_complaint}
- Symptoms: ${input.symptoms.join(", ")}
- Severity (1-10): ${input.severity}
- Duration (days): ${input.duration_days}
- Age: ${input.age}, Sex: ${input.sex}
- Vitals: ${JSON.stringify(input.vitals || {})}
- History: ${input.medical_history || "none"}
- Medications: ${input.current_medications || "none"}
- Allergies: ${input.allergies || "none"}

Rule-based triage produced risk score ${rule.score}/100 (${rule.level}). Red flags: ${rule.redFlags.join(", ") || "none"}.

Provide differential considerations and recommended next actions.`;

      try {
        const aiRes = await fetch(
          "https://ai.gateway.lovable.dev/v1/chat/completions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
              ],
              tools: [
                {
                  type: "function",
                  function: {
                    name: "submit_triage",
                    description: "Return structured triage analysis",
                    parameters: {
                      type: "object",
                      properties: {
                        ai_summary: { type: "string" },
                        differentials: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              condition: { type: "string" },
                              likelihood: {
                                type: "string",
                                enum: ["low", "moderate", "high"],
                              },
                              rationale: { type: "string" },
                            },
                            required: ["condition", "likelihood", "rationale"],
                            additionalProperties: false,
                          },
                        },
                        recommended_actions: {
                          type: "array",
                          items: { type: "string" },
                        },
                      },
                      required: [
                        "ai_summary",
                        "differentials",
                        "recommended_actions",
                      ],
                      additionalProperties: false,
                    },
                  },
                },
              ],
              tool_choice: {
                type: "function",
                function: { name: "submit_triage" },
              },
            }),
          },
        );

        if (aiRes.status === 429) {
          return new Response(
            JSON.stringify({ error: "AI rate limit reached. Please try again shortly." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
        if (aiRes.status === 402) {
          return new Response(
            JSON.stringify({ error: "AI credits exhausted. Please add credits in workspace settings." }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }

        if (aiRes.ok) {
          const json = await aiRes.json();
          const call =
            json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
          if (call) aiData = JSON.parse(call);
        } else {
          console.error("AI gateway error", aiRes.status, await aiRes.text());
        }
      } catch (e) {
        console.error("AI call failed", e);
      }
    }

    return new Response(
      JSON.stringify({
        risk_score: rule.score,
        risk_level: rule.level,
        red_flags: rule.redFlags,
        rule_breakdown: rule.breakdown,
        ai_model: "google/gemini-2.5-flash",
        ...aiData,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("triage error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
