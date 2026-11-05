(function initializeAuthUi(global) {
  "use strict";

  const cloud = global.MingliCloud?.client;
  const authGate = document.querySelector("#authGate");
  const businessApp = document.querySelector("#businessApp");
  const form = document.querySelector("#loginForm");
  const accountInput = document.querySelector("#loginAccount");
  const passwordInput = document.querySelector("#loginPassword");
  const submitButton = document.querySelector("#loginSubmit");
  const status = document.querySelector("#loginStatus");
  const ACTIVITY_KEY = "mingli.auth.last-activity.v1";
  const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
  const ACTIVITY_WRITE_INTERVAL_MS = 15 * 1000;
  let inactivityTimer = 0;
  let lastActivityWrite = 0;
  let logoutInProgress = false;

  function setStatus(message, tone = "") {
    status.textContent = message;
    status.dataset.tone = tone;
  }

  function showLogin() {
    global.clearTimeout(inactivityTimer);
    inactivityTimer = 0;
    businessApp.hidden = true;
    authGate.hidden = false;
    document.body.classList.remove("is-authenticated");
    document.body.classList.add("is-unauthenticated");
    accountInput.value = "";
    passwordInput.value = "";
    accountInput.focus({ preventScroll: true });
  }

  function showBusiness() {
    authGate.hidden = true;
    businessApp.hidden = false;
    document.body.classList.remove("is-unauthenticated");
    document.body.classList.add("is-authenticated");
    accountInput.value = "";
    passwordInput.value = "";
    recordActivity(true);
    global.dispatchEvent(new CustomEvent("mingli:authenticated"));
  }

  function readLastActivity() {
    const value = Number(localStorage.getItem(ACTIVITY_KEY));
    return Number.isFinite(value) && value > 0 ? value : 0;
  }

  function scheduleInactivityCheck() {
    global.clearTimeout(inactivityTimer);
    if (!cloud?.session) return;
    const lastActivity = readLastActivity() || Date.now();
    const remaining = Math.max(0, IDLE_TIMEOUT_MS - (Date.now() - lastActivity));
    inactivityTimer = global.setTimeout(() => void checkInactivity(), Math.min(remaining + 50, 60 * 1000));
  }

  function recordActivity(force = false) {
    if (!cloud?.session || businessApp.hidden) return;
    const now = Date.now();
    if (!force && now - lastActivityWrite < ACTIVITY_WRITE_INTERVAL_MS) return;
    lastActivityWrite = now;
    localStorage.setItem(ACTIVITY_KEY, String(now));
    scheduleInactivityCheck();
  }

  async function performLogout(message = "已退出登录") {
    if (logoutInProgress) return;
    logoutInProgress = true;
    global.clearTimeout(inactivityTimer);
    localStorage.removeItem(ACTIVITY_KEY);
    try {
      await cloud.logout();
    } finally {
      showLogin();
      setStatus(message);
      logoutInProgress = false;
    }
  }

  async function checkInactivity() {
    if (!cloud?.session) return false;
    const lastActivity = readLastActivity();
    if (!lastActivity) {
      recordActivity(true);
      return false;
    }
    if (Date.now() - lastActivity < IDLE_TIMEOUT_MS) {
      scheduleInactivityCheck();
      return false;
    }
    await performLogout("已因 30 分钟未操作自动退出，请重新登录");
    return true;
  }

  async function boot() {
    if (!cloud) {
      showLogin();
      setStatus("云端配置不可用，请稍后重试", "error");
      submitButton.disabled = true;
      return;
    }
    setStatus("正在确认登录状态…");
    try {
      if (cloud.session && readLastActivity() && Date.now() - readLastActivity() >= IDLE_TIMEOUT_MS) {
        await performLogout("已因 30 分钟未操作自动退出，请重新登录");
        return;
      }
      const valid = await cloud.validateSession();
      if (valid) {
        showBusiness();
        return;
      }
      showLogin();
      setStatus("");
    } catch (error) {
      showLogin();
      setStatus(error?.message || "无法连接云端服务，请稍后重试", "error");
    }
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (submitButton.disabled) return;
    const account = accountInput.value.trim();
    const password = passwordInput.value;
    if (!account || !password) {
      setStatus("请输入登录账户和密码", "error");
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "正在登录…";
    setStatus("");
    try {
      await cloud.login(account, password);
      showBusiness();
    } catch (error) {
      passwordInput.value = "";
      passwordInput.focus({ preventScroll: true });
      setStatus(error?.message || "账户或密码不正确", "error");
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "登录";
    }
  });

  global.MingliAuthUi = Object.freeze({
    logout: () => performLogout(),
    checkInactivity,
    idleTimeoutMs: IDLE_TIMEOUT_MS,
  });

  for (const eventName of ["pointerdown", "touchstart", "keydown"]) {
    global.addEventListener(eventName, () => recordActivity(), { passive: true });
  }
  global.addEventListener("scroll", () => recordActivity(), { passive: true });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void checkInactivity();
  });
  global.addEventListener("storage", (event) => {
    if (event.key === global.MingliCloud?.sessionKey && !event.newValue) {
      showLogin();
      setStatus("已在其他页面退出登录");
      return;
    }
    if (event.key === ACTIVITY_KEY) scheduleInactivityCheck();
  });

  void boot();
})(window);
