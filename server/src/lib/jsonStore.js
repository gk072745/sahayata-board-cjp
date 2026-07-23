import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "..", "..", "data");

// Per-file write queues so concurrent requests never interleave reads/writes
// on the same JSON file and corrupt it.
const queues = new Map();

function enqueue(file, task) {
  const previous = queues.get(file) || Promise.resolve();
  const next = previous.then(task, task);
  queues.set(file, next.catch(() => {}));
  return next;
}

async function ensureDataDir() {
  await mkdir(DATA_DIR, { recursive: true });
}

async function readJson(filename, fallback) {
  await ensureDataDir();
  const filePath = path.join(DATA_DIR, filename);
  try {
    const raw = await readFile(filePath, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === "ENOENT") return fallback;
    throw err;
  }
}

async function writeJson(filename, data) {
  await ensureDataDir();
  const filePath = path.join(DATA_DIR, filename);
  await writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}

/**
 * Reads the file, lets `mutator` modify the parsed value, then persists it.
 * Queued per-file so concurrent calls apply in order instead of racing.
 */
export function updateJson(filename, fallback, mutator) {
  return enqueue(filename, async () => {
    const data = await readJson(filename, fallback);
    const result = await mutator(data);
    await writeJson(filename, result ?? data);
    return result ?? data;
  });
}

export function getJson(filename, fallback) {
  return enqueue(filename, () => readJson(filename, fallback));
}
