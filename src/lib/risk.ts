export const RISK_COLORS = {
  low: { bg: "bg-success/15", text: "text-success", border: "border-success/30", label: "Low" },
  moderate: { bg: "bg-warning/15", text: "text-warning", border: "border-warning/30", label: "Moderate" },
  high: { bg: "bg-destructive/15", text: "text-destructive", border: "border-destructive/40", label: "High" },
  critical: { bg: "bg-destructive/25", text: "text-destructive", border: "border-destructive/60", label: "Critical" },
} as const;

export type RiskLevel = keyof typeof RISK_COLORS;
