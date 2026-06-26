const { TextDecoder } = require("util");
const decoder = new TextDecoder();

function createTokenValidator(token) {
  const tokenBytes = Buffer.from(token.replace(/-/g, ""), "hex");
  return (id) => id.equals(tokenBytes);
}

function parseTarget(msg, startIndex) {
  const ATYP = msg[startIndex];
  let host = null;
  let endIndex = startIndex;

  switch (ATYP) {
    case 1:
      host = msg.slice(startIndex + 1, startIndex + 5).join(".");
      endIndex = startIndex + 5;
      break;
    case 2:
      const len = msg[startIndex + 1];
      host = decoder.decode(msg.slice(startIndex + 2, startIndex + 2 + len));
      endIndex = startIndex + 2 + len;
      break;
    case 3:
      const bytes = msg.slice(startIndex + 1, startIndex + 17);
      host = Array.from(bytes)
        .map((b, i) => (i % 2 === 0) ? b.toString(16).padStart(2, "0") + bytes[i + 1].toString(16).padStart(2, "0") : "")
        .filter(s => s !== "")
        .join(":");
      endIndex = startIndex + 17;
      break;
    default:
      console.error("[ERROR] Invalid address type");
      return { host: null, endIndex: startIndex };
  }

  return { host, endIndex };
}

module.exports = { createTokenValidator, parseTarget };
