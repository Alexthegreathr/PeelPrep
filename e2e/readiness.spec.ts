import { test, expect } from "@playwright/test";

import {
  createConfirmedUser,
  deleteUser,
  hasSupabaseEnv,
  uniqueEmail,
  seedPreparingInterview,
} from "./helpers/auth";

const PASSWORD = "peelprep123";

test.describe("readiness & dashboard", () => {
  test.skip(!hasSupabaseEnv(), "requires local Supabase env");

  let email: string;
  let userId: string;
  let interviewId: string;

  test.beforeAll(async () => {
    email = uniqueEmail("readiness");
    userId = await createConfirmedUser(email, PASSWORD);
    interviewId = await seedPreparingInterview(userId);
  });
  test.afterAll(async () => {
    if (userId) await deleteUser(userId);
  });

  test("generate a brief, see readiness score + checklist, and dashboard", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    // Generate the brief so readiness has inputs.
    await page.goto(`/interviews/${interviewId}/brief`);
    await page.getByRole("button", { name: /generate peel brief/i }).click();
    await expect(
      page.getByRole("heading", { name: "Company overview" }),
    ).toBeVisible({ timeout: 30000 });

    // Readiness page.
    await page.goto(`/interviews/${interviewId}/readiness`);
    await expect(page.getByText("out of 100").first()).toBeVisible();
    await expect(page.getByText("Category breakdown")).toBeVisible();
    await expect(
      page.getByText(/recommended next action/i).first(),
    ).toBeVisible();
    await expect(
      page.getByText(/prepare at least 3 star stories/i),
    ).toBeVisible();
    await expect(
      page.getByText(/measures your preparation, not your chances/i),
    ).toBeVisible();

    // Dashboard shows the readiness card + usage meters.
    await page.goto("/dashboard");
    await expect(page.getByText("AI usage this period")).toBeVisible();
    await expect(page.getByText("out of 100")).toBeVisible();
  });
});
