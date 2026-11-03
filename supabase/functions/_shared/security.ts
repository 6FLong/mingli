export const MAX_ACCOUNT_LENGTH = 320;
export const MAX_DEVICE_LENGTH = 300;

export function normalizeAccount(value: unknown): string {
  return String(value ?? "").trim().toLowerCase().slice(0, MAX_ACCOUNT_LENGTH);
}

export function isPlausibleEmail(value: string): boolean {
  return value.length >= 3 && value.length <= MAX_ACCOUNT_LENGTH && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function sanitizeDevice(value: string | null): string {
  return String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_DEVICE_LENGTH);
}

export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("cf-connecting-ip")?.trim() || headers.get("x-real-ip")?.trim() || "";
}

export function maskIp(ip: string): string {
  if (!ip) return "";
  if (ip.includes(":")) {
    const parts = ip.split(":").filter(Boolean);
    return `${parts.slice(0, 3).join(":")}::`;
  }
  const parts = ip.split(".");
  if (parts.length !== 4) return "";
  return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function isPublicIp(ip: string): boolean {
  if (!ip || ip === "::1" || ip.startsWith("127.") || ip.startsWith("10.") || ip.startsWith("192.168.")) return false;
  if (ip.startsWith("172.")) {
    const second = Number(ip.split(".")[1]);
    if (second >= 16 && second <= 31) return false;
  }
  return true;
}

export type ApproximateLocation = {
  countryCode: string;
  regionName: string;
  cityName: string;
  source: string;
};

export async function resolveApproximateLocation(
  headers: Headers,
  ip: string,
): Promise<ApproximateLocation> {
  const headerCountry = headers.get("cf-ipcountry") || headers.get("x-vercel-ip-country") || "";
  const headerRegion = headers.get("x-vercel-ip-country-region") || "";
  const headerCity = headers.get("x-vercel-ip-city") || "";
  if (headerCountry || headerRegion || headerCity) {
    return {
      countryCode: headerCountry.slice(0, 8),
      regionName: decodeURIComponent(headerRegion).slice(0, 120),
      cityName: decodeURIComponent(headerCity).slice(0, 120),
      source: "edge-header",
    };
  }

  if (!isPublicIp(ip)) {
    return { countryCode: "", regionName: "", cityName: "", source: "unavailable" };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1800);
  try {
    const response = await fetch(
      `https://ipwho.is/${encodeURIComponent(ip)}?fields=success,country_code,region,city`,
      { signal: controller.signal },
    );
    if (!response.ok) throw new Error(`geo ${response.status}`);
    const data = await response.json();
    if (!data?.success) throw new Error("geo unavailable");
    return {
      countryCode: String(data.country_code || "").slice(0, 8),
      regionName: String(data.region || "").slice(0, 120),
      cityName: String(data.city || "").slice(0, 120),
      source: "ipwho.is",
    };
  } catch {
    return { countryCode: "", regionName: "", cityName: "", source: "unavailable" };
  } finally {
    clearTimeout(timeout);
  }
}
