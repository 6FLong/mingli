const screenNames = new Set(["home", "ask", "profiles", "detail", "mine"]);

const screens = Array.from(document.querySelectorAll(".screen"));
const tabs = Array.from(document.querySelectorAll(".tabbar .tab"));
const toastEl = document.querySelector("#toast");
const questionText = document.querySelector("#questionText");
const resultTitle = document.querySelector("#resultTitle");
const archiveSearch = document.querySelector("#archiveSearch");
const archiveCards = Array.from(document.querySelectorAll(".archive-card"));
const profileModal = document.querySelector("#profileModal");
const profileName = document.querySelector("#profileName");
const selectedProfileName = document.querySelector("#selectedProfileName");
const selectedProfileMeta = document.querySelector("#selectedProfileMeta");
const profilePickerModal = document.querySelector("#profilePickerModal");
const profilePickerSearch = document.querySelector("#profilePickerSearch");
const profilePickerItems = Array.from(document.querySelectorAll("[data-pick-profile]"));

let activeFilter = "all";
let toastTimer = null;

function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.add("is-show");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toastEl.classList.remove("is-show");
  }, 1800);
}

function goTo(screenName) {
  if (!screenNames.has(screenName)) return;

  screens.forEach((screen) => {
    screen.classList.toggle("is-active", screen.dataset.screen === screenName);
  });

  tabs.forEach((tab) => {
    tab.classList.toggle("is-active", tab.dataset.go === screenName);
  });

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function resetArchiveFilters() {
  activeFilter = "all";
  document.querySelectorAll("[data-filter]").forEach((item) => {
    item.classList.toggle("is-selected", item.dataset.filter === "all");
  });
}

function applyArchiveSearch() {
  const keyword = archiveSearch.value.trim().toLowerCase();

  archiveCards.forEach((card) => {
    const haystack = card.dataset.keywords.toLowerCase();
    const filterMatched = activeFilter === "all" || haystack.includes(activeFilter);
    const keywordMatched = !keyword || haystack.includes(keyword);
    card.classList.toggle("is-hidden", !filterMatched || !keywordMatched);
  });
}

function openProfileModal() {
  profileModal.hidden = false;
  window.setTimeout(() => profileName.focus(), 30);
}

function closeProfileModal() {
  profileModal.hidden = true;
}

function openProfilePicker() {
  profilePickerModal.hidden = false;
  profilePickerSearch.value = "";
  filterProfilePicker();
  window.setTimeout(() => profilePickerSearch.focus(), 30);
}

function closeProfilePicker() {
  profilePickerModal.hidden = true;
}

function filterProfilePicker() {
  const keyword = profilePickerSearch.value.trim().toLowerCase();

  profilePickerItems.forEach((item) => {
    const matched = !keyword || item.dataset.keywords.toLowerCase().includes(keyword);
    item.classList.toggle("is-hidden", !matched);
  });
}

document.addEventListener("click", (event) => {
  const goButton = event.target.closest("[data-go]");
  if (goButton) {
    const question = goButton.dataset.question;
    if (question && questionText) {
      questionText.value = question;
      resultTitle.textContent = question;
    }
    goTo(goButton.dataset.go);
    return;
  }

  const chip = event.target.closest("#questionChips button");
  if (chip) {
    document.querySelectorAll("#questionChips button").forEach((item) => {
      item.classList.toggle("is-selected", item === chip);
    });

    const questionMap = {
      "今年运势": "今年整体运势怎么样？",
      "财运": "财运什么时候会有起色？",
      "事业": "今年适不适合换工作？",
      "婚姻感情": "这段关系还能不能继续？",
      "健康": "健康方面要注意什么？",
      "近三年": "近三年整体走势如何？",
    };
    questionText.value = questionMap[chip.textContent.trim()] || chip.textContent.trim();
    return;
  }

  const filter = event.target.closest("[data-filter]");
  if (filter) {
    activeFilter = filter.dataset.filter;
    document.querySelectorAll("[data-filter]").forEach((item) => {
      item.classList.toggle("is-selected", item === filter);
    });
    applyArchiveSearch();
    return;
  }

  const pickedProfile = event.target.closest("[data-pick-profile]");
  if (pickedProfile) {
    selectedProfileName.textContent = pickedProfile.dataset.name;
    selectedProfileMeta.textContent = pickedProfile.dataset.meta;
    closeProfilePicker();
    showToast(`已选择 ${pickedProfile.dataset.name}`);
  }
});

document.querySelector("#generateResult").addEventListener("click", () => {
  const question = questionText.value.trim() || "今年整体运势怎么样？";
  resultTitle.textContent = question;
  showToast("已生成示例分析，后续会接入真实排盘算法");
});

archiveSearch.addEventListener("input", applyArchiveSearch);
profilePickerSearch.addEventListener("input", filterProfilePicker);

document.querySelector("#clearSearch").addEventListener("click", () => {
  archiveSearch.value = "";
  resetArchiveFilters();
  applyArchiveSearch();
});

document.querySelector("#exportData").addEventListener("click", () => {
  showToast("导出功能会在接入 IndexedDB 后启用");
});

document.querySelector("#importData").addEventListener("click", () => {
  showToast("导入功能会在备份格式确定后启用");
});

document.querySelector("#openProfileModal").addEventListener("click", openProfileModal);

document.querySelector("#closeProfileModal").addEventListener("click", closeProfileModal);

document.querySelector("#openProfilePicker").addEventListener("click", openProfilePicker);

document.querySelector("#closeProfilePicker").addEventListener("click", closeProfilePicker);

document.querySelector("#clearProfilePickerSearch").addEventListener("click", () => {
  profilePickerSearch.value = "";
  filterProfilePicker();
});

document.querySelector("#saveProfileDraft").addEventListener("click", () => {
  closeProfileModal();
  showToast("档案保存会在接入 IndexedDB 后启用");
});

profileModal.addEventListener("click", (event) => {
  if (event.target === profileModal) {
    closeProfileModal();
  }
});

profilePickerModal.addEventListener("click", (event) => {
  if (event.target === profilePickerModal) {
    closeProfilePicker();
  }
});

if ("serviceWorker" in navigator && window.location.protocol !== "file:") {
  navigator.serviceWorker.register("./sw.js").catch(() => {
    showToast("离线缓存暂未启用");
  });
}
