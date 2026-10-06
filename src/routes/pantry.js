// /api/pantry — items the user already has at home.
const router = require("express").Router();
const { query } = require("../db");

const ymd = (d) => (d ? String(d).slice(0, 10) : null);

// GET /api/pantry -> { items: [{ id, name, quantity, unit, section, expiry }] }
router.get("/", async (req, res, next) => {
  try {
    const r = await query(
      "SELECT * FROM pantry_items WHERE uid = $1 ORDER BY id",
      [req.uid]
    );
    res.json({
      items: r.rows.map((row) => ({
        id: row.id,
        name: row.name,
        quantity: row.quantity,
        unit: row.unit,
        section: row.section,
        expiry: row.expiry ? ymd(row.expiry) : null,
      })),
    });
  } catch (e) {
    next(e);
  }
});

// POST /api/pantry  body { name, quantity, unit, section, expiry } -> { id }
router.post("/", async (req, res, next) => {
  const b = req.body || {};
  try {
    const r = await query(
      `INSERT INTO pantry_items (uid, name, quantity, unit, section, expiry)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [req.uid, b.name, b.quantity ?? 1, b.unit || "piece", b.section || "other", b.expiry || null]
    );
    res.status(201).json({ id: r.rows[0].id });
  } catch (e) {
    next(e);
  }
});

// DELETE /api/pantry/:id
router.delete("/:id", async (req, res, next) => {
  try {
    await query("DELETE FROM pantry_items WHERE id = $1 AND uid = $2", [
      req.params.id,
      req.uid,
    ]);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
