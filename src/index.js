// MealMe REST API server.
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
require("dotenv").config();

const { authenticate } = require("./middleware/auth");

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

// Public health check (no auth) — handy to confirm the server is up.
app.get("/health", (req, res) => res.json({ ok: true, service: "mealme-api" }));

// Everything under /api requires a valid Firebase token.
app.use("/api", authenticate);
app.use("/api/profile", require("./routes/profile"));
app.use("/api/recipes", require("./routes/recipes"));
app.use("/api/plan", require("./routes/plan"));
app.use("/api/pantry", require("./routes/pantry"));
app.use("/api/favorites", require("./routes/favorites"));
app.use("/api/reminders", require("./routes/reminders"));
app.use("/api/ai", require("./routes/ai"));
app.use("/api/admin", require("./routes/admin"));

// Fallback error handler.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error." });
});

const PORT = Number(process.env.PORT) || 4000;
app.listen(PORT, () => {
  console.log(`MealMe API listening on http://localhost:${PORT}`);
});
