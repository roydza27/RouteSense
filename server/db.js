import Database from "better-sqlite3";

export function initDatabase(dbPath = process.env.DB_PATH || "metrics.db") {
  const db = new Database(dbPath);

  // Enable WAL mode for better concurrent access
  db.pragma("journal_mode = WAL");
  db.pragma("busy_timeout = 5000");


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

  db.exec(`
  CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY
  );
  `);

  let row = db.prepare(`SELECT version FROM schema_version LIMIT 1`).get();

  if (!row) {
    db.prepare(`INSERT INTO schema_version (version) VALUES (1)`).run();
    row = { version: 1 };
  }


  runMigrations(db);
  db.pragma("optimize");

  console.log("✅ Database initialized successfully");
  
  return db;
}

export function cleanOldMetrics(db, daysToKeep = 7) {
  try {
    const stmt = db.prepare(`
      DELETE FROM api_metrics
      WHERE timestamp < datetime('now', '-' || ? || ' days')
    `);

    const result = stmt.run(daysToKeep);

    
    if (result.changes > 0) {
      console.log(`🧹 Cleaned ${result.changes} old metrics (>${daysToKeep} days old)`);
    }
    
    return result.changes;
  } catch (error) {
    console.error("❌ Error cleaning old metrics:", error);
    return 0;
  }
}

function columnExists(db, table, column) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all();
  return columns.some(col => col.name === column);
}

function runMigrations(db) {

  const migrate = db.transaction(() => {

    if (!columnExists(db, "api_metrics", "session_id")) {
      db.exec(`ALTER TABLE api_metrics ADD COLUMN session_id TEXT;`);
      console.log("✅ Added session_id column");
    }

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_session 
      ON api_metrics(session_id);
    `);

    if (!columnExists(db, "api_metrics", "service_name")) {
      db.exec(`ALTER TABLE api_metrics ADD COLUMN service_name TEXT;`);
      console.log("✅ Added service_name column");
    }

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_service 
      ON api_metrics(service_name);
    `);

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_session_timestamp 
      ON api_metrics(session_id, timestamp);
    `);

  });

  migrate(); // run safely
}




export default { initDatabase, cleanOldMetrics };
