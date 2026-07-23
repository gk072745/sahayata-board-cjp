const BASE = "/api";
const SESSION_KEY = "sahayata_session";
const DEVICE_KEY = "sahayata_device_id";
const HELPED_KEY = "sahayata_helped";

function authHeaders() {
  const session = getSession();
  if (!session) return {};
  return { "x-username": session.username, "x-password": session.password };
}

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}

export function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

export function getDeviceId() {
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

export function getHelpedIds() {
  try {
    return JSON.parse(localStorage.getItem(HELPED_KEY) || "[]");
  } catch {
    return [];
  }
}

export function hasMarkedHelping(requestId) {
  return getHelpedIds().includes(requestId);
}

export function markHelpedLocally(requestId) {
  const ids = getHelpedIds();
  if (!ids.includes(requestId)) {
    ids.push(requestId);
    localStorage.setItem(HELPED_KEY, JSON.stringify(ids));
  }
}

export const api = {
  login: (username, password) =>
    request("/auth/login", { method: "POST", body: JSON.stringify({ username, password }) }),
  listRequests: () => request("/requests"),
  getRequest: (id) => request(`/requests/${id}`),
  myRequests: () => request("/requests/mine"),
  createRequest: (payload) => request("/requests", { method: "POST", body: JSON.stringify(payload) }),
  updateRequest: (id, payload) =>
    request(`/requests/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  fulfillRequest: (id) => request(`/requests/${id}/fulfill`, { method: "POST" }),
  deleteRequest: (id) => request(`/requests/${id}`, { method: "DELETE" }),
  markHelping: (id) =>
    request(`/requests/${id}/help`, {
      method: "POST",
      body: JSON.stringify({ deviceId: getDeviceId() }),
    }),
};
