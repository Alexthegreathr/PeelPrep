import type { Metadata } from "next";

import { UpdatePasswordForm } from "@/app/(auth)/update-password/update-form";

export const metadata: Metadata = { title: "Choose a new password" };

/**
 * Reached via the recovery email link, which lands on /auth/confirm
 * (verifyOtp establishes a recovery session) and redirects here. The
 * update action re-checks for that session server-side.
 */
export default function UpdatePasswordPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Choose a new password
        </h1>
        <p className="text-sm text-muted-foreground">
          Set a new password for your account.
        </p>
      </div>

      <UpdatePasswordForm />
    </div>
  );
}
