import { test, expect, type Request } from "@playwright/test";

import {
  createConfirmedUser,
  deleteUser,
  hasSupabaseEnv,
  uniqueEmail,
  seedPreparingInterview,
  seedCompletedSession,
  makeUserPro,
  grantVdaConsents,
} from "./helpers/auth";

const PASSWORD = "peelprep123";

/**
 * Video Delivery Analysis E2E (Phase 8B). Uses Chromium's fake camera/mic to
 * record a short answer, analyze it, and render a delivery report — and asserts
 * the privacy boundary on the wire: NO raw video/audio ever leaves the browser
 * (no upload-URL request, no storage PUT, no multi-megabyte request body).
 */
test.describe("video delivery analysis", () => {
  test.skip(!hasSupabaseEnv(), "requires local Supabase env");

  let email: string;
  let userId: string;
  let interviewId: string;
  let sessionId: string;

  test.beforeAll(async () => {
    email = uniqueEmail("vda");
    userId = await createConfirmedUser(email, PASSWORD);
    await makeUserPro(userId);
    await grantVdaConsents(userId);
    interviewId = await seedPreparingInterview(userId);
    sessionId = await seedCompletedSession(userId, interviewId);
  });
  test.afterAll(async () => {
    if (userId) await deleteUser(userId);
  });

  test("records, analyzes, and never uploads raw media", async ({ page }) => {
    // Capture every outbound request so we can prove no media crosses the wire.
    const uploadRequests: string[] = [];
    const bigBodies: { url: string; size: number }[] = [];
    page.on("request", (req: Request) => {
      const url = req.url();
      if (
        /\/api\/vda\/media\/upload-url/.test(url) ||
        /\/storage\/v1\/object\//.test(url)
      ) {
        uploadRequests.push(url);
      }
      const body = req.postData();
      // Aggregate-metric payloads are tiny; a raw clip would be >100KB.
      if (body && body.length > 100_000) {
        bigBodies.push({ url, size: body.length });
      }
    });

    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    await page.goto(`/interviews/${interviewId}/practice/${sessionId}`);

    // The VDA panel is present for a Pro user on a completed session.
    await expect(
      page.getByText(/video delivery analysis/i).first(),
    ).toBeVisible();

    // Record a short answer with the fake camera.
    await page.getByRole("button", { name: /turn on camera/i }).click();
    await page.getByRole("button", { name: /start recording/i }).click();
    // Let a little media accumulate, then stop.
    await page.waitForTimeout(1500);
    await page.getByRole("button", { name: /^stop$/i }).click();

    // Analyze the recording (computes aggregates in-browser, submits JSON only).
    await expect(
      page.getByRole("button", { name: /analyze delivery/i }),
    ).toBeVisible();
    await page.getByRole("button", { name: /analyze delivery/i }).click();

    // A report renders with the uncertainty framing.
    await expect(page.getByText(/your delivery reports/i)).toBeVisible({
      timeout: 30000,
    });
    await expect(
      page.getByText(/approximate|measurements|on-device/i).first(),
    ).toBeVisible();

    // The privacy guarantee: no raw media left the browser.
    expect(uploadRequests, "no media upload requests").toEqual([]);
    expect(bigBodies, "no large request bodies").toEqual([]);
  });
});
