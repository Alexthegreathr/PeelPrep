import { test, expect } from "@playwright/test";

import {
  createConfirmedUser,
  deleteUser,
  hasSupabaseEnv,
  uniqueEmail,
} from "./helpers/auth";

const PASSWORD = "peelprep123";

test.describe("interview intake", () => {
  test.skip(!hasSupabaseEnv(), "requires local Supabase env");

  let email: string;
  let userId: string;

  test.beforeAll(async () => {
    email = uniqueEmail("intake");
    userId = await createConfirmedUser(email, PASSWORD);
  });
  test.afterAll(async () => {
    if (userId) await deleteUser(userId);
  });

  test("create, fill, upload a résumé, confirm, and hit the free-tier gate", async ({
    page,
  }) => {
    // Sign in.
    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    // Start a new interview from the dashboard empty state.
    await page.getByRole("button", { name: /add an interview/i }).click();
    await expect(page).toHaveURL(/\/interviews\/[0-9a-f-]+$/);

    // Step 1 — opportunity.
    await page.getByLabel("Company").fill("Acme Fruit Logistics");
    await page.getByLabel("Position title").fill("Senior Engineer");
    await page
      .getByLabel("Job description")
      .fill("We need an engineer to build resilient banana supply systems.");
    await page.getByRole("button", { name: "Continue" }).click();

    // Step 2 — interview details (optional).
    await expect(page.getByLabel("Format")).toBeVisible();
    await page.getByRole("button", { name: "Continue" }).click();

    // Step 3 — interviewers (optional).
    await expect(
      page.getByRole("button", { name: /add interviewer/i }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Continue" }).click();

    // Step 4 — materials: upload a résumé.
    await expect(page.getByLabel("Résumé")).toBeVisible();
    await page.getByLabel("File").setInputFiles({
      name: "resume.txt",
      mimeType: "text/plain",
      buffer: Buffer.from(
        "Jane Candidate — 6 years building logistics platforms. Led a team of 5.",
      ),
    });
    await page.getByRole("button", { name: /upload document/i }).click();
    await expect(page.getByText(/^Uploaded\.?$/i).first()).toBeVisible();

    await page.getByRole("button", { name: "Continue" }).click();

    // Step 5 — review & confirm.
    await expect(page.getByRole("heading", { name: /review/i })).toBeVisible();
    await expect(page.getByText("Acme Fruit Logistics")).toBeVisible();
    await page
      .getByRole("button", { name: /confirm & start preparing/i })
      .click();

    // Lands on the hub as "Preparing".
    await expect(
      page.getByRole("heading", { name: "Acme Fruit Logistics" }),
    ).toBeVisible();
    await expect(page.getByText("Preparing")).toBeVisible();

    // Free-tier gate: a second interview is blocked (1 active already).
    await page.goto("/dashboard");
    await page.getByRole("button", { name: /add an interview/i }).click();
    await expect(page).toHaveURL(/\/interviews\/new\?limit=1/);
    await expect(
      page.getByText(/archive or delete an existing one/i),
    ).toBeVisible();
  });
});
