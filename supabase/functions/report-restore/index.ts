import { ApiError, authenticateAdministrator } from "../_shared/admin.ts";
import { corsHeaders, isAllowedOrigin, jsonResponse } from "../_shared/http.ts";
import { serviceRequest, supabaseEnvironment } from "../_shared/supabase.ts";

const MAX_REQUEST_BYTES = 25 * 1024 * 1024;

function stablePayload(value: Record<string, unknown>): string {
  const copy = { ...value };
  delete copy.integrity;
  return JSON.stringify(copy);
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function validateBackup(value: unknown): Promise<Record<string, unknown>> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ApiError(400, "backup_invalid", "恢复数据格式错误");
  const backup = value as Record<string, unknown>;
  const profile = backup.profile as Record<string, unknown> | undefined;
  const chart = backup.currentChart as Record<string, unknown> | undefined;
  const integrity = backup.integrity as Record<string, unknown> | undefined;
  if (backup.formatVersion !== "mingli-backup-v1" || !profile?.id || !chart?.facts) {
    throw new ApiError(400, "backup_version_unsupported", "恢复数据版本不受支持");
  }
  if (integrity?.algorithm !== "SHA-256" || typeof integrity.sha256 !== "string") {
    throw new ApiError(400, "backup_integrity_missing", "恢复数据缺少完整性校验");
  }
  if ((await sha256Hex(stablePayload(backup))) !== integrity.sha256) {
    throw new ApiError(400, "backup_integrity_failed", "恢复数据完整性校验失败");
  }
  const serialized = JSON.stringify(backup);
  for (const forbidden of ["access_token", "refresh_token", "service_role", "DEEPSEEK_API_KEY", "password"]) {
    if (serialized.includes(forbidden)) throw new ApiError(400, "backup_contains_secret", "恢复数据包含不允许的敏感字段");
  }
  return backup;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(request) });
  if (request.method !== "POST") return jsonResponse(request, 405, { error: "method_not_allowed" });
  if (!isAllowedOrigin(request)) return jsonResponse(request, 403, { error: "origin_not_allowed" });
  if (Number(request.headers.get("content-length") || 0) > MAX_REQUEST_BYTES) {
    return jsonResponse(request, 413, { error: "request_too_large", message: "恢复数据超过服务端限制" });
  }

  const environment = supabaseEnvironment();
  try {
    const admin = await authenticateAdministrator(request, environment);
    const payload = await request.json();
    const mode = String(payload?.conflictMode || "preserve");
    if (!["preserve", "replace", "copy"].includes(mode)) throw new ApiError(400, "conflict_mode_invalid", "冲突处理方式无效");
    if (!Array.isArray(payload?.backups) || payload.backups.length < 1 || payload.backups.length > 100) {
      throw new ApiError(400, "backup_collection_invalid", "一次只能恢复 1 到 100 份档案");
    }
    const backups = [];
    for (const backup of payload.backups) backups.push(await validateBackup(backup));

    const response = await serviceRequest(environment, "/rest/v1/rpc/restore_profile_backups", {
      method: "POST",
      body: JSON.stringify({
        target_owner_id: admin.id,
        target_backups: backups,
        target_conflict_mode: mode,
      }),
    });
    if (!response.ok) throw new ApiError(500, "restore_transaction_failed", "恢复失败，云端原数据未改变");
    const result = await response.json();
    return jsonResponse(request, 200, result);
  } catch (error) {
    const apiError = error instanceof ApiError ? error : new ApiError(500, "restore_failed", "恢复失败，云端原数据未改变");
    return jsonResponse(request, apiError.status, { error: apiError.code, message: apiError.message });
  }
});
