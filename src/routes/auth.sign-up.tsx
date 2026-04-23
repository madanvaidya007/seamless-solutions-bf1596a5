import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { signUpSchema } from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Loader2, Activity, Stethoscope, User as UserIcon } from "lucide-react";

export const Route = createFileRoute("/auth/sign-up")({
  head: () => ({ meta: [{ title: "Sign up — MediTriage AI" }] }),
  component: SignUp,
});

function SignUp() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    role: "patient" as "patient" | "doctor",
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = signUpSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { full_name: form.full_name, role: form.role },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Account created. You can sign in now.");
    navigate({ to: form.role === "doctor" ? "/doctor" : "/patient" });
  };

  return (
    <div className="min-h-screen bg-gradient-mint p-3 md:p-6">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-6xl overflow-hidden rounded-3xl bg-card shadow-elegant lg:grid-cols-2">
        {/* Form */}
        <div className="flex items-center justify-center p-6 md:p-10">
          <div className="w-full max-w-sm">
            <Link to="/" className="mb-8 flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-hero text-primary-foreground">
                <Activity className="h-5 w-5" />
              </div>
              <span className="font-semibold">MediTriage +</span>
            </Link>
            <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Choose your role to access the right workspace.
            </p>
            <form onSubmit={submit} className="mt-6 space-y-4">
              <div>
                <Label htmlFor="full_name">Full name</Label>
                <Input id="full_name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" autoComplete="new-password" minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
                <p className="mt-1 text-xs text-muted-foreground">At least 8 characters.</p>
              </div>
              <div>
                <Label>Role</Label>
                <RadioGroup
                  value={form.role}
                  onValueChange={(v) => setForm({ ...form, role: v as "patient" | "doctor" })}
                  className="mt-2 grid grid-cols-2 gap-2"
                >
                  {[
                    { v: "patient", icon: UserIcon, label: "Patient" },
                    { v: "doctor", icon: Stethoscope, label: "Doctor" },
                  ].map((r) => (
                    <label
                      key={r.v}
                      className="flex cursor-pointer items-center gap-2 rounded-xl border p-3 text-sm transition has-[:checked]:border-primary has-[:checked]:bg-accent"
                    >
                      <RadioGroupItem value={r.v} id={`role-${r.v}`} className="sr-only" />
                      <r.icon className="h-4 w-4 text-primary" />
                      {r.label}
                    </label>
                  ))}
                </RadioGroup>
              </div>
              <Button type="submit" className="w-full shadow-soft" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create account"}
              </Button>
            </form>
            <p className="mt-6 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to="/auth/sign-in" className="font-medium text-primary hover:underline">Sign in</Link>
            </p>
          </div>
        </div>

        {/* Brand panel */}
        <div className="relative hidden flex-col justify-between bg-gradient-hero p-10 text-primary-foreground lg:flex">
          <div className="ml-auto rounded-xl bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
            LAKSHYAVEDH 2K26
          </div>
          <div>
            <h2 className="text-3xl font-semibold leading-tight">Join the smart triage workflow.</h2>
            <p className="mt-3 text-primary-foreground/85">
              From patient self-intake to AI-assisted differentials and clinician
              notes — all in one secure workspace.
            </p>
          </div>
          <p className="text-xs text-primary-foreground/70">For research and decision support only — not a medical device.</p>
        </div>
      </div>
    </div>
  );
}
