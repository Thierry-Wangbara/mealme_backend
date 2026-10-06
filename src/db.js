// PostgreSQL connection pool. Every query in the app goes through here.
const { Pool } = require("pg");
require("dotenv").config();
const { databaseConfig } = require("./databaseConfig");

const pool = new Pool({
  ...databaseConfig(),
  max: 10,
});

pool.on("error", (err) => {
  console.error("Unexpected PostgreSQL error:", err.message);
});

// Small helper so route files can just call query(sql, params).
async function query(text, params) {
  return pool.query(text, params);
}

module.exports = { pool, query };
