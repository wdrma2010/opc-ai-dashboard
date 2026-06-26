const { WebSocketServer, createWebSocketStream } = require("ws");
const net = require("net");
const { pipeline } = require("stream");
const { parseTarget, createTokenValidator } = require("./utils/parser");
const { CONNECTION_CONFIG } = require("./config");

const HANDSHAKE_OK = Buffer.from([0x00, 0x00]);

function setupBridge(server, secret) {
  const wss = new WebSocketServer({ server });
  const validateToken = createTokenValidator(secret);

  wss.on("connection", (ws) => {
    let connTimer = setTimeout(() => {
      console.warn("[WARN] Connection timeout");
      ws.close();
    }, 30000);

    ws.once("message", async (msg) => {
      clearTimeout(connTimer);

      try {
        const id = msg.slice(1, 17);
        if (!validateToken(id)) {
          console.warn("[WARN] Invalid token");
          ws.close();
          return;
        }

        let i = msg.readUInt8(17) + 19;
        const port = msg.readUInt16BE(i);
        i += 2;

        const { host, endIndex } = parseTarget(msg, i);
        if (!host) {
          console.error("[ERROR] Cannot resolve target host");
          ws.close();
          return;
        }
        i = endIndex;

        const payload = msg.slice(i);

        ws.send(HANDSHAKE_OK);
        const wsStream = createWebSocketStream(ws);

        const socket = net.connect({ host, port, ...CONNECTION_CONFIG }, () => {
          socket.write(payload);
        });
        socket.setMaxListeners(5);

        pipeline(wsStream, socket, (err) => {
          if (err && err.code !== 'ECONNRESET' && err.code !== 'ETIMEDOUT') {
            console.error("[ERROR] WS->TCP pipe error:", err.message);
          }
          socket.destroy();
        });

        pipeline(socket, wsStream, (err) => {
          if (err && err.code !== 'ECONNRESET' && err.code !== 'ETIMEDOUT') {
            console.error("[ERROR] TCP->WS pipe error:", err.message);
          }
          ws.close();
        });

        socket.on("error", (err) => {
          console.error("[ERROR] TCP connection error:", err.message);
          ws.close();
        });
      } catch (err) {
        console.error("[ERROR] Message processing error:", err.message);
        ws.close();
      }
    });

    ws.on("close", () => {
      clearTimeout(connTimer);
    });

    ws.on("error", (err) => {
      console.error("[ERROR] WebSocket error:", err.message);
      ws.close();
    });
  });
}

module.exports = { setupBridge };
