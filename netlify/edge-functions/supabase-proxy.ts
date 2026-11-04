const UPSTREAM_ORIGIN = "https://tcqyntzbeinlygvwahav.supabase.co";
const ROUTE_PREFIX = "/api/supabase";
const ALLOWED_ORIGINS = new Set([
  "https://6flong.github.io",
  "http://127.0.0.1:4173",
  "http://localhost:4173",
]);
const REQUEST_HEADERS = new Set([
  "accept",
  "accept-language",
  "apikey",
  "authorization",
  "content-type",
  "prefer",
  "range",
  "x-client-info",
  "x-upsert",
]);
const RESPONSE_HEADERS = new Set([
  "cache-control",
  "content-disposition",
  "content-length",
  "content-range",
  "content-type",
  "etag",
  "last-modified",
  "range",
]);
const ALLOWED_METHODS = new Set(["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"]);

function corsHeaders(origin: string | null): Headers {
  const headers = new Headers({
    "Access-Control-Allow-Headers": "apikey, authorization, content-type, prefer, range, x-client-info, x-upsert",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, PUT, DELETE, OPTIONS",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  });
  if (origin && ALLOWED_ORIGINS.has(origin)) headers.set("Access-Control-Allow-Origin", origin);
  return headers;
}

function json(status: number, code: string, origin: string | null): Response {
  const headers = corsHeaders(origin);
  headers.set("Content-Type", "application/json; charset=utf-8");
  return new Response(JSON.stringify({ error: code }), { status, headers });
}

export default async function supabaseProxy(request: Request): Promise<Response> {
  const origin = request.headers.get("origin");
  if (origin && !ALLOWED_ORIGINS.has(origin)) return json(403, "origin_not_allowed", origin);
  if (!ALLOWED_METHODS.has(request.method)) return json(405, "method_not_allowed", origin);
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(origin) });

  const incomingUrl = new URL(request.url);
  if (!incomingUrl.pathname.startsWith(`${ROUTE_PREFIX}/`)) return json(404, "route_not_found", origin);
  const targetPath = incomingUrl.pathname.slice(ROUTE_PREFIX.length);
  if (!/^\/(?:auth|rest|storage|functions)\/v1\//.test(`${targetPath}/`)) {
    return json(404, "route_not_allowed", origin);
  }

  const targetUrl = new URL(`${targetPath}${incomingUrl.search}`, UPSTREAM_ORIGIN);
  const requestHeaders = new Headers();
  request.headers.forEach((value, name) => {
    if (REQUEST_HEADERS.has(name.toLowerCase())) requestHeaders.set(name, value);
  });

  try {
    const upstream = await fetch(targetUrl, {
      method: request.method,
      headers: requestHeaders,
      body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
      redirect: "manual",
    });
    const responseHeaders = corsHeaders(origin);
    upstream.headers.forEach((value, name) => {
      if (RESPONSE_HEADERS.has(name.toLowerCase())) responseHeaders.set(name, value);
    });
    responseHeaders.set("Cache-Control", "no-store");
    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    });
  } catch {
    return json(502, "upstream_unreachable", origin);
  }
}

export const config = { path: "/api/supabase/*" };
