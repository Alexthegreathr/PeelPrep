import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  Gauge,
  MessagesSquare,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { Hero } from "@/components/marketing/hero";
import { Button } from "@/components/ui/button";
import { PLANS, type PlanKey } from "@/lib/billing/plans";

const PLAN_TAGLINES: Record<PlanKey, string> = {
  free: "One Peel Brief and one active interview to try it out.",
  plus: "Unlimited interviews and briefs, full practice, and story tools.",
  pro: "Everything in Plus, plus on-device Video Delivery Analysis.",
};

const STEPS = [
  {
    title: "Add your interview",
    description:
      "Company, role, interviewer, and your résumé — everything PeelPrep needs, in one guided flow.",
    icon: <FileText className="size-5" aria-hidden="true" />,
  },
  {
    title: "Get your Peel Brief",
    description:
      "A personalized briefing: company context, role analysis, likely questions, and the stories to tell.",
    icon: <Sparkles className="size-5" aria-hidden="true" />,
  },
  {
    title: "Practice, then walk in ready",
    description:
      "Typed mock interviews with structured feedback and a transparent readiness score.",
    icon: <Gauge className="size-5" aria-hidden="true" />,
  },
] as const;

export default function LandingPage() {
  return (
    <div>
      <Hero />

      {/* Problem */}
      <Section>
        <div className="mx-auto max-w-2xl text-center">
          <Eyebrow>The problem</Eyebrow>
          <h2 className="mt-3 text-3xl font-medium text-balance sm:text-4xl">
            Interview prep is scattered and stressful
          </h2>
          <p className="mt-5 text-lg text-muted-foreground text-pretty">
            You dig through the company site, re-read the job description, guess
            at questions, and hope you remember your best stories under
            pressure. PeelPrep pulls it together into one focused plan —
            grounded only in what you provide, never invented.
          </p>
        </div>
      </Section>

      {/* How it works */}
      <Section muted>
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <Eyebrow>How it works</Eyebrow>
            <h2 className="mt-3 text-3xl font-medium sm:text-4xl">
              From a blank page to a plan, in three steps
            </h2>
          </div>
          <ol className="grid gap-6 sm:grid-cols-3">
            {STEPS.map((step, i) => (
              <li
                key={step.title}
                className="group relative flex flex-col gap-3 rounded-2xl border bg-card p-6 shadow-sm transition-transform hover:-translate-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary/30 to-accent/20 text-accent-foreground">
                    {step.icon}
                  </span>
                  <span className="font-heading text-4xl font-semibold text-primary/30 tabular-nums">
                    {i + 1}
                  </span>
                </div>
                <h3 className="font-heading text-lg font-semibold">
                  {step.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {step.description}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </Section>

      {/* Features */}
      <Section>
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <Eyebrow>What you get</Eyebrow>
            <h2 className="mt-3 text-3xl font-medium sm:text-4xl">
              Everything for the interview, in one place
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {/* Lead feature — elevated and spanning the full height beside the two supporting cards. */}
            <div className="group relative flex flex-col gap-4 overflow-hidden rounded-2xl border border-primary/50 bg-card p-7 shadow-sm ring-1 ring-primary/10 transition-transform hover:-translate-y-1 md:row-span-2">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-primary/60 to-transparent"
              />
              <div className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/40 to-accent/25 text-accent-foreground transition-transform group-hover:scale-105">
                <FileText className="size-6" aria-hidden="true" />
              </div>
              <h3 className="font-heading text-xl font-semibold">
                The Peel Brief
              </h3>
              <p className="text-sm text-muted-foreground">
                Company priorities, role analysis, respectful interviewer
                context, likely themes, and questions to ask — each labeled AI
                guidance, with sources shown.
              </p>
            </div>
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
        </div>
      </Section>

      {/* Pricing */}
      <Section muted>
        <div className="mx-auto max-w-5xl">
          <div className="mb-10 text-center">
            <Eyebrow>Pricing</Eyebrow>
            <h2 className="mt-3 text-3xl font-medium sm:text-4xl">
              Simple, honest pricing
            </h2>
            <p className="mt-3 text-muted-foreground">
              Start free. Upgrade when you want deeper analysis and more
              practice.
            </p>
          </div>
          <div className="grid items-start gap-6 md:grid-cols-3">
            {(["free", "plus", "pro"] as const).map((key) => {
              const plan = PLANS[key];
              const featured = key === "plus";
              return (
                <div
                  key={key}
                  className={`relative flex flex-col gap-4 rounded-2xl border bg-card p-6 shadow-sm ${
                    featured
                      ? "border-primary/60 shadow-lg ring-1 ring-primary/30 md:-translate-y-2"
                      : ""
                  }`}
                >
                  {featured ? (
                    <span className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow">
                      Most popular
                    </span>
                  ) : null}
                  <p className="font-heading text-lg font-semibold">
                    {plan.name}
                  </p>
                  <p className="text-3xl font-bold tabular-nums">
                    ${plan.priceCentsMonthly / 100}
                    <span className="text-base font-medium text-muted-foreground">
                      /mo
                    </span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {PLAN_TAGLINES[key]}
                  </p>
                  <Button
                    asChild
                    variant={featured ? "default" : "outline"}
                    className="mt-1"
                  >
                    <Link href="/signup">
                      {key === "free" ? "Get started" : `Choose ${plan.name}`}
                    </Link>
                  </Button>
                </div>
              );
            })}
          </div>
          <div className="mt-8 text-center">
            <Link
              href="/pricing"
              className="text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Compare all features →
            </Link>
          </div>
        </div>
      </Section>

      {/* Trust */}
      <Section>
        <div className="mx-auto max-w-3xl">
          <div className="mb-8 text-center">
            <span className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-success/12 text-success">
              <ShieldCheck className="size-6" aria-hidden="true" />
            </span>
            <h2 className="text-3xl font-medium sm:text-4xl">
              Your career data stays yours
            </h2>
          </div>
          <ul className="mx-auto grid max-w-2xl gap-3 sm:grid-cols-2">
            <TrustItem>
              Row-level security isolates every user’s data.
            </TrustItem>
            <TrustItem>
              Résumés and files live in private storage with signed links.
            </TrustItem>
            <TrustItem>
              We never train models on your private content.
            </TrustItem>
            <TrustItem>
              Only public professional context about interviewers — never
              sensitive inferences.
            </TrustItem>
            <TrustItem>Export or delete everything, anytime.</TrustItem>
            <TrustItem>
              On-device video analysis — nothing leaves your browser.
            </TrustItem>
          </ul>
        </div>
      </Section>

      {/* Final CTA */}
      <section className="px-6 pb-20">
        <div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl bg-gradient-to-br from-sidebar to-sidebar-accent px-8 py-16 text-center text-sidebar-foreground shadow-xl sm:px-16">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -top-16 size-72 rounded-full bg-primary/25 blur-3xl"
          />
          <h2 className="text-3xl font-medium text-balance sm:text-4xl">
            Walk in prepared
          </h2>
          <p className="mx-auto mt-4 max-w-md text-sidebar-foreground/80">
            Turn your next interview into a plan you can act on — free to start.
          </p>
          <Button asChild size="lg" className="mt-8">
            <Link href="/signup">
              Create your free account{" "}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}

function Section({
  children,
  muted = false,
  ...props
}: React.ComponentProps<"section"> & { muted?: boolean }) {
  return (
    <section
      className={`px-6 py-16 sm:py-20 ${muted ? "bg-secondary/30" : ""}`}
      {...props}
    >
      {children}
    </section>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-accent-foreground">
      {children}
    </span>
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
    <div className="group flex flex-col gap-3 rounded-2xl border bg-card p-6 shadow-sm transition-transform hover:-translate-y-1">
      <div className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary/30 to-accent/20 text-accent-foreground transition-transform group-hover:scale-105">
        {icon}
      </div>
      <h3 className="font-heading text-lg font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

function TrustItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 rounded-xl border bg-card px-4 py-3 text-sm shadow-sm">
      <CheckCircle2
        className="mt-0.5 size-4 shrink-0 text-success"
        aria-hidden="true"
      />
      <span className="text-muted-foreground">{children}</span>
    </li>
  );
}
