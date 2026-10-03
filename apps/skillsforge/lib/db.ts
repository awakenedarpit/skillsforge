import { db as prismaDb } from "@quikit/database";

// For SQLite / file-based databases, there's no server to probe.
// For PostgreSQL, the original code probed port 5432.
// Detect provider from DATABASE_URL to decide strategy.
const isSQLite = (process.env.DATABASE_URL || "").startsWith("file:");

let dbOnline = isSQLite; // SQLite is always "online" (it's a file)
let lastProbe = 0;
const PROBE_TTL = 30000; // 30 seconds

function probeDatabase() {
  if (process.env.NODE_ENV === "test" || process.env.VITEST) return;
  if (isSQLite || process.env.VERCEL || (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes("127.0.0.1") && !process.env.DATABASE_URL.includes("localhost"))) {
    dbOnline = true;
    return;
  }

  // TCP probe for server-based databases (PostgreSQL, MySQL, etc.)
  const now = Date.now();
  if (now - lastProbe < PROBE_TTL && lastProbe > 0) return;
  lastProbe = now;

  try {
    const net = require("net");
    const url = process.env.DATABASE_URL || "";
    const portMatch = url.match(/:(\d+)\//);
    const port = portMatch ? parseInt(portMatch[1], 10) : 5432;

    const sock = net.connect({ host: "127.0.0.1", port, timeout: 150 });
    sock.on("connect", () => {
      dbOnline = true;
      sock.destroy();
    });
    sock.on("error", () => {
      dbOnline = false;
      sock.destroy();
    });
    sock.on("timeout", () => {
      dbOnline = false;
      sock.destroy();
    });
  } catch {
    dbOnline = false;
  }
}

// Initial probe
probeDatabase();

function createOfflineProxy(): any {
  const handler: ProxyHandler<any> = {
    get(_target, prop) {
      if (prop === "then") return undefined; // avoid Promise-like confusion
      return createOfflineProxy();
    },
    apply() {
      return Promise.reject(new Error("Database offline"));
    },
  };
  const fn = () => Promise.reject(new Error("Database offline"));
  return new Proxy(fn, handler);
}

export const db: any = new Proxy(prismaDb, {
  get(target: any, prop: string | symbol) {
    if (process.env.NODE_ENV === "test" || process.env.VITEST) {
      return target[prop];
    }
    probeDatabase();
    if (!dbOnline) {
      return createOfflineProxy();
    }
    return target[prop];
  },
});

export default db;
