import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Activity, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

export function AppHeader() {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.invalidate();
    navigate({ to: "/" });
  };

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-hero text-primary-foreground shadow-elegant">
            <Activity className="h-5 w-5" />
          </div>
          <span className="text-lg font-semibold tracking-tight">MediTriage AI</span>
        </Link>

        <nav className="flex items-center gap-2">
          {user ? (
            <>
              {role === "patient" && (
                <Link to="/patient">
                  <Button variant="ghost" size="sm">My Cases</Button>
                </Link>
              )}
              {(role === "doctor" || role === "admin") && (
                <Link to="/doctor">
                  <Button variant="ghost" size="sm">Queue</Button>
                </Link>
              )}
              {role === "admin" && (
                <Link to="/admin">
                  <Button variant="ghost" size="sm">Admin</Button>
                </Link>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <span className="max-w-[140px] truncate">{user.email}</span>
                    {role && <Badge variant="secondary" className="capitalize">{role}</Badge>}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem disabled className="text-xs">
                    Signed in as {user.email}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Link to="/auth/sign-in"><Button variant="ghost" size="sm">Sign in</Button></Link>
              <Link to="/auth/sign-up"><Button size="sm">Get started</Button></Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
