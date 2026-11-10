import * as v from "valibot";

const email = v.pipe(v.string(), v.minLength(1, "Email is required"), v.email("Invalid email"));

export const zLogin = v.object({
  email,
  password: v.pipe(v.string(), v.minLength(1, "Password is required")),
});

/** The login form plus, in preview builds, which backend to sign in to. */
export const zSignIn = v.object({
  ...zLogin.entries,
  backend: v.optional(v.picklist(["mock", "test"])),
});

export const zForgotPassword = v.object({ email });

// The match check is part of the schema, so the form catches a mismatch
// before submitting and the server function's validator still enforces it.
export const zSetPassword = v.pipe(
  v.object({
    password: v.pipe(v.string(), v.minLength(8, "Password must be at least 8 characters")),
    "confirm-password": v.pipe(
      v.string(),
      v.minLength(8, "Confirmation must be at least 8 characters"),
    ),
  }),
  v.forward(
    v.partialCheck(
      [["password"], ["confirm-password"]],
      (input) => input.password === input["confirm-password"],
      "Passwords do not match",
    ),
    ["confirm-password"],
  ),
);

export const zRequestAccess = v.object({
  email,
  first_name: v.pipe(v.string(), v.minLength(1, "First name is required")),
  last_name: v.pipe(v.string(), v.minLength(1, "Last name is required")),
});
