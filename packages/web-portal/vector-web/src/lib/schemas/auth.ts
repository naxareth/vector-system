import { z } from 'zod';

// OWASP Recommended Password Regex
const passwordValidation = new RegExp(
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/
);

// Base schema for shared fields
const baseRegisterSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters").max(50, "First name is too long"),
  lastName: z.string().min(2, "Last name must be at least 2 characters").max(50, "Last name is too long"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().regex(passwordValidation, {
    message: "Password must be 12+ chars, include uppercase, lowercase, number, and special char.",
  }),
  confirmPassword: z.string(),
});

// Student specific schema
export const studentSchema = baseRegisterSchema.refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

// Registrar specific schema (Includes de-jargonized "Authorization Code" instead of Invite Code)
export const registrarSchema = baseRegisterSchema.extend({
  inviteCode: z.string().min(6, "Authorization code must be at least 6 characters"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export type StudentRegisterData = z.infer<typeof studentSchema>;
export type RegistrarRegisterData = z.infer<typeof registrarSchema>;