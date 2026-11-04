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

  function setStatus(message, tone = "") {
    status.textContent = message;
    status.dataset.tone = tone;
  }

  function showLogin() {
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
    global.dispatchEvent(new CustomEvent("mingli:authenticated"));
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
    logout: async () => {
      await cloud.logout();
      showLogin();
      setStatus("已退出登录");
    },
  });

  void boot();
})(window);
