import { nanoid } from "nanoid";
import { getJson, updateJson } from "./jsonStore.js";

const REQUESTS_FILE = "requests.json";
const MAX_AGE_MS = 36 * 60 * 60 * 1000;

const REQUEST_TYPES = ["food", "bath", "toilet", "medical"];

function isExpired(request, now) {
  return now - new Date(request.createdAt).getTime() > MAX_AGE_MS;
}

/** Removes requests older than 36 hours. Called on every read and by the cleanup interval. */
export async function cleanupExpired() {
  return updateJson(REQUESTS_FILE, [], (requests) => {
    const now = Date.now();
    return requests.filter((r) => !isExpired(r, now));
  });
}

function toPublicRequest(request) {
  const { requesterUsername, requesterPasswordHash, ...rest } = request;
  return { ...rest, helperCount: request.helpers.length };
}

function sortForBoard(requests) {
  const bucket = (r) => (r.helpers.length === 0 ? 0 : r.helpers.length <= 2 ? 1 : 2);
  return [...requests].sort((a, b) => {
    const bucketDiff = bucket(a) - bucket(b);
    if (bucketDiff !== 0) return bucketDiff;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
}

export async function listOpenRequests() {
  const requests = await cleanupExpired();
  return sortForBoard(requests.filter((r) => r.status === "open")).map(toPublicRequest);
}

export async function getRequestPublic(id) {
  const requests = await cleanupExpired();
  const found = requests.find((r) => r.id === id);
  return found ? toPublicRequest(found) : null;
}

export async function getRequestsByUsername(username) {
  const requests = await cleanupExpired();
  return requests.filter((r) => r.requesterUsername === username).map(toPublicRequest);
}

export function isValidType(type) {
  return REQUEST_TYPES.includes(type);
}

export async function createRequest(username, payload) {
  const now = new Date().toISOString();
  const request = {
    id: nanoid(10),
    type: payload.type,
    name: payload.name.trim(),
    mobile: payload.mobile.trim(),
    address: payload.address ? payload.address.trim() : null,
    instructions: payload.instructions ? payload.instructions.trim() : "",
    createdAt: now,
    updatedAt: now,
    status: "open",
    requesterUsername: username,
    helpers: [],
  };
  await updateJson(REQUESTS_FILE, [], (requests) => {
    requests.push(request);
    return requests;
  });
  return toPublicRequest(request);
}

async function mutateOwnRequest(id, username, mutator) {
  let result = null;
  await updateJson(REQUESTS_FILE, [], (requests) => {
    const now = Date.now();
    const fresh = requests.filter((r) => !isExpired(r, now));
    const index = fresh.findIndex((r) => r.id === id);
    if (index === -1) {
      result = { error: "not_found" };
      return fresh;
    }
    if (fresh[index].requesterUsername !== username) {
      result = { error: "forbidden" };
      return fresh;
    }
    fresh[index] = mutator(fresh[index]);
    result = { value: toPublicRequest(fresh[index]) };
    return fresh;
  });
  return result;
}

export async function updateRequest(id, username, payload) {
  return mutateOwnRequest(id, username, (request) => ({
    ...request,
    type: payload.type,
    name: payload.name.trim(),
    mobile: payload.mobile.trim(),
    address: payload.address ? payload.address.trim() : null,
    instructions: payload.instructions ? payload.instructions.trim() : "",
    updatedAt: new Date().toISOString(),
  }));
}

export async function markFulfilled(id, username) {
  return mutateOwnRequest(id, username, (request) => ({
    ...request,
    status: "fulfilled",
    updatedAt: new Date().toISOString(),
  }));
}

export async function deleteRequest(id, username) {
  let result = null;
  await updateJson(REQUESTS_FILE, [], (requests) => {
    const now = Date.now();
    const fresh = requests.filter((r) => !isExpired(r, now));
    const index = fresh.findIndex((r) => r.id === id);
    if (index === -1) {
      result = { error: "not_found" };
      return fresh;
    }
    if (fresh[index].requesterUsername !== username) {
      result = { error: "forbidden" };
      return fresh;
    }
    result = { value: true };
    fresh.splice(index, 1);
    return fresh;
  });
  return result;
}

/** Volunteers mark help anonymously; one mark per device via deviceId. */
export async function addHelper(id, deviceId) {
  let result = null;
  await updateJson(REQUESTS_FILE, [], (requests) => {
    const now = Date.now();
    const fresh = requests.filter((r) => !isExpired(r, now));
    const index = fresh.findIndex((r) => r.id === id);
    if (index === -1) {
      result = { error: "not_found" };
      return fresh;
    }
    const request = fresh[index];
    if (request.helpers.some((h) => h.deviceId === deviceId)) {
      result = { value: toPublicRequest(request) };
      return fresh;
    }
    request.helpers.push({ deviceId, markedAt: new Date().toISOString() });
    result = { value: toPublicRequest(request) };
    return fresh;
  });
  return result;
}

export async function getJsonSnapshot() {
  return getJson(REQUESTS_FILE, []);
}
