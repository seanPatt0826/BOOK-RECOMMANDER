import { describe, it, expect, afterEach } from "vitest";
import { renderToString } from "react-dom/server";
import { render, fireEvent, waitFor } from "@testing-library/react";
import ThemeToggle from "./ThemeToggle";

afterEach(() => {
  document.documentElement.classList.remove("dark");
});

describe("ThemeToggle hydration safety", () => {
  // The server render and the client's FIRST (hydration) render must be
  // identical, or React throws a hydration mismatch. The server has no real
  // theme, so the deterministic baseline is light + not-yet-mounted —
  // regardless of any `.dark` class already on <html> in the test document.
  it("server-renders the light/unmounted baseline even when the DOM has .dark", () => {
    document.documentElement.classList.add("dark");
    const html = renderToString(<ThemeToggle />);
    expect(html).toContain("scale-75 opacity-0"); // mounted=false baseline
    expect(html).toContain("Switch to dark mode"); // dark=false baseline (Moon icon)
    expect(html).not.toContain("scale-100 opacity-100");
  });
});

describe("ThemeToggle behavior", () => {
  it("toggles the <html> dark class and aria-label on click", async () => {
    document.documentElement.classList.remove("dark");
    const { getByRole } = render(<ThemeToggle />);
    const btn = getByRole("button");
    expect(document.documentElement.classList.contains("dark")).toBe(false);

    fireEvent.click(btn);
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    // The icon/aria-label re-render is driven by the MutationObserver (async).
    await waitFor(() => expect(btn.getAttribute("aria-label")).toBe("Switch to light mode"));

    fireEvent.click(btn);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    await waitFor(() => expect(btn.getAttribute("aria-label")).toBe("Switch to dark mode"));
  });
});
