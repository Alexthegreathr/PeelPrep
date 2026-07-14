import { afterEach, describe, expect, it, vi } from "vitest";

import {
  DEV_ORIGIN_ALLOWLIST,
  getConfiguredAppUrl,
  pickAuthRedirectBase,
} from "./site-url";

describe("getConfiguredAppUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("defaults to localhost:3000 when unset", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    expect(getConfiguredAppUrl()).toBe("http://localhost:3000");
  });

  it("strips trailing slashes", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://peelprep.app///");
    expect(getConfiguredAppUrl()).toBe("https://peelprep.app");
  });
});

describe("pickAuthRedirectBase", () => {
  const configuredUrl = "https://peelprep.app";

  it("always uses the configured URL in production, ignoring request origin", () => {
    expect(
      pickAuthRedirectBase({
        isProduction: true,
        configuredUrl,
        origin: "http://localhost:3001",
        host: "localhost:3001",
      }),
    ).toBe(configuredUrl);
  });

  it("honors an allowlisted dev origin so links target the active port", () => {
    expect(
      pickAuthRedirectBase({
        isProduction: false,
        configuredUrl,
        origin: "http://localhost:3001",
        host: "localhost:3001",
      }),
    ).toBe("http://localhost:3001");
  });

  it("supports both localhost and 127.0.0.1 dev hosts", () => {
    for (const origin of DEV_ORIGIN_ALLOWLIST) {
      expect(
        pickAuthRedirectBase({ isProduction: false, configuredUrl, origin }),
      ).toBe(origin);
    }
  });

  it("falls back to the Host header when there is no Origin (GET handlers)", () => {
    expect(
      pickAuthRedirectBase({
        isProduction: false,
        configuredUrl,
        origin: null,
        host: "127.0.0.1:3000",
      }),
    ).toBe("http://127.0.0.1:3000");
  });

  it("ignores untrusted origins/hosts and falls back to configured URL", () => {
    expect(
      pickAuthRedirectBase({
        isProduction: false,
        configuredUrl,
        origin: "http://evil.example.com",
        host: "evil.example.com",
      }),
    ).toBe(configuredUrl);
  });

  it("does not honor a non-dev port even on localhost", () => {
    expect(
      pickAuthRedirectBase({
        isProduction: false,
        configuredUrl,
        origin: "http://localhost:9999",
      }),
    ).toBe(configuredUrl);
  });
});
