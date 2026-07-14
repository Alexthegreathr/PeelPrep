import { test, expect } from "@playwright/test";

import {
  createConfirmedUser,
  deleteUser,
  hasSupabaseEnv,
  uniqueEmail,
  seedPreparingInterview,
} from "./helpers/auth";

const PASSWORD = "peelprep123";

test.describe("outcomes & settings", () => {
  test.skip(!hasSupabaseEnv(), "requires local Supabase env");

  let email: string;
  let userId: string;
  let interviewId: string;

  test.beforeAll(async () => {
    email = uniqueEmail("outcome");
    userId = await createConfirmedUser(email, PASSWORD);
    interviewId = await seedPreparingInterview(userId);
  });
  test.afterAll(async () => {
    if (userId) await deleteUser(userId);
  });

  test("record an outcome, manage consent, and export data", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    // Record an outcome → interview becomes completed.
    await page.goto(`/interviews/${interviewId}/outcome`);
    await page.getByLabel("Difficulty (1–5)").selectOption("4");
    await page.getByLabel("Did you advance?").selectOption("yes");
    await page
      .getByLabel("Lessons for next time")
      .fill("Prepare more concise stories.");
    await page.getByRole("button", { name: /save outcome/i }).click();

    // Lands on the hub as Completed.
    await expect(page).toHaveURL(new RegExp(`/interviews/${interviewId}$`), {
      timeout: 15000,
    });
    await expect(page.getByText("Completed").first()).toBeVisible();

    // Settings: consent toggle + export.
    await page.goto("/settings");
    const consent = page.getByRole("checkbox").first();
    await consent.check();
    await expect(consent).toBeChecked();

    await page.getByRole("button", { name: /export my data/i }).click();
    await expect(
      page.getByRole("link", { name: /download json/i }),
    ).toBeVisible({ timeout: 20000 });
  });
});
