"use client";

import { useFormStatus } from "react-dom";
import { LogOut, Loader2 } from "lucide-react";

import { signOutAction } from "@/app/(app)/actions";
import { cn } from "@/lib/utils";

function SignOutInner({ className }: { className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring disabled:opacity-60",
        className,
      )}
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      ) : (
        <LogOut className="size-4" aria-hidden="true" />
      )}
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}

export function SignOutButton({ className }: { className?: string }) {
  return (
    <form action={signOutAction}>
      <SignOutInner className={className} />
    </form>
  );
}
