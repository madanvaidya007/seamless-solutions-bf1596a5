import { createFileRoute, Link } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RiskBadge } from "@/components/RiskBadge";
import { useAuth } from "@/lib/auth";
import { generateAssessmentForIntake } from "@/lib/triage";
import { format } from "date-fns";
import { Loader2, AlertTriangle, FileDown, ArrowLeft } from "lucide-react";
import type { RiskLevel } from "@/lib/risk";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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
  patient: { full_name: string | null; email: string | null } | null;
}

function CaseDetail() {
  const { id } = Route.useParams();
  const { user, role } = useAuth();
  const [data, setData] = useState<CaseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [generatingAssessment, setGeneratingAssessment] = useState(false);
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
      .select("full_name, email")
      .eq("id", intake.patient_id)
      .maybeSingle();

    setData({ intake, assessment, notes: notes ?? [], patient });
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

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

    const { error } = await supabase.from("doctor_notes").insert({
      intake_id: id,
      doctor_id: user!.id,
      diagnosis: note.diagnosis || null,
      treatment_plan: note.treatment_plan || null,
      follow_up: note.follow_up || null,
      notes: note.notes || null,
      override_risk: note.override_risk || null,
    });

    setSavingNote(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Note added");
    setNote({ diagnosis: "", treatment_plan: "", follow_up: "", notes: "", override_risk: "" });
    load();
  };

  const exportPdf = () => {
    if (!data) return;

    const doc = new jsPDF();
    const { intake, assessment, notes, patient } = data;

    doc.setFontSize(18);
    doc.text("MediTriage AI — Case Report", 14, 18);
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text(`Generated ${format(new Date(), "PPp")}`, 14, 24);
    doc.setTextColor(20);

    autoTable(doc, {
      startY: 30,
      head: [["Patient", "Value"]],
      body: [
        ["Name", patient?.full_name || "—"],
        ["Email", patient?.email || "—"],
        ["Age / Sex", `${intake.age ?? "—"} / ${intake.sex ?? "—"}`],
        ["Submitted", format(new Date(intake.created_at), "PPp")],
        ["Status", intake.status],
      ],
    });

    autoTable(doc, {
      head: [["Clinical", "Value"]],
      body: [
        ["Chief complaint", intake.chief_complaint],
        ["Symptoms", (intake.symptoms || []).join(", ")],
        ["Severity", `${intake.severity}/10`],
        ["Duration (days)", String(intake.duration_days ?? "—")],
        ["Vitals", JSON.stringify(intake.vitals || {})],
        ["History", intake.medical_history || "—"],
        ["Medications", intake.current_medications || "—"],
        ["Allergies", intake.allergies || "—"],
      ],
    });

    if (assessment) {
      autoTable(doc, {
        head: [["AI Assessment", "Value"]],
        body: [
          ["Risk", `${assessment.risk_level} (${assessment.risk_score}/100)`],
          ["Red flags", (assessment.red_flags || []).join(", ") || "—"],
          ["AI summary", assessment.ai_summary || "—"],
          ["Recommended actions", (assessment.recommended_actions || []).join("; ") || "—"],
        ],
      });

      const diffs = assessment.differentials || [];
      if (diffs.length) {
        autoTable(doc, {
          head: [["Condition", "Likelihood", "Rationale"]],
          body: diffs.map((d: any) => [d.condition, d.likelihood, d.rationale]),
        });
      }
    }

    if (notes.length) {
      autoTable(doc, {
        head: [["Doctor's Notes", ""]],
        body: notes.flatMap((n: any) => [
          ["Date", format(new Date(n.created_at), "PPp")],
          ["Diagnosis", n.diagnosis || "—"],
          ["Plan", n.treatment_plan || "—"],
          ["Follow-up", n.follow_up || "—"],
          ["Notes", n.notes || "—"],
          ["—", "—"],
        ]),
      });
    }

    doc.save(`meditriage-case-${id.slice(0, 8)}.pdf`);
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

  return (
    <div className="mx-auto max-w-4xl p-6 md:p-8">
      <Link to={isClinician ? "/doctor" : "/patient"}>
        <Button variant="ghost" size="sm" className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{intake.chief_complaint}</h1>
          <p className="text-sm text-muted-foreground">
            {patient?.full_name || patient?.email || "Patient"} · {format(new Date(intake.created_at), "PPp")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {assessment && <RiskBadge level={assessment.risk_level} score={assessment.risk_score} />}
          <Badge variant="secondary" className="capitalize">
            {intake.status.replace("_", " ")}
          </Badge>
          <Button variant="outline" size="sm" onClick={exportPdf} className="gap-2">
            <FileDown className="h-4 w-4" /> PDF
          </Button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Card className="p-5">
          <h2 className="font-semibold">Patient details</h2>
          <dl className="mt-3 space-y-1.5 text-sm">
            <Row k="Age / Sex" v={`${intake.age} / ${intake.sex}`} />
            <Row k="Severity" v={`${intake.severity}/10`} />
            <Row k="Duration" v={`${intake.duration_days} day(s)`} />
            <Row k="Symptoms" v={(intake.symptoms || []).join(", ")} />
            <Row k="History" v={intake.medical_history || "—"} />
            <Row k="Medications" v={intake.current_medications || "—"} />
            <Row k="Allergies" v={intake.allergies || "—"} />
          </dl>
        </Card>

        <Card className="p-5">
          <h2 className="font-semibold">Vitals</h2>
          <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
            {Object.entries(intake.vitals || {}).map(([k, v]) =>
              v == null ? null : <Row key={k} k={k.replace(/_/g, " ")} v={String(v)} />,
            )}
            {!intake.vitals || Object.keys(intake.vitals).length === 0 ? (
              <p className="text-muted-foreground">Not recorded</p>
            ) : null}
          </dl>
        </Card>
      </div>

      {!assessment && (
        <Card className="mt-4 p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="font-semibold">AI assessment pending</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                This case was saved before the AI result was attached.
              </p>
            </div>
            <Button onClick={generateAssessment} disabled={generatingAssessment} className="min-w-40">
              {generatingAssessment ? <Loader2 className="h-4 w-4 animate-spin" /> : "Generate AI now"}
            </Button>
          </div>
        </Card>
      )}

      {assessment && (
        <Card className="mt-4 p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">AI assessment</h2>
            <span className="text-xs text-muted-foreground">{assessment.ai_model}</span>
          </div>

          {assessment.red_flags?.length > 0 && (
            <div className="mt-3 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm">
              <AlertTriangle className="mt-0.5 h-4 w-4 text-destructive" />
              <div>
                <p className="font-medium text-destructive">Red flags detected</p>
                <p className="text-destructive/90">{assessment.red_flags.join(", ")}</p>
              </div>
            </div>
          )}

          <div className="prose prose-sm mt-4 max-w-none dark:prose-invert">
            <ReactMarkdown>{assessment.ai_summary || ""}</ReactMarkdown>
          </div>

          {assessment.differentials?.length > 0 && (
            <>
              <h3 className="mt-4 text-sm font-semibold">Differential considerations</h3>
              <div className="mt-2 space-y-2">
                {assessment.differentials.map((d: any, i: number) => (
                  <div key={i} className="rounded-md border p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{d.condition}</span>
                      <Badge variant="outline" className="capitalize">
                        {d.likelihood}
                      </Badge>
                    </div>
                    <p className="mt-1 text-muted-foreground">{d.rationale}</p>
                  </div>
                ))}
              </div>
            </>
          )}

          {assessment.recommended_actions?.length > 0 && (
            <>
              <h3 className="mt-4 text-sm font-semibold">Recommended actions</h3>
              <ul className="mt-2 list-inside list-disc text-sm text-muted-foreground">
                {assessment.recommended_actions.map((a: string, i: number) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </>
          )}

          <details className="mt-4">
            <summary className="cursor-pointer text-xs text-muted-foreground">Risk score breakdown</summary>
            <pre className="mt-2 overflow-auto rounded-md bg-muted p-3 text-xs">
              {JSON.stringify(assessment.rule_breakdown, null, 2)}
            </pre>
          </details>

          <p className="mt-4 text-xs text-muted-foreground">
            ⚠ Decision support only. Not a medical diagnosis. Clinical judgment required.
          </p>
        </Card>
      )}

      {isClinician && (
        <Card className="mt-4 p-5">
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
            <h3 className="font-medium">Add clinician note</h3>
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
              {savingNote ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save note"}
            </Button>
          </form>
        </Card>
      )}

      {notes.length > 0 && (
        <Card className="mt-4 p-5">
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
