import { api, getSession, saveSession, clearSession, hasMarkedHelping, markHelpedLocally, getDeviceId } from "./api.js";

const REQUEST_TYPES = [
  { value: "food", label: "Food", needsAddress: true },
  { value: "bath", label: "Bath", needsAddress: false },
  { value: "toilet", label: "Toilet", needsAddress: false },
  { value: "medical", label: "Medical", needsAddress: true },
];

const LEGACY_TYPE_LABELS = {
  bath_toilet: "Bath / Toilet",
};

const SAFETY_NOTES = {
  general: {
    title: "General safety / सामान्य सुरक्षा",
    en: "This board is only for help at the protest site. Never go alone — always move with 2–3 trusted people and keep each other informed about where you are going. Be respectful and never share anyone's details outside this board.",
    hi: "यह बोर्ड केवल विरोध स्थल पर मदद के लिए है। कभी अकेले न जाएँ — हमेशा 2–3 भरोसेमंद लोगों के साथ रहें और एक-दूसरे को बताते रहें कि कहाँ जा रहे हैं। सम्मान से रहें और किसी की जानकारी इस बोर्ड के बाहर साझा न करें।",
  },
  address: {
    title: "Address rules / पते के नियम",
    en: "Add only your protest site location — gate number, landmark, or area near the protest. Do not add home addresses, fake locations, or unnecessary details.",
    hi: "केवल विरोध स्थल का पता लिखें — गेट नंबर, लैंडमार्क, या विरोध क्षेत्र के पास की जगह। घर का पता, गलत स्थान, या अनावश्यक जानकारी न लिखें।",
  },
  bath: {
    title: "Bath / नहाना",
    en: "Never go alone. Volunteers and requesters should always go in a group of 2–3 trusted people, especially when helping women. Keep your group informed about the location and stay together. Use only safe, well-lit bathing areas.",
    hi: "कभी अकेले न जाएँ। स्वयंसेवक और अनुरोधकर्ता हमेशा 2–3 भरोसेमंद लोगों के समूह में जाएँ, खासकर महिलाओं की मदद करते समय। अपने समूह को स्थान की जानकारी देते रहें और साथ रहें। केवल सुरक्षित, अच्छी रोशनी वाली नहाने की जगह का उपयोग करें।",
  },
  toilet: {
    title: "Toilet / शौचालय",
    en: "Never go alone, especially for women. Always go with 2–3 trusted people, keep each other informed, and stay together. Meet only in well-lit, public, visible areas.",
    hi: "कभी अकेले न जाएँ, खासकर महिलाएँ। हमेशा 2–3 भरोसेमंद लोगों के साथ जाएँ, एक-दूसरे को सूचित रखें, और साथ रहें। केवल अच्छी रोशनी वाली, सार्वजनिक और दिखाई देने वाली जगह पर मिलें।",
  },
  food: {
    title: "Food / खाना",
    en: "Never go alone to deliver or collect food. Go in a group of 2–3 trusted people, keep each other informed, and meet in a public, visible spot. Avoid isolated or unsafe areas.",
    hi: "खाना देने या लेने के लिए कभी अकेले न जाएँ। 2–3 भरोसेमंद लोगों के समूह में जाएँ, एक-दूसरे को सूचित रखें, और सार्वजनिक, दिखाई देने वाली जगह पर मिलें। एकांत या असुरक्षित जगहों से बचें।",
  },
  medical: {
    title: "Medical / चिकित्सा",
    en: "For emergencies, call local emergency services first (112/102). Never go alone — take 2–3 trusted people with you and keep your group informed. This board is for coordination only, not a substitute for professional medical care.",
    hi: "आपात स्थिति में पहले स्थानीय आपातकालीन नंबर (112/102) पर कॉल करें। कभी अकेले न जाएँ — 2–3 भरोसेमंद लोगों को साथ लें और समूह को सूचित रखें। यह बोर्ड केवल समन्वय के लिए है, पेशेवर चिकित्सा सेवा का विकल्प नहीं।",
  },
};

function safetyNoteHtml(type) {
  const note = SAFETY_NOTES[type] || SAFETY_NOTES.bath || SAFETY_NOTES.food;
  return `
    <p class="safety-heading">Safety guidelines / सुरक्षा दिशानिर्देश</p>
    <p class="safety-line"><strong>English:</strong> ${escapeHtml(note.en)}</p>
    <p class="safety-line"><strong>हिंदी:</strong> ${escapeHtml(note.hi)}</p>
  `;
}

function guidelineBlock(key) {
  const note = SAFETY_NOTES[key];
  if (!note) return "";
  return `
    <section class="guideline-section">
      <h3 class="guideline-title">${escapeHtml(note.title || key)}</h3>
      <p class="guideline-line"><strong>English:</strong> ${escapeHtml(note.en)}</p>
      <p class="guideline-line"><strong>हिंदी:</strong> ${escapeHtml(note.hi)}</p>
    </section>
  `;
}

function allGuidelinesHtml() {
  return `
    <h2 id="guidelines-title" class="detail-title">Safety Guidelines / सुरक्षा दिशानिर्देश</h2>
    ${guidelineBlock("general")}
    ${guidelineBlock("address")}
    ${guidelineBlock("food")}
    ${guidelineBlock("bath")}
    ${guidelineBlock("toilet")}
    ${guidelineBlock("medical")}
  `;
}

function openGuidelines() {
  const modal = document.getElementById("guidelines-modal");
  const content = document.getElementById("guidelines-content");
  content.innerHTML = allGuidelinesHtml();
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");
}

function closeGuidelines() {
  const modal = document.getElementById("guidelines-modal");
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
  document.getElementById("guidelines-content").innerHTML = "";
}

const boardList = document.getElementById("board-list");
const boardEmpty = document.getElementById("board-empty");
const boardStatus = document.getElementById("board-status");
const detailModal = document.getElementById("detail-modal");
const detailContent = document.getElementById("detail-content");
const toast = document.getElementById("toast");
const loginSection = document.getElementById("login-section");
const mineDashboard = document.getElementById("mine-dashboard");
const mineContent = document.getElementById("mine-content");
const loggedInUser = document.getElementById("logged-in-user");
const boardPanel = document.getElementById("board-panel");
const minePanel = document.getElementById("mine-panel");
const tabsNav = document.getElementById("tabs-nav");
const bottomBar = document.querySelector(".bottom-bar");

let guestTab = "board";
let refreshTimer = null;

function typeMeta(type) {
  return REQUEST_TYPES.find((t) => t.value === type) || { value: type, label: LEGACY_TYPE_LABELS[type] || type, needsAddress: false };
}

function userAlreadyHelping(request) {
  if (hasMarkedHelping(request.id)) return true;
  const deviceId = getDeviceId();
  return request.helpers?.some((h) => h.deviceId === deviceId);
}

function formatTime(iso) {
  const date = new Date(iso);
  const diffMin = Math.floor((Date.now() - date.getTime()) / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hr ago`;
  return date.toLocaleString();
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.remove("hidden");
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => toast.classList.add("hidden"), 1500);
}

function updateLayout() {
  const session = getSession();
  document.body.classList.toggle("logged-in", Boolean(session));

  if (session) {
    tabsNav.classList.add("hidden");
    boardPanel.classList.remove("active");
    minePanel.classList.add("active");
    bottomBar.classList.add("hidden");
    loginSection.classList.add("hidden");
    mineDashboard.classList.remove("hidden");
    loggedInUser.textContent = session.username;
    return;
  }

  tabsNav.classList.remove("hidden");
  mineDashboard.classList.add("hidden");
  bottomBar.classList.add("hidden");
  loginSection.classList.remove("hidden");
  switchGuestTab(guestTab);
}

function switchGuestTab(tab) {
  guestTab = tab;
  document.querySelectorAll(".tab").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tab);
  });
  boardPanel.classList.toggle("active", tab === "board");
  minePanel.classList.toggle("active", tab === "mine");
  if (tab === "board") loadBoard();
}

function showGuestBoard() {
  switchGuestTab("board");
}

function showGuestLogin() {
  switchGuestTab("mine");
}

function helperLabel(count) {
  if (count === 0) return { text: "No help yet", urgent: true };
  if (count <= 2) return { text: `${count} helping`, urgent: false };
  return { text: `${count}+ volunteers on the way`, urgent: false };
}

function renderBoardCard(request) {
  const meta = typeMeta(request.type);
  const helper = helperLabel(request.helperCount);
  const card = document.createElement("article");
  card.className = "card request-card";
  card.innerHTML = `
    <div class="request-card-top">
      <span class="badge badge-${request.type}">${meta.label}</span>
      <span class="helper-pill ${helper.urgent ? "urgent" : ""}">${helper.text}</span>
    </div>
    <p class="request-name">${escapeHtml(request.name)}</p>
    <p class="request-meta">${formatTime(request.createdAt)}</p>
  `;
  card.addEventListener("click", () => openDetail(request.id));
  return card;
}

async function loadBoard() {
  try {
    const requests = await api.listRequests();
    boardList.innerHTML = "";
    if (!requests.length) {
      boardEmpty.classList.remove("hidden");
    } else {
      boardEmpty.classList.add("hidden");
      requests.forEach((request) => boardList.appendChild(renderBoardCard(request)));
    }
    boardStatus.textContent = `Updated ${new Date().toLocaleTimeString()} · ${requests.length} open request(s)`;
  } catch (err) {
    boardStatus.textContent = err.message;
  }
}

function copyField(label, value) {
  if (!value) return "";
  return `
    <div class="copy-field">
      <div>
        <span class="copy-field-label">${label}</span>
        <span class="copy-field-value">${escapeHtml(value)}</span>
      </div>
      <button class="copy-btn" type="button" data-copy="${escapeAttr(value)}">Copy</button>
    </div>
  `;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll("'", "&#39;");
}

async function openDetail(id) {
  try {
    const request = await api.getRequest(id);
    const meta = typeMeta(request.type);
    const helper = helperLabel(request.helperCount);
    const allText = [
      `Type: ${meta.label}`,
      `Name: ${request.name}`,
      `Mobile: ${request.mobile}`,
      request.address ? `Address: ${request.address}` : null,
      request.instructions ? `Instructions: ${request.instructions}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    const alreadyHelping = userAlreadyHelping(request);
    const helpSection = alreadyHelping
      ? `<p class="helped-note">You marked as helping / आपने मदद करने का संकेत दिया है</p>`
      : `<button class="btn btn-primary btn-block" type="button" id="help-btn">I am providing help / मैं मदद कर रहा/रही हूँ</button>`;

    detailContent.innerHTML = `
      <h2 id="detail-title" class="detail-title">${meta.label} request</h2>
      <p class="helper-pill ${helper.urgent ? "urgent" : ""}">${helper.text}</p>
      <div class="safety-box">${safetyNoteHtml(request.type)}</div>
      ${copyField("Name", request.name)}
      ${copyField("Mobile", request.mobile)}
      ${copyField("Address", request.address)}
      ${copyField("Instructions", request.instructions)}
      <div class="btn-row detail-actions">
        <button class="btn btn-secondary btn-block" type="button" data-copy="${escapeAttr(allText)}">Copy all</button>
        ${helpSection}
      </div>
    `;

    detailContent.querySelectorAll("[data-copy]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        await navigator.clipboard.writeText(btn.dataset.copy);
        showToast("Copied!");
      });
    });

    const helpBtn = document.getElementById("help-btn");
    if (helpBtn) {
      helpBtn.addEventListener("click", async () => {
        try {
          const updated = await api.markHelping(request.id);
          markHelpedLocally(request.id);
          showToast("Marked as helping");
          closeDetail();
          await loadBoard();
          openDetail(updated.id);
        } catch (err) {
          showToast(err.message);
        }
      });
    }

    detailModal.classList.remove("hidden");
    detailModal.setAttribute("aria-hidden", "false");
  } catch (err) {
    showToast(err.message);
  }
}

function closeDetail() {
  detailModal.classList.add("hidden");
  detailModal.setAttribute("aria-hidden", "true");
  detailContent.innerHTML = "";
}

function requestFormHtml(request = null) {
  const selectedType = request?.type || "food";
  const meta = typeMeta(selectedType);
  const isEdit = Boolean(request);
  return `
    <div class="card">
      <h2>${isEdit ? "Edit request" : "New request / नया अनुरोध"}</h2>
      <form id="request-form">
        <label>
          Request type
          <select name="type" required>
            ${REQUEST_TYPES.map(
              (t) =>
                `<option value="${t.value}" ${t.value === selectedType ? "selected" : ""}>${t.label}</option>`
            ).join("")}
          </select>
        </label>
        <label>
          Name
          <input name="name" required value="${escapeAttr(request?.name || "")}" />
        </label>
        <label>
          Mobile number
          <input name="mobile" required inputmode="tel" value="${escapeAttr(request?.mobile || "")}" />
        </label>
        <label id="address-field" class="${meta.needsAddress ? "" : "hidden"}">
          Address / पता
          <p class="field-hint">
            Protest site location only — e.g. Gate 2, near main stage. Do not add home or random addresses.
            <br />
            केवल विरोध स्थल का पता — जैसे गेट 2, मुख्य मंच के पास। घर या अनावश्यक पता न लिखें।
          </p>
          <input
            name="address"
            ${meta.needsAddress ? "required" : ""}
            placeholder="e.g. Gate 2, protest site, near main stage"
            value="${escapeAttr(request?.address || "")}"
          />
        </label>
        <label>
          Instructions
          <textarea name="instructions" placeholder="Any extra details">${escapeHtml(request?.instructions || "")}</textarea>
        </label>
        <div id="form-safety" class="safety-box">${safetyNoteHtml(selectedType)}</div>
        <div class="btn-row">
          <button class="btn btn-secondary btn-block" type="button" id="cancel-form-btn">Cancel</button>
          <button class="btn btn-primary btn-block" type="submit">${isEdit ? "Save changes" : "Post request"}</button>
        </div>
      </form>
    </div>
  `;
}

function showRequestForm(request = null) {
  mineContent.innerHTML = requestFormHtml(request);
  bindRequestForm(request);
  document.getElementById("cancel-form-btn").addEventListener("click", () => renderMineList());
}

function renderMyRequestCard(request) {
  const meta = typeMeta(request.type);
  const helper = helperLabel(request.helperCount);
  const isOpen = request.status === "open";
  const card = document.createElement("article");
  card.className = "card my-request-card";
  card.innerHTML = `
    <div class="request-card-top">
      <span class="badge badge-${request.type}">${meta.label}</span>
      <span class="status-pill ${isOpen ? "status-open" : "status-fulfilled"}">${isOpen ? "Open" : "Fulfilled"}</span>
    </div>
    <p class="request-name">${escapeHtml(request.name)}</p>
    <p class="request-meta">${formatTime(request.createdAt)} · ${helper.text}</p>
    ${isOpen ? `
      <div class="btn-row">
        <button class="btn btn-secondary" type="button" data-action="edit">Edit</button>
        <button class="btn btn-primary" type="button" data-action="fulfill">Mark fulfilled</button>
        <button class="btn btn-danger" type="button" data-action="delete">Delete</button>
      </div>
    ` : ""}
  `;

  if (isOpen) {
    card.querySelector('[data-action="edit"]').addEventListener("click", () => showRequestForm(request));
    card.querySelector('[data-action="fulfill"]').addEventListener("click", async () => {
      try {
        await api.fulfillRequest(request.id);
        showToast("Marked as fulfilled");
        await renderMineList();
      } catch (err) {
        showToast(err.message);
      }
    });
    card.querySelector('[data-action="delete"]').addEventListener("click", async () => {
      if (!confirm("Delete this request?")) return;
      try {
        await api.deleteRequest(request.id);
        showToast("Request deleted");
        await renderMineList();
      } catch (err) {
        showToast(err.message);
      }
    });
  }

  return card;
}

async function renderMineList() {
  updateLayout();
  try {
    const requests = await api.myRequests();
    const sorted = [...requests].sort((a, b) => {
      if (a.status !== b.status) return a.status === "open" ? -1 : 1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    mineContent.innerHTML = `
      <button id="new-request-btn" class="btn btn-primary btn-block" type="button">
        New Request / नया अनुरोध
      </button>
      <div id="my-requests-list" class="request-list my-requests-list"></div>
      <p id="my-requests-empty" class="empty ${sorted.length ? "hidden" : ""}">No requests yet. Tap New Request to post one.</p>
    `;

    const list = document.getElementById("my-requests-list");
    sorted.forEach((request) => list.appendChild(renderMyRequestCard(request)));

    document.getElementById("new-request-btn").addEventListener("click", () => showRequestForm());
  } catch (err) {
    mineContent.innerHTML = `<p class="error-text">${escapeHtml(err.message)}</p>`;
  }
}

function bindRequestForm(request = null) {
  const form = document.getElementById("request-form");
  const typeSelect = form.querySelector('[name="type"]');
  const addressField = document.getElementById("address-field");
  const addressInput = form.querySelector('[name="address"]');
  const safetyBox = document.getElementById("form-safety");

  typeSelect.addEventListener("change", () => {
    const meta = typeMeta(typeSelect.value);
    addressField.classList.toggle("hidden", !meta.needsAddress);
    addressInput.required = meta.needsAddress;
    safetyBox.innerHTML = safetyNoteHtml(typeSelect.value);
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const payload = {
      type: data.get("type"),
      name: data.get("name"),
      mobile: data.get("mobile"),
      address: data.get("address"),
      instructions: data.get("instructions"),
    };
    try {
      if (request) {
        await api.updateRequest(request.id, payload);
        showToast("Request updated");
      } else {
        await api.createRequest(payload);
        showToast("Request posted");
      }
      await renderMineList();
    } catch (err) {
      showToast(err.message);
    }
  });
}

async function renderMinePanel() {
  const session = getSession();
  if (!session) {
    updateLayout();
    return;
  }
  await renderMineList();
}

document.querySelectorAll(".tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    if (getSession()) return;
    switchGuestTab(btn.dataset.tab);
  });
});

document.getElementById("refresh-btn").addEventListener("click", () => {
  if (getSession()) {
    renderMineList();
  } else {
    loadBoard();
  }
});

document.getElementById("guidelines-btn").addEventListener("click", openGuidelines);

document.getElementById("guidelines-modal").addEventListener("click", (event) => {
  if (event.target.dataset.closeGuidelines === "true") closeGuidelines();
});

document.getElementById("post-request-btn").addEventListener("click", () => {
  if (getSession()) {
    renderMineList().then(() => showRequestForm());
    return;
  }
  showGuestLogin();
  document.querySelector('#login-form [name="username"]')?.focus();
});

document.getElementById("login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = new FormData(event.target);
  const username = data.get("username").trim();
  const password = data.get("password");
  try {
    await api.login(username, password);
    saveSession({ username, password });
    showToast("Logged in");
    updateLayout();
    await renderMineList();
  } catch (err) {
    showToast(err.message);
  }
});

document.getElementById("logout-btn").addEventListener("click", () => {
  clearSession();
  updateLayout();
  showToast("Logged out");
});

detailModal.addEventListener("click", (event) => {
  if (event.target.dataset.close === "true") closeDetail();
});

if (getSession()) {
  updateLayout();
  renderMineList();
} else {
  updateLayout();
}
refreshTimer = setInterval(() => {
  if (!getSession() && guestTab === "board" && detailModal.classList.contains("hidden")) {
    loadBoard();
  }
}, 45000);
