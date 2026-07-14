import Link from "next/link";
import {
  CheckCircle2,
  FileText,
  Gauge,
  MessagesSquare,
  ShieldCheck,
} from "lucide-react";

import { Hero } from "@/components/marketing/hero";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PLANS } from "@/lib/billing/plans";

const PLAN_TAGLINES = {
  free: "Get started: one Peel Brief and one active interview per month.",
  plus: "Unlimited interviews and briefs (fair use), full practice and story tools.",
  pro: "Higher limits, advanced practice, and readiness analytics.",
} as const;

const STEPS = [
  {
    title: "1 · Add your interview",
    description:
      "Company, role, interviewer, and your résumé — everything PeelPrep needs, in one guided flow.",
  },
  {
    title: "2 · Get your Peel Brief",
    description:
      "A personalized briefing: company context, role analysis, likely questions, and the stories to tell.",
  },
  {
    title: "3 · Practice and walk in ready",
    description:
      "Typed mock interviews with structured feedback and a transparent readiness score.",
  },
] as const;

export default function LandingPage() {
  return (
    <div>
      <Hero />

      <div className="mx-auto -mt-4 flex max-w-3xl flex-col items-center gap-3 px-6 pb-20 sm:flex-row sm:justify-center">
        <Button asChild size="lg">
          <Link href="/signup">Create your free account</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/how-it-works">See how it works</Link>
        </Button>
      </div>

      <Section aria-label="The problem">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight">
            Interview prep is scattered and stressful
          </h2>
          <p className="mt-4 text-muted-foreground text-pretty">
            You dig through the company site, re-read the job description, guess
            at questions, and hope you remember your best stories under
            pressure. PeelPrep pulls it together into one focused plan —
            grounded only in what you provide, never invented.
          </p>
        </div>
      </Section>

      <Section aria-label="How PeelPrep works" className="bg-secondary/30">
        <div className="mx-auto grid max-w-5xl gap-6 sm:grid-cols-3">
          {STEPS.map((step) => (
            <Card key={step.title} className="bg-background">
              <CardHeader>
                <CardTitle className="text-lg">{step.title}</CardTitle>
                <CardDescription>{step.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </Section>

      <Section aria-label="What you get">
        <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
          <Feature
            icon={<FileText className="size-5" aria-hidden="true" />}
            title="The Peel Brief"
            body="Company priorities, role analysis, respectful interviewer context, likely themes, and questions to ask — each labeled AI guidance, with sources shown and general knowledge marked."
          />
          <Feature
            icon={<MessagesSquare className="size-5" aria-hidden="true" />}
            title="Typed mock interviews"
            body="One question at a time, follow-ups, and structured per-answer feedback that coaches the answer as delivered — never a judgment about you."
          />
          <Feature
            icon={<Gauge className="size-5" aria-hidden="true" />}
            title="Transparent readiness"
            body="A 0–100 score calculated from your real prep, with an explanation for every category. It measures preparation, never guarantees an outcome."
          />
        </div>
      </Section>

      <Section aria-label="Pricing" className="bg-secondary/30">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-semibold tracking-tight">
              Simple, honest pricing
            </h2>
            <p className="mt-2 text-muted-foreground">
              Start free. Upgrade when you want deeper analysis and more
              practice.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {(["free", "plus", "pro"] as const).map((key) => {
              const plan = PLANS[key];
              return (
                <Card key={key} className="bg-background">
                  <CardHeader>
                    <CardTitle>{plan.name}</CardTitle>
                    <p className="text-2xl font-bold">
                      {plan.priceCentsMonthly === 0
                        ? "Free"
                        : `$${plan.priceCentsMonthly / 100}/mo`}
                    </p>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    {PLAN_TAGLINES[key]}
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <div className="mt-6 text-center">
            <Button asChild variant="outline">
              <Link href="/pricing">Compare plans</Link>
            </Button>
          </div>
        </div>
      </Section>

      <Section aria-label="Privacy and trust">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 text-center">
          <ShieldCheck className="size-8 text-success" aria-hidden="true" />
          <h2 className="text-3xl font-semibold tracking-tight">
            Your career data stays yours
          </h2>
          <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
            <TrustItem>
              Row-level security isolates every user&apos;s data.
            </TrustItem>
            <TrustItem>
              Résumés and files live in private storage with signed links.
            </TrustItem>
            <TrustItem>
              We never train models on your private content.
            </TrustItem>
            <TrustItem>
              Only public professional context is used about interviewers —
              never sensitive inferences.
            </TrustItem>
            <TrustItem>Export or delete everything, anytime.</TrustItem>
          </ul>
        </div>
      </Section>

      <Section aria-label="Get started" className="bg-primary/10">
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 text-center">
          <h2 className="text-3xl font-semibold tracking-tight">
            Walk in prepared
          </h2>
          <p className="text-muted-foreground">
            Turn your next interview into a plan you can act on.
          </p>
          <Button asChild size="lg">
            <Link href="/signup">Create your free account</Link>
          </Button>
        </div>
      </Section>
    </div>
  );
}

function Section({
  children,
  className,
  ...props
}: React.ComponentProps<"section">) {
  return (
    <section className={`px-6 py-16 ${className ?? ""}`} {...props}>
      {children}
    </section>
  );
}

function Feature({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex size-10 items-center justify-center rounded-lg bg-primary/15 text-[#13213c]">
        {icon}
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

function TrustItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-center justify-center gap-2">
      <CheckCircle2
        className="size-4 shrink-0 text-success"
        aria-hidden="true"
      />
      {children}
    </li>
  );
}
