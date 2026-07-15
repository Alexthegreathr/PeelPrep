import type { Metadata } from "next";

import {
  LegalPageShell,
  type LegalDocSection,
} from "@/components/marketing/legal-page-shell";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The terms that govern your use of PeelPrep, the AI-powered interview-preparation service.",
};

const INTRO = (
  <p>
    These Terms govern your use of PeelPrep, an AI-powered interview-preparation
    service. By creating an account you agree to these Terms and to our{" "}
    <a href="/privacy" className="underline underline-offset-4">
      Privacy Policy
    </a>
    . PeelPrep is currently a beta product provided for interview practice and
    preparation.
  </p>
);

const SECTIONS: LegalDocSection[] = [
  {
    heading: "Your account",
    body: (
      <p>
        You must provide an accurate email address and keep your credentials
        secure. You are responsible for activity under your account. You must
        verify your email before accessing the application, and you must be old
        enough to form a binding contract in your jurisdiction.
      </p>
    ),
  },
  {
    heading: "Acceptable use",
    body: (
      <>
        <p>You agree not to:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            upload content you do not have the right to share, or another
            person&rsquo;s private information;
          </li>
          <li>
            attempt to access other users&rsquo; data or circumvent security,
            usage limits, or authentication;
          </li>
          <li>
            use PeelPrep to harass an interviewer, or to seek out private,
            sensitive, or protected characteristics about any person;
          </li>
          <li>
            misuse the AI features to generate deceptive, discriminatory, or
            unlawful content.
          </li>
        </ul>
        <p>
          PeelPrep only uses public professional information to help you
          prepare, and asks you to do the same.
        </p>
      </>
    ),
  },
  {
    heading: "AI content and no guarantees",
    body: (
      <p>
        PeelPrep&rsquo;s briefs, predicted questions, story suggestions,
        feedback, and readiness scores are AI-assisted preparation guidance.
        They are suggestions, not verified facts, and are not guaranteed to
        match your real interview. PeelPrep does not guarantee that you will
        advance in a process or receive an offer, and nothing in the service
        should be read as such a promise. You are responsible for the answers
        you give in a real interview; do not present AI-generated content as
        your own factual experience.
      </p>
    ),
  },
  {
    heading: "Your content",
    body: (
      <p>
        You retain ownership of the content you provide. You grant PeelPrep the
        limited permission needed to store and process that content to operate
        the service for you, as described in the Privacy Policy. We do not use
        your private content to train AI models.
      </p>
    ),
  },
  {
    heading: "Subscriptions and billing",
    body: (
      <p>
        PeelPrep offers a free plan and paid plans (Plus and Pro). Paid plans
        are billed through Stripe on a recurring basis until cancelled. Usage
        limits apply per plan and are enforced by the service. You can upgrade,
        downgrade, or cancel from the billing area; cancellations take effect at
        the end of the current billing period, and downgrading never deletes
        work you have already created. Fees are non-refundable except where
        required by law.
      </p>
    ),
  },
  {
    heading: "Termination",
    body: (
      <p>
        You may stop using PeelPrep and delete your account at any time. We may
        suspend or terminate access that violates these Terms or that is
        necessary to protect the service or other users.
      </p>
    ),
  },
  {
    heading: "Disclaimers and limitation of liability",
    body: (
      <p>
        PeelPrep is provided &ldquo;as is,&rdquo; without warranties of any
        kind, to the maximum extent permitted by law. To the extent permitted by
        law, PeelPrep and its providers are not liable for indirect, incidental,
        or consequential damages, or for outcomes of any interview or hiring
        decision.
      </p>
    ),
  },
  {
    heading: "Changes to these Terms",
    body: (
      <p>
        We may update these Terms as the product evolves. When we do, we will
        revise the effective date and, for material changes, ask you to review
        them again. Continued use after an update means you accept the revised
        Terms.
      </p>
    ),
  },
  {
    heading: "Contact",
    body: (
      <p>
        Questions about these Terms can be sent to{" "}
        <a
          href="mailto:support@peelprep.example"
          className="underline underline-offset-4"
        >
          support@peelprep.example
        </a>
        . This is a beta contact address for the demonstration build.
      </p>
    ),
  },
];

export default function TermsPage() {
  return (
    <LegalPageShell
      title="Terms of Service"
      effectiveDate="July 13, 2026"
      intro={INTRO}
      sections={SECTIONS}
    />
  );
}
