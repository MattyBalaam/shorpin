import { styleText } from "node:util";
import { parseCookieHeader } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { MiddlewareFunction } from "react-router";
import { createContext, href, redirect } from "react-router";
import type { Database } from "./database.types";
import { createSupabaseClient } from "./supabase.server";

export const supabaseContext = createContext<SupabaseClient<Database>>();

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
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        logger(`failed getting session, redirect to login`, true);

        throw redirect(href("/login"), { headers: cookieHeaders });
      }

      logger(`got session`, true);
    }
  }

  const response = await next();

  // Apply token refresh (and login/logout) cookie changes to the response
  for (const [key, value] of cookieHeaders.entries()) {
    response.headers.append(key, value);
  }

  // Cache authenticated HTML navigations in the browser — stale-while-revalidate
  // means back-navigations and repeat visits feel instant while a fresh copy is
  // fetched in the background. Scoped to navigation requests on non-public routes
  // so data fetches and the SW's offline error-state logic are unaffected.
  if (
    !publicRoutes.includes(url.pathname) &&
    request.headers.get("Sec-Fetch-Mode") === "navigate"
  ) {
    response.headers.set("Cache-Control", "private, max-age=0, stale-while-revalidate=30");
  }

  logger(`complete`, true);

  return response;
};
