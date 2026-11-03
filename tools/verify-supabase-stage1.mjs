import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const configSource = fs.readFileSync(path.join(root, "app-config.js"), "utf8");
const context = { window: {} };
vm.runInNewContext(configSource, context, { filename: "app-config.js" });
const { supabaseUrl, supabasePublishableKey } = context.window.MINGLI_CONFIG;

function parseBody(text) {
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text;
  }
}

function curlGet(url) {
  const output = execFileSync(
    "curl.exe",
    [
      "-sS",
      "-w",
      "\n%{http_code}",
      url,
      "-H",
      `apikey: ${supabasePublishableKey}`,
      "-H",
      "Content-Type: application/json",
    ],
    { encoding: "utf8", timeout: 30_000 },
  );
  const separator = output.lastIndexOf("\n");
  return {
    status: Number(output.slice(separator + 1).trim()),
    body: parseBody(output.slice(0, separator)),
  };
}

async function main() {
  const authSettingsResponse = curlGet(`${supabaseUrl}/auth/v1/settings`);
  assert.equal(authSettingsResponse.status, 200, "Supabase Auth settings endpoint is unavailable");
  const authSettings = authSettingsResponse.body;
  assert.equal(authSettings.disable_signup, true, "Public user signup must remain disabled");
  console.log("OK Supabase Auth is reachable and public signup is disabled");

  const profileResponse = curlGet(`${supabaseUrl}/rest/v1/profiles?select=id&limit=1`);
  const profileBody = profileResponse.body;
  assert.notEqual(
    profileResponse.status,
    404,
    `profiles table is missing or schema cache is stale: ${JSON.stringify(profileBody)}`,
  );
  assert.ok(
    [401, 403].includes(profileResponse.status),
    `Anonymous profiles access should be denied, got ${profileResponse.status}: ${JSON.stringify(profileBody)}`,
  );
  console.log("OK profiles exists and anonymous REST access is denied");

  const loginEventsResponse = curlGet(`${supabaseUrl}/rest/v1/login_events?select=id&limit=1`);
  const loginEventsBody = loginEventsResponse.body;
  assert.notEqual(
    loginEventsResponse.status,
    404,
    `login_events table is missing or schema cache is stale: ${JSON.stringify(loginEventsBody)}`,
  );
  assert.ok(
    [401, 403].includes(loginEventsResponse.status),
    `Anonymous login_events access should be denied, got ${loginEventsResponse.status}: ${JSON.stringify(loginEventsBody)}`,
  );
  console.log("OK login_events exists and anonymous REST access is denied");

  const bucketResponse = curlGet(`${supabaseUrl}/storage/v1/bucket/reports`);
  const bucketBody = bucketResponse.body;
  assert.ok(
    [400, 401, 403, 404].includes(bucketResponse.status),
    `Anonymous report bucket metadata must not be readable, got ${bucketResponse.status}: ${JSON.stringify(bucketBody)}`,
  );
  console.log("OK report storage is not publicly readable");

  console.log("\nSupabase stage-one remote checks passed.");
}

main().catch((error) => {
  console.error(`FAIL ${error.stack || error.message}`);
  if (error.cause) console.error(`CAUSE ${error.cause.stack || error.cause}`);
  process.exitCode = 1;
});
