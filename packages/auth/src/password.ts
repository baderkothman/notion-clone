import bcrypt from "bcryptjs";

/** Cost factor 12: OWASP's current floor for bcrypt as of 2024+ guidance. Revisit
 * upward as hardware improves — see docs/SECURITY.md. */
const BCRYPT_COST_FACTOR = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST_FACTOR);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
