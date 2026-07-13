import { test, expect } from "@playwright/test";

test("landing page renders the hero", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { level: 1, name: /know the room/i }),
  ).toBeVisible();
});
