const { Pool } = require("pg");

let pool = null;
let tableReady = null;

// Il database è "configurato" solo se ci sono host, utente e password
function isConfigured() {
  return Boolean(
    process.env.DB_HOST && process.env.DB_USER && process.env.DB_PASSWORD
  );
}

function getPool() {
  if (!pool) {
    pool = new Pool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT) || 5432,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || "appdb",
      // Azure richiede una connessione cifrata (TLS)
      ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
      max: 5,
      connectionTimeoutMillis: 5000,
    });

    // Senza questo, un errore su una connessione inattiva fermerebbe l'app
    pool.on("error", (err) => {
      console.error(
        JSON.stringify({
          time: new Date().toISOString(),
          level: "error",
          message: "idle database client error",
          error: err.message,
        })
      );
    });
  }
  return pool;
}

async function query(text, params) {
  try {
    const p = getPool();

    // Crea la tabella la prima volta che serve
    if (!tableReady) {
      tableReady = p
        .query(
          `CREATE TABLE IF NOT EXISTS notes (
             id SERIAL PRIMARY KEY,
             text TEXT NOT NULL,
             created_at TIMESTAMPTZ NOT NULL DEFAULT now()
           )`
        )
        .catch((err) => {
          tableReady = null;
          throw err;
        });
    }
    await tableReady;

    return await p.query(text, params);
  } catch (err) {
    err.status = 503; // database non disponibile
    throw err;
  }
}

async function ping() {
  await query("SELECT 1");
}

async function listNotes() {
  const result = await query(
    "SELECT id, text, created_at FROM notes ORDER BY id DESC LIMIT 50"
  );
  return result.rows;
}

async function addNote(text) {
  // $1 = parametro: protegge da SQL injection
  const result = await query(
    "INSERT INTO notes (text) VALUES ($1) RETURNING id, text, created_at",
    [text]
  );
  return result.rows[0];
}

async function close() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

module.exports = { isConfigured, ping, listNotes, addNote, close };