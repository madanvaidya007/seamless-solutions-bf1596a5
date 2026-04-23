import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { RiskBadge } from "@/components/RiskBadge";
import { BodyDiagram } from "@/components/BodyDiagram";
import { useAuth } from "@/lib/auth";
import { generateAssessmentForIntake } from "@/lib/triage";
import { format } from "date-fns";
import {
  Loader2,
  AlertTriangle,
  FileDown,
  ArrowLeft,
  Pill,
  Leaf,
  HeartPulse,
  ClipboardCheck,
  Stethoscope,
  CalendarPlus,
  Sparkles,
} from "lucide-react";
import type { RiskLevel } from "@/lib/risk";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { buildHospitalReport } from "@/lib/pdf";

export const Route = createFileRoute("/cases/$id")({
  head: () => ({ meta: [{ title: "Case Detail — MediTriage AI" }] }),
  component: () => (
    <RequireAuth>
      <CaseDetail />
    </RequireAuth>
  ),
});

interface CaseData {
  intake: any;
  assessment: any | null;
  notes: any[];
  patient: { full_name: string | null; email: string | null; phone: string | null } | null;
}

function CaseDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const [data, setData] = useState<CaseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [generatingAssessment, setGeneratingAssessment] = useState(false);
  const [approvedSet, setApprovedSet] = useState<Set<number>>(new Set());
  const [note, setNote] = useState({
    diagnosis: "",
    treatment_plan: "",
    follow_up: "",
    notes: "",
    override_risk: "" as "" | RiskLevel,
  });

  const isClinician = role === "doctor" || role === "admin";

  const load = useCallback(async () => {
    const { data: intake } = await supabase
      .from("patient_intakes")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (!intake) {
      setLoading(false);
      return;
    }

    const { data: assessment } = await supabase
      .from("assessments")
      .select("*")
      .eq("intake_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: notes } = await supabase
      .from("doctor_notes")
      .select("*")
      .eq("intake_id", id)
      .order("created_at", { ascending: false });

    const { data: patient } = await supabase
      .from("profiles")
      .select("full_name, email, phone")
      .eq("id", intake.patient_id)
      .maybeSingle();

    setData({ intake, assessment, notes: notes ?? [], patient });
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // Pre-select medicines from latest doctor note approval, if any
  useEffect(() => {
    const latest = data?.notes?.[0];
    const meds = data?.assessment?.suggested_medicines as any[] | undefined;
    if (!latest?.approved_medicines || !meds) return;
    const approvedNames = new Set(
      (latest.approved_medicines as any[]).map((m: any) => `${m.name}|${m.dosage}`),
    );
    const next = new Set<number>();
    meds.forEach((m, i) => {
      if (approvedNames.has(`${m.name}|${m.dosage}`)) next.add(i);
    });
    setApprovedSet(next);
  }, [data]);

  const updateStatus = async (status: "pending" | "in_review" | "completed" | "archived") => {
    setSavingStatus(true);
    const { error } = await supabase.from("patient_intakes").update({ status }).eq("id", id);
    setSavingStatus(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Status updated");
      load();
    }
  };

  const generateAssessment = async () => {
    if (!data) return;

    const payload = {
      chief_complaint: data.intake.chief_complaint,
      symptoms: data.intake.symptoms ?? [],
      body_regions: data.intake.body_regions ?? [],
      duration_days: data.intake.duration_days ?? undefined,
      severity: data.intake.severity ?? undefined,
      age: data.intake.age ?? undefined,
      sex: data.intake.sex ?? undefined,
      medical_history: data.intake.medical_history ?? undefined,
      current_medications: data.intake.current_medications ?? undefined,
      allergies: data.intake.allergies ?? undefined,
      notes: data.intake.notes ?? undefined,
      vitals: data.intake.vitals ?? {},
    };

    setGeneratingAssessment(true);
    const result = await generateAssessmentForIntake({
      intakeId: data.intake.id,
      patientId: data.intake.patient_id,
      payload,
    });
    setGeneratingAssessment(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success("AI assessment ready");
    load();
  };

  const submitNote = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingNote(true);

    const meds = (data?.assessment?.suggested_medicines as any[]) || [];
    const approved_medicines = meds.filter((_, i) => approvedSet.has(i));

    const { error } = await (supabase.from("doctor_notes") as any).insert({
      intake_id: id,
      doctor_id: user!.id,
      diagnosis: note.diagnosis || null,
      treatment_plan: note.treatment_plan || null,
      follow_up: note.follow_up || null,
      notes: note.notes || null,
      override_risk: note.override_risk || null,
      approved_medicines,
      approved_at: approved_medicines.length ? new Date().toISOString() : null,
    });

    setSavingNote(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Note saved");
    setNote({ diagnosis: "", treatment_plan: "", follow_up: "", notes: "", override_risk: "" });
    load();
  };

  const exportPdf = () => {
    if (!data) return;
    const doc = buildHospitalReport({
      intake: data.intake,
      assessment: data.assessment,
      notes: data.notes,
      patient: data.patient,
    });
    doc.save(`meditriage-${(data.intake.id || "case").slice(0, 8)}.pdf`);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!data) {
    return <div className="container mx-auto max-w-2xl py-20 text-center">Case not found.</div>;
  }

  const { intake, assessment, notes, patient } = data;
  const meds = (assessment?.suggested_medicines as any[]) || [];
  const diagnoses = (assessment?.possible_diagnoses as any[]) || [];

  return (
    <div className="mx-auto max-w-5xl p-6 md:p-8">
      <Link to={isClinician ? "/doctor" : "/patient"}>
        <Button variant="ghost" size="sm" className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
      </Link>

      {/* Hero */}
      <Card className="mt-4 overflow-hidden border-0 bg-gradient-mint p-0 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-4 p-6 md:p-7">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wider text-primary/80">Case · MT-{id.slice(0, 8).toUpperCase()}</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">{intake.chief_complaint}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {patient?.full_name || patient?.email || "Patient"} · {format(new Date(intake.created_at), "PPp")}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {assessment && <RiskBadge level={assessment.risk_level} score={assessment.risk_score} />}
              <Badge variant="secondary" className="capitalize">{intake.status.replace("_", " ")}</Badge>
              {assessment?.ai_model && (
                <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-card/70 px-2 py-0.5 text-[11px] text-muted-foreground">
                  <Sparkles className="h-3 w-3 text-primary" /> {assessment.ai_model}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() =>
                navigate({
                  to: "/appointments",
                  search: { intake: id, complaint: intake.chief_complaint },
                })
              }
            >
              <CalendarPlus className="h-4 w-4" /> Book appointment
            </Button>
            <Button size="sm" onClick={exportPdf} className="gap-2 shadow-soft">
              <FileDown className="h-4 w-4" /> Hospital PDF
            </Button>
          </div>
        </div>
      </Card>

      {/* Top row: details, vitals, body */}
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <Card className="p-5 md:col-span-1">
          <h2 className="flex items-center gap-2 font-semibold"><Stethoscope className="h-4 w-4 text-primary" /> Patient details</h2>
          <dl className="mt-3 space-y-1.5 text-sm">
            <Row k="Age / Sex" v={`${intake.age ?? "—"} / ${intake.sex ?? "—"}`} />
            <Row k="Severity" v={`${intake.severity ?? "—"}/10`} />
            <Row k="Duration" v={`${intake.duration_days ?? "—"} day(s)`} />
            <Row k="Symptoms" v={(intake.symptoms || []).join(", ") || "—"} />
            <Row k="History" v={intake.medical_history || "—"} />
            <Row k="Medications" v={intake.current_medications || "—"} />
            <Row k="Allergies" v={intake.allergies || "—"} />
          </dl>
        </Card>

        <Card className="p-5 md:col-span-1">
          <h2 className="flex items-center gap-2 font-semibold"><HeartPulse className="h-4 w-4 text-primary" /> Vitals</h2>
          <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
            {Object.entries(intake.vitals || {})
              .filter(([, v]) => v != null && v !== "")
              .map(([k, v]) => (
                <Row key={k} k={k.replace(/_/g, " ")} v={String(v)} />
              ))}
            {!intake.vitals || Object.values(intake.vitals || {}).every((v) => v == null || v === "") ? (
              <p className="col-span-2 text-muted-foreground">Not recorded</p>
            ) : null}
          </dl>
        </Card>

        <Card className="p-5 md:col-span-1">
          <h2 className="flex items-center gap-2 font-semibold">Affected regions</h2>
          <BodyDiagram
            selected={intake.body_regions || []}
            readOnly
            highlightTone={
              assessment?.risk_level === "critical" || assessment?.risk_level === "high"
                ? "destructive"
                : assessment?.risk_level === "moderate"
                  ? "warning"
                  : "primary"
            }
            className="mt-2"
          />
        </Card>
      </div>

      {!assessment && (
        <Card className="mt-5 p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="font-semibold">AI assessment pending</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Run the AI to generate diagnoses, medicine suggestions and home remedies.
              </p>
            </div>
            <Button onClick={generateAssessment} disabled={generatingAssessment} className="min-w-40">
              {generatingAssessment ? <Loader2 className="h-4 w-4 animate-spin" /> : "Generate AI now"}
            </Button>
          </div>
        </Card>
      )}

      {assessment && (
        <>
          {/* Red flags strip */}
          {assessment.red_flags?.length > 0 && (
            <div className="mt-5 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm shadow-soft">
              <AlertTriangle className="mt-0.5 h-4 w-4 text-destructive" />
              <div>
                <p className="font-medium text-destructive">Red flags detected</p>
                <p className="text-destructive/90">{assessment.red_flags.join(", ")}</p>
              </div>
            </div>
          )}

          {/* AI summary + diagnoses */}
          <div className="mt-5 grid gap-4 md:grid-cols-5">
            <Card className="p-5 md:col-span-3">
              <h2 className="flex items-center gap-2 font-semibold">
                <Sparkles className="h-4 w-4 text-primary" /> AI clinical summary
              </h2>
              <div className="prose prose-sm mt-3 max-w-none dark:prose-invert">
                <ReactMarkdown>{assessment.ai_summary || "_No summary available._"}</ReactMarkdown>
              </div>
            </Card>

            <Card className="p-5 md:col-span-2">
              <h2 className="font-semibold">Possible diagnoses</h2>
              {diagnoses.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">None suggested.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {diagnoses.map((d: any, i: number) => (
                    <li key={i} className="rounded-md border border-border/70 bg-background/60 p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{d.name}</span>
                        <Badge variant="outline" className="capitalize">{d.likelihood}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{d.explanation}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          {/* Differentials */}
          {assessment.differentials?.length > 0 && (
            <Card className="mt-4 p-5">
              <h2 className="font-semibold">Differential considerations</h2>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {assessment.differentials.map((d: any, i: number) => (
                  <div key={i} className="rounded-md border p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{d.condition}</span>
                      <Badge variant="outline" className="capitalize">{d.likelihood}</Badge>
                    </div>
                    <p className="mt-1 text-muted-foreground">{d.rationale}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Medicines */}
          {meds.length > 0 && (
            <Card className="mt-4 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 font-semibold">
                  <Pill className="h-4 w-4 text-primary" /> Suggested medicines
                </h2>
                {isClinician ? (
                  <p className="text-xs text-muted-foreground">
                    Tick the items you approve — they'll appear on the final hospital PDF.
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Pending doctor review. Don't self-medicate prescription items.
                  </p>
                )}
              </div>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {meds.map((m: any, i: number) => {
                  const checked = approvedSet.has(i);
                  return (
                    <div
                      key={i}
                      className={`flex items-start gap-3 rounded-md border p-3 text-sm transition ${
                        checked ? "border-primary/40 bg-primary/5" : ""
                      }`}
                    >
                      {isClinician && (
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(v) => {
                            setApprovedSet((prev) => {
                              const next = new Set(prev);
                              if (v) next.add(i);
                              else next.delete(i);
                              return next;
                            });
                          }}
                          className="mt-0.5"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{m.name}</span>
                          <Badge variant="outline" className="text-[10px]">{m.type}</Badge>
                          {m.requires_doctor_approval && (
                            <Badge variant="outline" className="border-warning/40 text-warning text-[10px]">
                              Doctor approval
                            </Badge>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          <b>Dosage:</b> {m.dosage}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          <b>Purpose:</b> {m.purpose}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Home remedies + lifestyle */}
          {(assessment.home_remedies?.length || assessment.lifestyle_advice?.length) ? (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {assessment.home_remedies?.length > 0 && (
                <Card className="p-5">
                  <h2 className="flex items-center gap-2 font-semibold">
                    <Leaf className="h-4 w-4 text-success" /> Home remedies
                  </h2>
                  <ul className="mt-3 space-y-2 text-sm">
                    {assessment.home_remedies.map((r: string, i: number) => (
                      <li key={i} className="flex gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-success" />
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
              {assessment.lifestyle_advice?.length > 0 && (
                <Card className="p-5">
                  <h2 className="flex items-center gap-2 font-semibold">
                    <HeartPulse className="h-4 w-4 text-primary" /> Lifestyle advice
                  </h2>
                  <ul className="mt-3 space-y-2 text-sm">
                    {assessment.lifestyle_advice.map((r: string, i: number) => (
                      <li key={i} className="flex gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
            </div>
          ) : null}

          {/* Recommended actions */}
          {assessment.recommended_actions?.length > 0 && (
            <Card className="mt-4 p-5">
              <h2 className="flex items-center gap-2 font-semibold">
                <ClipboardCheck className="h-4 w-4 text-primary" /> Recommended clinical actions
              </h2>
              <ul className="mt-3 grid gap-2 md:grid-cols-2 text-sm">
                {assessment.recommended_actions.map((a: string, i: number) => (
                  <li key={i} className="flex gap-2 rounded-md border bg-background/60 p-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <span>{a}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <details className="mt-4 rounded-md border bg-card/60 p-3">
            <summary className="cursor-pointer text-xs text-muted-foreground">Risk score breakdown</summary>
            <pre className="mt-2 overflow-auto rounded-md bg-muted p-3 text-xs">
              {JSON.stringify(assessment.rule_breakdown, null, 2)}
            </pre>
          </details>

          <p className="mt-4 text-xs text-muted-foreground">
            ⚠ Decision support only. Not a medical diagnosis. Clinical judgment required before prescribing.
          </p>
        </>
      )}

      {isClinician && (
        <Card className="mt-5 p-5">
          <h2 className="font-semibold">Clinical workflow</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {(["pending", "in_review", "completed", "archived"] as const).map((s) => (
              <Button
                key={s}
                size="sm"
                variant={intake.status === s ? "default" : "outline"}
                disabled={savingStatus}
                onClick={() => updateStatus(s)}
              >
                {s.replace("_", " ")}
              </Button>
            ))}
          </div>

          <form onSubmit={submitNote} className="mt-6 space-y-3">
            <h3 className="font-medium">
              Add clinician note
              {approvedSet.size > 0 && (
                <span className="ml-2 text-xs text-primary">
                  · {approvedSet.size} medicine{approvedSet.size > 1 ? "s" : ""} approved
                </span>
              )}
            </h3>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label>Diagnosis</Label>
                <Input value={note.diagnosis} onChange={(e) => setNote({ ...note, diagnosis: e.target.value })} />
              </div>
              <div>
                <Label>Override risk</Label>
                <select
                  className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={note.override_risk}
                  onChange={(e) => setNote({ ...note, override_risk: e.target.value as RiskLevel | "" })}
                >
                  <option value="">— keep AI score —</option>
                  <option value="low">Low</option>
                  <option value="moderate">Moderate</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>
            <div>
              <Label>Treatment plan</Label>
              <Textarea value={note.treatment_plan} onChange={(e) => setNote({ ...note, treatment_plan: e.target.value })} />
            </div>
            <div>
              <Label>Follow-up</Label>
              <Input value={note.follow_up} onChange={(e) => setNote({ ...note, follow_up: e.target.value })} />
            </div>
            <div>
              <Label>Free-form notes</Label>
              <Textarea value={note.notes} onChange={(e) => setNote({ ...note, notes: e.target.value })} />
            </div>
            <Button type="submit" disabled={savingNote}>
              {savingNote ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save note & approve meds"}
            </Button>
          </form>
        </Card>
      )}

      {notes.length > 0 && (
        <Card className="mt-5 p-5">
          <h2 className="font-semibold">Clinician notes</h2>
          <div className="mt-3 space-y-3">
            {notes.map((n: any) => (
              <div key={n.id} className="rounded-md border p-3 text-sm">
                <p className="text-xs text-muted-foreground">{format(new Date(n.created_at), "PPp")}</p>
                {n.diagnosis && <p className="mt-1"><b>Dx:</b> {n.diagnosis}</p>}
                {n.treatment_plan && <p><b>Plan:</b> {n.treatment_plan}</p>}
                {n.follow_up && <p><b>Follow-up:</b> {n.follow_up}</p>}
                {n.notes && <p className="mt-1 text-muted-foreground">{n.notes}</p>}
                {n.override_risk && (
                  <Badge variant="outline" className="mt-2 capitalize">
                    Risk overridden → {n.override_risk}
                  </Badge>
                )}
                {Array.isArray(n.approved_medicines) && n.approved_medicines.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs font-medium text-success">Approved medicines:</p>
                    <ul className="mt-1 list-inside list-disc text-xs text-muted-foreground">
                      {n.approved_medicines.map((m: any, i: number) => (
                        <li key={i}>{m.name} — {m.dosage}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground capitalize">{k}</dt>
      <dd className="text-right">{v}</dd>
    </div>
  );
}
