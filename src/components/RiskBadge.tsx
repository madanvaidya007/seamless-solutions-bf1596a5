import { RISK_COLORS, type RiskLevel } from "@/lib/risk";
import { cn } from "@/lib/utils";

export function RiskBadge({ level, score }: { level: RiskLevel; score?: number }) {
  const c = RISK_COLORS[level];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        c.bg,
        c.text,
        c.border,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {c.label}
      {typeof score === "number" && <span className="opacity-70">· {score}</span>}
    </span>
  );
}
