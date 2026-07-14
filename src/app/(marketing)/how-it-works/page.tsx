import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "Add your interview, generate a personalized Peel Brief, practice with structured feedback, and track a transparent readiness score.",
};

const STEPS = [
  {
    n: 1,
    title: "Add your interview",
    body: "Tell PeelPrep about the opportunity — company, role, job description, interview logistics, and interviewers — and select or upload your résumé. It takes a few minutes and saves as you go.",
  },
  {
    n: 2,
    title: "Generate your Peel Brief",
    body: "PeelPrep builds a personalized briefing section by section, grounded in what you provided. You'll see live progress, source labels, and can regenerate or add notes to any section.",
  },
  {
    n: 3,
    title: "Save questions & build stories",
    body: "Review predicted questions by category, save the ones you'll practice, and build a reusable bank of STAR stories — linking the right story to each question.",
  },
  {
    n: 4,
    title: "Practice with feedback",
    body: "Run typed mock interviews one question at a time. Afterward, request structured feedback on each answer to sharpen your delivery — without memorizing scripts.",
  },
  {
    n: 5,
    title: "Track readiness & record outcomes",
    body: "Watch a transparent readiness score rise as you prepare, follow the recommended next action, and record how each interview went to improve your next one.",
  },
] as const;

export default function HowItWorksPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-semibold tracking-tight">How it works</h1>
        <p className="mt-3 text-muted-foreground">
          From a blank page to a walk-in-ready plan in five steps.
        </p>
      </div>
      <ol className="flex flex-col gap-8">
        {STEPS.map((step) => (
          <li key={step.n} className="flex gap-4">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground">
              {step.n}
            </span>
            <div>
              <h2 className="text-lg font-semibold">{step.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-12 text-center">
        <Button asChild size="lg">
          <Link href="/signup">Start preparing free</Link>
        </Button>
      </div>
    </div>
  );
}
