import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = fs.readFileSync(path.join(root, "cloud-client.js"), "utf8");

function createClient(fetchImpl, storedSession = null, supabaseUrl = "https://project.example.com") {
  const values = new Map();
  if (storedSession) values.set("mingli.auth.session.v1", JSON.stringify(storedSession));
  const localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
  const window = {
    MINGLI_CONFIG: {
      supabaseUrl,
      supabasePublishableKey: "sb_publishable_test",
    },
  };
  vm.runInNewContext(source, { window, localStorage, fetch: fetchImpl, Date, JSON, Object, Error, String, Number, URL });
  return { client: window.MingliCloud.client, localStorage };
}

const checks = [];
async function check(name, fn) {
  try {
    await fn();
    checks.push({ name, ok: true });
  } catch (error) {
    checks.push({ name, ok: false, error });
  }
}

await check("登录网络失败返回中文可重试提示", async () => {
  const { client } = createClient(async () => {
    throw new TypeError("Failed to fetch");
  });
  await assert.rejects(
    () => client.login("account", "password"),
    (error) =>
      error.code === "network_unreachable" &&
      error.message === "无法连接云端服务，请检查网络或切换网络后重试",
  );
});

await check("恢复会话遇到网络失败不会清除本地令牌", async () => {
  const stored = {
    access_token: "access",
    refresh_token: "refresh",
    expires_at: Date.now() + 3600_000,
    user: { id: "11111111-1111-4111-8111-111111111111" },
  };
  const { client, localStorage } = createClient(async () => {
    throw new TypeError("Failed to fetch");
  }, stored);
  await assert.rejects(() => client.validateSession(), (error) => error.code === "network_unreachable");
  assert.equal(client.session.access_token, "access");
  assert.ok(localStorage.getItem("mingli.auth.session.v1"));
});

await check("服务端明确未授权才清除失效会话", async () => {
  const stored = {
    access_token: "expired",
    refresh_token: "refresh",
    expires_at: Date.now() + 3600_000,
    user: { id: "11111111-1111-4111-8111-111111111111" },
  };
  const { client, localStorage } = createClient(async () => ({ status: 401, ok: false }), stored);
  assert.equal(await client.validateSession(), false);
  assert.equal(client.session, null);
  assert.equal(localStorage.getItem("mingli.auth.session.v1"), null);
});

await check("令牌刷新网络失败同样保留可重试会话", async () => {
  const stored = {
    access_token: "access",
    refresh_token: "refresh",
    expires_at: Date.now(),
    user: { id: "11111111-1111-4111-8111-111111111111" },
  };
  const { client } = createClient(async () => {
    throw new TypeError("Failed to fetch");
  }, stored);
  await assert.rejects(() => client.accessToken(), (error) => error.code === "network_unreachable");
  assert.equal(client.session.refresh_token, "refresh");
});

await check("固定中转路径会完整拼接云端接口地址", async () => {
  const requests = [];
  const { client } = createClient(async (url) => {
    requests.push(url);
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify({
        access_token: "access",
        refresh_token: "refresh",
        expires_in: 3600,
        user: { id: "11111111-1111-4111-8111-111111111111" },
      }),
    };
  }, null, "https://relay.netlify.app/api/supabase");
  await client.login("account", "password");
  assert.equal(requests[0], "https://relay.netlify.app/api/supabase/functions/v1/auth-login");
});

await check("云端地址拒绝非 HTTPS、任意路径及凭据参数", async () => {
  for (const value of [
    "http://relay.netlify.app/api/supabase",
    "https://relay.netlify.app/other",
    "https://user:password@relay.netlify.app/api/supabase",
    "https://relay.netlify.app/api/supabase?target=other",
    "https://relay.netlify.app/api/supabase#other",
  ]) {
    assert.throws(
      () => createClient(async () => undefined, null, value),
      (error) => error.code === "config_missing",
      value,
    );
  }
});

for (const result of checks) {
  if (result.ok) console.log(`OK ${result.name}`);
  else {
    console.error(`FAIL ${result.name}`);
    console.error(result.error?.stack || result.error);
  }
}
const failed = checks.filter((item) => !item.ok);
if (failed.length) process.exitCode = 1;
else console.log(`\n${checks.length} stage-two network checks passed.`);
