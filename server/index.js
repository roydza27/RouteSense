import express from "express";
import { Server } from "socket.io";
import http from "http";
import cors from "cors";
import { initDatabase } from "./db.js"; 

const app = express();
const db = initDatabase();

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

io.on("connection", (socket) => {

  console.log("Client connected:", socket.id);

  socket.on("join_service", (service) => {
    socket.join(service);
    console.log(`Socket ${socket.id} joined ${service}`);
  });

  socket.on("leave_service", (service) => {
    socket.leave(service);
    console.log(`Socket ${socket.id} left ${service}`);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });

});





const insertMetric = db.prepare(`
 INSERT INTO api_metrics 
 (route, method, status, response_time, is_error, source_port, service_name)
 VALUES (?, ?, ?, ?, ?, ?, ?)
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
// METRICS COLLECTION ENDPOINT
// ============================================
app.post("/api/metrics", (req, res) => {
  try {
    const { route, method, status, responseTime, isError, sourcePort, service } = req.body;

    const serviceName = service || `port-${sourcePort}` || "unknown";


    // ✅ FIRST — block dashboard traffic
    if (route.startsWith("/api/metrics") || route.startsWith("/health")) {
      return res.json({ ok: true });
    }

    if (req.headers["x-observe-ignore"]) return res.json({ ok: true });


    // ✅ validate payload
    if (
      typeof route !== "string" ||
      typeof method !== "string" ||
      typeof status !== "number" ||
      status < 100 || status > 599 ||
      typeof responseTime !== "number" ||
      responseTime < 0
    ) {
      return res.status(400).json({ ok: false, error: "Invalid payload" });
    }

    // ✅ SECOND — persist (SOURCE OF TRUTH)
    insertMetric.run(
      route,
      method.toUpperCase(),
      status,
      responseTime,
      isError ? 1 : 0,
      sourcePort ?? null,
      serviceName
    );

    

    // ✅ THIRD — broadcast
    io.to(serviceName).emit("new_metric", {
      route,
      method,
      status,
      responseTime,
      isError,
      sourcePort,
      service: serviceName
    });



    res.json({ ok: true });

  } catch (err) {
    console.error("Metric insert failed:", err);
    res.status(500).json({ ok: false });
  }
});






// ============================================
// DASHBOARD API ENDPOINTS
// ============================================


// Summary statistics
app.get("/api/metrics/summary", (req, res) => {

  const service = req.query.service ?? null;

  const row = db.prepare(`
    SELECT 
      COUNT(*) as totalRequests,
      AVG(response_time) as avgResponseTime,
      SUM(CASE WHEN is_error = 1 THEN 1 ELSE 0 END) as totalErrors
    FROM api_metrics
    WHERE route NOT LIKE '%favicon%'
    AND route NOT LIKE '%/api/metrics%'
    AND (? IS NULL OR service_name= ?)
  `).get(service, service);

  const totalRequests = row.totalRequests ?? 0;
  const avgResponseTime = Math.round(row.avgResponseTime ?? 0);
  const errorRate = totalRequests > 0
    ? Number(((row.totalErrors / totalRequests) * 100).toFixed(2))
    : 0;

  res.json({
    totalRequests,
    avgResponseTime,
    errorRate
  });
});

app.get("/api/services", (req, res) => {

  const rows = db.prepare(`
    SELECT service_name as service, COUNT(*) as requests
    FROM api_metrics
    GROUP BY service_name
    ORDER BY requests DESC;
  `).all();

  res.json(rows.map(r => r.service));
});







// Route-wise analytics (FIXED - No more duplicates!)
app.get("/api/metrics/routes", (req, res) => {

  const timeWindow = Number(req.query.minutes) || 60;
  const service = req.query.service ?? null;

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
    WHERE timestamp >= datetime('now', '-' || ? || ' minutes')
    AND route NOT LIKE '%favicon%'
    AND route NOT LIKE '%/api/metrics%'
    AND (? IS NULL OR service_name= ?)
    GROUP BY route, method
    ORDER BY hits DESC
  `).all(timeWindow, service, service);

  res.json(rows);
});




// Latency time series data
app.get("/api/metrics/latency", (req, res) => {

  const limit = Number(req.query.limit) || 50;
  const timeWindow = Number(req.query.minutes) || 60;
  const service = req.query.service ?? null;

  const latencyData = db.prepare(`
    SELECT 
      strftime('%H:%M:%S', timestamp) as time,
      response_time as latency,
      route,
      method
    FROM api_metrics
    WHERE timestamp >= datetime('now', '-' || ? || ' minutes')
    AND (? IS NULL OR service_name= ?)
    ORDER BY timestamp DESC
    LIMIT ?
  `).all(timeWindow, service, service, limit);

  res.json(latencyData.reverse());
});



// Live logs / Recent requests
app.get("/api/metrics/export", (req, res) => {

  try {

    const limit = Number(req.query.limit) || 15;
    const service = req.query.service ?? null; // ⭐ REQUIRED

    const rows = db.prepare(`
      SELECT id, route, method, status, response_time, is_error, timestamp, source_port
      FROM api_metrics
      WHERE (? IS NULL OR service_name= ?)
      ORDER BY id DESC
      LIMIT ?
    `).all(service, service, limit);

    res.json(rows);

  } catch {
    res.status(500).json([]);
  }
});




// Error rate over time
app.get("/api/metrics/errors", (req, res) => {

  const timeWindow = Number(req.query.minutes) || 60;
  const service = req.query.service ?? null;

  const errors = db.prepare(`
    SELECT 
      strftime('%H:%M', timestamp) as time,
      COUNT(*) as count,
      route,
      status
    FROM api_metrics
    WHERE is_error = 1
    AND timestamp >= datetime('now', '-' || ? || ' minutes')
    AND (? IS NULL OR service_name= ?)
    GROUP BY strftime('%H:%M', timestamp), route
    ORDER BY timestamp DESC
    LIMIT 50
  `).all(timeWindow, service, service);

  res.json(errors);
});



// Clear all metrics (for testing)
app.delete("/api/metrics/clear/:service", (req, res) => {

  const service = req.params.service;

  db.prepare(`
    DELETE FROM api_metrics
    WHERE service_name= ?
  `).run(service);

  res.json({
    status: "success",
    cleared: service
  });
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
    database: "connected"
  });
});



// ============================================
// SERVER START
// ============================================

const PORT = 3002;
server.listen(PORT, () => {
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