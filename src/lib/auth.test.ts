import { describe, it, expect, vi, beforeEach } from "vitest";

const getUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser } }),
}));

import { getCurrentUser } from "./auth";

describe("getCurrentUser", () => {
  beforeEach(() => getUser.mockReset());

  it("returns the user when signed in", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    expect(await getCurrentUser()).toEqual({ id: "u1" });
  });

  it("returns null when logged out", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    expect(await getCurrentUser()).toBeNull();
  });
});
