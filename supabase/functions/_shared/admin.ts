import { serviceRequest, type SupabaseEnvironment } from "./supabase.ts";

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export async function authenticateAdministrator(
  request: Request,
  environment: SupabaseEnvironment,
): Promise<{ id: string }> {
  const authorization = request.headers.get("authorization") || "";
  const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1] || "";
  if (!token) throw new ApiError(401, "session_missing", "登录状态已失效");

  const userResponse = await fetch(`${environment.url}/auth/v1/user`, {
    headers: { apikey: environment.anonKey, Authorization: `Bearer ${token}` },
  });
  if (!userResponse.ok) throw new ApiError(401, "session_invalid", "登录状态已失效");
  const user = await userResponse.json();
  const userId = String(user?.id || "");
  if (!userId) throw new ApiError(401, "session_invalid", "登录状态已失效");

  const params = new URLSearchParams({ user_id: `eq.${userId}`, select: "user_id", limit: "1" });
  const adminResponse = await serviceRequest(environment, `/rest/v1/admin_users?${params}`);
  const admins = adminResponse.ok ? await adminResponse.json() : [];
  if (!Array.isArray(admins) || admins.length !== 1) {
    throw new ApiError(403, "administrator_required", "当前账户无权使用此应用");
  }
  return { id: userId };
}
