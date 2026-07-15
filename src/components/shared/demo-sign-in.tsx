import { startDemoSessionAction } from "@/app/(auth)/actions";
import { SubmitButton } from "@/components/shared/submit-button";

/**
 * One-tap "Try the demo" entry for the shared demo account. Renders only when
 * NEXT_PUBLIC_DEMO_MODE=1 (the action is guarded server-side too). Clearly
 * labeled demo behavior (AGENTS.md); no signup required.
 */
export function DemoSignInBlock() {
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== "1") return null;
  return (
    <div className="flex flex-col gap-4">
      <form action={startDemoSessionAction}>
        <SubmitButton pendingLabel="Entering the demo…" className="w-full">
          Try the demo — no sign-up
        </SubmitButton>
      </form>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" aria-hidden="true" />
        or sign in with email
        <span className="h-px flex-1 bg-border" aria-hidden="true" />
      </div>
    </div>
  );
}
