import { supabase } from "@/integrations/supabase/client";

export interface TriagePayload {
  chief_complaint: string;
  symptoms: string[];
  body_regions?: string[];
  duration_days?: number;
  severity?: number;
  age?: number;
  sex?: string;
  medical_history?: string;
  current_medications?: string;
  allergies?: string;
  notes?: string;
  vitals?: Record<string, number | undefined>;
}

export interface SuggestedMedicine {
  name: string;
  type: "OTC" | "Prescription" | string;
  dosage: string;
  purpose: string;
  requires_doctor_approval: boolean;
}

export interface PossibleDiagnosis {
  name: string;
  likelihood: string;
  explanation: string;
}

interface TriageResponse {
  risk_score: number;
  risk_level: "low" | "moderate" | "high" | "critical";
  red_flags?: string[];
  differentials?: Array<{
    condition: string;
    likelihood: string;
    rationale: string;
  }>;
  possible_diagnoses?: PossibleDiagnosis[];
  suggested_medicines?: SuggestedMedicine[];
  home_remedies?: string[];
  lifestyle_advice?: string[];
  recommended_actions?: string[];
  ai_summary?: string;
  ai_model?: string | null;
  rule_breakdown?: Record<string, number>;
  error?: string;
}

export async function generateAssessmentForIntake({
  intakeId,
  patientId,
  payload,
}: {
  intakeId: string;
  patientId: string;
  payload: TriagePayload;
}) {
  const { data, error } = await supabase.functions.invoke("triage", {
    body: payload,
  });

  if (error) {
    return { error: error.message || "AI triage failed" } as const;
  }

  const triage = data as TriageResponse | null;

  if (!triage) {
    return { error: "AI triage returned an empty response" } as const;
  }

  if (triage.error) {
    return { error: triage.error } as const;
  }

  const { data: assessment, error: insertError } = await (supabase
    .from("assessments") as any)
    .insert({
      intake_id: intakeId,
      patient_id: patientId,
      risk_score: triage.risk_score,
      risk_level: triage.risk_level,
      red_flags: triage.red_flags ?? [],
      differentials: triage.differentials ?? [],
      possible_diagnoses: triage.possible_diagnoses ?? [],
      suggested_medicines: triage.suggested_medicines ?? [],
      home_remedies: triage.home_remedies ?? [],
      lifestyle_advice: triage.lifestyle_advice ?? [],
      recommended_actions: triage.recommended_actions ?? [],
      ai_summary: triage.ai_summary ?? "",
      ai_model: triage.ai_model ?? null,
      rule_breakdown: triage.rule_breakdown ?? {},
    })
    .select()
    .single();

  if (insertError) {
    return { error: insertError.message || "Failed to save AI assessment" } as const;
  }

  return { assessment } as const;
}
