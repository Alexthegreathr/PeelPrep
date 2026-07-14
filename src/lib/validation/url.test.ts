import { describe, expect, it } from "vitest";

import { isSafeHttpUrl } from "./url";

describe("isSafeHttpUrl", () => {
  it("accepts http and https", () => {
    expect(isSafeHttpUrl("http://example.com")).toBe(true);
    expect(isSafeHttpUrl("https://jobs.example.com/posting/123")).toBe(true);
  });

  it("rejects dangerous or non-web schemes", () => {
    for (const url of [
      "javascript:alert(1)",
      "data:text/html,<script>",
      "file:///etc/passwd",
      "ftp://example.com",
      "mailto:a@b.com",
      "not a url",
      "example.com",
    ]) {
      expect(isSafeHttpUrl(url), url).toBe(false);
    }
  });
});
