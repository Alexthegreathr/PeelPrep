import { test, expect } from "@playwright/test";

import {
  createConfirmedUser,
  deleteUser,
  hasSupabaseEnv,
  uniqueEmail,
} from "./helpers/auth";

const PASSWORD = "peelprep123";

test.describe("billing", () => {
  test.skip(!hasSupabaseEnv(), "requires local Supabase env");

  let email: string;
  let userId: string;

  test.beforeAll(async () => {
    email = uniqueEmail("billing");
    userId = await createConfirmedUser(email, PASSWORD);
  });
  test.afterAll(async () => {
    if (userId) await deleteUser(userId);
  });

  test("shows plans, current plan, and usage meters", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    await page.goto("/billing");
    await expect(page.getByText("Free", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Plus", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Pro", { exact: true }).first()).toBeVisible();
    // A new account is on Free.
    await expect(page.getByText("Current", { exact: true })).toBeVisible();
    // Usage meters render.
    await expect(page.getByText("Usage this period")).toBeVisible();
    // Stripe not configured locally → test-mode notice.
    await expect(page.getByText(/Stripe test mode/i)).toBeVisible();
  });
});
