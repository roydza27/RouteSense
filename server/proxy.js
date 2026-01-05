import express from "express";
import axios from "axios";
import cors from "cors";

const app = express();

// ============================================
// CONFIGURATION
// ============================================
const CONFIG = {
  PROXY_PORT: 4001,
  TARGET_PORT: 3001,
  METRICS_COLLECTOR_URL: "http://localhost:3002/api/metrics", // ✅ correct
  TIMEOUT: 30000
};


console.log("\n🔧 Proxy Configuration:");
console.log(`   Proxy Port: http://localhost:${CONFIG.PROXY_PORT}`);
console.log(`   Target Backend: http://localhost:${CONFIG.TARGET_PORT}`);
console.log(`   Metrics Collector: ${CONFIG.METRICS_COLLECTOR_URL}\n`);

// ============================================
// MIDDLEWARE
// ============================================
app.use(cors({ origin: "*" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.raw({ type: "*/*", limit: "50mb" }));

// ============================================
// PROXY + SNIFF + FORWARD
// ============================================
app.use(async (req, res) => {
  const start = Date.now();
  const targetUrl = `http://localhost:${CONFIG.TARGET_PORT}${req.url}`;

  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);

  try {
    const response = await axios({
      method: req.method,
      url: targetUrl,
      data: req.body,
      headers: req.headers,
      timeout: CONFIG.TIMEOUT,
      validateStatus: () => true,
      responseType: "json" // ✅ force JSON, no downloads
    });


    const responseTime = Date.now() - start;
    const isError = response.status >= 400;

    console.log(`   ✔ Status ${response.status} — ${responseTime}ms`);

    // Forward metric to collector (real DB feed)
    sendMetricAsync({
      route: req.url,
      method: req.method,
      status: response.status,
      response_time: responseTime,  // 👈 FIXED
      is_error: isError ? 1 : 0,    // 👈 FIXED
      source_port: CONFIG.TARGET_PORT
    });



    res.status(response.status);
    res.send(response.data);

  } catch (error) {
    const responseTime = Date.now() - start;
    const status = error.response?.status || 500;

    console.log(`   ❌ Proxy Error ${status} — ${responseTime}ms`);

    sendMetricAsync({
      route: req.path,
      method: req.method,
      status: status,
      response_time: responseTime,
      is_error: 1,
      source_port: CONFIG.PROXY_PORT
    });


    res.status(503).json({
      error: "Target backend unreachable",
      message: error.message
    });
  }
});

// ============================================
// METRIC FORWARDER (REAL DATA)
// ============================================
async function sendMetricAsync(metric) {
  try {
    await axios.post(CONFIG.METRICS_COLLECTOR_URL, metric);
    console.log(`   📤 Metric forwarded`);
  } catch(e) {
    console.error(`   ⚠️ Metric send failed`);
  }
}

// ============================================
// SERVER START
// ============================================
app.listen(CONFIG.PROXY_PORT, () => {
  console.log("🔀 Proxy running and sniffing metrics\n");
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n👋 Proxy shutting down...");
  process.exit(0);
});
