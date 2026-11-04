import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const securityPath = path.join(root, "supabase/functions/_shared/security.ts");
const authLoginPath = path.join(root, "supabase/functions/auth-login/index.ts");
const authLoginSource = fs.readFileSync(authLoginPath, "utf8");
const serviceRoleMigration = fs.readFileSync(
  path.join(root, "supabase/migrations/202611040008_service_role_api_grants.sql"),
  "utf8",
);
const security = await import(pathToFileURL(securityPath));

const checks = [];
function check(name, fn) {
  try {
    const value = fn();
    checks.push({ name, ok: true, value });
  } catch (error) {
    checks.push({ name, ok: false, error });
  }
}

async function checkAsync(name, fn) {
  try {
    await fn();
    checks.push({ name, ok: true });
  } catch (error) {
    checks.push({ name, ok: false, error });
  }
}

check("账户规范化只去空格、转小写和限制长度", () => {
  assert.equal(security.normalizeAccount("  Admin@QQ.COM  "), "admin@qq.com");
  assert.equal(security.normalizeAccount(`A@${"b".repeat(400)}.com`).length, 320);
});

check("服务端验证邮箱身份但前端可继续称为登录账户", () => {
  assert.equal(security.isPlausibleEmail("992889661@qq.com"), true);
  assert.equal(security.isPlausibleEmail("管理员"), false);
  assert.equal(security.isPlausibleEmail("a@b"), false);
});

check("设备字符串去控制字符并限制长度", () => {
  assert.equal(security.sanitizeDevice(" Browser\n  Test "), "Browser Test");
  assert.equal(security.sanitizeDevice("x".repeat(500)).length, 300);
});

check("IPv4 与 IPv6 只保留脱敏网络段", () => {
  assert.equal(security.maskIp("203.0.113.42"), "203.0.113.0");
  assert.equal(security.maskIp("2001:db8:abcd:12::1"), "2001:db8:abcd::");
  assert.equal(security.maskIp(""), "");
});

check("客户端 IP 优先取受控中转值再取代理链首项", () => {
  const headers = new Headers({
    "x-mingli-client-ip": "198.51.100.8",
    "x-forwarded-for": "203.0.113.7, 10.0.0.1",
    "x-real-ip": "198.51.100.1",
  });
  assert.equal(security.getClientIp(headers), "198.51.100.8");
  headers.delete("x-mingli-client-ip");
  assert.equal(security.getClientIp(headers), "203.0.113.7");
});

check("内网地址不发送到外部地区查询", () => {
  assert.equal(security.isPublicIp("127.0.0.1"), false);
  assert.equal(security.isPublicIp("10.1.2.3"), false);
  assert.equal(security.isPublicIp("172.16.1.2"), false);
  assert.equal(security.isPublicIp("192.168.1.2"), false);
  assert.equal(security.isPublicIp("203.0.113.7"), true);
});

await checkAsync("IP 哈希稳定且不包含原始 IP", async () => {
  const first = await security.sha256Hex("salt:203.0.113.7");
  const second = await security.sha256Hex("salt:203.0.113.7");
  assert.equal(first, second);
  assert.equal(first.length, 64);
  assert.doesNotMatch(first, /203\.0\.113\.7/);
});

await checkAsync("优先使用边缘网络提供的近似地区", async () => {
  const result = await security.resolveApproximateLocation(
    new Headers({ "cf-ipcountry": "CN", "x-vercel-ip-country-region": "GD", "x-vercel-ip-city": "Shenzhen" }),
    "203.0.113.7",
  );
  assert.deepEqual(result, {
    countryCode: "CN",
    regionName: "GD",
    cityName: "Shenzhen",
    source: "edge-header",
  });
});

await checkAsync("优先使用 Netlify 中转传入的真实城市级地区", async () => {
  const result = await security.resolveApproximateLocation(
    new Headers({
      "x-mingli-country": "CN",
      "x-mingli-region": "Guangdong",
      "x-mingli-city": "Shenzhen",
      "cf-ipcountry": "SG",
    }),
    "203.0.113.7",
  );
  assert.deepEqual(result, {
    countryCode: "CN",
    regionName: "Guangdong",
    cityName: "Shenzhen",
    source: "netlify-edge",
  });
  assert.equal(security.decodeRelayHeader("Central%20District"), "Central District");
  assert.equal(security.decodeRelayHeader("%E0%A4%A"), "");
});

check("登录函数固定频率限制并覆盖全部日志结果", () => {
  assert.match(authLoginSource, /RATE_LIMIT_ATTEMPTS = 10/);
  for (const eventType of [
    "admin_login_success",
    "invalid_credentials",
    "non_admin_authenticated_blocked",
    "rate_limited",
  ]) {
    assert.match(authLoginSource, new RegExp(`event_type: \\\"${eventType}\\\"`), eventType);
  }
});

check("登录日志优先记录中转传递的真实浏览器设备", () => {
  assert.match(authLoginSource, /x-mingli-user-agent/);
  assert.match(authLoginSource, /decodeRelayHeader/);
});

check("登录函数通过服务端白名单校验且不返回邮箱", () => {
  assert.match(authLoginSource, /admin_users/);
  assert.match(authLoginSource, /serviceRoleKey|serviceRequest/);
  assert.doesNotMatch(authLoginSource, /user:\s*\{[^}]*email/s);
});

check("统一错误提示不暴露账户是否存在", () => {
  const occurrences = authLoginSource.match(/账户或密码不正确/g) || [];
  assert.ok(occurrences.length >= 3);
  assert.doesNotMatch(authLoginSource, /邮箱不存在|账户不存在|用户不存在/);
});

check("登录服务异常返回可重试中文提示且不泄露内部错误", () => {
  assert.match(authLoginSource, /error:\s*"service_unavailable"/);
  assert.match(authLoginSource, /message:\s*"云端服务暂时不可用，请稍后重试"/);
  assert.match(authLoginSource, /console\.error\("auth-login failed"/);
  assert.doesNotMatch(authLoginSource, /message:\s*error\.(?:message|stack)/);
  assert.match(serviceRoleMigration, /grant select, insert on public\.login_events to service_role/i);
});

check("密码只用于 Auth 请求且不会写入登录日志", () => {
  assert.match(authLoginSource, /JSON\.stringify\(\{ email: account, password \}\)/);
  const eventBlock = authLoginSource.slice(authLoginSource.indexOf("const eventBase"), authLoginSource.indexOf("if ((await recentAttemptCount"));
  assert.doesNotMatch(eventBlock, /password/);
});

for (const result of checks) {
  if (result.ok) {
    console.log(`OK ${result.name}`);
  } else {
    console.error(`FAIL ${result.name}`);
    console.error(result.error?.stack || result.error);
  }
}

const failed = checks.filter((item) => !item.ok);
if (failed.length > 0) process.exitCode = 1;
else console.log(`\n${checks.length} stage-two auth checks passed.`);
