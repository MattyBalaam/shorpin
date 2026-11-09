import type { EmailOtpType } from "@supabase/supabase-js";
import { Hono } from "hono";
import * as v from "valibot";
import { serializeAppStyleCookie } from "../../lib/app-style.ts";
import { zForgotPassword, zLogin, zRequestAccess, zSetPassword } from "../../lib/auth-schemas.ts";
import { env } from "../env.ts";
import { redirectWithFlash } from "../flash.ts";
import { type Html, html } from "../html.ts";
import { renderPage } from "../page.ts";
import type { AppEnv } from "../supabase.ts";
import { notifications } from "../views/components.ts";

export const auth = new Hono<AppEnv>();

type FieldErrors = Record<string, string[] | undefined>;

interface FormState {
  values?: Record<string, string>;
  fieldErrors?: FieldErrors;
  formErrors?: string[];
}

/** Valibot issues, keyed by field name, the way the fields render them. */
function toFieldErrors(issues: v.BaseIssue<unknown>[]): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of issues) {
    const key = v.getDotPath(issue);
    if (key) (errors[key] ??= []).push(issue.message);
  }
  return errors;
}

async function readForm(body: Promise<Record<string, string | File | (string | File)[]>>) {
  return Object.fromEntries(
    Object.entries(await body).flatMap(([key, value]) =>
      typeof value === "string" ? [[key, value]] : [],
    ),
  ) as Record<string, string>;
}

function field({
  name,
  label,
  type,
  autocomplete,
  state,
  minlength,
}: {
  name: string;
  label: string;
  type: "email" | "password" | "text";
  autocomplete: string;
  state: FormState;
  minlength?: number;
}) {
  const id = `field-${name}`;
  const errors = state.fieldErrors?.[name];
  // Passwords never come back from the server.
  const value = type === "password" ? "" : (state.values?.[name] ?? "");
  return html`<div class="auth-field-field">
    <label for="${id}">${label}</label>
    <input
      class="auth-field-input"
      type="${type}"
      name="${name}"
      id="${id}"
      value="${value}"
      autocomplete="${autocomplete}"
      required
      ${minlength ? html`minlength="${minlength}"` : ""}
      ${errors ? html`aria-invalid="true" aria-describedby="${id}-error"` : ""}
    />
    ${errors ? html`<div id="${id}-error">${errors.map((error) => html`<p>${error}</p>`)}</div>` : ""}
  </div>`;
}

function formErrors(state: FormState) {
  return state.formErrors?.map((error) => html`<p role="alert">${error}</p>`) ?? "";
}

function submitButton(label: string) {
  return html`<button type="submit" class="button button-primary">${label}</button>`;
}

function authPage(
  c: Parameters<typeof renderPage>[0],
  title: string,
  content: Html,
  status?: 200 | 422,
) {
  return renderPage(c, {
    title: `${title} | Shorpin`,
    status,
    body: ({ flash }) =>
      html`${notifications(flash)}
        <div class="auth-layout">${content}</div>`,
  });
}

// --- Sign in ---

const DEV_USERS = [
  { email: "owner@test.com", label: "Owner" },
  { email: "collab@test.com", label: "Collaborator" },
];

function loginPage(c: Parameters<typeof renderPage>[0], state: FormState = {}, status?: 200 | 422) {
  return authPage(
    c,
    "Sign in",
    html`<h1>Sign in${env.isMock ? " (Dev Mode)" : ""}</h1>
      <form method="post" class="auth-field-form">
        ${formErrors(state)}
        ${field({ name: "email", label: "Email", type: "email", autocomplete: "email", state })}
        ${field({ name: "password", label: "Password", type: "password", autocomplete: "current-password", state })}
        ${submitButton("Sign in")}
      </form>
      <div class="auth-field-links">
        <a class="button-link" href="/forgot-password">Forgot password?</a>
        <a class="button-link" href="/request-access">Request access</a>
      </div>
      ${
        env.isMock
          ? html`<div class="login-dev-section">
              <p class="login-dev-heading">Dev quick-login</p>
              ${DEV_USERS.map(
                ({ email, label }) =>
                  html`<form method="post">
                    <input type="hidden" name="email" value="${email}" />
                    <input type="hidden" name="password" value="password" />
                    <button type="submit" class="login-dev-button">
                      ${label} <span class="login-dev-email">${email}</span>
                    </button>
                  </form>`,
              )}
            </div>`
          : ""
      }`,
    status,
  );
}

auth.get("/login", (c) => loginPage(c));

auth.post("/login", async (c) => {
  const values = await readForm(c.req.parseBody());
  const result = v.safeParse(zLogin, values);
  if (!result.success) {
    return loginPage(c, { values, fieldErrors: toFieldErrors(result.issues) }, 422);
  }
  const { error } = await c.get("supabase").auth.signInWithPassword(result.output);
  if (error) return loginPage(c, { values, formErrors: [error.message] }, 422);
  return redirectWithFlash(c, "/", "success", "Welcome back!");
});

auth.post("/logout", async (c) => {
  await c.get("supabase").auth.signOut();
  // The style cookie caches this account's choice; expire it so whoever
  // signs in next starts from the default.
  c.header("Set-Cookie", serializeAppStyleCookie(null), { append: true });
  // Tells the service worker to drop its per-user page cache and queue.
  c.header("Clear-Site-Data", '"cache", "storage"');
  return redirectWithFlash(c, "/login", "success", "You have been logged out.");
});

// --- Forgot password ---

function forgotPage(
  c: Parameters<typeof renderPage>[0],
  state: FormState = {},
  status?: 200 | 422,
) {
  return authPage(
    c,
    "Forgot password",
    html`<h1>Forgot password</h1>
      <form method="post" class="auth-field-form">
        ${formErrors(state)}
        ${field({ name: "email", label: "Email", type: "email", autocomplete: "email", state })}
        ${submitButton("Send reset link")}
      </form>
      <a class="button-link" href="/login">Back to sign in</a>`,
    status,
  );
}

auth.get("/forgot-password", (c) => forgotPage(c));

auth.post("/forgot-password", async (c) => {
  const values = await readForm(c.req.parseBody());
  const result = v.safeParse(zForgotPassword, values);
  if (!result.success) {
    return forgotPage(c, { values, fieldErrors: toFieldErrors(result.issues) }, 422);
  }
  await c.get("supabase").auth.resetPasswordForEmail(result.output.email);
  // Always the same answer, so this can't test whether an account exists.
  return authPage(
    c,
    "Check your email",
    html`<h1>Check your email</h1>
      <p>If an account exists for that address, you'll receive a password reset link shortly.</p>
      <a class="button-link" href="/login">Back to sign in</a>`,
  );
});

// --- Email links (invite, recovery) ---

const PASSWORD_SETUP_TYPES: EmailOtpType[] = ["recovery", "invite"];

auth.get("/auth/confirm", async (c) => {
  const tokenHash = c.req.query("token_hash");
  const type = c.req.query("type") as EmailOtpType | undefined;
  if (!tokenHash || !type) return c.text("Missing token", 400);

  const { error } = await c.get("supabase").auth.verifyOtp({ token_hash: tokenHash, type });
  if (error) {
    console.error("Error verifying OTP:", error);
    return c.text("Invalid or expired link", 400);
  }
  return c.redirect(PASSWORD_SETUP_TYPES.includes(type) ? "/set-password" : "/", 303);
});

// --- Set password ---

async function setPasswordPage(
  c: Parameters<typeof renderPage>[0],
  state: FormState = {},
  status?: 200 | 422,
) {
  const {
    data: { user },
  } = await c.get("supabase").auth.getUser();
  return authPage(
    c,
    "Set password",
    html`<h1>Set new password</h1>
      <form method="post" class="auth-field-form">
        <input type="hidden" autocomplete="username" value="${user?.email ?? ""}" />
        ${formErrors(state)}
        ${field({ name: "password", label: "New password", type: "password", autocomplete: "new-password", state, minlength: 8 })}
        ${field({ name: "confirm-password", label: "Confirm password", type: "password", autocomplete: "new-password", state, minlength: 8 })}
        ${submitButton("Update password")}
      </form>`,
    status,
  );
}

auth.get("/set-password", (c) => setPasswordPage(c));

auth.post("/set-password", async (c) => {
  const values = await readForm(c.req.parseBody());
  const result = v.safeParse(zSetPassword, values);
  if (!result.success) {
    return setPasswordPage(c, { fieldErrors: toFieldErrors(result.issues) }, 422);
  }
  if (result.output.password !== result.output["confirm-password"]) {
    return setPasswordPage(
      c,
      { fieldErrors: { "confirm-password": ["Passwords do not match"] } },
      422,
    );
  }
  const { error } = await c.get("supabase").auth.updateUser({ password: result.output.password });
  if (error) return setPasswordPage(c, { formErrors: [error.message] }, 422);
  return redirectWithFlash(c, "/", "success", "Password updated successfully");
});

// --- Request access (the waitlist) ---

function requestAccessPage(
  c: Parameters<typeof renderPage>[0],
  state: FormState = {},
  status?: 200 | 422,
) {
  return authPage(
    c,
    "Request access",
    html`<h1>Request access</h1>
      <form method="post" class="auth-field-form">
        ${formErrors(state)}
        ${field({ name: "first_name", label: "First name", type: "text", autocomplete: "given-name", state })}
        ${field({ name: "last_name", label: "Last name", type: "text", autocomplete: "family-name", state })}
        ${field({ name: "email", label: "Email", type: "email", autocomplete: "email", state })}
        ${submitButton("Request access")}
      </form>`,
    status,
  );
}

auth.get("/request-access", (c) => requestAccessPage(c));

auth.post("/request-access", async (c) => {
  const values = await readForm(c.req.parseBody());
  const result = v.safeParse(zRequestAccess, values);
  if (!result.success) {
    return requestAccessPage(c, { values, fieldErrors: toFieldErrors(result.issues) }, 422);
  }
  const { error } = await c.get("supabase").from("waitlist").insert(result.output);
  if (error) {
    console.error("Error adding to waitlist:", error);
    return requestAccessPage(
      c,
      { values, formErrors: ["Something went wrong. Please try again."] },
      422,
    );
  }
  return redirectWithFlash(
    c,
    "/login",
    "success",
    "Your account is being verified. We'll be in touch soon.",
  );
});
