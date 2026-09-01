import "server-only";
import { db, users, passwordResetTokens, eq } from "@notion-clone/database";
import {
  requestPasswordResetSchema,
  resetPasswordSchema,
  type RequestPasswordResetInput,
  type ResetPasswordInput,
} from "@notion-clone/contracts";
import { hashPassword } from "@notion-clone/auth";
import { checkRateLimit, RateLimitedError, ValidationError, newToken } from "@notion-clone/shared";
import { createHash } from "node:crypto";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

const RESET_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Always succeeds from the caller's point of view whether or not the email exists —
 * enumerating valid accounts through a password-reset form is a classic leak (see
 * docs/SECURITY.md). Only when a matching user exists is a token actually minted.
 */
export async function requestPasswordReset(raw: RequestPasswordResetInput): Promise<void> {
  const { email } = requestPasswordResetSchema.parse(raw);

  const limit = checkRateLimit(`auth:reset-request:${email}`, { max: 3, windowMs: 15 * 60_000 });
  if (!limit.allowed) throw new RateLimitedError();

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user) return;

  const token = newToken();
  await db.insert(passwordResetTokens).values({
    userId: user.id,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + RESET_TTL_MS),
  });

  // Phase 1: no transactional email provider is wired up yet (out of scope for the
  // clone foundation). Logging server-side lets local development exercise the full
  // flow; wiring a real provider is a drop-in replacement for this one call.
  console.info(`[password-reset] token for ${email}: ${token}`);
}

export async function resetPassword(raw: ResetPasswordInput): Promise<void> {
  const input = resetPasswordSchema.parse(raw);
  const tokenHash = hashToken(input.token);

  const [record] = await db
    .select()
    .from(passwordResetTokens)
    .where(eq(passwordResetTokens.tokenHash, tokenHash))
    .limit(1);

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw new ValidationError("This password reset link is invalid or has expired.");
  }

  const passwordHash = await hashPassword(input.password);
  await db.transaction(async (tx) => {
    await tx.update(users).set({ passwordHash }).where(eq(users.id, record.userId));
    await tx.update(passwordResetTokens).set({ usedAt: new Date() }).where(eq(passwordResetTokens.id, record.id));
  });
}
