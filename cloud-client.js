(function createMingliCloud(global) {
  "use strict";

  const config = global.MINGLI_CONFIG || {};
  const SESSION_KEY = "mingli.auth.session.v1";
  const REFRESH_MARGIN_MS = 60 * 1000;

  class CloudError extends Error {
    constructor(message, options = {}) {
      super(message);
      this.name = "CloudError";
      this.status = options.status || 0;
      this.code = options.code || "cloud_error";
      this.details = options.details;
    }
  }

  function assertConfig() {
    if (!/^https:\/\/[a-z0-9.-]+(?::\d+)?$/i.test(config.supabaseUrl || "")) {
      throw new CloudError("云端地址未配置", { code: "config_missing" });
    }
    if (!String(config.supabasePublishableKey || "").startsWith("sb_publishable_")) {
      throw new CloudError("云端公开密钥未配置", { code: "config_missing" });
    }
  }

  async function fetchCloud(path, options = {}) {
    try {
      return await fetch(`${config.supabaseUrl}${path}`, options);
    } catch (error) {
      throw new CloudError("无法连接云端服务，请检查网络或切换网络后重试", {
        code: "network_unreachable",
        details: { cause: error?.name || "network_error" },
      });
    }
  }

  async function parseResponse(response) {
    const text = await response.text();
    let body = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = text;
    }
    if (!response.ok) {
      throw new CloudError(body?.message || "云端请求失败", {
        status: response.status,
        code: body?.error || body?.code || "request_failed",
        details: body,
      });
    }
    return body;
  }

  class MingliCloudClient {
    constructor() {
      assertConfig();
      this.session = null;
      this.accountIdentifier = "";
      this.refreshPromise = null;
      this.loadStoredSession();
    }

    loadStoredSession() {
      try {
        const value = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
        if (value?.access_token && value?.refresh_token && value?.expires_at) this.session = value;
      } catch {
        localStorage.removeItem(SESSION_KEY);
      }
    }

    saveSession(payload) {
      const expiresIn = Number(payload.expires_in || 3600);
      this.session = {
        access_token: payload.access_token,
        refresh_token: payload.refresh_token,
        expires_at: Date.now() + expiresIn * 1000,
        user: payload.user ? { id: payload.user.id } : null,
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(this.session));
      return this.session;
    }

    clearSession() {
      this.session = null;
      this.accountIdentifier = "";
      localStorage.removeItem(SESSION_KEY);
    }

    async login(account, password) {
      const response = await fetchCloud("/functions/v1/auth-login", {
        method: "POST",
        headers: {
          apikey: config.supabasePublishableKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ account: String(account || "").trim(), password: String(password || "") }),
      });
      const session = this.saveSession(await parseResponse(response));
      this.accountIdentifier = String(account || "").trim();
      return session;
    }

    async refreshSession() {
      if (this.refreshPromise) return this.refreshPromise;
      if (!this.session?.refresh_token) throw new CloudError("登录状态已失效", { code: "session_missing" });

      this.refreshPromise = (async () => {
        try {
          const response = await fetchCloud("/auth/v1/token?grant_type=refresh_token", {
            method: "POST",
            headers: {
              apikey: config.supabasePublishableKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ refresh_token: this.session.refresh_token }),
          });
          const payload = await parseResponse(response);
          return this.saveSession(payload);
        } catch (error) {
          if (error?.status === 400 || error?.status === 401) this.clearSession();
          throw error;
        } finally {
          this.refreshPromise = null;
        }
      })();
      return this.refreshPromise;
    }

    async accessToken() {
      if (!this.session) throw new CloudError("请先登录", { code: "session_missing" });
      if (this.session.expires_at - Date.now() <= REFRESH_MARGIN_MS) await this.refreshSession();
      return this.session.access_token;
    }

    async validateSession() {
      if (!this.session) return false;
      try {
        const token = await this.accessToken();
        const response = await fetchCloud("/auth/v1/user", {
          headers: { apikey: config.supabasePublishableKey, Authorization: `Bearer ${token}` },
        });
        if (response.status === 401 || response.status === 403) {
          this.clearSession();
          return false;
        }
        const user = await parseResponse(response);
        this.accountIdentifier = String(user.email || "");
        this.session.user = { id: user.id };
        localStorage.setItem(SESSION_KEY, JSON.stringify(this.session));
        return true;
      } catch (error) {
        if (error?.code === "session_missing") return false;
        throw error;
      }
    }

    async logout() {
      const token = this.session?.access_token;
      this.clearSession();
      if (!token) return;
      await fetchCloud("/auth/v1/logout", {
        method: "POST",
        headers: { apikey: config.supabasePublishableKey, Authorization: `Bearer ${token}` },
      }).catch(() => undefined);
    }

    async request(path, options = {}, retried = false) {
      const token = await this.accessToken();
      const response = await fetchCloud(path, {
        ...options,
        headers: {
          apikey: config.supabasePublishableKey,
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          ...(options.headers || {}),
        },
      });
      if (response.status === 401 && !retried) {
        await this.refreshSession();
        return this.request(path, options, true);
      }
      return parseResponse(response);
    }

    async updatePassword(password) {
      return this.request("/auth/v1/user", {
        method: "PUT",
        body: JSON.stringify({ password }),
      });
    }
  }

  global.MingliCloud = Object.freeze({
    client: new MingliCloudClient(),
    CloudError,
    sessionKey: SESSION_KEY,
  });
})(window);
