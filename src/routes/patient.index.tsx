import { createFileRoute, Link } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RiskBadge } from "@/components/RiskBadge";
import { PageHeader } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { format } from "date-fns";
import { Plus, Loader2, ClipboardList, Activity, AlertTriangle } from "lucide-react";
import type { RiskLevel } from "@/lib/risk";

export const Route = createFileRoute("/patient/")({
  head: () => ({ meta: [{ title: "My Cases — MediTriage AI" }] }),
  component: () => (
    <RequireAuth allowed={["patient", "admin", "doctor"]}>
      <PatientHome />
    </RequireAuth>
  ),
});

interface IntakeRow {
  id: string;
  chief_complaint: string;
  status: string;
  created_at: string;
  assessments: { risk_score: number; risk_level: RiskLevel }[] | null;
}

function PatientHome() {
  const { user } = useAuth();
  const [items, setItems] = useState<IntakeRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("patient_intakes")
      .select("id, chief_complaint, status, created_at, assessments(risk_score, risk_level)")
      .eq("patient_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setItems((data as any) ?? []);
        setLoading(false);
      });
  }, [user]);

  const totalCases = items.length;
  const highRisk = items.filter((i) => {
    const r = i.assessments?.[0]?.risk_level;
    return r === "high" || r === "critical";
  }).length;
  const pending = items.filter((i) => i.status === "pending" || i.status === "in_review").length;

  return (
    <div className="p-6 md:p-8">
      <PageHeader
        title="My Cases"
        subtitle="Track your assessments and clinician notes."
        actions={
          <Link to="/patient/new">
            <Button className="gap-2 shadow-soft"><Plus className="h-4 w-4" /> New assessment</Button>
          </Link>
        }
      />

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <StatCard icon={ClipboardList} label="Total cases" value={totalCases} tone="primary" />
        <StatCard icon={Activity} label="Active" value={pending} tone="warning" />
        <StatCard icon={AlertTriangle} label="High / critical" value={highRisk} tone="destructive" />
      </div>

      <div className="mt-6 space-y-3">
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : items.length === 0 ? (
          <Card className="p-10 text-center">
            <p className="text-muted-foreground">No cases yet. Submit your symptoms to get a triage assessment.</p>
            <Link to="/patient/new">
              <Button className="mt-4">Start an assessment</Button>
            </Link>
          </Card>
        ) : (
          items.map((it) => {
            const a = it.assessments?.[0];
            return (
              <Link key={it.id} to="/cases/$id" params={{ id: it.id }}>
                <Card className="flex items-center justify-between gap-4 p-5 transition hover:-translate-y-0.5 hover:shadow-elegant">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{it.chief_complaint}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(it.created_at), "PPp")}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {a && <RiskBadge level={a.risk_level} score={a.risk_score} />}
                    <Badge variant="secondary" className="capitalize">{it.status.replace("_", " ")}</Badge>
                  </div>
                </Card>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Activity;
  label: string;
  value: number;
  tone: "primary" | "warning" | "destructive";
}) {
  const toneMap = {
    primary: "bg-accent text-primary",
    warning: "bg-warning/15 text-warning",
    destructive: "bg-destructive/10 text-destructive",
  } as const;
  return (
    <Card className="flex items-center gap-4 p-5">
      <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${toneMap[tone]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold">{value}</p>
      </div>
    </Card>
  );
}
