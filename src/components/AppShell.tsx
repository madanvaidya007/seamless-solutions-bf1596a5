import { ReactNode } from "react";
import { Link, useLocation, useNavigate, useRouter } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import {
  Activity,
  LayoutDashboard,
  ClipboardList,
  Stethoscope,
  PlusCircle,
  ShieldCheck,
  LogOut,
  HelpCircle,
  Bell,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface NavItem {
  to: string;
  label: string;
  icon: typeof Activity;
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user, role, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.invalidate();
    navigate({ to: "/" });
  };

  const items: NavItem[] = [];
  if (role === "patient") {
    items.push({ to: "/patient", label: "My Cases", icon: LayoutDashboard });
    items.push({ to: "/patient/new", label: "New Assessment", icon: PlusCircle });
  }
  if (role === "doctor" || role === "admin") {
    items.push({ to: "/doctor", label: "Triage Queue", icon: Stethoscope });
    items.push({ to: "/patient/new", label: "New Intake", icon: PlusCircle });
  }
  if (role === "admin") {
    items.push({ to: "/admin", label: "Admin", icon: ShieldCheck });
  }

  const initials = (user?.email ?? "??").slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen p-3 md:p-5">
      <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] max-w-[1400px] overflow-hidden rounded-3xl bg-card shadow-elegant">
        {/* Sidebar */}
        <aside className="hidden w-64 flex-col bg-sidebar text-sidebar-foreground md:flex">
          <div className="flex items-center gap-2 px-6 py-6">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-hero text-primary-foreground shadow-soft">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <p className="text-base font-semibold leading-tight">MediTriage</p>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">AI Clinical Suite</p>
            </div>
          </div>

          <nav className="mt-2 flex-1 space-y-1 px-3">
            {items.map((it) => {
              const active = location.pathname === it.to;
              return (
                <Link
                  key={it.to}
                  to={it.to}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                    active
                      ? "bg-sidebar-accent text-primary shadow-soft"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                  )}
                >
                  <it.icon className={cn("h-4 w-4", active && "text-primary")} />
                  {it.label}
                </Link>
              );
            })}
          </nav>

          <div className="px-3 pb-3">
            <Link
              to="/"
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/60"
            >
              <HelpCircle className="h-4 w-4" /> About
            </Link>
            <button
              onClick={handleSignOut}
              className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/60"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </aside>

        {/* Main */}
        <div className="flex flex-1 flex-col overflow-hidden bg-gradient-subtle">
          <header className="flex items-center justify-between gap-3 border-b border-border/60 bg-card/40 px-6 py-4 backdrop-blur">
            {/* Mobile nav */}
            <div className="flex items-center gap-2 md:hidden">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-hero text-primary-foreground">
                <Activity className="h-4 w-4" />
              </div>
              <span className="font-semibold">MediTriage</span>
            </div>

            <div className="hidden flex-1 md:block">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {role ? `${role} workspace` : "Workspace"}
              </p>
              <p className="text-sm text-foreground/80">Welcome back{user?.email ? `, ${user.email.split("@")[0]}` : ""}.</p>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="rounded-full">
                <Bell className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2 rounded-full bg-card px-2 py-1 shadow-soft">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-hero text-xs font-semibold text-primary-foreground">
                  {initials}
                </div>
                <div className="hidden pr-2 text-left sm:block">
                  <p className="text-xs font-medium leading-tight">{user?.email}</p>
                  {role && <Badge variant="secondary" className="mt-0.5 h-4 capitalize">{role}</Badge>}
                </div>
              </div>
            </div>
          </header>

          {/* Mobile bottom nav */}
          <div className="flex gap-2 overflow-x-auto border-b border-border/60 bg-card/40 px-4 py-2 md:hidden">
            {items.map((it) => {
              const active = location.pathname === it.to;
              return (
                <Link key={it.to} to={it.to}>
                  <Button variant={active ? "default" : "ghost"} size="sm" className="gap-2 whitespace-nowrap">
                    <it.icon className="h-3.5 w-3.5" /> {it.label}
                  </Button>
                </Link>
              );
            })}
          </div>

          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
    </div>
  );
}

/** Reusable section heading used inside the shell */
export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
