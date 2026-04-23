import { createFileRoute, Link } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RequireAuth";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/AppShell";
import { CalendarClock, Loader2, Plus, Stethoscope, Check, X, Video, Phone, MapPin } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const apptSearchSchema = z.object({
  intake: z.string().optional(),
  complaint: z.string().optional(),
});

export const Route = createFileRoute("/appointments")({
  validateSearch: (s) => apptSearchSchema.parse(s),
  head: () => ({ meta: [{ title: "Appointments — MediTriage AI" }] }),
  component: () => (
    <RequireAuth>
      <AppointmentsPage />
    </RequireAuth>
  ),
});

interface Appt {
  id: string;
  patient_id: string;
  doctor_id: string | null;
  intake_id: string | null;
  preferred_at: string;
  mode: "in_person" | "video" | "phone";
  reason: string | null;
  doctor_message: string | null;
  status: "requested" | "confirmed" | "declined" | "completed" | "cancelled";
  created_at: string;
  patient_name?: string;
  patient_email?: string;
}

const statusTone: Record<Appt["status"], string> = {
  requested: "bg-warning/15 text-warning border-warning/30",
  confirmed: "bg-success/15 text-success border-success/30",
  declined: "bg-destructive/10 text-destructive border-destructive/30",
  completed: "bg-muted text-muted-foreground border-border",
  cancelled: "bg-muted text-muted-foreground border-border",
};

const ModeIcon = ({ mode }: { mode: Appt["mode"] }) =>
  mode === "video" ? <Video className="h-3.5 w-3.5" /> : mode === "phone" ? <Phone className="h-3.5 w-3.5" /> : <MapPin className="h-3.5 w-3.5" />;

function AppointmentsPage() {
  const { user, role } = useAuth();
  const search = Route.useSearch();
  const [items, setItems] = useState<Appt[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(Boolean(search.intake));
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    preferred_at: "",
    mode: "in_person" as Appt["mode"],
    reason: search.complaint ? `Follow-up on: ${search.complaint}` : "",
  });

  const isClinician = role === "doctor" || role === "admin";

  const load = async () => {
    setLoading(true);
    let q = supabase.from("appointments").select("*").order("preferred_at", { ascending: true });
    if (!isClinician && user) q = q.eq("patient_id", user.id);
    const { data } = await q;
    let rows = (data ?? []) as Appt[];

    if (isClinician && rows.length) {
      const ids = Array.from(new Set(rows.map((r) => r.patient_id)));
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", ids);
      const map = Object.fromEntries((profiles ?? []).map((p: any) => [p.id, p]));
      rows = rows.map((r) => ({
        ...r,
        patient_name: map[r.patient_id]?.full_name ?? undefined,
        patient_email: map[r.patient_id]?.email ?? undefined,
      }));
    }

    setItems(rows);
    setLoading(false);
  };

  useEffect(() => {
    if (user) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, role]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !form.preferred_at) return;
    setCreating(true);
    const { error } = await (supabase.from("appointments") as any).insert({
      patient_id: user.id,
      intake_id: search.intake ?? null,
      preferred_at: new Date(form.preferred_at).toISOString(),
      mode: form.mode,
      reason: form.reason || null,
    });
    setCreating(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Appointment requested");
    setShowNew(false);
    setForm({ preferred_at: "", mode: "in_person", reason: "" });
    load();
  };

  const updateStatus = async (id: string, status: Appt["status"], doctor_message?: string) => {
    const patch: Record<string, unknown> = { status };
    if (isClinician && user) patch.doctor_id = user.id;
    if (doctor_message !== undefined) patch.doctor_message = doctor_message;
    const { error } = await (supabase.from("appointments") as any).update(patch).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Updated");
    load();
  };

  return (
    <div className="p-6 md:p-8">
      <PageHeader
        title="Appointments"
        subtitle={isClinician ? "Confirm or reschedule patient consultations." : "Book and track your visits with the medical team."}
        actions={
          !isClinician && (
            <Button className="gap-2 shadow-soft" onClick={() => setShowNew((s) => !s)}>
              <Plus className="h-4 w-4" /> Request appointment
            </Button>
          )
        }
      />

      {showNew && !isClinician && (
        <Card className="mt-6 p-6">
          <form onSubmit={create} className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Preferred date & time</Label>
              <Input
                type="datetime-local"
                required
                value={form.preferred_at}
                onChange={(e) => setForm({ ...form, preferred_at: e.target.value })}
              />
            </div>
            <div>
              <Label>Consultation mode</Label>
              <select
                className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.mode}
                onChange={(e) => setForm({ ...form, mode: e.target.value as Appt["mode"] })}
              >
                <option value="in_person">In person</option>
                <option value="video">Video call</option>
                <option value="phone">Phone</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <Label>Reason (optional)</Label>
              <Textarea
                placeholder="Briefly describe why you'd like to see a doctor"
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
              />
            </div>
            <div className="md:col-span-2 flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setShowNew(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={creating}>
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit request"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className="mt-6 space-y-3">
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : items.length === 0 ? (
          <Card className="p-10 text-center text-muted-foreground">
            <CalendarClock className="mx-auto h-8 w-8 opacity-60" />
            <p className="mt-3">No appointments yet.</p>
          </Card>
        ) : (
          items.map((a) => (
            <Card key={a.id} className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-mint text-primary">
                  <Stethoscope className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium">
                    {format(new Date(a.preferred_at), "PPP 'at' p")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {isClinician
                      ? a.patient_name || a.patient_email || "Patient"
                      : "Consultation request"}
                    {a.reason ? ` · ${a.reason}` : ""}
                  </p>
                  {a.doctor_message && (
                    <p className="mt-1 text-xs text-muted-foreground italic">
                      Doctor: {a.doctor_message}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground capitalize">
                  <ModeIcon mode={a.mode} /> {a.mode.replace("_", " ")}
                </span>
                <Badge variant="outline" className={`capitalize ${statusTone[a.status]}`}>
                  {a.status}
                </Badge>
                {isClinician && a.status === "requested" && (
                  <>
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => updateStatus(a.id, "confirmed")}>
                      <Check className="h-3.5 w-3.5" /> Confirm
                    </Button>
                    <Button size="sm" variant="ghost" className="gap-1 text-destructive" onClick={() => updateStatus(a.id, "declined")}>
                      <X className="h-3.5 w-3.5" /> Decline
                    </Button>
                  </>
                )}
                {isClinician && a.status === "confirmed" && (
                  <Button size="sm" variant="outline" onClick={() => updateStatus(a.id, "completed")}>
                    Mark completed
                  </Button>
                )}
                {!isClinician && (a.status === "requested" || a.status === "confirmed") && (
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => updateStatus(a.id, "cancelled")}>
                    Cancel
                  </Button>
                )}
                {a.intake_id && (
                  <Link to="/cases/$id" params={{ id: a.intake_id }}>
                    <Button size="sm" variant="ghost">View case</Button>
                  </Link>
                )}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
