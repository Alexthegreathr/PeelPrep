import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { HeroPreview } from "@/components/marketing/hero-preview";

export function Hero() {
  return (
    <section className="relative overflow-hidden px-6 pt-20 pb-16 sm:pt-28">
      {/* Soft, brand-coloured ambient glow that gently drifts (decorative). */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        aria-hidden="true"
      >
        <div className="absolute left-1/4 -top-24 size-[32rem] rounded-full bg-primary/20 blur-[100px] motion-safe:animate-[peel-float_12s_ease-in-out_infinite]" />
        <div className="absolute right-1/4 top-10 size-96 rounded-full bg-success/12 blur-[90px] motion-safe:animate-[peel-float_15s_ease-in-out_infinite_reverse]" />
      </div>

      <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card/70 px-3 py-1 text-xs font-medium text-accent-foreground shadow-sm backdrop-blur motion-safe:animate-[fade-up_.6s_ease-out_both]">
          <Sparkles className="size-3.5" aria-hidden="true" />
          Beta in development
        </span>

        <h1 className="text-5xl leading-[1.02] font-medium text-balance motion-safe:animate-[fade-up_.6s_ease-out_.08s_both] sm:text-6xl md:text-7xl">
          Know the room.{" "}
          <span className="text-accent-foreground italic">
            Own the interview.
          </span>
        </h1>

        <p className="max-w-xl text-lg text-muted-foreground text-pretty motion-safe:animate-[fade-up_.6s_ease-out_.16s_both]">
          PeelPrep turns scattered interview research into one personalized
          briefing, a practice plan, and a transparent readiness score —
          grounded only in what you provide.
        </p>

        <div className="flex flex-col items-center gap-3 motion-safe:animate-[fade-up_.6s_ease-out_.24s_both] sm:flex-row">
          <Button asChild size="lg">
            <Link href="/signup">
              Create your free account{" "}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/how-it-works">See how it works</Link>
          </Button>
        </div>

        <p className="text-xs text-muted-foreground motion-safe:animate-[fade-up_.6s_ease-out_.32s_both]">
          Free to start · No credit card · Your data stays yours
        </p>
      </div>

      <HeroPreview />
    </section>
  );
}
