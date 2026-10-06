// Shared PostgreSQL configuration.
// Prefer DATABASE_URL for managed providers such as Neon. Individual PG*
// variables remain supported for local PostgreSQL development.
function databaseConfig() {
  const connectionString = process.env.DATABASE_URL;

  if (connectionString) {
    return {
      connectionString,
      // Neon requires TLS. Its certificate is managed by the provider, so pg
      // must not require a locally installed CA certificate.
      ssl: { rejectUnauthorized: false },
    };
  }

  return {
    host: process.env.PGHOST || "localhost",
    port: Number(process.env.PGPORT) || 5432,
    user: process.env.PGUSER || "postgres",
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE || "mealme",
  };
}

module.exports = { databaseConfig };
