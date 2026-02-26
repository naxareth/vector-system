import { z } from 'zod';

// OWASP Recommended Password Regex
const passwordValidation = new RegExp(
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/
);

// Base schema for shared fields
const baseRegisterSchema = z.object({
  firstName: z.string({ required_error: "Please fill out this field" })
    .min(1, "Please fill out this field")
    .min(2, "Must be at least 2 characters")
    .max(50, "Must be 50 characters or fewer"),
  lastName: z.string({ required_error: "Please fill out this field" })
    .min(1, "Please fill out this field")
    .min(2, "Must be at least 2 characters")
    .max(50, "Must be 50 characters or fewer"),
  email: z.string({ required_error: "Please fill out this field" })
    .min(1, "Please fill out this field")
    .email("Please enter a valid email address"),
  password: z.string({ required_error: "Please fill out this field" })
    .min(1, "Please fill out this field")
    .regex(passwordValidation, {
      message: "Must be 12+ chars with uppercase, lowercase, number & special char",
    }),
  confirmPassword: z.string({ required_error: "Please fill out this field" })
    .min(1, "Please fill out this field"),
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