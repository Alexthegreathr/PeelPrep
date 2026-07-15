"use client";

import { useEffect, useState } from "react";
import { FlaskConical, ShieldAlert } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const ACK_KEY = "peelprep_beta_ack_v1";

/**
 * Beta/demo limitations notice. Auto-opens once per browser (localStorage) and
 * can be re-opened from the banner trigger. Presentational + client-only state;
 * gated by the caller on NEXT_PUBLIC_DEMO_MODE.
 */
export function BetaNotice() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Read persisted acknowledgement after mount (localStorage is client-only),
    // then open once for first-time visitors.
    try {
      if (localStorage.getItem(ACK_KEY)) return;
    } catch {
      // localStorage may be unavailable (private mode) — skip the auto-open.
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(true);
  }, []);

  function acknowledge() {
    try {
      localStorage.setItem(ACK_KEY, "1");
    } catch {
      /* ignore */
    }
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="underline underline-offset-2 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
      >
        What&apos;s limited?
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <span
              aria-hidden="true"
              className="mb-1 flex size-11 items-center justify-center rounded-xl bg-primary/20 text-accent-foreground"
            >
              <FlaskConical className="size-5" />
            </span>
            <DialogTitle className="font-heading text-xl">
              Welcome to the PeelPrep beta
            </DialogTitle>
            <DialogDescription>
              This is an early preview so you can try the flow end to end. A few
              things to know before you start:
            </DialogDescription>
          </DialogHeader>

          <ul className="flex flex-col gap-2.5 text-sm">
            <Item label="AI is simulated.">
              Briefs, questions, and feedback come from a mock provider —
              they&apos;re illustrative, not real research or analysis.
            </Item>
            <Item label="Sample data is fictional.">
              Companies, roles, and interviewers shown are made up.
            </Item>
            <Item label="Don't enter anything real or sensitive.">
              Skip real résumés and personal details — treat it like a sandbox.
            </Item>
            <Item label="It's a shared space.">
              Other people may be exploring at the same time, so you&apos;ll see
              — and can change — each other&apos;s sample data.
            </Item>
            <Item label="No real payments.">
              Billing runs in test mode; you won&apos;t be charged.
            </Item>
            <Item label="It's a beta.">
              Expect rough edges, and note that demo data may be reset without
              notice.
            </Item>
          </ul>

          <p className="flex items-start gap-2 rounded-lg bg-secondary/60 p-3 text-xs text-muted-foreground">
            <ShieldAlert
              className="mt-0.5 size-4 shrink-0 text-warning"
              aria-hidden="true"
            />
            Your feedback shapes what we build next — poke at everything.
          </p>

          <Button type="button" onClick={acknowledge} className="w-full">
            Got it — start exploring
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Item({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-2">
      <span
        aria-hidden="true"
        className="mt-2 size-1.5 shrink-0 rounded-full bg-primary"
      />
      <span className="text-muted-foreground">
        <strong className="mr-1 font-semibold text-foreground">{label}</strong>
        {children}
      </span>
    </li>
  );
}
