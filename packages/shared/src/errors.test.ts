import { describe, expect, it } from "vitest";
import { ForbiddenError, NotFoundError, DomainError } from "./errors";

describe("domain errors", () => {
  it("carries a stable machine-readable code distinct from the message", () => {
    const error = new ForbiddenError("Guests cannot delete pages.");
    expect(error).toBeInstanceOf(DomainError);
    expect(error.code).toBe("FORBIDDEN");
    expect(error.message).toBe("Guests cannot delete pages.");
  });

  it("defaults to a safe, non-leaky message", () => {
    const error = new NotFoundError("Page");
    expect(error.message).toBe("Page not found.");
  });
});
