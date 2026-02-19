import { z } from "zod/v4";

export const zLogin = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

export const zForgotPassword = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email"),
});

export const zSetPassword = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
  "confirm-password": z.string().min(8, "Confirmation must be at least 8 characters"),
});

export const zRequestAccess = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email"),
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
});
