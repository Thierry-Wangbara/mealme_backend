// Applies db/schema.sql to the configured database. Run with: npm run migrate
const { Client } = require("pg");
const fs = require("fs");
const path = require("path");
require("dotenv").config();
const { databaseConfig } = require("./databaseConfig");

async function applySchema() {
  const client = new Client(databaseConfig());
  await client.connect();
  const sql = fs.readFileSync(
    path.join(__dirname, "..", "db", "schema.sql"),
    "utf8"
  );
  await client.query(sql);
  console.log("Schema applied.");
  await client.end();
}

(async () => {
  try {
    await applySchema();
    console.log("✅ Migration complete.");
    process.exit(0);
  } catch (e) {
    console.error("Migration failed:", e.message);
    process.exit(1);
  }
})();
