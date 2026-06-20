// src/components/ui/Button.test.tsx
import { render } from "@testing-library/react";
import Button from "./Button";

describe("Button", () => {
  it("renders a <button> by default with the primary variant classes", () => {
    const { getByRole } = render(<Button>Save</Button>);
    const el = getByRole("button", { name: "Save" });
    expect(el.tagName).toBe("BUTTON");
    expect(el.className).toContain("bg-accent");
  });

  it("renders an anchor when href is set", () => {
    const { getByRole } = render(<Button href="/search">Go</Button>);
    const el = getByRole("link", { name: "Go" });
    expect(el.tagName).toBe("A");
    expect(el.getAttribute("href")).toBe("/search");
  });

  it("merges a passthrough className and keeps the button type", () => {
    const { getByRole } = render(
      <Button className="w-full" type="submit">Log in</Button>,
    );
    const el = getByRole("button", { name: "Log in" });
    expect(el.className).toContain("w-full");
    expect(el.getAttribute("type")).toBe("submit");
  });

  it("applies the secondary variant classes", () => {
    const { getByRole } = render(<Button variant="secondary">X</Button>);
    expect(getByRole("button", { name: "X" }).className).toContain("border-edge");
  });
});
