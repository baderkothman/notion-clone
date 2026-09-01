import { describe, expect, it, beforeEach } from "vitest";
import { checkRateLimit, __resetRateLimitStoreForTests } from "./rate-limit";

describe("checkRateLimit", () => {
  beforeEach(() => __resetRateLimitStoreForTests());

  it("allows requests under the limit and denies once exceeded", () => {
    const key = "login:test@example.com";
    const opts = { max: 3, windowMs: 60_000 };
    expect(checkRateLimit(key, opts).allowed).toBe(true);
    expect(checkRateLimit(key, opts).allowed).toBe(true);
    expect(checkRateLimit(key, opts).allowed).toBe(true);
    const fourth = checkRateLimit(key, opts);
    expect(fourth.allowed).toBe(false);
    expect(fourth.remaining).toBe(0);
  });

  it("tracks separate keys independently", () => {
    const opts = { max: 1, windowMs: 60_000 };
    expect(checkRateLimit("a", opts).allowed).toBe(true);
    expect(checkRateLimit("b", opts).allowed).toBe(true);
    expect(checkRateLimit("a", opts).allowed).toBe(false);
  });
});
