import { Badge } from "@/components/ui/badge";

export function Hero() {
  return (
    <section className="relative mx-auto flex max-w-3xl flex-col items-center gap-6 overflow-hidden px-6 pt-24 pb-16 text-center">
      {/* Soft, brand-coloured ambient glow that gently drifts (decorative). */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        aria-hidden="true"
      >
        <div className="absolute -left-16 top-4 size-72 rounded-full bg-primary/25 blur-3xl motion-safe:animate-[peel-float_9s_ease-in-out_infinite]" />
        <div className="absolute -right-10 top-20 size-64 rounded-full bg-success/15 blur-3xl motion-safe:animate-[peel-float_11s_ease-in-out_infinite_reverse]" />
        <div className="absolute left-1/3 -top-8 size-56 rounded-full bg-accent/40 blur-3xl motion-safe:animate-[peel-float_13s_ease-in-out_infinite]" />
      </div>

      <Badge
        variant="secondary"
        className="motion-safe:animate-[fade-up_.6s_ease-out_both]"
      >
        Beta in development
      </Badge>
      <h1 className="text-5xl font-medium text-balance motion-safe:animate-[fade-up_.6s_ease-out_.08s_both] sm:text-6xl">
        Know the room.{" "}
        <span className="text-accent-foreground italic">
          Own the interview.
        </span>
      </h1>
      <p className="max-w-xl text-lg text-muted-foreground text-pretty motion-safe:animate-[fade-up_.6s_ease-out_.16s_both]">
        PeelPrep turns scattered interview research into a personalized
        briefing, practice plan, and confidence boost.
      </p>
    </section>
  );
}
