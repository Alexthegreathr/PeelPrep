import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Hero } from "./hero";

describe("Hero", () => {
  it("renders the headline and supporting copy", () => {
    render(<Hero />);
    expect(
      screen.getByRole("heading", { level: 1, name: /know the room/i }),
    ).toBeDefined();
    expect(screen.getByText(/one personalized briefing/i)).toBeDefined();
  });
});
