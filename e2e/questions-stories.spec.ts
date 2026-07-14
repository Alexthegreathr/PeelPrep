import { test, expect } from "@playwright/test";

import {
  createConfirmedUser,
  deleteUser,
  hasSupabaseEnv,
  uniqueEmail,
  seedPreparingInterview,
} from "./helpers/auth";

const PASSWORD = "peelprep123";

test.describe("questions & stories", () => {
  test.skip(!hasSupabaseEnv(), "requires local Supabase env");

  let email: string;
  let userId: string;
  let interviewId: string;

  test.beforeAll(async () => {
    email = uniqueEmail("qs");
    userId = await createConfirmedUser(email, PASSWORD);
    interviewId = await seedPreparingInterview(userId);
  });
  test.afterAll(async () => {
    if (userId) await deleteUser(userId);
  });

  test("generate questions, add a story, and link them", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    // Questions.
    await page.goto(`/interviews/${interviewId}/questions`);
    await page
      .getByRole("button", { name: /generate predicted questions/i })
      .click();
    await expect(page.getByText(/tell me about a time/i)).toBeVisible({
      timeout: 20000,
    });

    // Stories: create one.
    await page.goto(`/interviews/${interviewId}/stories`);
    await page.getByRole("button", { name: /add a story/i }).click();
    await page.getByLabel("Title").fill("Shipped the reliability project");
    await page
      .getByLabel("Situation")
      .fill("Our tracking pipeline had frequent outages.");
    await page.getByRole("button", { name: /save story/i }).click();
    await expect(
      page.getByRole("heading", { name: "Shipped the reliability project" }),
    ).toBeVisible();

    // Link the story to a question.
    await page.goto(`/interviews/${interviewId}/questions`);
    await page
      .getByRole("combobox")
      .first()
      .selectOption({ label: "Shipped the reliability project" });
    await expect(
      page.getByText("Shipped the reliability project").first(),
    ).toBeVisible();
  });
});
