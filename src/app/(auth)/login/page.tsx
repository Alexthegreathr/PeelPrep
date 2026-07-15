import Link from "next/link";
import type { Metadata } from "next";
import { CircleCheck, CircleAlert } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { sanitizeNextPath } from "@/lib/auth/redirect";
import { LoginForm } from "@/app/(auth)/login/login-form";
import { DemoSignInBlock } from "@/components/shared/demo-sign-in";

export const metadata: Metadata = { title: "Sign in" };

const LINK_ERRORS: Record<string, string> = {
  invalid_link:
    "That confirmation link was invalid. Try signing in or request a new one.",
  expired_link:
    "That link has expired or was already used. Request a new one below.",
  demo_unavailable:
    "The demo account isn't ready yet. Please try again in a moment.",
};

export default async function LoginPage(props: PageProps<"/login">) {
  const searchParams = await props.searchParams;
  const rawNext = Array.isArray(searchParams.next)
    ? searchParams.next[0]
    : searchParams.next;
  const next = rawNext ? sanitizeNextPath(rawNext) : undefined;

  const confirmed = searchParams.confirmed === "1";
  const errorKey = Array.isArray(searchParams.error)
    ? searchParams.error[0]
    : searchParams.error;
  const linkError = errorKey ? LINK_ERRORS[errorKey] : undefined;

  // In the public demo build, "Try the demo" is the only entry — hide the
  // email login/signup (email confirmation isn't wired up for the preview).
  const demoOnly = process.env.NEXT_PUBLIC_DEMO_MODE === "1";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          {demoOnly ? "Try PeelPrep" : "Welcome back"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {demoOnly
            ? "Tap below to explore the demo — no sign-up needed."
            : "Sign in to continue preparing."}
        </p>
      </div>

      {confirmed ? (
        <Alert variant="success">
          <CircleCheck aria-hidden="true" />
          <AlertDescription>
            <p>Your email is confirmed. Sign in to get started.</p>
          </AlertDescription>
        </Alert>
      ) : null}

      {linkError ? (
        <Alert variant="destructive">
          <CircleAlert aria-hidden="true" />
          <AlertDescription>
            <p>{linkError}</p>
          </AlertDescription>
        </Alert>
      ) : null}

      <DemoSignInBlock />

      {!demoOnly ? (
        <>
          <LoginForm next={next} />

          <p className="text-center text-sm text-muted-foreground">
            New to PeelPrep?{" "}
            <Link
              href="/signup"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              Create an account
            </Link>
          </p>
        </>
      ) : null}
    </div>
  );
}
