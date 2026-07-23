import { Router } from "express";
import { requireAuth } from "../lib/auth.js";
import {
  listOpenRequests,
  getRequestPublic,
  getRequestsByUsername,
  createRequest,
  updateRequest,
  markFulfilled,
  deleteRequest,
  addHelper,
  isValidType,
} from "../lib/requestsStore.js";

export const requestsRouter = Router();

function validatePayload(body) {
  const { type, name, mobile, address, instructions } = body || {};
  if (!isValidType(type)) return "A valid request type is required.";
  if (!name || !name.trim()) return "Name is required.";
  if (!mobile || !mobile.trim()) return "Mobile number is required.";
  if ((type === "food" || type === "medical") && (!address || !address.trim())) {
    return "Address is required for food and medical requests.";
  }
  return null;
}

requestsRouter.get("/", async (_req, res, next) => {
  try {
    res.json(await listOpenRequests());
  } catch (err) {
    next(err);
  }
});

requestsRouter.get("/mine", requireAuth(), async (req, res, next) => {
  try {
    res.json(await getRequestsByUsername(req.username));
  } catch (err) {
    next(err);
  }
});

requestsRouter.get("/:id", async (req, res, next) => {
  try {
    const request = await getRequestPublic(req.params.id);
    if (!request) return res.status(404).json({ error: "Request not found." });
    res.json(request);
  } catch (err) {
    next(err);
  }
});

requestsRouter.post("/", requireAuth(), async (req, res, next) => {
  const error = validatePayload(req.body);
  if (error) return res.status(400).json({ error });
  try {
    const request = await createRequest(req.username, req.body);
    res.status(201).json(request);
  } catch (err) {
    next(err);
  }
});

requestsRouter.put("/:id", requireAuth(), async (req, res, next) => {
  const error = validatePayload(req.body);
  if (error) return res.status(400).json({ error });
  try {
    const result = await updateRequest(req.params.id, req.username, req.body);
    if (result.error === "not_found") return res.status(404).json({ error: "Request not found." });
    if (result.error === "forbidden") return res.status(403).json({ error: "Not your request." });
    res.json(result.value);
  } catch (err) {
    next(err);
  }
});

requestsRouter.post("/:id/fulfill", requireAuth(), async (req, res, next) => {
  try {
    const result = await markFulfilled(req.params.id, req.username);
    if (result.error === "not_found") return res.status(404).json({ error: "Request not found." });
    if (result.error === "forbidden") return res.status(403).json({ error: "Not your request." });
    res.json(result.value);
  } catch (err) {
    next(err);
  }
});

requestsRouter.delete("/:id", requireAuth(), async (req, res, next) => {
  try {
    const result = await deleteRequest(req.params.id, req.username);
    if (result.error === "not_found") return res.status(404).json({ error: "Request not found." });
    if (result.error === "forbidden") return res.status(403).json({ error: "Not your request." });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

requestsRouter.post("/:id/help", async (req, res, next) => {
  const { deviceId } = req.body || {};
  if (!deviceId) return res.status(400).json({ error: "deviceId is required." });
  try {
    const result = await addHelper(req.params.id, deviceId);
    if (result.error === "not_found") return res.status(404).json({ error: "Request not found." });
    res.json(result.value);
  } catch (err) {
    next(err);
  }
});
