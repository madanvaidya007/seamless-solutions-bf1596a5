import { createFileRoute, Link } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RiskBadge } from "@/components/RiskBadge";
import { PageHeader } from "@/components/AppShell";
import { format } from "date-fns";
import { Loader2, Users, AlertTriangle, Activity } from "lucide-react";
import type { RiskLevel } from "@/lib/risk";

export const Route = createFileRoute("/doctor/")({
  head: () => ({ meta: [{ title: "Triage Queue — MediTriage AI" }] }),
  component: () => (
    <RequireAuth allowed={["doctor", "admin"]}>
      <DoctorQueue />
    </RequireAuth>
  ),
});

interface QueueRow {
  id: string;
  chief_complaint: string;
  status: string;
  created_at: string;
  patient_id: string;
  assessments: { risk_score: number; risk_level: RiskLevel }[] | null;
  // Joined locally
  patient_name?: string;
  patient_email?: string;
}

function DoctorQueue() {
  const [items, setItems] = useState<QueueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"active" | "all">("active");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      let q = supabase
        .from("patient_intakes")
        .select("id, chief_complaint, status, created_at, patient_id, assessments(risk_score, risk_level)");
      if (filter === "active") q = q.in("status", ["pending", "in_review"]);

      const { data } = await q.order("created_at", { ascending: false });
      const rows = ((data as any) ?? []) as QueueRow[];

      const ids = Array.from(new Set(rows.map((r) => r.patient_id)));
      let profilesMap: Record<string, { full_name: string | null; email: string | null }> = {};
      if (ids.length) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", ids);
        profilesMap = Object.fromEntries((profiles ?? []).map((p: any) => [p.id, p]));
      }

      const enriched = rows.map((r) => ({
        ...r,
        patient_name: profilesMap[r.patient_id]?.full_name ?? undefined,
        patient_email: profilesMap[r.patient_id]?.email ?? undefined,
      }));
      enriched.sort((a, b) => (b.assessments?.[0]?.risk_score ?? 0) - (a.assessments?.[0]?.risk_score ?? 0));

      if (!cancelled) {
        setItems(enriched);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [filter]);

  const counts = {
    total: items.length,
    high: items.filter((i) => {
      const r = i.assessments?.[0]?.risk_level;
      return r === "high" || r === "critical";
    }).length,
    pending: items.filter((i) => i.status === "pending").length,
  };

  return (
    <div className="p-6 md:p-8">
      <PageHeader
        title="Triage queue"
        subtitle="Patients sorted by AI risk score."
        actions={
          <div className="flex gap-2">
            <Button variant={filter === "active" ? "default" : "outline"} size="sm" onClick={() => setFilter("active")}>Active</Button>
            <Button variant={filter === "all" ? "default" : "outline"} size="sm" onClick={() => setFilter("all")}>All</Button>
          </div>
        }
      />

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <KpiCard icon={Users} label="In queue" value={counts.total} tone="primary" />
        <KpiCard icon={Activity} label="Pending" value={counts.pending} tone="warning" />
        <KpiCard icon={AlertTriangle} label="High / critical" value={counts.high} tone="destructive" />
      </div>

      <div className="mt-6 space-y-3">
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : items.length === 0 ? (
          <Card className="p-10 text-center text-muted-foreground">No patients in queue.</Card>
        ) : (
          items.map((it) => {
            const a = it.assessments?.[0];
            const display = it.patient_name || it.patient_email || "Patient";
            const initials = display.slice(0, 2).toUpperCase();
            return (
              <Link key={it.id} to="/cases/$id" params={{ id: it.id }}>
                <Card className="flex items-center gap-4 p-5 transition hover:-translate-y-0.5 hover:shadow-elegant">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-mint text-sm font-semibold text-primary">
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{display}</p>
                      <Badge variant="secondary" className="capitalize">{it.status.replace("_", " ")}</Badge>
                    </div>
                    <p className="mt-0.5 truncate text-sm text-muted-foreground">{it.chief_complaint}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(it.created_at), "PPp")}</p>
                  </div>
                  {a && <RiskBadge level={a.risk_level} score={a.risk_score} />}
                </Card>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}

function KpiCard({
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
