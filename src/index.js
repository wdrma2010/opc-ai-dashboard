require("dotenv").config();
const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { getRequiredEnv } = require("./config");
const { startMemoryMonitor } = require("./utils/memory");
const { setupBridge } = require("./bridge");
const { isValidUUID, isValidPort, isValidDomain } = require("./utils/validators");

async function main() {
  try {
    startMemoryMonitor();

    const SECRET = getRequiredEnv("UUID", isValidUUID);
    const PORT = getRequiredEnv("PORT", isValidPort, "8080");
    const DOMAIN = getRequiredEnv("TUNNEL_DOMAIN", isValidDomain);
    const NAME = process.env.NAME || os.hostname();

    let landingPage = "<h1>OPC Singular AI</h1>";
    try {
      landingPage = fs.readFileSync(path.join(__dirname, "..", "public", "index.html"), "utf8");
    } catch (e) {
      console.warn("[WARN] Landing page not found, using fallback.");
    }

    const server = http.createServer((req, res) => {
      try {
        if (req.url === "/") {
          res.writeHead(200, { "Content-Type": "text/html" });
          res.end(landingPage);
        } else if (req.url === "/health") {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ status: "ok", service: "opc-ai", uptime: process.uptime() }));
        } else if (req.url === "/api/status") {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({
            name: NAME,
            version: "1.0.0",
            region: os.hostname(),
            time: new Date().toISOString()
          }));
        } else {
          res.writeHead(404, { "Content-Type": "text/plain" });
          res.end("Not Found");
        }
      } catch (handlerError) {
        console.error("Request handler error:", handlerError);
        res.writeHead(500, { "Content-Type": "text/plain" });
        res.end("Internal Server Error");
      }
    });

    server.listen(Number(PORT), () => {
      console.log(`[INFO] Service started on port ${PORT}`);
    });

    setupBridge(server, SECRET.replace(/-/g, ""));
  } catch (err) {
    console.error("[ERROR] Failed to start:", err.message);
    process.exit(1);
  }
}

process.on("uncaughtException", (err) => {
  console.error("[FATAL]", err.message);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  console.error("[FATAL]", reason);
  process.exit(1);
});

main();
