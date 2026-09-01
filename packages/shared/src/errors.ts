/**
 * Domain error hierarchy. Server route handlers / server actions catch these and map
 * them to the correct HTTP status + user-facing message. Never leak internal error
 * details (stack traces, SQL) to the client — see docs/SECURITY.md.
 */
export class DomainError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class UnauthorizedError extends DomainError {
  constructor(message = "Authentication required.") {
    super(message, "UNAUTHORIZED");
  }
}

export class ForbiddenError extends DomainError {
  constructor(message = "You do not have permission to perform this action.") {
    super(message, "FORBIDDEN");
  }
}

export class NotFoundError extends DomainError {
  constructor(resource = "Resource") {
    super(`${resource} not found.`, "NOT_FOUND");
  }
}

export class ValidationError extends DomainError {
  constructor(message = "Invalid input.") {
    super(message, "VALIDATION_ERROR");
  }
}

export class ConflictError extends DomainError {
  constructor(message = "The resource has changed since you last loaded it.") {
    super(message, "CONFLICT");
  }
}

export class RateLimitedError extends DomainError {
  constructor(message = "Too many requests. Please slow down.") {
    super(message, "RATE_LIMITED");
  }
}
