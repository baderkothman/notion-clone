import { describe, expect, it } from "vitest";
import { signUpSchema, signInSchema, passwordSchema } from "./auth";

describe("passwordSchema", () => {
  it("rejects passwords shorter than 10 characters", () => {
    expect(passwordSchema.safeParse("short1").success).toBe(false);
  });

  it("accepts a 10+ character password with no composition requirements", () => {
    expect(passwordSchema.safeParse("all lowercase words").success).toBe(true);
  });
});

describe("signUpSchema", () => {
  it("normalizes email to lowercase and trims name", () => {
    const result = signUpSchema.parse({
      name: "  Ada Lovelace  ",
      email: "ADA@Example.com",
      password: "correct-horse-battery",
    });
    expect(result).toEqual({
      name: "Ada Lovelace",
      email: "ada@example.com",
      password: "correct-horse-battery",
    });
  });

  it("rejects an empty name", () => {
    const result = signUpSchema.safeParse({ name: "", email: "a@b.com", password: "correct-horse-battery" });
    expect(result.success).toBe(false);
  });

  it("rejects a malformed email", () => {
    const result = signUpSchema.safeParse({ name: "Ada", email: "not-an-email", password: "correct-horse-battery" });
    expect(result.success).toBe(false);
  });
});

describe("signInSchema", () => {
  it("requires a non-empty password but doesn't enforce the length policy (existing users may predate it)", () => {
    expect(signInSchema.safeParse({ email: "a@b.com", password: "x" }).success).toBe(true);
    expect(signInSchema.safeParse({ email: "a@b.com", password: "" }).success).toBe(false);
  });
});
