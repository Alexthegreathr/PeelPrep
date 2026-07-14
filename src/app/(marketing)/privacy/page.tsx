import type { Metadata } from "next";

import {
  LegalPageShell,
  LegalSection,
} from "@/components/marketing/legal-page-shell";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How PeelPrep collects, uses, protects, and lets you control your interview-preparation data.",
};

export default function PrivacyPage() {
  return (
    <LegalPageShell title="Privacy Policy" effectiveDate="July 13, 2026">
      <p>
        PeelPrep helps you prepare for a specific job interview. Doing that well
        means handling genuinely sensitive information — your résumé, the roles
        you are pursuing, your practice answers, and how interviews turn out.
        This policy explains what we collect, how we use it, and the controls
        you have. It is written for the current beta; we will update the
        effective date and, where changes are material, ask you to review them
        again.
      </p>

      <LegalSection heading="Information we collect">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong>Account information</strong> — your email address and, if
            you provide it, your name and headline.
          </li>
          <li>
            <strong>Interview details you enter</strong> — company, role, job
            description, interview logistics, and publicly available
            professional background you choose to add about your interviewers.
          </li>
          <li>
            <strong>Documents you upload</strong> — résumés, cover letters, and
            similar materials, stored in private file storage.
          </li>
          <li>
            <strong>Preparation content</strong> — your stories, saved
            questions, practice answers, feedback, readiness scores, notes, and
            recorded outcomes.
          </li>
          <li>
            <strong>Operational data</strong> — usage counts, subscription
            state, and security logs (for example, records that an export or
            deletion was requested). These contain identifiers and counters,
            never the contents of your documents or answers.
          </li>
        </ul>
        <p>
          Payment card details are handled by Stripe and are never stored on
          PeelPrep&rsquo;s servers.
        </p>
      </LegalSection>

      <LegalSection heading="How your information is used">
        <p>
          We use your information to provide the service: to generate your
          personalized Peel Brief, predict likely questions, run typed mock
          interviews, evaluate your answers, calculate your readiness score, and
          manage your subscription. Preparation content is used to improve{" "}
          <em>your own</em> future preparation by default.
        </p>
        <p>
          We do <strong>not</strong> use your private content to train AI
          models. AI features send the relevant context to our AI provider for a
          single inference request and return a result; the provider is not
          permitted to train on that content. Any future use of anonymized
          outcome data to improve system-wide predictions is strictly opt-in,
          controlled by a separate consent you can grant or revoke at any time
          in Settings, and is never model training.
        </p>
      </LegalSection>

      <LegalSection heading="AI-generated content">
        <p>
          Peel Briefs, predicted questions, suggested story outlines, and answer
          feedback are AI-generated preparation guidance, not verified facts.
          PeelPrep grounds this content in the information you supply and
          clearly labels anything that comes from general knowledge rather than
          a source you provided. It does not fabricate citations, invent your
          experiences, or infer protected or sensitive characteristics about
          interviewers — we use only public professional context to help you
          prepare respectfully.
        </p>
      </LegalSection>

      <LegalSection heading="How your information is protected">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            Every user&rsquo;s data is isolated at the database level with row
            level security, so no user can access another user&rsquo;s records.
          </li>
          <li>
            Uploaded files live in private storage and are reachable only
            through short-lived signed links issued after a server-side
            ownership check.
          </li>
          <li>
            Authorization is enforced on the server for every request; hidden or
            disabled interface controls are never relied on for security.
          </li>
          <li>Secret keys are never exposed to your browser.</li>
        </ul>
      </LegalSection>

      <LegalSection heading="Your choices and rights">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong>Access &amp; export.</strong> You can export your data —
            including your interviews, documents, stories, and outcomes — in a
            portable format from Settings.
          </li>
          <li>
            <strong>Deletion.</strong> You can delete an individual interview
            (removing its generated content and uploaded materials tied to it)
            or delete your entire account. Account deletion removes your stored
            files and personal records; anonymized security-log entries may be
            retained as required.
          </li>
          <li>
            <strong>Consent.</strong> You can review and change your consents,
            including the optional outcome-research opt-in, at any time in
            Settings. Changes take effect immediately.
          </li>
        </ul>
      </LegalSection>

      <LegalSection heading="Data retention">
        <p>
          We keep your information for as long as your account is active or as
          needed to provide the service. When you delete content or your
          account, it is removed rather than archived. Temporary export files
          expire automatically. Stripe retains its own billing records as
          legally required.
        </p>
      </LegalSection>

      <LegalSection heading="Contact">
        <p>
          Questions about this policy or your data can be sent to{" "}
          <a
            href="mailto:privacy@peelprep.example"
            className="underline underline-offset-4"
          >
            privacy@peelprep.example
          </a>
          . This is a beta contact address for the demonstration build.
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
