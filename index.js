const http = require("http");
const pkg = require("./package.json");

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

// ---------- Server ----------
const server = http.createServer((req, res) => {
  try {
    const path = new URL(req.url, "http://localhost").pathname;
    log("info", "request", { method: req.method, path });

    if (req.method !== "GET") {
      return send(res, 405, "Method Not Allowed");
    }

    if (path === "/") {
      return send(res, 200, `Hello from ${config.appName} (${config.env})`);
    }

    if (path === "/health") {
      return send(res, 200, "OK");
    }

    if (path === "/version") {
      return send(
        res,
        200,
        JSON.stringify({
          name: config.appName,
          version: config.version,
          environment: config.env,
        }),
        "application/json"
      );
    }

    log("warn", "not found", { path });
    return send(res, 404, "Not Found");
  } catch (err) {
    log("error", "unexpected error", { error: err.message });
    return send(res, 500, "Internal Server Error");
  }
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
    });
  });

  // Docker manda SIGTERM quando ferma il container: chiudiamo con ordine
  const shutdown = (signal) => {
    log("info", "shutting down", { signal });
    server.close(() => process.exit(0));
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

module.exports = { server, config };