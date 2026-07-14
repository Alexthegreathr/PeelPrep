import Link from "next/link";
import type { Metadata } from "next";
import { CircleCheck, CircleAlert } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { sanitizeNextPath } from "@/lib/auth/redirect";
import { LoginForm } from "@/app/(auth)/login/login-form";

export const metadata: Metadata = { title: "Sign in" };

const LINK_ERRORS: Record<string, string> = {
  invalid_link:
    "That confirmation link was invalid. Try signing in or request a new one.",
  expired_link:
    "That link has expired or was already used. Request a new one below.",
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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="text-sm text-muted-foreground">
          Sign in to continue preparing.
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
    </div>
  );
}
