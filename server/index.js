import express from "express";
import cors from "cors";
import Database from "better-sqlite3";

const app = express();
const db = new Database("metrics.db");

// Middlewares
app.use(cors({ origin: "*", methods: ["GET","POST","PUT","DELETE","OPTIONS"], allowedHeaders: ["Content-Type"] }));
app.use(express.json());

// Store metrics in memory
const metrics = [];

// Capture all API traffic
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const responseTime = Date.now() - start;
    const isError = res.statusCode >= 400;

    const metric = {
      id: metrics.length + 1,
      route: req.path,
      method: req.method,
      status: res.statusCode,
      responseTime,
      isError
    };

    metrics.push(metric);

    // Insert into DB
    try {
      db.prepare(`INSERT INTO api_metrics (route, method, status, response_time, is_error) VALUES (?,?,?,?,?)`)
        .run(metric.route, metric.method, metric.status, metric.responseTime, metric.isError ? 1 : 0);
    } catch (err) {
      console.error("DB insert failed:", err.message);
    }
  });
  next();
});

// Summary endpoint (your frontend needs this)
app.get("/api/metrics/summary", (req, res) => {
  const total = metrics.length;
  const errors = metrics.filter(m => m.isError).length;
  const avg = metrics.reduce((a,b) => a + b.responseTime, 0) / (total || 1);

  res.json({
    totalRequests: total,
    avgResponseTime: avg,
    errorRate: total ? (errors/total)*100 : 0
  });
});

// Latency endpoint (convert to chart-friendly structure)
app.get("/api/metrics/latency", (req, res) => {
  const result = metrics
    .filter(m => !m.route.includes("favicon"))
    .map(m => ({
      time: new Date().toLocaleTimeString(),
      latency: m.responseTime
    }));

  res.json(result);
});

// Grouped route analytics (match TSX table!)
app.get("/api/metrics/routes", (req, res) => {
  const grouped = {};
  metrics.forEach(m => {
    if (!grouped[m.route]) grouped[m.route] = { hits: 0, errors: 0, totalTime: 0, method: m.method };
    grouped[m.route].hits++;
    grouped[m.route].totalTime += m.responseTime;
    if (m.isError) grouped[m.route].errors++;
  });

  const result = Object.entries(grouped).map(([route, d]) => ({
    id: Date.now().toString(), // TSX expects string
    route,
    method: d.method,
    hits: d.hits,
    avgTime: d.totalTime / d.hits,
    errorPercent: (d.errors/d.hits)*100,
    status: (d.totalTime/d.hits) > 500 ? "slow" : "normal",
    isSlow: (d.totalTime/d.hits) > 500
  }));

  res.json(result);
});

// Raw logs endpoint (frontend LiveLogs)
app.get("/api/metrics/export", (req, res) => {
  res.json(metrics);
});

// Traffic generators
app.get("/api/test/fast", (req, res) => res.send("OK"));
app.get("/api/test/slow", (req, res) => setTimeout(() => res.send("Slow"), 900));
app.get("/api/test/error", (req, res) => res.status(500).send("Fail"));

// Start server on 3002
app.listen(3002, () => console.log("Server running on port 3002"));
