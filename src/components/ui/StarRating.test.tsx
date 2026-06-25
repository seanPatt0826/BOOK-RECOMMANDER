import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import StarRating from "./StarRating";

describe("StarRating", () => {
  it("exposes the rating to assistive tech via aria-label", () => {
    const { getByRole } = render(<StarRating rating={4.3} />);
    expect(getByRole("img").getAttribute("aria-label")).toBe("Rated 4.3 out of 5");
  });

  it("renders outOf stars (default 5)", () => {
    const { getByRole } = render(<StarRating rating={4.3} />);
    // each star is an aria-hidden span containing the base svg
    const svgs = getByRole("img").querySelectorAll("svg");
    // 4 full + 1 half = 5 base svgs + 5 overlay svgs (half has an overlay too)
    expect(svgs.length).toBeGreaterThanOrEqual(5);
  });

  it("renders the numeric value only when showValue is set", () => {
    const { queryByText, rerender } = render(<StarRating rating={4.3} />);
    expect(queryByText("4.3")).toBeNull();
    rerender(<StarRating rating={4.3} showValue />);
    expect(queryByText("4.3")).not.toBeNull();
  });

  it("clamps an out-of-range rating in the label", () => {
    const { getByRole } = render(<StarRating rating={9} />);
    expect(getByRole("img").getAttribute("aria-label")).toBe("Rated 5 out of 5");
  });
});
