import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest } from "next/server";

const nextAuthHandler = NextAuth(authOptions);

/**
 * Wraps the NextAuth handler to rewrite any localhost URLs in the response
 * to the actual request origin. This is the definitive fix for the issue
 * where NEXTAUTH_URL=http://localhost:3011 is set in Vercel env vars,
 * causing next-auth/react's signIn() to redirect the browser to localhost.
 *
 * Works by:
 * 1. Capturing the real origin from the incoming request's Host/x-forwarded-host header
 * 2. Reading the NextAuth response body
 * 3. Replacing any localhost:PORT occurrences with the real origin
 * 4. Fixing the Location header for 302 redirects too
 */
async function wrappedHandler(req: NextRequest, context: { params: { nextauth: string[] } }) {
  const response = await nextAuthHandler(req, context);

  // Determine the real origin: prefer x-forwarded-host (set by Vercel proxy)
  const forwardedHost = req.headers.get("x-forwarded-host");
  const host = forwardedHost || req.headers.get("host") || "";
  const proto = req.headers.get("x-forwarded-proto") || "https";
  const realOrigin = host ? `${proto}://${host}` : null;

  // Only rewrite if we're running on a non-localhost host
  if (!realOrigin || realOrigin.includes("localhost")) {
    return response;
  }

  // Rewrite Location header (for 302 redirects from server-side NextAuth flow)
  const location = response.headers.get("location");
  if (location && (location.includes("localhost") || location.startsWith("http://localhost"))) {
    const fixedLocation = location.replace(/https?:\/\/localhost:\d+/g, realOrigin);
    const newHeaders = new Headers(response.headers);
    newHeaders.set("location", fixedLocation);

    const newResponse = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
    return newResponse;
  }

  // Rewrite JSON body (for credentials signIn() which returns {url: ...})
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const text = await response.text();
    if (text.includes("localhost")) {
      const fixed = text.replace(/https?:\/\/localhost:\d+/g, realOrigin);
      const newHeaders = new Headers(response.headers);
      newHeaders.set("content-length", String(Buffer.byteLength(fixed)));
      return new Response(fixed, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      });
    }
  }

  return response;
}

export { wrappedHandler as GET, wrappedHandler as POST };

