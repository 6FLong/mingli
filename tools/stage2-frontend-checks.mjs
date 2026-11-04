import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const html = read("index.html");
const cloudSource = read("cloud-client.js");
const authUiSource = read("auth-ui.js");
const accountUiSource = read("account-ui.js");
const appSource = read("app.js");

const checks = [];
function check(name, fn) {
  try {
    fn();
    checks.push({ name, ok: true });
  } catch (error) {
    checks.push({ name, ok: false, error });
  }
}

check("登录页只显示空的登录账户和密码", () => {
  assert.match(html, /<span>登录账户<\/span>/);
  assert.match(html, /id="loginAccount"[^>]*type="text"[^>]*autocomplete="off"/);
  assert.match(html, /id="loginPassword"[^>]*type="password"[^>]*autocomplete="off"/);
  assert.doesNotMatch(html, /登录邮箱|@qq\.com|请输入邮箱|type="email"/i);
  assert.doesNotMatch(html, /id="loginAccount"[^>]*value=/i);
});

check("业务界面默认隐藏且认证脚本最后启动", () => {
  assert.match(html, /id="businessApp" hidden/);
  const configIndex = html.indexOf("app-config.js");
  const cloudIndex = html.indexOf("cloud-client.js");
  const appIndex = html.indexOf("app.js");
  const authIndex = html.indexOf("auth-ui.js");
  assert.ok(configIndex < cloudIndex && cloudIndex < appIndex && appIndex < authIndex);
});

check("业务数据只在认证事件后初始化", () => {
  assert.match(appSource, /addEventListener\("mingli:authenticated"/);
  assert.match(appSource, /businessAppStarted/);
  assert.doesNotMatch(appSource, /void initializeApp\(\);\s*$/m);
});

check("认证界面每次显示都会清空账户和密码", () => {
  const showLogin = authUiSource.slice(authUiSource.indexOf("function showLogin"), authUiSource.indexOf("function showBusiness"));
  assert.match(showLogin, /accountInput\.value = ""/);
  assert.match(showLogin, /passwordInput\.value = ""/);
});

check("会话只保存令牌、到期时间和用户 UUID", () => {
  const saveBlock = cloudSource.slice(cloudSource.indexOf("saveSession(payload)"), cloudSource.indexOf("clearSession()"));
  assert.match(saveBlock, /access_token/);
  assert.match(saveBlock, /refresh_token/);
  assert.match(saveBlock, /expires_at/);
  assert.doesNotMatch(saveBlock, /email|account|password/);
});

check("登录只通过受控 Edge Function 而非前端直接密码认证", () => {
  const loginBlock = cloudSource.slice(cloudSource.indexOf("async login("), cloudSource.indexOf("async refreshSession"));
  assert.match(loginBlock, /\/functions\/v1\/auth-login/);
  assert.doesNotMatch(loginBlock, /grant_type=password/);
});

check("退出先清理本机会话且不因网络失败残留", () => {
  const logoutBlock = cloudSource.slice(cloudSource.indexOf("async logout()"), cloudSource.indexOf("async request("));
  assert.ok(logoutBlock.indexOf("this.clearSession()") < logoutBlock.indexOf("fetchCloud("));
  assert.match(logoutBlock, /catch\(\(\) => undefined\)/);
});

check("网络失败统一为中文提示且不会误清除可重试会话", () => {
  assert.match(cloudSource, /code: "network_unreachable"/);
  assert.match(cloudSource, /无法连接云端服务，请检查网络或切换网络后重试/);
  const validationBlock = cloudSource.slice(
    cloudSource.indexOf("async validateSession()"),
    cloudSource.indexOf("async logout()"),
  );
  assert.match(validationBlock, /response\.status === 401 \|\| response\.status === 403/);
  assert.doesNotMatch(validationBlock, /catch[\s\S]*this\.clearSession\(\)/);
});

check("公开前端脚本不包含管理员邮箱、UUID或服务端密钥", () => {
  const combined = `${html}\n${cloudSource}\n${authUiSource}\n${accountUiSource}`;
  assert.doesNotMatch(combined, /@qq\.com|3ee8e734-ffad-4a5e-b1b9-4582b751a73f|service_role|DEEPSEEK_API_KEY/i);
});

check("我的页面提供登录日志、修改密码和退出登录", () => {
  for (const id of ["openLoginLogs", "openPasswordModal", "logoutAccount", "loginLogsModal", "passwordModal"]) {
    assert.match(html, new RegExp(`id="${id}"`), id);
  }
  assert.match(accountUiSource, /login_events\?select=/);
  assert.match(accountUiSource, /account_identifier/);
  assert.match(accountUiSource, /Asia\/Shanghai/);
  assert.match(accountUiSource, /IP 推断/);
});

check("登录日志只能标记风险已读，界面没有删除操作", () => {
  assert.match(accountUiSource, /method: "PATCH"/);
  assert.match(accountUiSource, /JSON\.stringify\(\{ read_at:/);
  assert.doesNotMatch(accountUiSource, /method: "DELETE"/);
  assert.doesNotMatch(html, /删除登录日志/);
});

check("修改密码要求二次输入且成功后退出", () => {
  assert.match(html, /id="newPassword"/);
  assert.match(html, /id="confirmPassword"/);
  assert.match(accountUiSource, /password !== confirmation/);
  assert.match(accountUiSource, /updatePassword\(password\)/);
  assert.match(accountUiSource, /MingliAuthUi\.logout/);
});

check("401 刷新最多重试一次", () => {
  assert.match(cloudSource, /response\.status === 401 && !retried/);
  assert.match(cloudSource, /this\.request\(path, options, true\)/);
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
else console.log(`\n${checks.length} stage-two frontend checks passed.`);
