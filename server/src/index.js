import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { authRouter } from "./routes/auth.js";
import { requestsRouter } from "./routes/requests.js";
import { cleanupExpired } from "./lib/requestsStore.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = path.join(__dirname, "..", "..", "client");

const app = express();
const PORT = process.env.PORT || 4000;
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // hourly sweep, in addition to per-read cleanup

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api/auth", authRouter);
app.use("/api/requests", requestsRouter);

app.use(express.static(CLIENT_DIR));
app.get("*", (_req, res) => {
  res.sendFile(path.join(CLIENT_DIR, "index.html"));
});

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Something went wrong." });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Sahayata Board API listening on port ${PORT}`);
});

cleanupExpired().catch((err) => console.error("Initial cleanup failed:", err));
setInterval(() => {
  cleanupExpired().catch((err) => console.error("Cleanup sweep failed:", err));
}, CLEANUP_INTERVAL_MS);
