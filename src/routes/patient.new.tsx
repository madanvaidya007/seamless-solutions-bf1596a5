import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { intakeSchema } from "@/lib/schemas";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { generateAssessmentForIntake } from "@/lib/triage";
import { Loader2, X, Plus } from "lucide-react";

export const Route = createFileRoute("/patient/new")({
  head: () => ({ meta: [{ title: "New Assessment — MediTriage AI" }] }),
  component: () => (
    <RequireAuth allowed={["patient", "doctor", "admin"]}>
      <NewIntake />
    </RequireAuth>
  ),
});

const SUGGESTED = [
  "fever",
  "cough",
  "fatigue",
  "headache",
  "shortness of breath",
  "chest pain",
  "nausea",
  "vomiting",
  "diarrhea",
  "abdominal pain",
  "dizziness",
  "rash",
  "sore throat",
  "back pain",
];

function NewIntake() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    chief_complaint: "",
    symptoms: [] as string[],
    symptomInput: "",
    duration_days: 1,
    severity: 5,
    age: 30,
    sex: "male" as "male" | "female" | "other",
    medical_history: "",
    current_medications: "",
    allergies: "",
    notes: "",
    heart_rate: "" as string,
    systolic_bp: "" as string,
    diastolic_bp: "" as string,
    temperature_c: "" as string,
    respiratory_rate: "" as string,
    spo2: "" as string,
  });

  const addSymptom = (s: string) => {
    const v = s.trim();
    if (!v || form.symptoms.includes(v) || form.symptoms.length >= 30) return;
    setForm((f) => ({ ...f, symptoms: [...f.symptoms, v], symptomInput: "" }));
  };

  const removeSymptom = (s: string) =>
    setForm((f) => ({ ...f, symptoms: f.symptoms.filter((x) => x !== s) }));

  const num = (v: string) => (v === "" ? undefined : Number(v));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    const vitals = {
      heart_rate: num(form.heart_rate),
      systolic_bp: num(form.systolic_bp),
      diastolic_bp: num(form.diastolic_bp),
      temperature_c: num(form.temperature_c),
      respiratory_rate: num(form.respiratory_rate),
      spo2: num(form.spo2),
    };

    const payload = {
      chief_complaint: form.chief_complaint,
      symptoms: form.symptoms,
      duration_days: form.duration_days,
      severity: form.severity,
      age: form.age,
      sex: form.sex,
      medical_history: form.medical_history || undefined,
      current_medications: form.current_medications || undefined,
      allergies: form.allergies || undefined,
      notes: form.notes || undefined,
      vitals,
    };

    const parsed = intakeSchema.safeParse(payload);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }

    setLoading(true);

    const { data: intake, error: intakeError } = await supabase
      .from("patient_intakes")
      .insert({ ...payload, patient_id: user!.id })
      .select()
      .single();

    if (intakeError || !intake) {
      setLoading(false);
      toast.error(intakeError?.message ?? "Failed to save intake");
      return;
    }

    const triageResult = await generateAssessmentForIntake({
      intakeId: intake.id,
      patientId: user!.id,
      payload,
    });

    setLoading(false);

    if (triageResult.error) {
      toast.error(`Case saved. ${triageResult.error}`);
      navigate({ to: "/cases/$id", params: { id: intake.id } });
      return;
    }

    const assessment = triageResult.assessment;

    if (!assessment) {
      toast.error("Case saved, but the assessment could not be attached.");
      navigate({ to: "/cases/$id", params: { id: intake.id } });
      return;
    }

    await supabase.from("audit_logs").insert({
      user_id: user!.id,
      action: "intake_submitted",
      resource_type: "patient_intakes",
      resource_id: intake.id,
      metadata: {
        risk_level: assessment.risk_level,
        risk_score: assessment.risk_score,
      },
    });

    toast.success("Assessment ready");
    navigate({ to: "/cases/$id", params: { id: intake.id } });
  };

  return (
    <div className="mx-auto max-w-3xl p-6 md:p-8">
      <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">New assessment</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Fill in your symptoms — optional fields improve accuracy.
      </p>

      <form onSubmit={submit} className="mt-8 space-y-5">
        <Card className="space-y-4 p-6">
          <div>
            <Label htmlFor="cc">Chief complaint *</Label>
            <Textarea
              id="cc"
              required
              maxLength={500}
              placeholder="What's the main reason for your visit?"
              value={form.chief_complaint}
              onChange={(e) => setForm({ ...form, chief_complaint: e.target.value })}
            />
          </div>

          <div>
            <Label>Symptoms *</Label>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {form.symptoms.map((s) => (
                <Badge key={s} variant="secondary" className="gap-1">
                  {s}
                  <button type="button" onClick={() => removeSymptom(s)}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <Input
                placeholder="Add a symptom and press Enter"
                value={form.symptomInput}
                onChange={(e) => setForm({ ...form, symptomInput: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addSymptom(form.symptomInput);
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => addSymptom(form.symptomInput)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {SUGGESTED.filter((s) => !form.symptoms.includes(s))
                .slice(0, 10)
                .map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => addSymptom(s)}
                    className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground hover:bg-accent"
                  >
                    + {s}
                  </button>
                ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Duration (days)</Label>
              <Input
                type="number"
                min={0}
                max={3650}
                value={form.duration_days}
                onChange={(e) => setForm({ ...form, duration_days: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>Severity ({form.severity}/10)</Label>
              <Slider
                min={1}
                max={10}
                step={1}
                value={[form.severity]}
                onValueChange={(v) => setForm({ ...form, severity: v[0] })}
                className="mt-3"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Age</Label>
              <Input
                type="number"
                min={0}
                max={130}
                value={form.age}
                onChange={(e) => setForm({ ...form, age: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>Sex</Label>
              <select
                className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                value={form.sex}
                onChange={(e) => setForm({ ...form, sex: e.target.value as "male" | "female" | "other" })}
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
        </Card>

        <Card className="space-y-4 p-6">
          <div>
            <h2 className="font-medium">Vitals (optional)</h2>
            <p className="text-xs text-muted-foreground">Improves triage accuracy when available.</p>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {[
              ["heart_rate", "Heart rate (bpm)"],
              ["systolic_bp", "Systolic BP"],
              ["diastolic_bp", "Diastolic BP"],
              ["temperature_c", "Temp (°C)"],
              ["respiratory_rate", "Resp rate"],
              ["spo2", "SpO₂ (%)"],
            ].map(([k, label]) => (
              <div key={k}>
                <Label>{label}</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={(form as Record<string, string | string[] | number>)[k] as string}
                  onChange={(e) => setForm({ ...form, [k]: e.target.value } as typeof form)}
                />
              </div>
            ))}
          </div>
        </Card>

        <Card className="space-y-4 p-6">
          <div>
            <Label>Medical history (optional)</Label>
            <Textarea
              maxLength={2000}
              value={form.medical_history}
              onChange={(e) => setForm({ ...form, medical_history: e.target.value })}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Current medications</Label>
              <Textarea
                maxLength={1000}
                value={form.current_medications}
                onChange={(e) => setForm({ ...form, current_medications: e.target.value })}
              />
            </div>
            <div>
              <Label>Allergies</Label>
              <Textarea
                maxLength={500}
                value={form.allergies}
                onChange={(e) => setForm({ ...form, allergies: e.target.value })}
              />
            </div>
          </div>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={loading || form.symptoms.length === 0}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Run AI triage"}
          </Button>
        </div>
      </form>
    </div>
  );
}
