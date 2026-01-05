import express from "express";
import Database from "better-sqlite3";
import cors from "cors";

const app = express();
app.use(express.json());
app.use(cors());

// Init SQLite
const db = new Database("metrics.db");

// Create table if not exists
db.prepare(`
  CREATE TABLE IF NOT EXISTS metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    route TEXT,
    method TEXT,
    status INTEGER,
    responseTime INTEGER,
    isError INTEGER,
    sourcePort INTEGER,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`).run();

// Insert metrics endpoint
app.post("/api/metrics", (req, res) => {
  const { route, method, status, responseTime, isError, sourcePort } = req.body;

  const stmt = db.prepare(`
    INSERT INTO metrics (route, method, status, responseTime, isError, sourcePort, sourcePort)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    route,
    method,
    status,
    responseTime,
    isError ? 1 : 0,
    sourcePort,
    Date.now()
  );

  res.json({ ok: true });
});

// Summary stats
app.get("/api/metrics/summary", (req, res) => {
  const rows = db.prepare(`SELECT * FROM metrics`).all();
  const total = rows.length;
  const errors = rows.filter(r => r.isError === 1).length;
  const avg = db.prepare(`SELECT AVG(responseTime) as a FROM metrics`).get().a || 0;

  res.json({
    totalRequests: total,
    avgResponseTime: Math.round(avg),
    errorRate: total ? (errors / total) * 100 : 0
  });
});

// Unique route+method grouping
app.get("/api/metrics/routes", (req, res) => {
  const stats = db.prepare(`
    SELECT route, method,
      COUNT(*) as hits,
      AVG(responseTime) as avgTime,
      SUM(isError) * 100.0 / COUNT(*) as errorPercent
    FROM metrics
    GROUP BY route, method
  `).all().map(r => ({
    id: `${r.method}-${r.route}`,
    route: r.route,
    method: r.method,
    hits: r.hits,
    avgTime: Math.round(r.avgTime),
    errorPercent: parseFloat(r.errorPercent.toFixed(2)),
    isSlow: r.avgTime > 500,
    status: r.avgTime > 500 ? "slow" : "normal"
  }));

  res.json(stats);
});

// Latest 25 logs
app.get("/api/metrics/export", (req, res) => {
  const limit = 25;
  const rows = db.prepare(`
    SELECT * FROM metrics
    ORDER BY id DESC
    LIMIT ?
  `).all(limit);

  res.json(rows);
});

// Last 20 latency points
app.get("/api/metrics/latency", (req, res) => {
  const limit = 20;
  const rows = db.prepare(`
    SELECT strftime('%H:%M:%S', timestamp) as time, responseTime as latency
    FROM metrics
    ORDER BY id DESC
    LIMIT ?
  `).all(limit).map(r => ({
    time: r.time,
    latency: r.latency
  }));

  res.json(rows);
});

// Start collector
const PORT = 3002;
app.listen(PORT, () => {
  console.log(`📡 Metrics collector running on port ${PORT}`);
});
