import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Activity, Brain, ShieldCheck, Stethoscope, Timer, Workflow, ArrowRight, HeartPulse } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MediTriage AI — Smart Triage & Clinical Decision Support" },
      { name: "description", content: "Reduce diagnostic delays and prioritize high-risk patients with AI-assisted triage built for hospitals." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-gradient-mint">
      {/* Top bar */}
      <header className="container mx-auto flex items-center justify-between px-4 py-5">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-hero text-primary-foreground shadow-soft">
            <Activity className="h-5 w-5" />
          </div>
          <span className="text-lg font-semibold tracking-tight">MediTriage <span className="text-primary">+</span></span>
        </Link>
        <nav className="flex items-center gap-2">
          <Link to="/auth/sign-in"><Button variant="ghost" size="sm">Sign in</Button></Link>
          <Link to="/auth/sign-up"><Button size="sm" className="shadow-soft">Get started</Button></Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-4 pt-8 pb-20">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-card/70 px-3 py-1 text-xs font-medium text-primary backdrop-blur">
              <HeartPulse className="h-3.5 w-3.5" />
              LAKSHYAVEDH 2K26 · Clinical Decision Support
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              AI triage for the
              <span className="block bg-gradient-hero bg-clip-text text-transparent">modern hospital.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base text-muted-foreground sm:text-lg">
              MediTriage AI combines a transparent rule-based risk engine with
              AI-assisted differentials so clinicians can see the right patient
              first — without replacing clinical judgment.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/auth/sign-up">
                <Button size="lg" className="gap-2 shadow-elegant">
                  Start free <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/auth/sign-in">
                <Button size="lg" variant="outline">I have an account</Button>
              </Link>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              For research and decision support only — not a medical device.
            </p>
          </div>

          {/* Mock dashboard preview */}
          <div className="relative">
            <div className="absolute -inset-6 rounded-[2rem] bg-gradient-hero opacity-20 blur-3xl" />
            <Card className="relative overflow-hidden border-border/50 p-0 shadow-elegant">
              <div className="flex items-center justify-between border-b border-border/60 bg-card px-5 py-3">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-destructive/70" />
                  <div className="h-2.5 w-2.5 rounded-full bg-warning/70" />
                  <div className="h-2.5 w-2.5 rounded-full bg-success/70" />
                </div>
                <p className="text-xs font-medium text-muted-foreground">Triage Queue · Live</p>
              </div>
              <div className="space-y-2.5 bg-gradient-subtle p-5">
                {[
                  { name: "Anita R.", complaint: "Chest tightness, SOB", risk: "critical", score: 86, color: "bg-destructive/10 text-destructive border-destructive/30" },
                  { name: "James O.", complaint: "Severe headache, vomiting", risk: "high", score: 71, color: "bg-destructive/10 text-destructive border-destructive/30" },
                  { name: "Maria S.", complaint: "Persistent fever 5 days", risk: "moderate", score: 48, color: "bg-warning/15 text-warning border-warning/30" },
                  { name: "Ravi K.", complaint: "Mild sore throat", risk: "low", score: 18, color: "bg-success/15 text-success border-success/30" },
                ].map((row) => (
                  <div key={row.name} className="flex items-center justify-between rounded-xl bg-card px-4 py-3 shadow-soft">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-primary text-sm font-semibold">
                        {row.name[0]}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{row.name}</p>
                        <p className="text-xs text-muted-foreground">{row.complaint}</p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${row.color}`}>
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      {row.risk} · {row.score}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-card/40 py-20 backdrop-blur">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight">Built for busy clinics</h2>
            <p className="mt-3 text-muted-foreground">
              Every input is validated, every assessment is auditable, and every
              risk score is explainable.
            </p>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: Brain, title: "Hybrid AI engine", body: "Rule-based scoring with red-flag detection plus AI-generated differentials and rationales." },
              { icon: Timer, title: "Fast triage", body: "Sub-second risk scoring; AI summary returned in seconds via secure edge functions." },
              { icon: ShieldCheck, title: "Privacy first", body: "Row-level security, role-based access, audit logs, and signed sessions on every request." },
              { icon: Stethoscope, title: "Doctor cockpit", body: "Patients sorted by risk. Review, override, and document in one workflow." },
              { icon: Workflow, title: "Workflow ready", body: "Patient self-intake, clinician review, exportable PDF reports for the chart." },
              { icon: Activity, title: "Explainable scores", body: "Every point is broken down so you can trust — and challenge — the output." },
            ].map((f) => (
              <Card key={f.title} className="border-border/50 p-6 transition hover:-translate-y-0.5 hover:shadow-elegant">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-mint text-primary">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{f.body}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-20">
        <Card className="overflow-hidden border-0 bg-gradient-hero p-10 text-center text-primary-foreground shadow-elegant md:p-14">
          <h3 className="text-2xl font-semibold md:text-3xl">Try the live triage demo</h3>
          <p className="mx-auto mt-3 max-w-xl text-primary-foreground/85">
            Create an account as a patient or clinician and walk through a full
            symptom-to-assessment flow in under a minute.
          </p>
          <div className="mt-6">
            <Link to="/auth/sign-up">
              <Button size="lg" variant="secondary" className="gap-2">
                Create account <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </Card>
      </section>

      <footer className="border-t border-border/60 bg-card/40 py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} MediTriage AI · For research & decision support only.
      </footer>
    </div>
  );
}
