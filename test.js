const http = require("http");
const { server } = require("./index");

function get(port, path) {
  return new Promise((resolve, reject) => {
    http
      .get({ port, path }, (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => resolve({ status: res.statusCode, body }));
      })
      .on("error", reject);
  });
}

function check(name, condition) {
  if (!condition) {
    console.error("FAIL:", name);
    process.exit(1);
  }
  console.log("OK:", name);
}

server.listen(0, async () => {
  const port = server.address().port;
  try {
    const home = await get(port, "/");
    check("/ risponde 200", home.status === 200);

    const health = await get(port, "/health");
    check("/health risponde 200 e OK", health.status === 200 && health.body === "OK");

    const version = await get(port, "/version");
    const data = JSON.parse(version.body);
    check("/version contiene la versione", version.status === 200 && Boolean(data.version));

    const missing = await get(port, "/non-esiste");
    check("percorso sconosciuto risponde 404", missing.status === 404);

    console.log("Tutti i test OK");
    process.exit(0);
  } catch (err) {
    console.error("Errore nel test:", err.message);
    process.exit(1);
  }
});