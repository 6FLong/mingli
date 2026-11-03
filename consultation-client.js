(function createConsultationClient(global) {
  "use strict";

  const cloud = global.MingliCloud?.client;

  function requireCloud() {
    if (!cloud) throw new Error("云端连接不可用");
    return cloud;
  }

  async function listConversations(profileId) {
    return requireCloud().request(
      `/rest/v1/conversations?profile_id=eq.${encodeURIComponent(profileId)}&select=id,profile_id,chart_id,title,status,last_message_at,created_at,updated_at&order=last_message_at.desc.nullslast,created_at.desc`,
    );
  }

  async function listMessages(conversationId, before = null, limit = 30) {
    const beforeFilter = before ? `&created_at=lt.${encodeURIComponent(before)}` : "";
    const rows = await requireCloud().request(
      `/rest/v1/messages?conversation_id=eq.${encodeURIComponent(conversationId)}${beforeFilter}&select=id,profile_id,conversation_id,chart_id,role,status,content,structured_content,fact_refs,idempotency_key,error_code,created_at,updated_at&order=created_at.desc,id.desc&limit=${Math.min(50, Math.max(1, limit))}`,
    );
    return Array.isArray(rows) ? rows.reverse() : [];
  }

  async function sendQuestion({ profileId, conversationId, question, questionType, idempotencyKey }) {
    return requireCloud().request("/functions/v1/ai-consult", {
      method: "POST",
      body: JSON.stringify({ profileId, conversationId, question, questionType, idempotencyKey }),
    });
  }

  async function deleteMessage(messageId) {
    await requireCloud().request("/rest/v1/rpc/delete_consultation_history", {
      method: "POST",
      body: JSON.stringify({ target_message_id: messageId, target_conversation_id: null }),
    });
  }

  async function deleteConversation(conversationId) {
    await requireCloud().request("/rest/v1/rpc/delete_consultation_history", {
      method: "POST",
      body: JSON.stringify({ target_message_id: null, target_conversation_id: conversationId }),
    });
  }

  global.MingliConsultationClient = Object.freeze({
    listConversations,
    listMessages,
    sendQuestion,
    deleteMessage,
    deleteConversation,
  });
})(window);
