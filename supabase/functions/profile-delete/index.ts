import { ApiError, authenticateAdministrator } from "../_shared/admin.ts";
import { corsHeaders, isAllowedOrigin, jsonResponse } from "../_shared/http.ts";
import { serviceRequest, supabaseEnvironment } from "../_shared/supabase.ts";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function serviceJson(environment: ReturnType<typeof supabaseEnvironment>, path: string): Promise<unknown> {
  const response = await serviceRequest(environment, path);
  if (!response.ok) throw new ApiError(500, "cloud_read_failed", "云端数据读取失败");
  return response.json();
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(request) });
  if (request.method !== "POST") return jsonResponse(request, 405, { error: "method_not_allowed" });
  if (!isAllowedOrigin(request)) return jsonResponse(request, 403, { error: "origin_not_allowed" });
  if (Number(request.headers.get("content-length") || 0) > 8192) return jsonResponse(request, 413, { error: "request_too_large" });

  const environment = supabaseEnvironment();
  try {
    const admin = await authenticateAdministrator(request, environment);
    const payload = await request.json();
    const profileId = String(payload?.profileId || "");
    const confirmName = String(payload?.confirmName || "");
    if (!UUID_PATTERN.test(profileId) || payload?.confirmPermanent !== true) {
      throw new ApiError(400, "delete_confirmation_required", "需要确认永久删除");
    }
    const params = new URLSearchParams({
      id: `eq.${profileId}`,
      owner_id: `eq.${admin.id}`,
      select: "id,name,relation",
      limit: "1",
    });
    const rows = await serviceJson(environment, `/rest/v1/profiles?${params}`);
    const profile = Array.isArray(rows) ? rows[0] : null;
    if (!profile) throw new ApiError(404, "profile_not_found", "档案不存在或已删除");
    if (profile.name !== confirmName) throw new ApiError(400, "delete_name_mismatch", "档案名称确认不一致");

    const reportPath = `${admin.id}/${profileId}/current-report.pdf`;
    const storageResponse = await serviceRequest(environment, `/storage/v1/object/reports/${reportPath}`, { method: "DELETE" });
    if (!storageResponse.ok && storageResponse.status !== 404) {
      throw new ApiError(502, "report_delete_failed", "报告文件删除失败，档案尚未删除，请重试");
    }

    const deleteResponse = await serviceRequest(environment, "/rest/v1/rpc/delete_profile_permanently", {
      method: "POST",
      body: JSON.stringify({ target_owner_id: admin.id, target_profile_id: profileId }),
    });
    if (!deleteResponse.ok) {
      throw new ApiError(500, "profile_delete_failed", "档案删除失败，请安全重试");
    }
    const result = await deleteResponse.json();
    if (!result?.deleted) throw new ApiError(500, "profile_delete_failed", "档案删除失败，请安全重试");
    return jsonResponse(request, 200, {
      ...result,
      scope: ["档案", "命盘", "会话", "消息", "滚动摘要", "分析报告"],
    });
  } catch (error) {
    const apiError = error instanceof ApiError ? error : new ApiError(500, "profile_delete_failed", "档案删除失败，请安全重试");
    return jsonResponse(request, apiError.status, { error: apiError.code, message: apiError.message });
  }
});
