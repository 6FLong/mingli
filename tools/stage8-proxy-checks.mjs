import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const proxyPath = path.join(root, "netlify/edge-functions/supabase-proxy.ts");
const source = fs.readFileSync(proxyPath, "utf8");

assert.match(source, /https:\/\/tcqyntzbeinlygvwahav\.supabase\.co/);
assert.match(source, /https:\/\/6flong\.github\.io/);
assert.doesNotMatch(source, /service_role|DEEPSEEK_API_KEY|sb_secret_/i);
assert.match(source, /auth\|rest\|storage\|functions/);
assert.match(source, /origin_not_allowed/);
assert.match(source, /Cache-Control", "no-store/);

const originalFetch = globalThis.fetch;
const upstreamRequests = [];
globalThis.fetch = async (url, options) => {
  upstreamRequests.push({ url: String(url), options });
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json", "Set-Cookie": "must-not-pass=1" },
  });
};

try {
  const module = await import(`${pathToFileURL(proxyPath).href}?test=${Date.now()}`);
  const proxy = module.default;

  const forbidden = await proxy(new Request("https://relay.netlify.app/api/supabase/rest/v1/profiles", {
    headers: { Origin: "https://attacker.example" },
  }));
  assert.equal(forbidden.status, 403);
  assert.equal(upstreamRequests.length, 0);

  const preflight = await proxy(new Request("https://relay.netlify.app/api/supabase/rest/v1/profiles", {
    method: "OPTIONS",
    headers: { Origin: "https://6flong.github.io" },
  }));
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get("access-control-allow-origin"), "https://6flong.github.io");

  const response = await proxy(new Request(
    "https://relay.netlify.app/api/supabase/rest/v1/profiles?select=id%2Cname",
    {
      method: "GET",
      headers: {
        Origin: "https://6flong.github.io",
        apikey: "public-key",
        Authorization: "Bearer user-token",
        Cookie: "must-not-pass=1",
      },
    },
  ));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("access-control-allow-origin"), "https://6flong.github.io");
  assert.equal(response.headers.get("set-cookie"), null);
  assert.equal(upstreamRequests.length, 1);
  assert.equal(upstreamRequests[0].url, "https://tcqyntzbeinlygvwahav.supabase.co/rest/v1/profiles?select=id%2Cname");
  assert.equal(upstreamRequests[0].options.headers.get("authorization"), "Bearer user-token");
  assert.equal(upstreamRequests[0].options.headers.get("origin"), "https://6flong.github.io");
  assert.equal(upstreamRequests[0].options.headers.get("cookie"), null);

  const invalid = await proxy(new Request("https://relay.netlify.app/api/supabase/unknown/path", {
    headers: { Origin: "https://6flong.github.io" },
  }));
  assert.equal(invalid.status, 404);
  assert.equal(upstreamRequests.length, 1);
} finally {
  globalThis.fetch = originalFetch;
}

console.log("OK 中转只允许正式 GitHub Pages 与本地开发来源");
console.log("OK 中转只访问固定 Supabase 项目及允许的 API 命名空间");
console.log("OK 身份头与浏览器来源按需转发，Cookie 与上游 Set-Cookie 不透传");
console.log("\n3 stage-eight proxy checks passed.");
