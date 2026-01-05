import Database from "better-sqlite3";

export function initDatabase(dbPath = "metrics.db") {
  const db = new Database(dbPath);

  // Enable WAL mode for better concurrent access
  db.pragma("journal_mode = WAL");

  // Create tables
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
    CREATE INDEX IF NOT EXISTS idx_method ON api_metrics(method);
  `);

  console.log("✅ Database initialized successfully");
  
  return db;
}

export function cleanOldMetrics(db, daysToKeep = 7) {
  try {
    const result = db.prepare(`
      DELETE FROM api_metrics 
      WHERE timestamp < datetime('now', '-${daysToKeep} days')
    `).run();
    
    if (result.changes > 0) {
      console.log(`🧹 Cleaned ${result.changes} old metrics (>${daysToKeep} days old)`);
    }
    
    return result.changes;
  } catch (error) {
    console.error("❌ Error cleaning old metrics:", error);
    return 0;
  }
}

export default { initDatabase, cleanOldMetrics };