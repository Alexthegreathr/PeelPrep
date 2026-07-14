import { test, expect } from "@playwright/test";

import {
  createConfirmedUser,
  deleteUser,
  hasSupabaseEnv,
  uniqueEmail,
  seedPreparingInterview,
} from "./helpers/auth";

const PASSWORD = "peelprep123";

test.describe("peel brief", () => {
  test.skip(!hasSupabaseEnv(), "requires local Supabase env");

  let email: string;
  let userId: string;
  let interviewId: string;

  test.beforeAll(async () => {
    email = uniqueEmail("brief");
    userId = await createConfirmedUser(email, PASSWORD);
    interviewId = await seedPreparingInterview(userId);
  });
  test.afterAll(async () => {
    if (userId) await deleteUser(userId);
  });

  test("generate a brief, see sections, and open the print view", async ({
    page,
  }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    await page.goto(`/interviews/${interviewId}/brief`);
    await page.getByRole("button", { name: /generate peel brief/i }).click();

    // Sections appear as generation completes.
    await expect(
      page.getByRole("heading", { name: "Company overview" }),
    ).toBeVisible({ timeout: 30000 });
    await expect(
      page.getByRole("heading", { name: "Interview snapshot" }),
    ).toBeVisible();
    await expect(
      page.getByText("AI-generated preparation guidance").first(),
    ).toBeVisible();

    // Free plan skips the deeper risks/gaps section.
    await expect(page.getByText(/available on paid plans/i)).toBeVisible();

    // Print / last-minute view renders.
    await page.getByRole("link", { name: /print \/ last-minute/i }).click();
    await expect(page).toHaveURL(/\/brief\/print/);
    await expect(
      page.getByRole("heading", { name: /last-minute summary/i }),
    ).toBeVisible();
  });
});
