import { test, expect } from "@playwright/test";

import {
  createConfirmedUser,
  deleteUser,
  hasSupabaseEnv,
  uniqueEmail,
  seedPreparingInterview,
  grantVdaConsents,
  makeUserPro,
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
    // Pro plan so both tests here have practice-session quota (free = 1/period).
    await makeUserPro(userId);
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
    await expect(page).toHaveURL(/\/practice\/[0-9a-f-]+$/, { timeout: 20000 });
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

    // End the session and review (confirm in the dialog).
    await page.getByRole("button", { name: "End session" }).click();
    await page.getByRole("button", { name: "End practice session" }).click();
    await expect(
      page.getByRole("heading", { name: /session review/i }),
    ).toBeVisible();

    // Request feedback on the answer.
    await page.getByRole("button", { name: /get feedback/i }).click();
    await expect(page.getByText(/top improvement/i)).toBeVisible({
      timeout: 20000,
    });
  });

  test("spoken practice: avatar interviewer + voice answer (Phase 14)", async ({
    page,
  }) => {
    await grantVdaConsents(userId); // mic + media-upload enable voice answers

    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 20000 });

    await page.goto(`/interviews/${interviewId}/practice`);
    await page.getByLabel("Questions").fill("1");
    await page.getByRole("button", { name: /start practice/i }).click();
    await expect(page).toHaveURL(/\/practice\/[0-9a-f-]+$/, { timeout: 20000 });

    // The synthetic avatar interviewer is present, with a voice toggle.
    await expect(page.getByText(/AI interviewer/i)).toBeVisible({
      timeout: 20000,
    });
    await expect(
      page.getByRole("button", { name: /voice on|voice off/i }),
    ).toBeVisible();

    // Answer by voice: record with the fake mic → mock transcript fills the box.
    await expect(page.getByText(/Interviewer/).first()).toBeVisible({
      timeout: 20000,
    });
    await page.getByRole("button", { name: /answer by voice/i }).click();
    await page.waitForTimeout(1200);
    await page.getByRole("button", { name: /^stop$/i }).click();

    // The transcript (mock in this build) lands in the answer box; then send.
    await expect(page.getByText(/mock transcript/i)).toBeVisible({
      timeout: 20000,
    });
    const answer = page.getByLabel("Your answer");
    await expect(answer).not.toHaveValue("");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByText(/last of my questions/i)).toBeVisible({
      timeout: 20000,
    });
  });
});
