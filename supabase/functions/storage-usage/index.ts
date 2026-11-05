import { ApiError, authenticateAdministrator } from "../_shared/admin.ts";
import { corsHeaders, isAllowedOrigin, jsonResponse } from "../_shared/http.ts";
import { serviceRequest, supabaseEnvironment } from "../_shared/supabase.ts";

const DEFAULT_DATABASE_LIMIT_BYTES = 500 * 1024 * 1024;
const DEFAULT_STORAGE_LIMIT_BYTES = 1024 * 1024 * 1024;

function positiveLimit(name: string, fallback: number): number {
  const value = Number(Deno.env.get(name) || fallback);
  return Number.isFinite(value) && value > 0 ? Math.round(value) : fallback;
}

function percentage(used: number, limit: number): number {
  return Number(Math.max(0, (used / limit) * 100).toFixed(2));
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(request) });
  if (request.method !== "POST") return jsonResponse(request, 405, { error: "method_not_allowed" });
  if (!isAllowedOrigin(request)) return jsonResponse(request, 403, { error: "origin_not_allowed" });
  if (Number(request.headers.get("content-length") || 0) > 1024) {
    return jsonResponse(request, 413, { error: "request_too_large" });
  }

  const environment = supabaseEnvironment();
  try {
    const admin = await authenticateAdministrator(request, environment);
    const response = await serviceRequest(environment, "/rest/v1/rpc/get_cloud_usage", {
      method: "POST",
      body: JSON.stringify({ target_owner_id: admin.id }),
    });
    if (!response.ok) throw new ApiError(500, "usage_read_failed", "云端存储情况读取失败");
    const usage = await response.json();
    const databaseUsed = Math.max(0, Number(usage?.databaseBytes || 0));
    const reportUsed = Math.max(0, Number(usage?.reportBytes || 0));
    const databaseLimit = positiveLimit("DATABASE_REFERENCE_LIMIT_BYTES", DEFAULT_DATABASE_LIMIT_BYTES);
    const reportLimit = positiveLimit("STORAGE_REFERENCE_LIMIT_BYTES", DEFAULT_STORAGE_LIMIT_BYTES);

    return jsonResponse(request, 200, {
      database: {
        usedBytes: databaseUsed,
        referenceLimitBytes: databaseLimit,
        percent: percentage(databaseUsed, databaseLimit),
      },
      reports: {
        usedBytes: reportUsed,
        referenceLimitBytes: reportLimit,
        percent: percentage(reportUsed, reportLimit),
      },
      counts: {
        profiles: Math.max(0, Number(usage?.profileCount || 0)),
        messages: Math.max(0, Number(usage?.messageCount || 0)),
        reports: Math.max(0, Number(usage?.reportCount || 0)),
      },
      measuredAt: new Date().toISOString(),
      limitKind: "free_plan_reference",
    });
  } catch (error) {
    const apiError = error instanceof ApiError ? error : new ApiError(500, "usage_read_failed", "云端存储情况读取失败");
    return jsonResponse(request, apiError.status, { error: apiError.code, message: apiError.message });
  }
});
