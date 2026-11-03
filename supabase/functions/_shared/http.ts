export const DEFAULT_ALLOWED_ORIGINS = [
  "https://6flong.github.io",
  "http://127.0.0.1:4173",
  "http://localhost:4173",
];

export function allowedOrigins(): Set<string> {
  const configured = Deno.env.get("APP_ALLOWED_ORIGINS")
    ?.split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return new Set(configured?.length ? configured : DEFAULT_ALLOWED_ORIGINS);
}

export function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("origin") || "";
  const allowed = allowedOrigins();
  return {
    "Access-Control-Allow-Origin": allowed.has(origin) ? origin : "null",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export function isAllowedOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  return !origin || allowedOrigins().has(origin);
}

export function jsonResponse(
  request: Request,
  status: number,
  body: Record<string, unknown>,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(request),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
