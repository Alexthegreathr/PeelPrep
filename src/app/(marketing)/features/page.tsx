import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Features",
  description:
    "The Peel Brief, predicted questions, a reusable story bank, typed mock interviews, and a transparent readiness score.",
};

const FEATURES = [
  {
    title: "The Peel Brief",
    body: "A personalized briefing generated section by section: company overview and priorities, role analysis against your résumé, respectful interviewer context, likely themes, questions to ask, risks to prepare for, and a recommended next action. Every AI section is labeled, timestamped, shows its sources, and marks general knowledge as unverified.",
  },
  {
    title: "Predicted questions",
    body: "Likely questions across every category — behavioral, technical, situational, and more — each with why it may be asked, what it evaluates, and a suggested structure. Save the ones you'll practice and link the stories you'll tell. Clearly marked as suggestions, not guarantees.",
  },
  {
    title: "Reusable story bank",
    body: "Build STAR stories once and reuse them across every interview. AI can draft an outline from facts you've provided — it never invents experiences or measurements, and asks you for anything missing.",
  },
  {
    title: "Typed mock interviews",
    body: "Practice one question at a time with relevant follow-ups, then get structured feedback on each answer: relevance, clarity, structure, specificity, evidence, and more — describing the answer as delivered, never judging you as a person.",
  },
  {
    title: "Transparent readiness score",
    body: "A 0–100 score computed deterministically from your preparation, with an explanation for every category and one recommended next action. It measures readiness, never guarantees an outcome — and a perfect score needs no camera.",
  },
  {
    title: "Privacy by design",
    body: "Row-level security, private file storage with signed links, server-enforced limits, full data export, and one-click account deletion. We never train models on your private content.",
  },
] as const;

export default function FeaturesPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-semibold tracking-tight">
          Everything you need to walk in prepared
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
          PeelPrep turns one upcoming interview into a personalized briefing,
          practice plan, and confidence boost — grounded in what you provide.
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        {FEATURES.map((f) => (
          <Card key={f.title}>
            <CardHeader>
              <CardTitle>{f.title}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {f.body}
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="mt-10 text-center">
        <Button asChild size="lg">
          <Link href="/signup">Get started free</Link>
        </Button>
      </div>
    </div>
  );
}
