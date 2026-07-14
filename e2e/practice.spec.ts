import { test, expect } from "@playwright/test";

import {
  createConfirmedUser,
  deleteUser,
  hasSupabaseEnv,
  uniqueEmail,
  seedPreparingInterview,
} from "./helpers/auth";

const PASSWORD = "peelprep123";

test.describe("mock practice", () => {
  test.skip(!hasSupabaseEnv(), "requires local Supabase env");

  let email: string;
  let userId: string;
  let interviewId: string;

  test.beforeAll(async () => {
    email = uniqueEmail("practice");
    userId = await createConfirmedUser(email, PASSWORD);
    interviewId = await seedPreparingInterview(userId);
  });
  test.afterAll(async () => {
    if (userId) await deleteUser(userId);
  });

  test("start a session, answer, end, and get feedback", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    await page.goto(`/interviews/${interviewId}/practice`);
    await page.getByLabel("Questions").fill("1");
    await page.getByRole("button", { name: /start practice/i }).click();

    // Lands in the session with the first interviewer question.
    await expect(page).toHaveURL(/\/practice\/[0-9a-f-]+$/);
    await expect(page.getByText("Interviewer").first()).toBeVisible({
      timeout: 20000,
    });

    // Answer the question.
    await page
      .getByPlaceholder(/type your answer/i)
      .fill(
        "I led a project to improve reliability, cutting incidents by half.",
      );
    await page.getByRole("button", { name: "Send" }).click();

    // With length 1, the interviewer wraps up next.
    await expect(page.getByText(/last of my questions/i)).toBeVisible({
      timeout: 20000,
    });

    // End the session and review.
    await page.getByRole("button", { name: "End session" }).click();
    await expect(
      page.getByRole("heading", { name: /session review/i }),
    ).toBeVisible();

    // Request feedback on the answer.
    await page.getByRole("button", { name: /get feedback/i }).click();
    await expect(page.getByText(/top improvement/i)).toBeVisible({
      timeout: 20000,
    });
  });
});
