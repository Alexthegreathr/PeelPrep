import { Check, FileText, Gauge, MessagesSquare, Sparkles } from "lucide-react";

/**
 * Stylised, illustrative product preview for the hero — an idealised Peel Brief
 * + readiness snapshot. Presentational only; the data shown is decorative,
 * on-brand demonstration, not a claim about a real interview.
 */
export function HeroPreview() {
  return (
    <div className="relative mx-auto mt-14 w-full max-w-4xl px-4 motion-safe:animate-[fade-up_.8s_ease-out_.3s_both]">
      {/* Ambient colour behind the panel */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-8 -top-8 bottom-0 -z-10 rounded-[2.5rem] bg-gradient-to-tr from-primary/25 via-accent/20 to-success/15 blur-2xl"
      />

      {/* Floating accent chips */}
      <FloatChip className="-left-2 top-10 sm:left-6" delay="0s">
        <Check className="size-3.5 text-success" aria-hidden="true" /> Grounded
        in your sources
      </FloatChip>
      <FloatChip className="-right-1 top-24 sm:right-4" delay="1.4s">
        <Gauge className="size-3.5 text-accent-foreground" aria-hidden="true" />{" "}
        Readiness 80/100
      </FloatChip>
      <FloatChip className="bottom-6 left-1/2 -translate-x-1/2" delay="2.6s">
        <Sparkles
          className="size-3.5 text-accent-foreground"
          aria-hidden="true"
        />{" "}
        12 predicted questions
      </FloatChip>

      {/* The panel */}
      <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-2xl ring-1 ring-foreground/5">
        <div className="flex items-center gap-2 border-b bg-secondary/50 px-4 py-3">
          <span className="size-2.5 rounded-full bg-destructive/40" />
          <span className="size-2.5 rounded-full bg-primary/60" />
          <span className="size-2.5 rounded-full bg-success/50" />
          <span className="ml-2 font-mono text-[11px] tracking-wide text-muted-foreground">
            peelprep · Acme Fruit Logistics — Senior Engineer
          </span>
        </div>

        <div className="grid gap-5 p-5 sm:grid-cols-[1.6fr_1fr] sm:p-6">
          {/* Brief column */}
          <div className="flex flex-col gap-3">
            <p className="font-heading text-lg font-semibold">Peel Brief</p>
            <BriefRow
              icon={<FileText className="size-4" />}
              label="Company overview"
              done
            />
            <BriefRow
              icon={<FileText className="size-4" />}
              label="Role analysis"
              done
            />
            <BriefRow
              icon={<MessagesSquare className="size-4" />}
              label="Likely questions & themes"
              done
            />
            <BriefRow
              icon={<Sparkles className="size-4" />}
              label="Stories to tell"
            />
          </div>

          {/* Readiness column */}
          <div className="flex flex-col items-center justify-center gap-2 rounded-xl bg-secondary/40 p-4">
            <Ring value={80} />
            <p className="text-xs font-medium">Readiness</p>
            <p className="text-center text-[11px] text-muted-foreground">
              Calculated from your prep — never guessed.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function BriefRow({
  icon,
  label,
  done = false,
}: {
  icon: React.ReactNode;
  label: string;
  done?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-background/60 px-3 py-2.5">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary/30 to-accent/20 text-accent-foreground">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{label}</p>
        <div className="mt-1.5 flex flex-col gap-1">
          <span className="h-1.5 w-full rounded-full bg-muted-foreground/15" />
          <span className="h-1.5 w-4/5 rounded-full bg-muted-foreground/10" />
        </div>
      </div>
      {done ? (
        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
          <Check className="size-3.5" aria-hidden="true" />
        </span>
      ) : (
        <span className="size-5 shrink-0 rounded-full border-2 border-dashed border-muted-foreground/30" />
      )}
    </div>
  );
}

function Ring({ value }: { value: number }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - value / 100);
  return (
    <div className="relative flex size-24 items-center justify-center">
      <svg width="96" height="96" className="-rotate-90" aria-hidden="true">
        <defs>
          <linearGradient id="heroRing" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#7bc088" />
            <stop offset="100%" stopColor="#4d7b55" />
          </linearGradient>
        </defs>
        <circle
          cx="48"
          cy="48"
          r={r}
          fill="none"
          strokeWidth="9"
          className="stroke-secondary"
        />
        <circle
          cx="48"
          cy="48"
          r={r}
          fill="none"
          strokeWidth="9"
          strokeLinecap="round"
          stroke="url(#heroRing)"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="absolute text-2xl font-bold tabular-nums">{value}</span>
    </div>
  );
}

function FloatChip({
  children,
  className = "",
  delay = "0s",
}: {
  children: React.ReactNode;
  className?: string;
  delay?: string;
}) {
  return (
    <div
      className={`absolute z-10 hidden items-center gap-1.5 rounded-full border bg-card px-3 py-1.5 text-xs font-medium shadow-lg motion-safe:animate-[float-soft_6s_ease-in-out_infinite] sm:flex ${className}`}
      style={{ animationDelay: delay }}
    >
      {children}
    </div>
  );
}
