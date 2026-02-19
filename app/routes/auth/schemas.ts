import * as v from "valibot";

const email = v.pipe(
  v.string(),
  v.minLength(1, "Email is required"),
  v.email("Invalid email"),
);

export const zLogin = v.object({
  email,
  password: v.pipe(v.string(), v.minLength(1, "Password is required")),
});

export const zForgotPassword = v.object({ email });

export const zSetPassword = v.object({
  password: v.pipe(
    v.string(),
    v.minLength(8, "Password must be at least 8 characters"),
  ),
  "confirm-password": v.pipe(
    v.string(),
    v.minLength(8, "Confirmation must be at least 8 characters"),
  ),
});

export const zRequestAccess = v.object({
  email,
  first_name: v.pipe(v.string(), v.minLength(1, "First name is required")),
  last_name: v.pipe(v.string(), v.minLength(1, "Last name is required")),
});
