import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { signInSchema } from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Activity, ShieldCheck, Stethoscope, HeartPulse } from "lucide-react";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/auth/sign-in")({
  head: () => ({ meta: [{ title: "Sign in — MediTriage AI" }] }),
  component: SignIn,
});

function SignIn() {
  const navigate = useNavigate();
  const { refreshRole } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = signInSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    const { error, data } = await supabase.auth.signInWithPassword(form);
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await refreshRole();
    const { data: roleData } = await supabase.rpc("get_primary_role", { _user_id: data.user!.id });
    toast.success("Welcome back");
    if (roleData === "doctor" || roleData === "admin") navigate({ to: "/doctor" });
    else navigate({ to: "/patient" });
  };

  return (
    <div className="min-h-screen bg-gradient-mint p-3 md:p-6">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-6xl overflow-hidden rounded-3xl bg-card shadow-elegant lg:grid-cols-2">
        {/* Brand panel */}
        <div className="relative hidden flex-col justify-between bg-gradient-hero p-10 text-primary-foreground lg:flex">
          <div>
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
                <Activity className="h-5 w-5" />
              </div>
              <span className="text-lg font-semibold">MediTriage +</span>
            </Link>
          </div>
          <div className="space-y-5">
            <h2 className="text-3xl font-semibold leading-tight">Care delivered with confidence.</h2>
            <p className="text-primary-foreground/85">
              Sign in to access your triage queue, review AI-assisted assessments,
              and document patient encounters securely.
            </p>
            <div className="space-y-3">
              {[
                { i: HeartPulse, t: "Real-time risk scoring" },
                { i: Stethoscope, t: "Doctor & patient workspaces" },
                { i: ShieldCheck, t: "Encrypted, role-based access" },
              ].map(({ i: Icon, t }) => (
                <div key={t} className="flex items-center gap-3 text-sm text-primary-foreground/90">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15">
                    <Icon className="h-4 w-4" />
                  </div>
                  {t}
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-primary-foreground/70">For research and decision support only — not a medical device.</p>
        </div>

        {/* Form panel */}
        <div className="flex items-center justify-center p-6 md:p-10">
          <div className="w-full max-w-sm">
            <Link to="/" className="mb-8 flex items-center gap-2 lg:hidden">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-hero text-primary-foreground">
                <Activity className="h-5 w-5" />
              </div>
              <span className="font-semibold">MediTriage +</span>
            </Link>
            <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
            <p className="mt-1 text-sm text-muted-foreground">Continue to your dashboard.</p>
            <form onSubmit={submit} className="mt-6 space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
              </div>
              <Button type="submit" className="w-full shadow-soft" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
              </Button>
            </form>
            <p className="mt-6 text-center text-sm text-muted-foreground">
              New here?{" "}
              <Link to="/auth/sign-up" className="font-medium text-primary hover:underline">Create an account</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
