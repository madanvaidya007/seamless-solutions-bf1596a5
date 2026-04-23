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
import {
  Plus,
  Loader2,
  ClipboardList,
  Activity,
  AlertTriangle,
  HeartPulse,
  Thermometer,
  Droplet,
  Wind,
  CalendarPlus,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import type { RiskLevel } from "@/lib/risk";

export const Route = createFileRoute("/patient/")({
  head: () => ({ meta: [{ title: "My Health — MediTriage AI" }] }),
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
  vitals: Record<string, number | string | null> | null;
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
      .select("id, chief_complaint, status, created_at, vitals, assessments(risk_score, risk_level)")
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
  const completed = items.filter((i) => i.status === "completed").length;

  // Vitals time series (latest 6 intakes)
  const vitalSeries = items
    .slice(0, 6)
    .reverse()
    .map((i) => i.vitals || {});
  const hrSeries = vitalSeries.map((v) => Number(v.heart_rate) || 0);
  const tempSeries = vitalSeries.map((v) => Number(v.temperature_c) || 0);
  const spo2Series = vitalSeries.map((v) => Number(v.spo2) || 0);

  const latest = items[0]?.vitals || {};

  return (
    <div className="p-6 md:p-8">
      <PageHeader
        title={user?.email ? `Welcome back` : "My Health"}
        subtitle="Your symptom history, vitals trends and AI insights at a glance."
        actions={
          <div className="flex gap-2">
            <Link to="/appointments">
              <Button variant="outline" className="gap-2"><CalendarPlus className="h-4 w-4" /> Book visit</Button>
            </Link>
            <Link to="/patient/new">
              <Button className="gap-2 shadow-soft"><Plus className="h-4 w-4" /> New assessment</Button>
            </Link>
          </div>
        }
      />

      {/* Pastel stat cards */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <PastelStat
          icon={ClipboardList}
          label="Total cases"
          value={totalCases}
          accent="oklch(0.92 0.06 195)"
          ring="oklch(0.55 0.13 200)"
        />
        <PastelStat
          icon={Activity}
          label="Active"
          value={pending}
          accent="oklch(0.94 0.07 75)"
          ring="oklch(0.60 0.16 60)"
        />
        <PastelStat
          icon={HeartPulse}
          label="Resolved"
          value={completed}
          accent="oklch(0.93 0.07 155)"
          ring="oklch(0.55 0.15 155)"
        />
        <PastelStat
          icon={AlertTriangle}
          label="High risk"
          value={highRisk}
          accent="oklch(0.94 0.06 25)"
          ring="oklch(0.60 0.22 25)"
        />
      </div>

      {/* AI Health Update promo + Vitals charts */}
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="relative overflow-hidden border-0 bg-gradient-hero p-6 text-primary-foreground shadow-elegant lg:col-span-2">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/15 blur-2xl" />
          <div className="absolute -bottom-12 -left-6 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
          <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="max-w-md">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-xs">
                <Sparkles className="h-3 w-3" /> AI Health Update
              </span>
              <h2 className="mt-3 text-2xl font-semibold leading-tight">
                Get a personalized triage in under a minute.
              </h2>
              <p className="mt-2 text-sm text-primary-foreground/85">
                Describe your symptoms, mark affected body regions, and our AI returns possible diagnoses,
                medicine suggestions and home remedies — reviewed by a doctor.
              </p>
              <div className="mt-4 flex gap-2">
                <Link to="/patient/new">
                  <Button variant="secondary" className="gap-2">
                    Start now <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/appointments">
                  <Button variant="ghost" className="gap-2 text-primary-foreground hover:bg-white/15">
                    Book a doctor
                  </Button>
                </Link>
              </div>
            </div>
            <div className="hidden h-32 w-32 shrink-0 items-center justify-center rounded-full bg-white/15 md:flex">
              <HeartPulse className="h-16 w-16 text-white" />
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-semibold">Latest vitals</h3>
          <div className="mt-3 space-y-3">
            <VitalLine label="Heart rate" unit="bpm" value={latest.heart_rate as any} icon={HeartPulse} series={hrSeries} tone="oklch(0.60 0.22 25)" />
            <VitalLine label="Temperature" unit="°C" value={latest.temperature_c as any} icon={Thermometer} series={tempSeries} tone="oklch(0.78 0.16 75)" />
            <VitalLine label="SpO₂" unit="%" value={latest.spo2 as any} icon={Wind} series={spo2Series} tone="oklch(0.55 0.13 200)" />
            <VitalLine
              label="Blood pressure"
              unit="mmHg"
              value={latest.systolic_bp ? `${latest.systolic_bp}/${latest.diastolic_bp ?? "—"}` : null}
              icon={Droplet}
              series={[]}
              tone="oklch(0.55 0.18 280)"
            />
          </div>
        </Card>
      </div>

      {/* Cases list */}
      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent cases</h2>
          <Link to="/patient/new" className="text-sm text-primary hover:underline">+ New</Link>
        </div>
        <div className="mt-3 space-y-3">
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
    </div>
  );
}

function PastelStat({
  icon: Icon,
  label,
  value,
  accent,
  ring,
}: {
  icon: typeof Activity;
  label: string;
  value: number;
  accent: string;
  ring: string;
}) {
  return (
    <Card
      className="relative overflow-hidden border-0 p-5 shadow-card"
      style={{ background: accent }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider opacity-70">{label}</p>
          <p className="mt-1 text-3xl font-semibold" style={{ color: ring }}>{value}</p>
        </div>
        <div
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/70"
          style={{ color: ring }}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}

function VitalLine({
  label,
  unit,
  value,
  icon: Icon,
  series,
  tone,
}: {
  label: string;
  unit: string;
  value: number | string | null | undefined;
  icon: typeof HeartPulse;
  series: number[];
  tone: string;
}) {
  // Build a tiny sparkline path
  const w = 90, h = 24;
  const valid = series.filter((n) => n > 0);
  let path = "";
  if (valid.length >= 2) {
    const min = Math.min(...valid);
    const max = Math.max(...valid);
    const range = max - min || 1;
    const step = w / (valid.length - 1);
    path = valid
      .map((v, i) => `${i === 0 ? "M" : "L"} ${i * step} ${h - ((v - min) / range) * h}`)
      .join(" ");
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: `color-mix(in oklab, ${tone} 15%, transparent)`, color: tone }}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-sm font-semibold">
            {value || value === 0 ? value : "—"} <span className="text-xs font-normal text-muted-foreground">{value ? unit : ""}</span>
          </p>
        </div>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} className="shrink-0">
        {path && (
          <>
            <path d={`${path} L ${w} ${h} L 0 ${h} Z`} fill={tone} fillOpacity={0.12} />
            <path d={path} stroke={tone} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </>
        )}
      </svg>
    </div>
  );
}
