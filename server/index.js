import express from "express";
import cors from "cors";
import Database from "better-sqlite3";

const app = express();
const db = new Database("metrics.db");

// ============================================
// DATABASE INITIALIZATION
// ============================================
db.exec(`
  CREATE TABLE IF NOT EXISTS api_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    route TEXT NOT NULL,
    method TEXT NOT NULL,
    status INTEGER NOT NULL,
    response_time INTEGER NOT NULL,
    is_error INTEGER NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    source_port INTEGER
  );
  
  CREATE INDEX IF NOT EXISTS idx_route ON api_metrics(route);
  CREATE INDEX IF NOT EXISTS idx_timestamp ON api_metrics(timestamp);
  CREATE INDEX IF NOT EXISTS idx_is_error ON api_metrics(is_error);
`);

console.log("✅ Database initialized with schema");

// ============================================
// MIDDLEWARE
// ============================================
app.use(cors({ 
  origin: "*", 
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], 
  allowedHeaders: ["Content-Type", "Authorization"] 
}));
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ============================================
// IN-MEMORY METRICS CACHE
// ============================================
const metricsCache = {
  recent: [], // Last 100 metrics
  maxSize: 100
};

// ============================================
// UTILITY FUNCTIONS
// ============================================
function isNoiseRoute(route) {
  const noisePatterns = [
    "favicon",
    "/metrics",
    "/api/metrics",
    "/_next",
    "/static",
    "/__",
    ".ico",
    ".png",
    ".jpg",
    ".css",
    ".js"
  ];
  return noisePatterns.some(pattern => route.toLowerCase().includes(pattern));
}

function addToCache(metric) {
  metricsCache.recent.unshift(metric);
  if (metricsCache.recent.length > metricsCache.maxSize) {
    metricsCache.recent.pop();
  }
}

// ============================================
// METRICS COLLECTION ENDPOINT
// ============================================
app.post("/api/metrics", (req, res) => {
  const { route, method, status, responseTime, isError, sourcePort } = req.body;

  const stmt = db.prepare(`
    INSERT INTO api_metrics (route, method, status, response_time, is_error, timestamp, source_port)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    route,
    method,
    status,
    responseTime,
    isError ? 1 : 0,
    new Date().toISOString(),
    sourcePort ?? sourcePort ?? 3001
  );

  console.log(`📥 Stored Metric → ${method} ${route} (${responseTime}ms)`);
  res.json({ ok: true });
});








// ============================================
// DASHBOARD API ENDPOINTS
// ============================================


// Summary statistics
app.get("/api/metrics/summary", (req, res) => {
  const row = db.prepare(`
    SELECT 
      COUNT(*) as totalRequests,
      AVG(response_time) as avgResponseTime,
      SUM(CASE WHEN is_error = 1 THEN 1 ELSE 0 END) as totalErrors
    FROM api_metrics
    WHERE route NOT LIKE '%favicon%'
    AND route NOT LIKE '%/api/metrics%'
  `).get();

  const totalRequests = row.totalRequests ?? 0;
  const avgResponseTime = Math.round(row.avgResponseTime ?? 0);
  const errorRate = totalRequests > 0 ? Number(((row.totalErrors / totalRequests) * 100).toFixed(2)) : 0;

  res.json({
    totalRequests,
    avgResponseTime,
    errorRate
  });
});





// Route-wise analytics (FIXED - No more duplicates!)
app.get("/api/metrics/routes", (req, res) => {
  const timeWindow = Number(req.query.minutes) || 60;

  const rows = db.prepare(`
    SELECT 
      route,
      method,
      COUNT(*) as hits,
      ROUND(AVG(response_time)) as avgTime,
      ROUND(MAX(response_time)) as maxTime,
      ROUND(MIN(response_time)) as minTime,
      SUM(CASE WHEN is_error = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as errorPercent
    FROM api_metrics
    WHERE timestamp >= datetime('now', ?)
    AND route NOT LIKE '%favicon%'
    AND route NOT LIKE '%/api/metrics%'
    GROUP BY route, method
    ORDER BY hits DESC
  `).all(`-${timeWindow} minutes`);

  const formatted = rows.map(r => ({
    id: `${r.method.toLowerCase()}-${r.route.replace(/[^a-zA-Z0-9]/g, "-")}`,
    route: r.route,
    method: r.method,
    hits: r.hits,
    avgTime: r.avgTime,
    maxTime: r.maxTime,
    minTime: r.minTime,
    errorPercent: Number(r.errorPercent.toFixed(2)),
    status: r.avgTime > 500 ? "slow" : "normal",
    isSlow: r.avgTime > 500
  }));

  res.json(formatted);
});


// Latency time series data
app.get("/api/metrics/latency", (req, res) => {
  try {
    const limit = req.query.limit || 50;
    const timeWindow = req.query.minutes || 60;
    
    const latencyData = db.prepare(`
      SELECT 
        strftime('%H:%M:%S', timestamp) as time,
        response_time as latency,
        route,
        method
      FROM api_metrics
      WHERE timestamp >= datetime('now', '-${timeWindow} minutes')
      AND route NOT LIKE '%favicon%'
      AND route NOT LIKE '%/api/metrics%'
      ORDER BY timestamp DESC
      LIMIT ?
    `).all(limit);

    // Reverse to show oldest to newest
    res.json(latencyData.reverse());

  } catch (error) {
    console.error("❌ Error fetching latency:", error);
    res.status(500).json({ error: "Failed to fetch latency data" });
  }
});

// Live logs / Recent requests
app.get("/api/metrics/export", (req, res) => {
  try {
    const rows = db.prepare(
      `SELECT id, route AS endpoint, method, status AS statusCode, response_time AS responseTime, is_error AS isError, timestamp, source_port AS sourcePort FROM api_metrics ORDER BY id DESC LIMIT 25`
    ).all();

    const formatted = rows.map(row => ({
      id: row.id,
      endpoint: row.endpoint,
      method: row.method,
      statusCode: row.statusCode,
      responseTime: row.responseTime,
      isError: Boolean(row.isError),
      timestamp: row.timestamp,   // keep original string, frontend will format time
      sourcePort: row.sourcePort
    }));

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: "Metric export failed" });
  }
});



// Error rate over time
app.get("/api/metrics/errors", (req, res) => {
  try {
    const timeWindow = req.query.minutes || 60;
    
    const errors = db.prepare(`
      SELECT 
        strftime('%H:%M', timestamp) as time,
        COUNT(*) as count,
        route,
        status
      FROM api_metrics
      WHERE is_error = 1
      AND timestamp >= datetime('now', '-${timeWindow} minutes')
      AND route NOT LIKE '%favicon%'
      AND route NOT LIKE '%/api/metrics%'
      GROUP BY strftime('%H:%M', timestamp), route
      ORDER BY timestamp DESC
      LIMIT 50
    `).all();

    res.json(errors);

  } catch (error) {
    console.error("❌ Error fetching error data:", error);
    res.status(500).json({ error: "Failed to fetch error data" });
  }
});

// Clear all metrics (for testing)
app.delete("/api/metrics/clear", (req, res) => {
  try {
    db.prepare("DELETE FROM api_metrics").run();
    metricsCache.recent = [];
    res.json({ 
      status: "success", 
      message: "All metrics cleared" 
    });
  } catch (error) {
    console.error("❌ Error clearing metrics:", error);
    res.status(500).json({ error: "Failed to clear metrics" });
  }
});

// Database statistics
app.get("/api/metrics/stats", (req, res) => {
  try {
    const stats = db.prepare(`
      SELECT 
        COUNT(*) as totalRecords,
        COUNT(DISTINCT route) as uniqueRoutes,
        MIN(timestamp) as oldestRecord,
        MAX(timestamp) as newestRecord
      FROM api_metrics
    `).get();

    res.json(stats);

  } catch (error) {
    console.error("❌ Error fetching stats:", error);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

// Health check
app.get("/health", (req, res) => {
  res.json({ 
    status: "ok", 
    service: "metrics-collector",
    timestamp: new Date().toISOString(),
    database: "connected",
    cacheSize: metricsCache.recent.length
  });
});

// ============================================
// SERVER START
// ============================================

const PORT = 3002;
app.listen(PORT, () => {
  console.log("\n🚀 ===========================================");
  console.log(`📊 Metrics Collector Server Started`);
  console.log(`🌐 Running on: http://localhost:${PORT}`);
  console.log(`💾 Database: metrics.db`);
  console.log(`📡 Listening for metrics on: POST /api/metrics/forward`);
  console.log(`📡 Metrics Collector running on: http://localhost:3002`);
  console.log(`📤 Accepting metrics on: POST /api/metrics`);

  console.log("===========================================\n");
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n👋 Shutting down gracefully...");
  db.close();
  process.exit(0);
});