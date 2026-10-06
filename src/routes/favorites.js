// /api/favorites — the user's favourite recipe ids.
const router = require("express").Router();
const { query } = require("../db");

// GET /api/favorites -> { ids: [recipeId, ...] }
router.get("/", async (req, res, next) => {
  try {
    const r = await query(
      "SELECT recipe_id FROM favorites WHERE uid = $1",
      [req.uid]
    );
    res.json({ ids: r.rows.map((row) => row.recipe_id) });
  } catch (e) {
    next(e);
  }
});

// PUT /api/favorites/:recipeId -> add
router.put("/:recipeId", async (req, res, next) => {
  try {
    await query(
      `INSERT INTO favorites (uid, recipe_id) VALUES ($1,$2)
       ON CONFLICT DO NOTHING`,
      [req.uid, req.params.recipeId]
    );
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// DELETE /api/favorites/:recipeId -> remove
router.delete("/:recipeId", async (req, res, next) => {
  try {
    await query("DELETE FROM favorites WHERE uid = $1 AND recipe_id = $2", [
      req.uid,
      req.params.recipeId,
    ]);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
