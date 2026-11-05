(function initializeConsultationUi(global) {
  "use strict";

  const client = global.MingliConsultationClient;
  const bridge = global.MingliAppBridge;
  const thread = document.querySelector("#recentQuestionList");
  const pickerModal = document.querySelector("#conversationPickerModal");
  const pickerList = document.querySelector("#conversationPickerList");
  const currentTitle = document.querySelector("#currentConversationTitle");
  const loadEarlierButton = document.querySelector("#loadEarlierMessages");
  const sendButton = document.querySelector("#generateResult");

  const state = {
    profileId: null,
    conversations: [],
    conversationId: null,
    messages: [],
    oldestMessageAt: null,
    hasEarlier: false,
    sending: false,
    generation: 0,
  };

  function element(tag, className = "", text = "") {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function formatTime(value) {
    if (!value) return "";
    return new Intl.DateTimeFormat("zh-CN", {
      timeZone: "Asia/Shanghai",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(value));
  }

  function setSending(value) {
    state.sending = value;
    sendButton.disabled = value;
    sendButton.textContent = value ? "正在分析…" : "发送问题";
  }

  function emptyState(title, detail) {
    const empty = element("div", "chat-empty");
    empty.append(element("strong", "", title), element("p", "", detail));
    return empty;
  }

  function appendTextSection(container, title, value) {
    if (!value) return;
    const section = element("section", "chat-answer-section");
    section.append(element("h4", "", title), element("p", "", String(value)));
    container.append(section);
  }

  function renderReasoning(container, reasoning) {
    if (!Array.isArray(reasoning) || !reasoning.length) return;
    const section = element("section", "chat-answer-section");
    section.append(element("h4", "", "命理依据"));
    reasoning.forEach((item) => {
      const details = element("details", "reasoning-item");
      const summary = element("summary", "", item.claim || "判断依据");
      const explanation = element("p", "", item.explanation || "");
      const refs = element("p", "fact-reference", `依据：${(item.factRefs || []).join("、")}`);
      details.append(summary, explanation, refs);
      section.append(details);
    });
    container.append(section);
  }

  function renderListSection(container, title, values) {
    if (!Array.isArray(values) || !values.length) return;
    const section = element("section", "chat-answer-section");
    section.append(element("h4", "", title));
    const list = element("ul");
    values.forEach((value) => list.append(element("li", "", String(value))));
    section.append(list);
    container.append(section);
  }

  function messageActions(message) {
    const actions = element("div", "message-actions");
    const remove = element("button", "message-delete", "删除");
    remove.type = "button";
    remove.dataset.deleteCloudMessage = message.id;
    remove.title = "删除消息";
    actions.append(element("time", "", formatTime(message.created_at)), remove);
    return actions;
  }

  function renderMessage(message, index) {
    const article = element("article", `chat-message is-${message.role} status-${message.status}`);
    article.dataset.messageId = message.id || "";
    const bubble = element("div", "chat-bubble");

    if (message.role === "user") {
      bubble.append(element("p", "", message.content || ""));
    } else if (message.status === "processing") {
      bubble.append(element("div", "analysis-progress", "正在根据当前命盘事实分析…"));
    } else if (message.status === "failed") {
      bubble.append(element("p", "chat-error", "这次分析没有完成，原问题已经保留。"));
      const retry = element("button", "retry-answer", "重新分析");
      retry.type = "button";
      retry.dataset.retryMessage = message.id || "";
      retry.dataset.requestKey = String(message.idempotency_key || "").replace(/^a:/, "");
      retry.dataset.userMessageIndex = String(Math.max(0, index - 1));
      bubble.append(retry);
    } else {
      const answer = message.structured_content?.answer;
      if (answer) {
        appendTextSection(bubble, "直接回答", answer.conclusion);
        appendTextSection(bubble, "现代解释", answer.modernExplanation);
        renderReasoning(bubble, answer.zipingReasoning);
        renderListSection(bubble, "现实建议", answer.suggestions);
        renderListSection(bubble, "不确定性与边界", answer.uncertainties);
        renderListSection(bubble, "可以继续追问", answer.followUpQuestions);
      } else {
        bubble.append(element("p", "", message.content || "回答内容暂不可用"));
      }
    }
    article.append(bubble, messageActions(message));
    return article;
  }

  function renderMessages() {
    if (!state.profileId) {
      thread.replaceChildren(emptyState("请先选择档案", "创建或选择档案后才能开始咨询。"));
      return;
    }
    if (!state.conversationId || !state.messages.length) {
      thread.replaceChildren(emptyState("还没有咨询记录", "可以输入任意具体问题开始第一次咨询。"));
      return;
    }
    thread.replaceChildren(...state.messages.map(renderMessage));
    loadEarlierButton.hidden = !state.hasEarlier;
  }

  function revealLatestMessage() {
    global.requestAnimationFrame(() => {
      thread.lastElementChild?.scrollIntoView({ block: "end", behavior: "auto" });
    });
  }

  function renderConversationPicker() {
    if (!state.conversations.length) {
      pickerList.replaceChildren(emptyState("还没有历史会话", "发送第一个问题后会自动建立会话。"));
      return;
    }
    pickerList.replaceChildren(
      ...state.conversations.map((conversation) => {
        const row = element("article", `conversation-picker-row${conversation.id === state.conversationId ? " is-current" : ""}`);
        const open = element("button", "conversation-open");
        open.type = "button";
        open.dataset.conversationId = conversation.id;
        open.append(
          element("strong", "", conversation.title || "咨询记录"),
          element("span", "", formatTime(conversation.last_message_at || conversation.created_at)),
        );
        const remove = element("button", "conversation-delete", "删除");
        remove.type = "button";
        remove.dataset.deleteConversation = conversation.id;
        remove.setAttribute("aria-label", `删除会话：${conversation.title || "咨询记录"}`);
        row.append(open, remove);
        return row;
      }),
    );
  }

  function setCurrentConversation(conversationId) {
    state.conversationId = conversationId || null;
    const conversation = state.conversations.find((item) => item.id === state.conversationId);
    currentTitle.textContent = conversation?.title || "新咨询";
  }

  async function loadMessages(conversationId, options = {}) {
    const generation = state.generation;
    const previousFirstMessageId = options.prepend ? thread.firstElementChild?.dataset.messageId : null;
    const rows = await client.listMessages(conversationId, options.before || null, 30);
    if (generation !== state.generation || conversationId !== state.conversationId) return;
    if (options.prepend) state.messages = [...rows, ...state.messages];
    else state.messages = rows;
    state.oldestMessageAt = state.messages[0]?.created_at || null;
    state.hasEarlier = rows.length === 30;
    renderMessages();
    if (options.prepend && previousFirstMessageId) {
      global.requestAnimationFrame(() => {
        thread.querySelector(`[data-message-id="${CSS.escape(previousFirstMessageId)}"]`)?.scrollIntoView({ block: "start" });
      });
    } else if (!options.prepend) {
      revealLatestMessage();
    }
  }

  async function loadProfile(profileId) {
    state.generation += 1;
    const generation = state.generation;
    state.profileId = profileId || null;
    state.conversations = [];
    state.messages = [];
    state.hasEarlier = false;
    setCurrentConversation(null);
    bridge.clearQuestion();
    renderMessages();
    if (!profileId) return;
    try {
      const conversations = await client.listConversations(profileId);
      if (generation !== state.generation) return;
      state.conversations = Array.isArray(conversations) ? conversations : [];
      setCurrentConversation(state.conversations[0]?.id || null);
      renderConversationPicker();
      if (state.conversationId) await loadMessages(state.conversationId);
      else renderMessages();
    } catch (error) {
      if (generation !== state.generation) return;
      thread.replaceChildren(emptyState("咨询记录读取失败", error?.message || "请检查网络后重试。"));
    }
  }

  async function refreshAfterAnswer(conversationId) {
    const conversations = await client.listConversations(state.profileId);
    state.conversations = Array.isArray(conversations) ? conversations : [];
    setCurrentConversation(conversationId);
    renderConversationPicker();
    await loadMessages(conversationId);
  }

  async function submitQuestion(question, questionType, idempotencyKey) {
    const profileId = state.profileId;
    const generation = state.generation;
    setSending(true);
    const optimisticUser = {
      id: `local-user-${idempotencyKey}`,
      role: "user",
      status: "complete",
      content: question,
      created_at: new Date().toISOString(),
    };
    const optimisticAnswer = {
      id: `local-answer-${idempotencyKey}`,
      role: "assistant",
      status: "processing",
      content: "",
      created_at: new Date(Date.now() + 1).toISOString(),
    };
    state.messages = [...state.messages, optimisticUser, optimisticAnswer];
    state.conversationId ||= "pending";
    renderMessages();
    optimisticAnswer.scrollIntoView?.({ block: "nearest" });

    try {
      const response = await client.sendQuestion({
        profileId,
        conversationId: state.conversationId === "pending" ? null : state.conversationId,
        question,
        questionType,
        idempotencyKey,
      });
      if (generation !== state.generation || profileId !== state.profileId) return;
      if (response.status === "processing") {
        setCurrentConversation(response.conversationId);
        await loadMessages(response.conversationId);
        bridge.showToast("问题正在分析，稍后会显示结果");
        return;
      }
      bridge.clearQuestion();
      bridge.markCurrentProfileConsulted(response.consultedAt, question);
      await refreshAfterAnswer(response.conversationId);
      bridge.showToast("分析已保存到云端");
      global.dispatchEvent(new CustomEvent("mingli:consultation-complete", {
        detail: { profileId, conversationId: response.conversationId },
      }));
    } catch (error) {
      if (generation !== state.generation || profileId !== state.profileId) return;
      optimisticAnswer.status = "failed";
      optimisticAnswer.error_code = error?.code || "consultation_failed";
      optimisticAnswer.idempotency_key = `a:${idempotencyKey}`;
      renderMessages();
      bridge.showToast(error?.message || "分析失败，原问题已保留");
    } finally {
      if (generation === state.generation) setSending(false);
    }
  }

  async function sendCurrentQuestion() {
    if (state.sending) return;
    const profile = bridge.getCurrentProfile();
    if (!profile || !state.profileId) {
      bridge.showToast("请先选择档案");
      return;
    }
    if (!bridge.hasCurrentChart()) {
      bridge.showToast("当前档案排盘未完成，暂时不能咨询");
      return;
    }
    const question = bridge.getQuestion();
    if (!question) {
      bridge.showToast("请先输入具体问题");
      bridge.focusQuestion();
      return;
    }
    await submitQuestion(question, bridge.getQuestionType(), crypto.randomUUID());
  }

  document.querySelector("#newConversation").addEventListener("click", () => {
    if (state.sending) return;
    setCurrentConversation(null);
    state.messages = [];
    state.hasEarlier = false;
    renderMessages();
    bridge.clearQuestion();
    bridge.focusQuestion();
  });

  document.querySelector("#openConversationPicker").addEventListener("click", () => {
    renderConversationPicker();
    pickerModal.hidden = false;
  });
  document.querySelector("#closeConversationPicker").addEventListener("click", () => {
    pickerModal.hidden = true;
  });
  pickerModal.addEventListener("click", (event) => {
    if (event.target === pickerModal) pickerModal.hidden = true;
  });

  pickerList.addEventListener("click", async (event) => {
    const open = event.target.closest("[data-conversation-id]");
    if (open) {
      setCurrentConversation(open.dataset.conversationId);
      pickerModal.hidden = true;
      state.messages = [];
      renderMessages();
      await loadMessages(state.conversationId);
      return;
    }
    const remove = event.target.closest("[data-delete-conversation]");
    if (!remove) return;
    const conversation = state.conversations.find((item) => item.id === remove.dataset.deleteConversation);
    if (!conversation || !global.confirm(`确定删除会话“${conversation.title}”吗？摘要和报告将标记为需要重新整理。`)) return;
    await client.deleteConversation(conversation.id);
    await loadProfile(state.profileId);
    bridge.showToast("会话已删除，分析报告需要重新整理");
  });

  thread.addEventListener("click", async (event) => {
    const remove = event.target.closest("[data-delete-cloud-message]");
    if (remove) {
      if (!global.confirm("确定删除这条消息吗？分析摘要和报告将标记为需要重新整理。")) return;
      await client.deleteMessage(remove.dataset.deleteCloudMessage);
      await loadMessages(state.conversationId);
      bridge.showToast("消息已删除，分析报告需要重新整理");
      return;
    }
    const retry = event.target.closest("[data-retry-message]");
    if (!retry || state.sending) return;
    const index = Number(retry.dataset.userMessageIndex);
    const userMessage = state.messages[index]?.role === "user" ? state.messages[index] : null;
    if (!userMessage) {
      bridge.showToast("没有找到原问题，请重新输入");
      return;
    }
    await submitQuestion(
      userMessage.content,
      userMessage.structured_content?.questionType || "自定义",
      retry.dataset.requestKey || crypto.randomUUID(),
    );
  });

  loadEarlierButton.addEventListener("click", async () => {
    if (!state.conversationId || !state.oldestMessageAt) return;
    loadEarlierButton.disabled = true;
    try {
      await loadMessages(state.conversationId, { before: state.oldestMessageAt, prepend: true });
    } finally {
      loadEarlierButton.disabled = false;
    }
  });

  global.addEventListener("mingli:profile-changed", (event) => {
    void loadProfile(event.detail?.profileId || null);
  });

  global.MingliConsultation = Object.freeze({ ownsHistory: true, sendCurrentQuestion, refresh: () => loadProfile(state.profileId) });
})(window);
