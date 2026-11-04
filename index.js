const http = require("http");
const pkg = require("./package.json");
const db = require("./db");

// ---------- Configurazione (letta dalle variabili d'ambiente) ----------
const config = {
  appName: process.env.APP_NAME || "final-project",
  env: process.env.APP_ENV || "development",
  port: Number(process.env.PORT) || 3000,
  logLevel: process.env.LOG_LEVEL || "info",
  version: process.env.APP_VERSION || pkg.version,
};

// ---------- Logging ----------
const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };

function log(level, message, extra = {}) {
  if (LEVELS[level] > LEVELS[config.logLevel]) return;
  console.log(
    JSON.stringify({ time: new Date().toISOString(), level, message, ...extra })
  );
}

// ---------- Risposte ----------
function send(res, status, body, type = "text/plain") {
  res.writeHead(status, { "Content-Type": type });
  res.end(body);
}

function sendJson(res, status, data) {
  send(res, status, JSON.stringify(data), "application/json");
}

// Legge il corpo di una richiesta POST (massimo 10 KB)
function readBody(req, limit = 10000) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > limit) {
        const err = new Error("payload too large");
        err.status = 413;
        reject(err);
        req.destroy();
      }
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

const KNOWN_PATHS = ["/", "/health", "/health/db", "/version", "/notes"];

// ---------- Gestione delle richieste ----------
async function handle(req, res) {
  const path = new URL(req.url, "http://localhost").pathname;
  log("info", "request", { method: req.method, path });

  switch (`${req.method} ${path}`) {
    case "GET /":
      return send(res, 200, `Hello from ${config.appName} (${config.env})`);

    case "GET /health":
      // Non controlla il database: dice solo "l'app è viva"
      return send(res, 200, "OK");

    case "GET /health/db":
      if (!db.isConfigured()) {
        return sendJson(res, 503, { database: "not configured" });
      }
      await db.ping();
      return sendJson(res, 200, { database: "ok" });

    case "GET /version":
      return sendJson(res, 200, {
        name: config.appName,
        version: config.version,
        environment: config.env,
      });

    case "GET /notes":
      if (!db.isConfigured()) {
        return sendJson(res, 503, { error: "database not configured" });
      }
      return sendJson(res, 200, await db.listNotes());

    case "POST /notes": {
      if (!db.isConfigured()) {
        return sendJson(res, 503, { error: "database not configured" });
      }
      const raw = await readBody(req);
      let parsed;
      try {
        parsed = JSON.parse(raw);
      } catch {
        return sendJson(res, 400, { error: "invalid JSON" });
      }
      const text =
        parsed && typeof parsed.text === "string" ? parsed.text.trim() : "";
      if (!text || text.length > 500) {
        return sendJson(res, 400, {
          error: "text is required (max 500 characters)",
        });
      }
      return sendJson(res, 201, await db.addNote(text));
    }

    default:
      if (KNOWN_PATHS.includes(path)) {
        return send(res, 405, "Method Not Allowed");
      }
      log("warn", "not found", { path });
      return send(res, 404, "Not Found");
  }
}

// ---------- Server ----------
const server = http.createServer((req, res) => {
  handle(req, res).catch((err) => {
    // L'errore vero va nel log, al cliente diamo solo un messaggio generico
    log("error", "request failed", { error: err.message, code: err.code });

    const messages = { 413: "Payload Too Large", 503: "Database unavailable" };
    const status = messages[err.status] ? err.status : 500;

    if (res.headersSent) return res.end();
    send(res, status, messages[status] || "Internal Server Error");
  });
});

server.on("error", (err) => {
  log("error", "server error", { error: err.message });
  process.exit(1);
});

// ---------- Avvio (solo se il file è lanciato direttamente) ----------
if (require.main === module) {
  server.listen(config.port, () => {
    log("info", "server started", {
      port: config.port,
      env: config.env,
      version: config.version,
      database: db.isConfigured() ? "configured" : "not configured",
    });
  });

  // Docker manda SIGTERM quando ferma il container: chiudiamo con ordine
  const shutdown = (signal) => {
    log("info", "shutting down", { signal });
    server.close(async () => {
      await db.close();
      process.exit(0);
    });
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

module.exports = { server, config };