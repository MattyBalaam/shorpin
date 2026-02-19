import { redirect, createContext, href } from "react-router";
import type { MiddlewareFunction } from "react-router";
import { createSupabaseClient } from "./supabase.server";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

export const supabaseContext = createContext<SupabaseClient<Database>>();

const publicRoutes = [
  href("/login"),
  href("/forgot-password"),
  href("/auth/confirm"),
  href("/set-password"),
];

export const supabaseMiddleware: MiddlewareFunction<Response> = async (
  { request, context },
  next,
) => {
  const { supabase, cookieHeaders } = createSupabaseClient(request);

  context.set(supabaseContext, supabase);

  const url = new URL(request.url);
  if (!publicRoutes.includes(url.pathname)) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw redirect(href("/login"), { headers: cookieHeaders });
    }
  }

  const response = await next();

  // Apply token refresh (and login/logout) cookie changes to the response
  for (const [key, value] of cookieHeaders.entries()) {
    response.headers.append(key, value);
  }

  return response;
};
