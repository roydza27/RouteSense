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
app.post("/api/metrics/forward", async (req, res) => {
  try {
    const { route, method, status, responseTime, isError, sourcePort } = req.body;
    
    // Validate required fields
    if (!route || !method || status === undefined || responseTime === undefined) {
      return res.status(400).json({ 
        error: "Missing required fields: route, method, status, responseTime" 
      });
    }

    const metric = {
      route,
      method,
      status,
      responseTime: parseInt(responseTime),
      isError: isError ? 1 : 0,
      sourcePort: sourcePort || null,
      timestamp: new Date().toISOString()
    };


    // Skip noise routes
    if (isNoiseRoute(route)) {
      return res.json({ status: "ignored", reason: "noise route" });
    }

    // Add to cache
    addToCache(metric);

    // Insert into database
    const stmt = db.prepare(`
      INSERT INTO api_metrics (route, method, status, response_time, is_error, source_port) 
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    const info = stmt.run(
      metric.route,
      metric.method,
      metric.status,
      metric.responseTime,   // ✅ correct key
      metric.isError,
      metric.sourcePort      // ✅ correct key
    );

    res.json({ 
      status: "success", 
      id: info.lastInsertRowid,
      message: "Metric recorded"
    });

  } catch (error) {
    console.error("❌ Error recording metric:", error);
    res.status(500).json({ error: "Failed to record metric" });
  }
});

// ============================================
// DASHBOARD API ENDPOINTS
// ============================================

// Summary statistics
app.get("/api/metrics/summary", (req, res) => {
  try {
    const timeWindow = req.query.minutes || 60; // Default: last 60 minutes
    
    const summary = db.prepare(`
      SELECT 
        COUNT(*) as totalRequests,
        AVG(response_time) as avgResponseTime,
        SUM(CASE WHEN is_error = 1 THEN 1 ELSE 0 END) as totalErrors
      FROM api_metrics
      WHERE timestamp >= datetime('now', '-${timeWindow} minutes')
      AND route NOT LIKE '%favicon%'
      AND route NOT LIKE '%/api/metrics%'
    `).get();

    const errorRate = summary.totalRequests > 0 
      ? ((summary.totalErrors / summary.totalRequests) * 100).toFixed(2)
      : 0;

    res.json({
      totalRequests: summary.totalRequests || 0,
      avgResponseTime: Math.round(summary.avgResponseTime || 0),
      errorRate: parseFloat(errorRate),
      timeWindow: `${timeWindow} minutes`
    });

  } catch (error) {
    console.error("❌ Error fetching summary:", error);
    res.status(500).json({ error: "Failed to fetch summary" });
  }
});

// Route-wise analytics (FIXED - No more duplicates!)
app.get("/api/metrics/routes", (req, res) => {
  try {
    const timeWindow = req.query.minutes || 60;
    
    const routes = db.prepare(`
      SELECT 
        route,
        method,
        COUNT(*) as hits,
        AVG(response_time) as avgTime,
        MAX(response_time) as maxTime,
        MIN(response_time) as minTime,
        SUM(CASE WHEN is_error = 1 THEN 1 ELSE 0 END) as errors
      FROM api_metrics
      WHERE timestamp >= datetime('now', '-${timeWindow} minutes')
      AND route NOT LIKE '%favicon%'
      AND route NOT LIKE '%/api/metrics%'
      GROUP BY route, method
      ORDER BY hits DESC
    `).all();

    // ✅ FIX: Create truly unique IDs by combining route + method
    const formatted = routes.map(r => {
      const avgTime = Math.round(r.avgTime);
      const errorPercent = r.hits > 0 ? ((r.errors / r.hits) * 100).toFixed(2) : 0;
      
      // Use route + method as unique identifier
      const uniqueId = `${r.method.toLowerCase()}-${r.route.replace(/[^a-zA-Z0-9]/g, '-')}`;
      
      return {
        id: uniqueId,  // ✅ Truly unique ID
        route: r.route,
        method: r.method,
        hits: r.hits,
        avgTime: avgTime,
        maxTime: Math.round(r.maxTime),
        minTime: Math.round(r.minTime),
        errorPercent: parseFloat(errorPercent),
        status: avgTime > 500 ? "slow" : "normal",
        isSlow: avgTime > 500
      };
    });

    res.json(formatted);

  } catch (error) {
    console.error("❌ Error fetching routes:", error);
    res.status(500).json({ error: "Failed to fetch routes" });
  }
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
    const limit = req.query.limit || 100;
    
    const logs = db.prepare(`
      SELECT 
        id,
        route as endpoint,
        method,
        status as statusCode,
        response_time as responseTime,
        is_error as isError,
        timestamp,
        source_port as sourcePort
      FROM api_metrics
      WHERE route NOT LIKE '%favicon%'
      AND route NOT LIKE '%/api/metrics%'
      ORDER BY timestamp DESC
      LIMIT ?
    `).all(limit);


    res.json(logs);

  } catch (error) {
    console.error("❌ Error fetching logs:", error);
    res.status(500).json({ error: "Failed to fetch logs" });
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
  console.log("===========================================\n");
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n👋 Shutting down gracefully...");
  db.close();
  process.exit(0);
});