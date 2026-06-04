import { describe, it, expect, afterEach } from "vitest";
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

  it("throws a descriptive error when the variable is an empty string", () => {
    process.env[KEY] = "";
    expect(() => requireEnv(KEY)).toThrowError(/TEST_ENV_VALUE/);
  });
});
