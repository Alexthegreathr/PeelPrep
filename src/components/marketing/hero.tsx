import { Badge } from "@/components/ui/badge";

export function Hero() {
  return (
    <section className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-6 pt-24 pb-16 text-center">
      <Badge variant="secondary">Beta in development</Badge>
      <h1 className="text-5xl font-semibold tracking-tight text-balance sm:text-6xl">
        Know the room.{" "}
        <span className="text-accent-foreground">Own the interview.</span>
      </h1>
      <p className="max-w-xl text-lg text-muted-foreground text-pretty">
        PeelPrep turns scattered interview research into a personalized
        briefing, practice plan, and confidence boost.
      </p>
    </section>
  );
}
