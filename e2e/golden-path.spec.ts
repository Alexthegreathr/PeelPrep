import { test, expect } from "@playwright/test";

import {
  createConfirmedUser,
  deleteUser,
  hasSupabaseEnv,
  uniqueEmail,
} from "./helpers/auth";

const PASSWORD = "peelprep123";

/**
 * Golden path (PRODUCT_SPEC §Testing): one user goes from sign-in through the
 * full core workflow — create an interview, upload a résumé, generate a Peel
 * Brief, save a question, create a story, complete a typed practice answer, get
 * feedback, see the readiness score update, and record an outcome. (Email
 * signup→confirm is covered separately in auth.spec.ts.)
 */
test.describe("golden path", () => {
  test.skip(!hasSupabaseEnv(), "requires local Supabase env");

  let email: string;
  let userId: string;

  test.beforeAll(async () => {
    email = uniqueEmail("golden");
    userId = await createConfirmedUser(email, PASSWORD);
  });
  test.afterAll(async () => {
    if (userId) await deleteUser(userId);
  });

  test("create → brief → question → story → practice → feedback → readiness → outcome", async ({
    page,
  }) => {
    test.slow();

    // Sign in.
    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    // Create an interview + upload a résumé + confirm.
    await page.getByRole("button", { name: /add an interview/i }).click();
    await expect(page).toHaveURL(/\/interviews\/[0-9a-f-]+$/);
    const url = page.url();
    const interviewId = url.split("/interviews/")[1];

    await page.getByLabel("Company").fill("Acme Fruit Logistics");
    await page.getByLabel("Position title").fill("Senior Engineer");
    await page
      .getByLabel("Job description")
      .fill("Build resilient produce-logistics systems at scale.");
    await page.getByRole("button", { name: "Continue" }).click(); // → interview
    await expect(page.getByLabel("Format")).toBeVisible();
    await page.getByRole("button", { name: "Continue" }).click(); // → interviewers
    await expect(
      page.getByRole("button", { name: /add interviewer/i }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Continue" }).click(); // → materials
    await expect(page.getByLabel("Résumé")).toBeVisible();
    await page.getByLabel("File").setInputFiles({
      name: "resume.txt",
      mimeType: "text/plain",
      buffer: Buffer.from(
        "Jane Candidate — 6 years building logistics platforms.",
      ),
    });
    await page.getByRole("button", { name: /upload document/i }).click();
    await expect(page.getByText(/^Uploaded\.?$/i).first()).toBeVisible();
    await page.getByRole("button", { name: "Continue" }).click(); // → review
    await page
      .getByRole("button", { name: /confirm & start preparing/i })
      .click();
    await expect(
      page.getByRole("heading", { name: "Acme Fruit Logistics" }),
    ).toBeVisible();

    // Generate the Peel Brief.
    await page.goto(`/interviews/${interviewId}/brief`);
    await page.getByRole("button", { name: /generate peel brief/i }).click();
    await expect(
      page.getByRole("heading", { name: "Company overview" }),
    ).toBeVisible({ timeout: 30000 });

    // Save a predicted question.
    await page.goto(`/interviews/${interviewId}/questions`);
    await page
      .getByRole("button", { name: /generate predicted questions/i })
      .click();
    await expect(page.getByText(/tell me about a time/i)).toBeVisible({
      timeout: 20000,
    });

    // Create a story.
    await page.goto(`/interviews/${interviewId}/stories`);
    await page.getByRole("button", { name: /add a story/i }).click();
    await page.getByLabel("Title").fill("Improved reliability");
    await page.getByRole("button", { name: /save story/i }).click();
    await expect(
      page.getByRole("heading", { name: "Improved reliability" }),
    ).toBeVisible();

    // Practice one answer and get feedback.
    await page.goto(`/interviews/${interviewId}/practice`);
    await page.getByLabel("Questions").fill("1");
    await page.getByRole("button", { name: /start practice/i }).click();
    await expect(page.getByPlaceholder(/type your answer/i)).toBeVisible({
      timeout: 20000,
    });
    await page
      .getByPlaceholder(/type your answer/i)
      .fill("I cut incident rates in half by adding retries and alerting.");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByText(/last of my questions/i)).toBeVisible({
      timeout: 20000,
    });
    await page.getByRole("button", { name: "End session" }).click();
    await page.getByRole("button", { name: "End practice session" }).click();
    await page.getByRole("button", { name: /get feedback/i }).click();
    await expect(page.getByText(/top improvement/i)).toBeVisible({
      timeout: 20000,
    });

    // Readiness score reflects the preparation.
    await page.goto(`/interviews/${interviewId}/readiness`);
    await expect(page.getByText("out of 100").first()).toBeVisible();

    // Record an outcome → interview completes.
    await page.goto(`/interviews/${interviewId}/outcome`);
    await page.getByLabel("Did you advance?").selectOption("yes");
    await page.getByRole("button", { name: /save outcome/i }).click();
    await expect(page).toHaveURL(new RegExp(`/interviews/${interviewId}$`), {
      timeout: 15000,
    });
    await expect(page.getByText("Completed").first()).toBeVisible();
  });
});
