import express from "express";
import axios from "axios";
import cors from "cors";

const app = express();

// ============================================
// CONFIGURATION
// ============================================
const TARGET_PORT = 3001;

const CONFIG = {
  PROXY_PORT: 4001,              // Port this proxy runs on 
  TARGET_PORT: TARGET_PORT,          // Backend port you want to monitor (RepoSense)
  METRICS_COLLECTOR_URL: "http://localhost:3002/api/metrics/forward",
  TIMEOUT: 30000                 // 30 second timeout
};

console.log("\n🔧 Proxy Configuration:");
console.log(`   Proxy Port: ${CONFIG.PROXY_PORT}`);
console.log(`   Target Backend: http://localhost:${TARGET_PORT}`);
console.log(`   Instead of: http://localhost:${TARGET_PORT}/your-endpoint`);

// ============================================
// MIDDLEWARE
// ============================================
app.use(cors({ origin: "*" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Raw body for binary data
app.use(express.raw({ type: "*/*", limit: "50mb" }));

// ============================================
// PROXY MIDDLEWARE
// ============================================
app.use(async (req, res) => {
  const start = Date.now();
  const targetUrl = `http://localhost:${TARGET_PORT}${req.url}`;


  
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} → ${targetUrl}`);

  try {
    // Forward the request to target backend
    const response = await axios({
      method: req.method,
      url: targetUrl,
      data: req.body,
      headers: {
        ...req.headers,
        host: `localhost:${CONFIG.TARGET_PORT}` // Update host header
      },
      timeout: CONFIG.TIMEOUT,
      validateStatus: () => true, // Accept all status codes
      maxRedirects: 5,
      responseType: "arraybuffer" // Handle binary responses
    });

    const responseTime = Date.now() - start;
    const isError = response.status >= 400;

    // Log metric
    console.log(`   ✓ ${response.status} in ${responseTime}ms`);

    // Send metrics to collector (non-blocking)
    const info = stmt.run(
      route,                 // use request field directly
      method,
      status,
      responseTime,          // FIX: correct variable
      isError ? 1 : 0,       // FIX: normalize
      sourcePort || null     // FIX: correct variable
    );




    // Forward response back to client
    res.status(response.status);
    
    // Copy response headers
    Object.entries(response.headers).forEach(([key, value]) => {
      if (key !== "content-encoding") { // Skip encoding headers
        res.set(key, value);
      }
    });
    console.log(`   ✓ ${status} in ${responseTime}ms`);
    res.send(response.data);

  } catch (error) {
    const responseTime = Date.now() - start;
    const status = error.response?.status || 500;
    const isError = true;

    console.log(`   ✗ ERROR ${status} in ${responseTime}ms: ${error.message}`);

    // Send error metric
    sendMetricAsync({
      route: req.url,
      method: req.method,
      status: response.status,
      response_time: responseTime, // FIX field name
      is_error: isError ? 1 : 0,   // match DB schema
      source_port: TARGET_PORT
    });


    // Handle different error types
    if (error.code === "ECONNREFUSED") {
      return res.status(503).json({
        error: "Target backend is not running",
        message: `Cannot connect to http://localhost:${CONFIG.TARGET_PORT}`,
        tip: "Make sure your backend server is running on the correct port"
      });
    }

    if (error.code === "ETIMEDOUT") {
      return res.status(504).json({
        error: "Gateway timeout",
        message: "Target backend took too long to respond"
      });
    }

    // Generic error response
    res.status(status).json({
      error: error.message || "Proxy error",
      status: status,
      path: req.url
    });
  }
});

// ============================================
// ASYNC METRIC SENDER (NON-BLOCKING)
// ============================================
async function sendMetricAsync(metric) {
  try {
    await axios.post(CONFIG.METRICS_COLLECTOR_URL, metric, {
      timeout: 2000, // Quick timeout to not block proxy
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    // Silently fail - don't block proxy if collector is down
    console.error(`   ⚠️  Metric not sent: ${error.message}`);
  }
}

// ============================================
// SERVER START
// ============================================
app.listen(CONFIG.PROXY_PORT, () => {
  console.log("🚀 ===========================================");
  console.log(`🔀 Proxy Server Started`);
  console.log(`🌐 Listening on: http://localhost:${CONFIG.PROXY_PORT}`);
  console.log(`🎯 Forwarding to: http://localhost:${TARGET_PORT}`);
  console.log(`📊 Metrics sent to: ${CONFIG.METRICS_COLLECTOR_URL}`);
  console.log("===========================================\n");
  console.log("💡 How to use:");
  console.log(`   Instead of: http://localhost:${CONFIG.TARGET_PORT}/your-endpoint`);
  console.log(`   Use:        http://localhost:${CONFIG.PROXY_PORT}/your-endpoint`);
  console.log("\n");
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n👋 Proxy shutting down...");
  process.exit(0);
});