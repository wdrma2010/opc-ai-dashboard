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

        console.log("[DEBUG] Ver:", msg[0], "UUID:", id.toString("hex"), "AddonLen:", msg[17]);
        if (msg[17] > 0) {
          console.log("[DEBUG] Addon data:", msg.slice(18, 18 + msg[17]).toString("hex"));
        }
        console.log("[DEBUG] Bytes 18-25:", msg.slice(18, 26).toString("hex"));
        console.log("[DEBUG] Byte 18 (cmd?):", msg[18], "Bytes 19-20 (port?):", msg.readUInt16BE(19), "Byte 21 (ATYP?):", msg[21]);
        console.log("[DEBUG] Byte 19 (port hi?):", msg[19], "Byte 20 (port lo?):", msg[20]);

        let i = msg.readUInt8(17) + 19;
        const port = msg.readUInt16BE(i);
        i += 2;

        console.log("[DEBUG] Using offset:", msg.readUInt8(17) + 19, "Port:", port, "ATYP from byte", i, "=", msg[i]);

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
        socket.setMaxListeners(20);

        pipeline(wsStream, socket, (err) => {
          if (err && err.code !== 'ECONNRESET' && err.code !== 'ETIMEDOUT' && err.code !== 'ERR_STREAM_PREMATURE_CLOSE') {
            console.error("[ERROR] WS->TCP pipe error:", err.message);
          }
          socket.destroy();
        });

        pipeline(socket, wsStream, (err) => {
          if (err && err.code !== 'ECONNRESET' && err.code !== 'ETIMEDOUT' && err.code !== 'ERR_STREAM_PREMATURE_CLOSE') {
            console.error("[ERROR] TCP->WS pipe error:", err.message);
          }
          ws.close();
        });

        socket.on("error", (err) => {
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
