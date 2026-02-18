import { redirect, createContext } from "react-router";
import type { MiddlewareFunction } from "react-router";
import { createSupabaseClient } from "./supabase.server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

export const supabaseContext = createContext<SupabaseClient<Database>>();

const publicRoutes = [
  "/login",
  "/forgot-password",
  "/auth/confirm",
  "/set-password",
];

export const supabaseMiddleware: MiddlewareFunction<Response> = async (
  { request, context },
  next,
) => {
  const responseHeaders = new Headers();
  const supabase = createSupabaseClient(request, responseHeaders);

  context.set(supabaseContext, supabase);

  const url = new URL(request.url);
  if (!publicRoutes.includes(url.pathname)) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw redirect("/login", { headers: responseHeaders });
    }
  }

  const response = await next();

  // Apply token refresh (and login/logout) cookie changes to the response
  for (const [key, value] of responseHeaders.entries()) {
    response.headers.append(key, value);
  }

  return response;
};
