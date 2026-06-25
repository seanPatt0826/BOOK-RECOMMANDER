import { describe, it, expect, afterEach } from "vitest";
import { renderToString } from "react-dom/server";
import { render, fireEvent, waitFor } from "@testing-library/react";
import HomeBackground from "./HomeBackground";

afterEach(() => {
  try {
    localStorage.removeItem("shelf-bg");
  } catch {
    // ignore
  }
});

describe("HomeBackground hydration safety", () => {
  // On the server there is no window: the portal must be skipped and the mode
  // must default to "calm", so the server render matches the client's first
  // (hydration) render regardless of any saved background. The old code read
  // window/localStorage during render, so SSR rendered the portal (throwing)
  // and a saved non-"calm" mode diverged from the server's "calm".
  it("server-renders without a portal and defaults to calm even with a saved mode", () => {
    localStorage.setItem("shelf-bg", "nature");
    const html = renderToString(<HomeBackground />);
    // "calm" is selected on the server, not the saved "nature".
    expect(html).toMatch(/<option[^>]*value="calm"[^>]*selected/);
    expect(html).not.toMatch(/<option[^>]*value="nature"[^>]*selected/);
  });
});

describe("HomeBackground behavior", () => {
  it("persists and reflects a chosen background", async () => {
    const { getByLabelText } = render(<HomeBackground />);
    const select = getByLabelText("Choose background style") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "nature" } });
    expect(localStorage.getItem("shelf-bg")).toBe("nature");
    await waitFor(() => expect((getByLabelText("Choose background style") as HTMLSelectElement).value).toBe("nature"));
  });
});
