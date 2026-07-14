import Link from "next/link";

import { Hero } from "@/components/marketing/hero";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shared/logo";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const steps = [
  {
    title: "1 · Add your interview",
    description:
      "Company, role, interviewer, and your résumé — everything PeelPrep needs to prepare you, in one guided flow.",
  },
  {
    title: "2 · Get your Peel Brief",
    description:
      "A personalized briefing: company context, role analysis, likely questions, and the stories you should tell.",
  },
  {
    title: "3 · Practice and walk in ready",
    description:
      "Typed mock interviews with structured feedback and a transparent readiness score that shows what to do next.",
  },
] as const;

export default function LandingPage() {
  return (
    <main className="flex-1">
      <header className="border-b bg-secondary">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Logo />
          <nav className="flex items-center gap-2" aria-label="Account">
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/signup">Get started</Link>
            </Button>
          </nav>
        </div>
      </header>

      <Hero />

      <div className="mx-auto -mt-4 flex max-w-3xl flex-col items-center gap-3 px-6 pb-16 sm:flex-row sm:justify-center">
        <Button asChild size="lg">
          <Link href="/signup">Create your free account</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/login">Sign in</Link>
        </Button>
      </div>

      <section
        aria-label="How PeelPrep works"
        className="mx-auto grid max-w-5xl gap-6 px-6 pb-24 sm:grid-cols-3"
      >
        {steps.map((step) => (
          <Card key={step.title} className="bg-secondary/50">
            <CardHeader>
              <CardTitle>{step.title}</CardTitle>
              <CardDescription>{step.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </section>

      <footer className="border-t">
        <div className="mx-auto max-w-5xl px-6 py-8 text-sm text-muted-foreground">
          © {new Date().getFullYear()} PeelPrep. The full site — features,
          pricing, and sign-up — arrives with later phases.
        </div>
      </footer>
    </main>
  );
}
