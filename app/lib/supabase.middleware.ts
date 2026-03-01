import { parseCookieHeader } from "@supabase/ssr";
import { redirect, createContext, href } from "react-router";
import type { MiddlewareFunction } from "react-router";
import { createSupabaseClient } from "./supabase.server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

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
    const { exp } = JSON.parse(
      Buffer.from(parts[1], "base64url").toString(),
    ) as { exp: number };
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
];

export const supabaseMiddleware: MiddlewareFunction<Response> = async (
  { request, context },
  next,
) => {
  const start = performance.now();

  const { supabase, cookieHeaders } = createSupabaseClient(request);

  console.log(
    `[Supabase Middleware] Initialized Supabase client in ${performance.now() - start}ms`,
  );

  context.set(supabaseContext, supabase);

  const url = new URL(request.url);

  if (!publicRoutes.includes(url.pathname)) {
    const hasAuthCookie = request.headers.get("Cookie")?.includes("sb-") ?? false;

    if (!hasAuthCookie) {
      throw redirect(href("/login"), { headers: cookieHeaders });
    }

    const secs = tokenSecondsLeft(request.headers.get("Cookie")!);
    console.log(
      `[Supabase Middleware] token ${secs === null ? "unreadable" : secs > 0 ? `expires in ${Math.floor(secs / 60)}m ${secs % 60}s` : `expired ${-secs}s ago`}`,
    );

    if (request.method !== "GET") {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      console.log(`[Supabase Middleware] got session in ${performance.now() - start}ms`);

      if (!session) {
        throw redirect(href("/login"), { headers: cookieHeaders });
      }
    }
  }

  const response = await next();

  // Apply token refresh (and login/logout) cookie changes to the response
  for (const [key, value] of cookieHeaders.entries()) {
    response.headers.append(key, value);
  }

  console.log(`[Supabase Middleware] return full flow  in ${performance.now() - start}ms`);

  return response;
};
