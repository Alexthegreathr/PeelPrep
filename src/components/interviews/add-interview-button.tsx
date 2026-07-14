import { Plus } from "lucide-react";

import { startInterviewDraft } from "@/app/(app)/interviews/actions";
import { SubmitButton } from "@/components/shared/submit-button";

/**
 * "Add an interview" as a POST form (not a prefetchable link) so navigation /
 * prefetch never has the side effect of creating a draft. The action enforces
 * the free-tier active-interview gate, then opens the intake wizard.
 */
export function AddInterviewButton({
  label = "Add an interview",
  size,
}: {
  label?: string;
  size?: "sm" | "lg";
}) {
  return (
    <form action={startInterviewDraft}>
      <SubmitButton
        pendingLabel="Starting…"
        className={size === "lg" ? "" : ""}
      >
        <Plus aria-hidden="true" />
        {label}
      </SubmitButton>
    </form>
  );
}
