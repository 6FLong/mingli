(function initializeAccountUi(global) {
  "use strict";

  const cloud = global.MingliCloud?.client;
  const logsModal = document.querySelector("#loginLogsModal");
  const logsList = document.querySelector("#loginLogsList");
  const logsStatus = document.querySelector("#loginLogsStatus");
  const passwordModal = document.querySelector("#passwordModal");
  const passwordForm = document.querySelector("#passwordForm");
  const passwordStatus = document.querySelector("#passwordStatus");
  const passwordSubmit = document.querySelector("#passwordSubmit");
  const currentAccountLabel = document.querySelector("#currentAccountLabel");

  const resultLabels = {
    admin_login_success: "登录成功",
    invalid_credentials: "账户或密码错误",
    non_admin_attempt: "非管理员账户尝试",
    non_admin_authenticated_blocked: "认证后被管理员白名单拦截",
    rate_limited: "尝试过多，已限流",
  };

  const beijingFormatter = new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  function openModal(modal) {
    modal.hidden = false;
    document.body.classList.add("modal-open");
  }

  function closeModal(modal) {
    modal.hidden = true;
    if (logsModal.hidden && passwordModal.hidden) document.body.classList.remove("modal-open");
  }

  function locationLabel(event) {
    const parts = [event.country_code, event.region_name, event.city_name].filter(Boolean);
    return parts.length ? `${parts.join(" · ")}（IP 推断）` : "未知地区（IP 推断）";
  }

  function deviceLabel(value) {
    const source = String(value || "");
    if (!source) return "未知设备";
    const platform = /iPhone/i.test(source)
      ? "iPhone"
      : /iPad/i.test(source)
        ? "iPad"
        : /Android/i.test(source)
          ? "Android"
          : /Windows/i.test(source)
            ? "Windows"
            : /Macintosh|Mac OS X/i.test(source)
              ? "Mac"
              : "其他设备";
    const browser = /Edg\//i.test(source)
      ? "Edge"
      : /(?:CriOS|Chrome)\//i.test(source)
        ? "Chrome"
        : /Firefox\//i.test(source)
          ? "Firefox"
          : /Safari\//i.test(source)
            ? "Safari"
            : "浏览器";
    return `${browser} · ${platform}`;
  }

  function createLogRow(event) {
    const article = document.createElement("article");
    article.className = `login-log-item risk-${event.risk_level || "normal"}`;

    const head = document.createElement("div");
    head.className = "login-log-head";
    const result = document.createElement("strong");
    result.textContent = resultLabels[event.event_type] || "登录事件";
    const time = document.createElement("time");
    time.dateTime = event.occurred_at;
    time.textContent = beijingFormatter.format(new Date(event.occurred_at));
    head.append(result, time);

    const account = document.createElement("p");
    account.className = "login-log-account";
    account.textContent = `账户：${event.account_identifier}`;
    const location = document.createElement("p");
    location.textContent = `地区：${locationLabel(event)}`;
    const device = document.createElement("p");
    device.textContent = `设备：${deviceLabel(event.device_summary)}`;
    const network = document.createElement("p");
    network.textContent = `网络：${event.ip_masked || "未知"}`;
    article.append(head, account, location, device, network);
    return article;
  }

  async function loadLoginLogs() {
    logsStatus.textContent = "正在读取登录日志…";
    logsList.replaceChildren();
    try {
      const fields = [
        "id",
        "event_type",
        "account_identifier",
        "occurred_at",
        "device_summary",
        "ip_masked",
        "country_code",
        "region_name",
        "city_name",
        "risk_level",
        "read_at",
      ].join(",");
      const events = await cloud.request(`/rest/v1/login_events?select=${fields}&order=occurred_at.desc&limit=100`);
      if (!Array.isArray(events) || events.length === 0) {
        logsStatus.textContent = "还没有登录日志。";
        return;
      }
      logsStatus.textContent = `共显示最近 ${events.length} 条，时间均为北京时间。`;
      logsList.replaceChildren(...events.map(createLogRow));

      if (events.some((event) => event.risk_level !== "normal" && !event.read_at)) {
        await cloud.request("/rest/v1/login_events?risk_level=neq.normal&read_at=is.null", {
          method: "PATCH",
          headers: { Prefer: "return=minimal" },
          body: JSON.stringify({ read_at: new Date().toISOString() }),
        });
      }
    } catch (error) {
      logsStatus.textContent = error?.message || "登录日志读取失败，请重试。";
    }
  }

  document.querySelector("#openLoginLogs").addEventListener("click", () => {
    openModal(logsModal);
    void loadLoginLogs();
  });
  document.querySelector("#closeLoginLogs").addEventListener("click", () => closeModal(logsModal));

  document.querySelector("#openPasswordModal").addEventListener("click", () => {
    passwordForm.reset();
    passwordStatus.textContent = "";
    openModal(passwordModal);
    document.querySelector("#newPassword").focus({ preventScroll: true });
  });
  document.querySelector("#closePasswordModal").addEventListener("click", () => closeModal(passwordModal));

  passwordForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const password = document.querySelector("#newPassword").value;
    const confirmation = document.querySelector("#confirmPassword").value;
    if (password.length < 10) {
      passwordStatus.textContent = "新密码至少需要 10 个字符。";
      return;
    }
    if (password !== confirmation) {
      passwordStatus.textContent = "两次输入的密码不一致。";
      return;
    }

    passwordSubmit.disabled = true;
    passwordSubmit.textContent = "正在修改…";
    passwordStatus.textContent = "";
    try {
      await cloud.updatePassword(password);
      passwordForm.reset();
      closeModal(passwordModal);
      await global.MingliAuthUi.logout();
    } catch (error) {
      passwordStatus.textContent = error?.message || "密码修改失败，请重试。";
    } finally {
      passwordSubmit.disabled = false;
      passwordSubmit.textContent = "确认修改";
    }
  });

  document.querySelector("#logoutAccount").addEventListener("click", () => {
    void global.MingliAuthUi.logout();
  });

  global.addEventListener("mingli:authenticated", () => {
    currentAccountLabel.textContent = cloud.accountIdentifier || "已登录";
  });

  for (const modal of [logsModal, passwordModal]) {
    modal.addEventListener("click", (event) => {
      if (event.target === modal) closeModal(modal);
    });
  }
})(window);
