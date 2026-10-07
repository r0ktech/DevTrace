import { NextResponse } from "next/server";
import { createDemoSession, demoEnabled, sessionCookieName } from "@/server/auth/demo";
import { isSameOrigin, jsonError } from "@/server/http";
import { rateLimit } from "@/server/rate-limit";

// POST /api/demo — sign in to the shared, read-only demo account.
export async function POST(request) {
  if (!demoEnabled()) return jsonError(404, "NOT_FOUND", "Demo mode is disabled.");
  if (!isSameOrigin(request)) return jsonError(403, "INVALID_ORIGIN", "Cross-origin requests are not allowed.");

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  const rl = await rateLimit(`demo:${ip}`, { limit: 10, windowSeconds: 600 });
  if (!rl.ok) return jsonError(429, "RATE_LIMITED", "Too many demo sessions from this address. Try again later.");

  const { sessionToken, expires } = await createDemoSession();
  const { name, secure } = sessionCookieName();
  const response = NextResponse.redirect(new URL("/dashboard", request.url), 303);
  response.cookies.set(name, sessionToken, { httpOnly: true, sameSite: "lax", secure, path: "/", expires });
  return response;
}
