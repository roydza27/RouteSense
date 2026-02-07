import Database from "better-sqlite3";

const db = new Database("metrics.db");

try {
  db.exec(`ALTER TABLE api_metrics ADD COLUMN session_id TEXT;`);
  console.log("✅ session_id column added");
} catch (err) {
  if (!err.message.includes("duplicate column")) {
    throw err;
  }
  console.log("👍 session_id already exists");
}

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_session 
  ON api_metrics(session_id);
`);

db.close();
