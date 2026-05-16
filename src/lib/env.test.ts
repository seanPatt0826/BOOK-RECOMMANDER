import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { requireEnv } from "./env";

describe("requireEnv", () => {
  const KEY = "TEST_ENV_VALUE";

  afterEach(() => {
    delete process.env[KEY];
  });

  it("returns the value when the variable is set", () => {
    process.env[KEY] = "hello";
    expect(requireEnv(KEY)).toBe("hello");
  });

  it("throws a descriptive error when the variable is missing", () => {
    expect(() => requireEnv(KEY)).toThrowError(/TEST_ENV_VALUE/);
  });
});
