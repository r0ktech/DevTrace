import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getCurrentUser } from "./auth/session.js";
import { rateLimit } from "./rate-limit.js";

export function jsonError(status, code, message, extra = {}) {
  return NextResponse.json({ error: { code, message, ...extra } }, { status });
}

export class NotFoundError extends Error {
  constructor(message = "Not found") {
    super(message);
    this.status = 404;
  }
}

/**
 * CSRF defence for cookie-authenticated mutations: the request must come
 * from our own origin. Browsers always send Origin on cross-site POSTs.
 */
export function isSameOrigin(request) {
  const origin = request.headers.get("origin");
  if (!origin) {
    // Non-browser clients omit Origin; Fetch Metadata still identifies browsers.
    const site = request.headers.get("sec-fetch-site");
    return !site || site === "same-origin" || site === "none";
  }
  const allowed = new Set([new URL(request.url).origin]);
  if (process.env.NEXTAUTH_URL) allowed.add(new URL(process.env.NEXTAUTH_URL).origin);
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  if (host) {
    const proto = request.headers.get("x-forwarded-proto") || new URL(request.url).protocol.replace(":", "");
    allowed.add(`${proto}://${host}`);
  }
  return allowed.has(origin);
}

const DEFAULT_LIMITS = {
  read: { limit: 120, windowSeconds: 60 },
  write: { limit: 20, windowSeconds: 60 },
};

/**
 * Wrap an API route handler with authentication, CSRF and rate limiting.
 *
 *   export const GET = apiHandler(async ({ user, searchParams }) => {...})
 *
 * Options:
 *   mutation   - require same-origin, use write rate limit
 *   demoAllowed - when false, the read-only demo account gets 403
 *   limit      - override rate limit { limit, windowSeconds }
 */
export function apiHandler(handler, { mutation = false, demoAllowed = true, limit, name = "api" } = {}) {
  return async function route(request, context) {
    if (mutation && !isSameOrigin(request)) {
      return jsonError(403, "INVALID_ORIGIN", "Cross-origin requests are not allowed.");
    }

    const user = await getCurrentUser();
    if (!user) return jsonError(401, "UNAUTHENTICATED", "Sign in with GitHub to continue.");

    if (mutation && user.isDemo && !demoAllowed) {
      return jsonError(403, "DEMO_READ_ONLY", "The demo account is read-only. Connect GitHub to use your own data.");
    }

    const rl = await rateLimit(`${name}:${user.id}`, limit || (mutation ? DEFAULT_LIMITS.write : DEFAULT_LIMITS.read));
    if (!rl.ok) {
      const response = jsonError(429, "RATE_LIMITED", "Too many requests. Try again shortly.");
      response.headers.set("Retry-After", String(rl.retryAfter));
      return response;
    }

    try {
      const params = context?.params ? await context.params : {};
      const searchParams = new URL(request.url).searchParams;
      const result = await handler({ request, user, params, searchParams });
      return result instanceof Response ? result : NextResponse.json(result);
    } catch (error) {
      if (error instanceof ZodError) {
        return jsonError(400, "INVALID_REQUEST", "Some request parameters are invalid.", {
          issues: error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
        });
      }
      if (error instanceof NotFoundError) return jsonError(404, "NOT_FOUND", error.message);
      if (error instanceof SyntaxError) return jsonError(400, "INVALID_JSON", "Request body must be valid JSON.");
      console.error(`[api] ${request.method} ${new URL(request.url).pathname} failed:`, error);
      return jsonError(500, "INTERNAL_ERROR", "DevTrace couldn't complete this request. It has been logged.");
    }
  };
}
