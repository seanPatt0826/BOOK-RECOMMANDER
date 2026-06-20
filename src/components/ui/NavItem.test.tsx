import { render, fireEvent } from "@testing-library/react";
import NavItem from "./NavItem";

describe("NavItem", () => {
  it("shows selected styling when selected", () => {
    const { getByRole } = render(
      <NavItem selected onClick={() => {}} label="All" />,
    );
    expect(getByRole("button", { name: /All/ }).className).toContain("bg-accent");
  });

  it("shows muted styling when not selected", () => {
    const { getByRole } = render(
      <NavItem selected={false} onClick={() => {}} label="All" />,
    );
    const cls = getByRole("button", { name: /All/ }).className;
    expect(cls).not.toContain("bg-accent");
    expect(cls).toContain("text-ink/75");
  });

  it("fires onClick and renders the count", () => {
    let clicked = 0;
    const { getByRole, getByText } = render(
      <NavItem selected={false} onClick={() => (clicked += 1)} label="Sci-Fi" count={7} />,
    );
    fireEvent.click(getByRole("button", { name: /Sci-Fi/ }));
    expect(clicked).toBe(1);
    expect(getByText("7")).toBeTruthy();
  });
});
