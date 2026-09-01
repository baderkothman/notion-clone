import { z } from "zod";

export const emailSchema = z.string().trim().toLowerCase().email().max(320);

/** OWASP ASVS-aligned minimum: length over composition rules (composition rules push
 * users toward predictable patterns without meaningfully raising entropy). */
export const passwordSchema = z
  .string()
  .min(10, "Password must be at least 10 characters.")
  .max(256, "Password is too long.");

export const signUpSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(200),
  email: emailSchema,
  password: passwordSchema,
});
export type SignUpInput = z.infer<typeof signUpSchema>;

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required.").max(256),
});
export type SignInInput = z.infer<typeof signInSchema>;

export const requestPasswordResetSchema = z.object({ email: emailSchema });
export type RequestPasswordResetInput = z.infer<typeof requestPasswordResetSchema>;

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: passwordSchema,
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
