import { corsHeaders, isAllowedOrigin, jsonResponse } from "../_shared/http.ts";
import {
  getClientIp,
  isPlausibleEmail,
  maskIp,
  normalizeAccount,
  resolveApproximateLocation,
  sanitizeDevice,
  sha256Hex,
} from "../_shared/security.ts";
import { serviceRequest, supabaseEnvironment } from "../_shared/supabase.ts";

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_ATTEMPTS = 10;

type LoginEvent = {
  user_id?: string | null;
  event_type: string;
  account_identifier: string;
  device_summary: string;
  ip_hash: string;
  ip_masked: string;
  country_code: string;
  region_name: string;
  city_name: string;
  location_source: string;
  risk_level: "normal" | "warning" | "high";
};

async function logEvent(environment: ReturnType<typeof supabaseEnvironment>, event: LoginEvent): Promise<void> {
  const response = await serviceRequest(environment, "/rest/v1/login_events", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(event),
  });
  if (!response.ok) throw new Error(`Unable to write login event: ${response.status}`);
}

async function recentAttemptCount(
  environment: ReturnType<typeof supabaseEnvironment>,
  account: string,
  ipHash: string,
): Promise<number> {
  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
  const params = new URLSearchParams({
    select: "id",
    occurred_at: `gte.${since}`,
    or: `(account_identifier.eq.${account},ip_hash.eq.${ipHash})`,
    limit: String(RATE_LIMIT_ATTEMPTS),
  });
  const response = await serviceRequest(environment, `/rest/v1/login_events?${params}`);
  if (!response.ok) return 0;
  const rows = await response.json();
  return Array.isArray(rows) ? rows.length : 0;
}

async function isAdmin(
  environment: ReturnType<typeof supabaseEnvironment>,
  userId: string,
): Promise<boolean> {
  const params = new URLSearchParams({ user_id: `eq.${userId}`, select: "user_id", limit: "1" });
  const response = await serviceRequest(environment, `/rest/v1/admin_users?${params}`);
  if (!response.ok) throw new Error(`Unable to verify administrator: ${response.status}`);
  const rows = await response.json();
  return Array.isArray(rows) && rows.length === 1;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  }
  if (request.method !== "POST") return jsonResponse(request, 405, { error: "method_not_allowed" });
  if (!isAllowedOrigin(request)) return jsonResponse(request, 403, { error: "origin_not_allowed" });

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 4096) return jsonResponse(request, 413, { error: "request_too_large" });

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse(request, 400, { error: "invalid_request" });
  }

  const account = normalizeAccount(payload.account);
  const password = String(payload.password ?? "");
  if (!isPlausibleEmail(account) || !password || password.length > 256) {
    return jsonResponse(request, 401, { error: "invalid_credentials", message: "账户或密码不正确" });
  }

  const environment = supabaseEnvironment();
  const ip = getClientIp(request.headers);
  const salt = Deno.env.get("LOGIN_AUDIT_SALT") || environment.url;
  const ipHash = await sha256Hex(`${salt}:${ip || "unknown"}`);
  const device = sanitizeDevice(request.headers.get("user-agent"));
  const location = await resolveApproximateLocation(request.headers, ip);
  const eventBase = {
    account_identifier: account,
    device_summary: device,
    ip_hash: ipHash,
    ip_masked: maskIp(ip),
    country_code: location.countryCode,
    region_name: location.regionName,
    city_name: location.cityName,
    location_source: location.source,
  };

  if ((await recentAttemptCount(environment, account, ipHash)) >= RATE_LIMIT_ATTEMPTS) {
    await logEvent(environment, { ...eventBase, event_type: "rate_limited", risk_level: "high" });
    return jsonResponse(request, 429, { error: "rate_limited", message: "尝试次数过多，请稍后再试" });
  }

  const authResponse = await fetch(`${environment.url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: environment.anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email: account, password }),
  });

  if (!authResponse.ok) {
    await logEvent(environment, { ...eventBase, event_type: "invalid_credentials", risk_level: "warning" });
    return jsonResponse(request, 401, { error: "invalid_credentials", message: "账户或密码不正确" });
  }

  const session = await authResponse.json();
  const userId = String(session?.user?.id || "");
  if (!userId || !(await isAdmin(environment, userId))) {
    await logEvent(environment, {
      ...eventBase,
      user_id: userId || null,
      event_type: "non_admin_authenticated_blocked",
      risk_level: "high",
    });
    if (session?.access_token) {
      await fetch(`${environment.url}/auth/v1/logout`, {
        method: "POST",
        headers: { apikey: environment.anonKey, Authorization: `Bearer ${session.access_token}` },
      }).catch(() => undefined);
    }
    return jsonResponse(request, 401, { error: "invalid_credentials", message: "账户或密码不正确" });
  }

  await logEvent(environment, {
    ...eventBase,
    user_id: userId,
    event_type: "admin_login_success",
    risk_level: "normal",
  });

  return jsonResponse(request, 200, {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_in: session.expires_in,
    token_type: session.token_type || "bearer",
    user: { id: userId },
  });
});
