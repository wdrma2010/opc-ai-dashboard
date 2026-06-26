const os = require("os");

function startMemoryMonitor(thresholdMB = 512) {
  const interval = setInterval(() => {
    const used = process.memoryUsage().heapUsed / 1024 / 1024;
    if (used > thresholdMB) {
      console.warn(`[WARN] Memory usage ${used.toFixed(2)}MB exceeds ${thresholdMB}MB, restarting...`);
      process.exit(0);
    }
  }, 30000);
  interval.unref();
}

module.exports = { startMemoryMonitor };
