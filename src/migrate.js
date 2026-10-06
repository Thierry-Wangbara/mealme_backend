// Creates the "mealme" database if it doesn't exist, then applies db/schema.sql.
// Run with:  npm run migrate
const { Client } = require("pg");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const cfg = {
  host: process.env.PGHOST || "localhost",
  port: Number(process.env.PGPORT) || 5432,
  user: process.env.PGUSER || "postgres",
  password: process.env.PGPASSWORD,
};
const dbName = process.env.PGDATABASE || "mealme";

async function ensureDatabase() {
  const client = new Client({ ...cfg, database: "postgres" });
  await client.connect();
  const { rowCount } = await client.query(
    "SELECT 1 FROM pg_database WHERE datname = $1",
    [dbName]
  );
  if (rowCount === 0) {
    await client.query(`CREATE DATABASE ${dbName}`);
    console.log(`Created database "${dbName}".`);
  } else {
    console.log(`Database "${dbName}" already exists.`);
  }
  await client.end();
}

async function applySchema() {
  const client = new Client({ ...cfg, database: dbName });
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
    await ensureDatabase();
    await applySchema();
    console.log("✅ Migration complete.");
    process.exit(0);
  } catch (e) {
    console.error("Migration failed:", e.message);
    process.exit(1);
  }
})();
