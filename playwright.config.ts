import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  // The dev server compiles routes on demand and the VDA spec loads on-device
  // vision models; capping workers keeps that contention from tipping timeouts.
  workers: process.env.CI ? 2 : 3,
  reporter: "list",
  use: {
    baseURL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Fake camera/mic so the Video Delivery Analysis flow runs headlessly
        // and auto-grants getUserMedia permission.
        launchOptions: {
          args: [
            "--use-fake-device-for-media-stream",
            "--use-fake-ui-for-media-stream",
            "--autoplay-policy=no-user-gesture-required",
          ],
        },
      },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    // The whole login-heavy suite runs from one loopback IP; relax ONLY the
    // shared-IP auth limiter for tests (non-production, per-email limit intact).
    env: { ...process.env, E2E_RELAX_AUTH_RATE_LIMIT: "1" },
  },
});
