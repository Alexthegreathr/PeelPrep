"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Submit button wired to the parent form's pending state (React 19
 * useFormStatus). Shows a spinner and disables itself during submission so
 * every form has an honest loading state (AGENTS.md quality rules).
 */
export function SubmitButton({
  children,
  pendingLabel,
  className,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" size="lg" disabled={pending} className={className}>
      {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
      {pending ? (pendingLabel ?? "Working…") : children}
    </Button>
  );
}
