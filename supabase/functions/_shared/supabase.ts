export type SupabaseEnvironment = {
  url: string;
  anonKey: string;
  serviceRoleKey: string;
};

export function supabaseEnvironment(): SupabaseEnvironment {
  const url = Deno.env.get("SUPABASE_URL") || "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!url || !anonKey || !serviceRoleKey) throw new Error("Supabase server environment is incomplete");
  return { url, anonKey, serviceRoleKey };
}

export async function serviceRequest(
  environment: SupabaseEnvironment,
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  return fetch(`${environment.url}${path}`, {
    ...init,
    headers: {
      apikey: environment.serviceRoleKey,
      Authorization: `Bearer ${environment.serviceRoleKey}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
}
