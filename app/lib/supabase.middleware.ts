import { styleText } from "node:util";
import { parseCookieHeader } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { MiddlewareFunction } from "react-router";
import { createContext, href, redirect } from "react-router";
import type { Database } from "./database.types";
import { createSupabaseClient } from "./supabase.server";

export const supabaseContext = createContext<SupabaseClient<Database>>();

let schemaCheckPromise: Promise<void> | null = null;

async function runListViewsSchemaCheck(supabase: SupabaseClient<Database>) {
  const { error } = await supabase
    .from("list_views")
    .select("list_id", { head: true, count: "exact" })
    .limit(1);

  if (!error) {
    return;
  }

  if (error.code === "PGRST205") {
    console.error(
      "[Startup check] list_views table is missing. Apply migrations (including supabase/migrations/20260312000000_list_views.sql) in this environment.",
    );
    return;
  }

  console.warn("[Startup check] Unable to verify list_views migration state:", error);
}

const supabaseStorageKey = `sb-${new URL(import.meta.env.VITE_SUPABASE_URL).hostname.split(".")[0]}-auth-token`;

function tokenSecondsLeft(cookieHeader: string): number | null {
  const cookies = parseCookieHeader(cookieHeader);
  const authCookie = cookies.find(
    (c) => (c.name === supabaseStorageKey || c.name === `${supabaseStorageKey}.0`) && c.value,
  );
  if (!authCookie?.value) return null;
  try {
    let value = authCookie.value;
    if (value.startsWith("base64-")) {
      value = Buffer.from(value.slice(7), "base64url").toString();
    }
    const tokenMatch = value.match(/"access_token":"([^"]+)"/);
    if (!tokenMatch) return null;
    const parts = tokenMatch[1].split(".");
    if (parts.length !== 3) return null; // not a real JWT (e.g. mock token)
    const { exp } = JSON.parse(Buffer.from(parts[1], "base64url").toString()) as { exp: number };
    return exp - Math.floor(Date.now() / 1000);
  } catch {
    return null;
  }
}

const publicRoutes = [
  "/perf",
  href("/login"),
  href("/forgot-password"),
  href("/auth/confirm"),
  href("/set-password"),
  href("/request-access"),
  href("/version"),
];

export const supabaseMiddleware: MiddlewareFunction<Response> = async (
  { request, context },
  next,
) => {
  const start = performance.now();

  const logger = (message: string, showMeta = false) => {
    console.log(
      `${styleText("yellow", "[Supabase]")} ${message}`,
      showMeta
        ? `\n${styleText("cyan", `[${Math.round(performance.now() - start)}ms]`)} ${styleText("magentaBright", new Date().toISOString())} | ${styleText("green", request.url)}`
        : "",
    );
  };

  const { supabase, cookieHeaders } = createSupabaseClient(request);

  logger(`Initialized Supabase client`, true);

  context.set(supabaseContext, supabase);

  const url = new URL(request.url);

  if (!publicRoutes.includes(url.pathname)) {
    if (!schemaCheckPromise) {
      schemaCheckPromise = runListViewsSchemaCheck(supabase).catch((error) => {
        console.warn("[Startup check] list_views schema check failed:", error);
      });
    }

    const cookie = request.headers.get("Cookie");
    const hasAuthCookie = cookie?.includes("sb-") ?? false;

    if (!cookie || !hasAuthCookie) {
      logger(`no auth cookie, redirect to login`, true);

      throw redirect(href("/login"), { headers: cookieHeaders });
    }

    const secs = tokenSecondsLeft(cookie);

    logger(
      `token ${secs === null ? "unreadable" : secs > 0 ? `expires in ${Math.floor(secs / 60)}m ${secs % 60}s` : `expired ${-secs}s ago`}`,
    );

    if (secs === null || secs <= 60) {
      logger(`session expiring - trying to refresh`, true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        logger(`failed getting session, redirect to login`, true);

        throw redirect(href("/login"), { headers: cookieHeaders });
      }

      logger(`session refreshed`, true);
    }
  }

  const response = await next();

  // Apply token refresh (and login/logout) cookie changes to the response
  for (const [key, value] of cookieHeaders.entries()) {
    response.headers.append(key, value);
  }

  logger(`complete`, true);

  return response;
};
