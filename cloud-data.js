(function createCloudData(global) {
  "use strict";

  const cloud = global.MingliCloud?.client;
  const ALLOWED_RELATIONS = new Set(["本人", "家人", "客户"]);

  function ownerId() {
    const value = cloud?.session?.user?.id;
    if (!value) throw new Error("登录状态已失效");
    return value;
  }

  function normalizedRelation(profile) {
    if (profile.isSelf || profile.relation === "本人") return "本人";
    if (profile.relation === "家人") return "家人";
    return "客户";
  }

  function toProfileRecord(profile) {
    const relation = normalizedRelation(profile);
    return {
      id: profile.id,
      owner_id: ownerId(),
      name: String(profile.name || "").trim(),
      gender: profile.gender === "female" ? "female" : "male",
      calendar_type: profile.calendarType === "lunar" ? "lunar" : "solar",
      birth_date: profile.birthDate,
      birth_time: profile.birthTime ? `${profile.birthTime}:00`.replace(/:00:00$/, ":00") : null,
      birth_time_known: Boolean(profile.birthTime),
      lunar_leap_month: Boolean(profile.lunarLeapMonth),
      birth_place: String(profile.birthPlace || ""),
      birth_longitude: Number.isFinite(profile.birthLongitude) ? profile.birthLongitude : null,
      relation,
      is_self: Boolean(profile.isSelf || relation === "本人"),
      note: String(profile.note || ""),
      last_consulted_at: profile.lastConsultedAt ? new Date(profile.lastConsultedAt).toISOString() : null,
      created_at: profile.createdAt ? new Date(profile.createdAt).toISOString() : undefined,
      updated_at: profile.updatedAt ? new Date(profile.updatedAt).toISOString() : new Date().toISOString(),
    };
  }

  function fromProfileRecord(record) {
    return {
      id: record.id,
      name: record.name,
      gender: record.gender,
      calendarType: record.calendar_type,
      lunarLeapMonth: Boolean(record.lunar_leap_month),
      birthDate: record.birth_date,
      birthTime: record.birth_time_known && record.birth_time ? String(record.birth_time).slice(0, 5) : "",
      birthPlace: record.birth_place || "",
      birthLongitude: record.birth_longitude == null ? null : Number(record.birth_longitude),
      relation: ALLOWED_RELATIONS.has(record.relation) ? record.relation : "客户",
      isSelf: Boolean(record.is_self),
      note: record.note || "",
      lastConsultedAt: record.last_consulted_at ? Date.parse(record.last_consulted_at) : null,
      retentionDueAt: record.retention_due_at ? Date.parse(record.retention_due_at) : null,
      retentionExpiredAt: record.retention_expired_at ? Date.parse(record.retention_expired_at) : null,
      createdAt: Date.parse(record.created_at),
      updatedAt: Date.parse(record.updated_at),
    };
  }

  async function listProfiles() {
    const rows = await cloud.request(
      "/rest/v1/profiles?select=*&order=is_self.desc,last_consulted_at.desc.nullslast,updated_at.desc",
    );
    return Array.isArray(rows) ? rows.map(fromProfileRecord) : [];
  }

  async function upsertProfiles(profileList) {
    const selfProfile = profileList.find((profile) => profile.isSelf || profile.relation === "本人");
    if (selfProfile) {
      await cloud.request(`/rest/v1/profiles?is_self=eq.true&id=neq.${encodeURIComponent(selfProfile.id)}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ is_self: false, relation: "家人" }),
      });
    }
    const records = profileList.map(toProfileRecord);
    if (!records.length) return [];
    return cloud.request("/rest/v1/profiles?on_conflict=id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify(records),
    });
  }

  async function deleteProfile(profileId, confirmName) {
    return cloud.request("/functions/v1/profile-delete", {
      method: "POST",
      body: JSON.stringify({ profileId, confirmName, confirmPermanent: true }),
    });
  }

  async function getSettings() {
    const rows = await cloud.request(
      `/rest/v1/user_settings?owner_id=eq.${encodeURIComponent(ownerId())}&select=*&limit=1`,
    );
    return Array.isArray(rows) ? rows[0] || null : null;
  }

  async function saveSettings(values) {
    const record = {
      owner_id: ownerId(),
      current_profile_id: values.currentProfileId || null,
      last_consulted_profile_id: values.lastConsultedProfileId || null,
      preferences: values.preferences || {},
    };
    const rows = await cloud.request("/rest/v1/user_settings?on_conflict=owner_id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify(record),
    });
    return Array.isArray(rows) ? rows[0] : rows;
  }

  function chartFingerprint(profile) {
    return [
      profile.gender,
      profile.calendarType,
      profile.lunarLeapMonth ? "leap" : "normal",
      profile.birthDate,
      profile.birthTime || "unknown",
      profile.birthPlace || "",
    ].join("|");
  }

  async function saveCurrentChart(profile, chart) {
    if (!chart?.facts || chart.error) return null;
    return cloud.request("/rest/v1/rpc/save_current_chart", {
      method: "POST",
      body: JSON.stringify({
        target_profile_id: profile.id,
        target_schema_version: chart.facts.schemaVersion || "bazi-facts-v1",
        target_engine_version: chart.facts.engineVersion,
        target_ruleset: chart.facts.ruleset,
        target_birth_fingerprint: chartFingerprint(profile),
        target_facts: chart.facts,
      }),
    });
  }

  global.MingliCloudData = Object.freeze({
    listProfiles,
    upsertProfiles,
    deleteProfile,
    getSettings,
    saveSettings,
    saveCurrentChart,
    fromProfileRecord,
    toProfileRecord,
    normalizedRelation,
    chartFingerprint,
  });
})(window);
