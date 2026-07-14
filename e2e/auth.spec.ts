import { test, expect } from "@playwright/test";

import {
  createConfirmedUser,
  deleteUser,
  hasSupabaseEnv,
  uniqueEmail,
  waitForAuthLink,
} from "./helpers/auth";

const PASSWORD = "peelprep123";

// These flows drive real local Supabase Auth + Mailpit. They require the local
// stack running and the Supabase env present in the test process
// (`set -a; source .env.local; set +a; npx playwright test`). Run right after
// `supabase db reset` so the auth rate-limit counters start fresh.
test.describe("authentication flows", () => {
  test.skip(
    !hasSupabaseEnv(),
    "requires local Supabase env (SERVICE_ROLE_KEY)",
  );

  test("wrong credentials show a clear, accessible error", async ({ page }) => {
    const email = uniqueEmail("wrongpw");
    const userId = await createConfirmedUser(email, PASSWORD);
    try {
      await page.goto("/login");
      await page.getByLabel("Email").fill(email);
      await page
        .getByLabel("Password", { exact: true })
        .fill("not-the-password");
      await page.getByRole("button", { name: "Sign in" }).click();

      // Target the message text directly (the framework's empty route-announcer
      // also has role="alert"). The message lives inside our destructive Alert.
      await expect(page.getByText("Invalid email or password.")).toBeVisible();
      await expect(page).toHaveURL(/\/login/);
    } finally {
      await deleteUser(userId);
    }
  });

  test("confirmed user can log in, reach the dashboard, and sign out", async ({
    page,
  }) => {
    const email = uniqueEmail("login");
    const userId = await createConfirmedUser(email, PASSWORD);
    try {
      await page.goto("/login");
      await page.getByLabel("Email").fill(email);
      await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
      await page.getByRole("button", { name: "Sign in" }).click();

      await expect(page).toHaveURL(/\/dashboard/);
      await expect(
        page.getByRole("heading", { name: /welcome/i }),
      ).toBeVisible();

      await page.getByRole("button", { name: "Sign out" }).click();
      await expect(page).toHaveURL(/\/$|\/login/);
    } finally {
      await deleteUser(userId);
    }
  });

  test("unauthenticated access to a protected route redirects to login", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login\?next=%2Fdashboard/);
  });

  test("signup → email confirmation → login", async ({ page }) => {
    const email = uniqueEmail("signup");
    await page.goto("/signup");
    await page.getByLabel("Full name").fill("Test Candidate");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(page.getByText(/confirm your email/i)).toBeVisible();

    // Follow the real confirmation link from the local mailbox.
    const link = await waitForAuthLink(email);
    // The link must point at the origin actually serving the app, not a stale
    // hardcoded port (the port-fix regression guard).
    expect(link).toContain("localhost:3000/auth/confirm");
    await page.goto(link);

    // verifyOtp establishes a session, so a confirmed user lands authenticated
    // on the dashboard (the proxy redirects them off /login).
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole("heading", { name: /welcome/i })).toBeVisible();
  });

  test("forgot password → recovery link → set new password", async ({
    page,
  }) => {
    const email = uniqueEmail("reset");
    const userId = await createConfirmedUser(email, PASSWORD);
    try {
      await page.goto("/reset-password");
      await page.getByLabel("Email").fill(email);
      await page.getByRole("button", { name: "Send reset link" }).click();
      await expect(page.getByText(/password reset link/i)).toBeVisible();

      const link = await waitForAuthLink(email);
      expect(link).toContain("localhost:3000/auth/confirm");
      await page.goto(link);
      await expect(page).toHaveURL(/\/update-password/);

      const newPassword = "peelprep456";
      await page.getByLabel("New password", { exact: true }).fill(newPassword);
      await page.getByLabel("Confirm new password").fill(newPassword);
      await page.getByRole("button", { name: "Save new password" }).click();
      await expect(page).toHaveURL(/\/dashboard/);
    } finally {
      await deleteUser(userId);
    }
  });
});
