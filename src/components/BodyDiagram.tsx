import { cn } from "@/lib/utils";

export const BODY_REGIONS = [
  { id: "head", label: "Head" },
  { id: "neck", label: "Neck" },
  { id: "chest", label: "Chest" },
  { id: "abdomen", label: "Abdomen" },
  { id: "pelvis", label: "Pelvis" },
  { id: "left_arm", label: "Left arm" },
  { id: "right_arm", label: "Right arm" },
  { id: "left_leg", label: "Left leg" },
  { id: "right_leg", label: "Right leg" },
  { id: "back", label: "Back" },
] as const;

export type BodyRegionId = (typeof BODY_REGIONS)[number]["id"];

interface Props {
  selected: string[];
  onToggle?: (id: string) => void;
  /** when true, regions are not clickable — used for read-only displays */
  readOnly?: boolean;
  /** Risk colour to use for the highlight. Defaults to primary. */
  highlightTone?: "primary" | "warning" | "destructive" | "success";
  className?: string;
}

const toneFill: Record<NonNullable<Props["highlightTone"]>, string> = {
  primary: "fill-[oklch(0.74_0.12_195_/_0.55)]",
  warning: "fill-[oklch(0.78_0.16_75_/_0.55)]",
  destructive: "fill-[oklch(0.65_0.22_25_/_0.55)]",
  success: "fill-[oklch(0.64_0.15_155_/_0.55)]",
};
const toneStroke: Record<NonNullable<Props["highlightTone"]>, string> = {
  primary: "stroke-[oklch(0.55_0.13_200)]",
  warning: "stroke-[oklch(0.55_0.16_60)]",
  destructive: "stroke-[oklch(0.50_0.22_25)]",
  success: "stroke-[oklch(0.45_0.15_155)]",
};

export function BodyDiagram({
  selected,
  onToggle,
  readOnly = false,
  highlightTone = "primary",
  className,
}: Props) {
  const has = (id: string) => selected.includes(id);
  const fill = toneFill[highlightTone];
  const stroke = toneStroke[highlightTone];

  const handle = (id: string) => () => {
    if (!readOnly && onToggle) onToggle(id);
  };

  // Base region styling
  const base =
    "transition-all duration-200 fill-[oklch(0.88_0.02_200)] stroke-[oklch(0.78_0.02_220)] stroke-[1.2]";
  const hover = !readOnly ? "cursor-pointer hover:fill-[oklch(0.84_0.05_195)]" : "";
  const active = (id: string) =>
    has(id) ? `${fill} ${stroke} stroke-[2]` : "";

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <svg
        viewBox="0 0 200 360"
        xmlns="http://www.w3.org/2000/svg"
        className="h-72 w-auto md:h-96"
        role="img"
        aria-label="Interactive body diagram"
      >
        {/* Soft platform shadow */}
        <ellipse cx="100" cy="350" rx="60" ry="6" fill="oklch(0.85 0.02 220 / 0.45)" />

        {/* Head */}
        <circle
          cx="100" cy="28" r="22"
          className={cn(base, hover, active("head"))}
          onClick={handle("head")}
        >
          <title>Head</title>
        </circle>

        {/* Neck */}
        <rect
          x="92" y="48" width="16" height="14" rx="3"
          className={cn(base, hover, active("neck"))}
          onClick={handle("neck")}
        >
          <title>Neck</title>
        </rect>

        {/* Chest (upper torso) */}
        <path
          d="M70 64 Q100 58 130 64 L132 130 Q100 138 68 130 Z"
          className={cn(base, hover, active("chest"))}
          onClick={handle("chest")}
        >
          <title>Chest</title>
        </path>

        {/* Abdomen */}
        <path
          d="M70 132 Q100 138 132 132 L130 178 Q100 184 70 178 Z"
          className={cn(base, hover, active("abdomen"))}
          onClick={handle("abdomen")}
        >
          <title>Abdomen</title>
        </path>

        {/* Pelvis */}
        <path
          d="M70 180 Q100 186 130 180 L126 214 Q100 222 74 214 Z"
          className={cn(base, hover, active("pelvis"))}
          onClick={handle("pelvis")}
        >
          <title>Pelvis</title>
        </path>

        {/* Right arm (viewer's left) — patient's right */}
        <path
          d="M64 70 L52 86 L40 158 L48 168 L58 162 L66 96 Z"
          className={cn(base, hover, active("right_arm"))}
          onClick={handle("right_arm")}
        >
          <title>Right arm</title>
        </path>

        {/* Left arm (viewer's right) — patient's left */}
        <path
          d="M136 70 L148 86 L160 158 L152 168 L142 162 L134 96 Z"
          className={cn(base, hover, active("left_arm"))}
          onClick={handle("left_arm")}
        >
          <title>Left arm</title>
        </path>

        {/* Right leg */}
        <path
          d="M76 218 L70 322 L82 332 L92 322 L92 218 Z"
          className={cn(base, hover, active("right_leg"))}
          onClick={handle("right_leg")}
        >
          <title>Right leg</title>
        </path>

        {/* Left leg */}
        <path
          d="M124 218 L130 322 L118 332 L108 322 L108 218 Z"
          className={cn(base, hover, active("left_leg"))}
          onClick={handle("left_leg")}
        >
          <title>Left leg</title>
        </path>

        {/* Back marker (lower spine indicator) — small button on the side */}
        <g
          onClick={handle("back")}
          className={!readOnly ? "cursor-pointer" : undefined}
        >
          <circle
            cx="172" cy="150" r="10"
            className={cn(
              "transition-all fill-[oklch(0.94_0.02_220)] stroke-[oklch(0.78_0.02_220)] stroke-[1.2]",
              !readOnly && "hover:fill-[oklch(0.88_0.05_195)]",
              has("back") && `${fill} ${stroke} stroke-[2]`,
            )}
          >
            <title>Back</title>
          </circle>
          <text x="172" y="153" textAnchor="middle" fontSize="8" className="fill-foreground/70 select-none pointer-events-none">
            Back
          </text>
        </g>
      </svg>

      {selected.length > 0 && (
        <div className="mt-3 flex flex-wrap justify-center gap-1.5">
          {selected.map((id) => {
            const r = BODY_REGIONS.find((b) => b.id === id);
            return (
              <span
                key={id}
                className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs text-primary"
              >
                {r?.label ?? id}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
