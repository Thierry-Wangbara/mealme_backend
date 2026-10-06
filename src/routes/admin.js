// /api/admin — admin-only moderation & user management.
// Every route here first checks the caller is the administrator (by email).
const router = require("express").Router();
const { query } = require("../db");

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "mbi@gmail.com").toLowerCase();

// Guard: only the administrator may use these routes.
function requireAdmin(req, res, next) {
  if ((req.userEmail || "").toLowerCase() !== ADMIN_EMAIL) {
    return res.status(403).json({ error: "Admins only." });
  }
  next();
}
router.use(requireAdmin);

// GET /api/admin/stats -> headline numbers for the dashboard.
router.get("/stats", async (req, res, next) => {
  try {
    const users = await query("SELECT COUNT(*)::int AS n FROM users");
    const custom = await query(
      "SELECT COUNT(*)::int AS n FROM recipes WHERE is_custom = true"
    );
    const pending = await query(
      "SELECT COUNT(*)::int AS n FROM recipes WHERE status = 'pending'"
    );
    const disabled = await query(
      "SELECT COUNT(*)::int AS n FROM users WHERE disabled = true"
    );
    res.json({
      users: users.rows[0].n,
      customRecipes: custom.rows[0].n,
      pending: pending.rows[0].n,
      disabledUsers: disabled.rows[0].n,
    });
  } catch (e) {
    next(e);
  }
});

// GET /api/admin/users -> all accounts (newest first).
router.get("/users", async (req, res, next) => {
  try {
    const r = await query(
      `SELECT u.uid, u.email, u.name, u.created_at, u.disabled,
              (SELECT COUNT(*)::int FROM recipes rc WHERE rc.owner_uid = u.uid) AS recipes
       FROM users u
       ORDER BY u.created_at DESC`
    );
    res.json({ users: r.rows, adminEmail: ADMIN_EMAIL });
  } catch (e) {
    next(e);
  }
});

// POST /api/admin/users/:uid/disabled  body { disabled: bool }
router.post("/users/:uid/disabled", async (req, res, next) => {
  try {
    const disabled = Boolean(req.body && req.body.disabled);
    const target = await query("SELECT email FROM users WHERE uid = $1", [
      req.params.uid,
    ]);
    if (
      target.rows[0] &&
      (target.rows[0].email || "").toLowerCase() === ADMIN_EMAIL
    ) {
      return res
        .status(400)
        .json({ error: "You cannot disable the admin account." });
    }
    await query("UPDATE users SET disabled = $2 WHERE uid = $1", [
      req.params.uid,
      disabled,
    ]);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// GET /api/admin/recipes?status=pending|approved|rejected|all
router.get("/recipes", async (req, res, next) => {
  try {
    const status = req.query.status || "pending";
    const params = [];
    let where = "r.is_custom = true";
    if (status !== "all") {
      params.push(status);
      where += ` AND r.status = $${params.length}`;
    }
    const r = await query(
      `SELECT r.id, r.title, r.cuisine, r.calories, r.cost_estimate_fcfa,
              r.cook_time_minutes, r.description, r.status, r.created_at,
              u.email AS owner_email, u.name AS owner_name
       FROM recipes r
       LEFT JOIN users u ON u.uid = r.owner_uid
       WHERE ${where}
       ORDER BY r.created_at DESC`,
      params
    );
    res.json({ recipes: r.rows });
  } catch (e) {
    next(e);
  }
});

// POST /api/admin/recipes/:id/status  body { status: 'approved'|'rejected' }
router.post("/recipes/:id/status", async (req, res, next) => {
  try {
    const status = (req.body && req.body.status) || "";
    if (!["approved", "rejected", "pending"].includes(status)) {
      return res.status(400).json({ error: "Invalid status." });
    }
    const upd = await query(
      "UPDATE recipes SET status = $2 WHERE id = $1 AND is_custom = true",
      [req.params.id, status]
    );
    if (upd.rowCount === 0)
      return res.status(404).json({ error: "Recipe not found." });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
