// /api/plan — the user's weekly meal-plan entries.
const router = require("express").Router();
const { query } = require("../db");

const ymd = (d) =>
  d instanceof Date ? d.toISOString().slice(0, 10) : String(d).slice(0, 10);

// GET /api/plan -> { entries: [{ day, slot, recipeId, servings }] }
router.get("/", async (req, res, next) => {
  try {
    const r = await query(
      "SELECT day, slot, recipe_id, servings FROM meal_plan_entries WHERE uid = $1",
      [req.uid]
    );
    res.json({
      entries: r.rows.map((row) => ({
        day: ymd(row.day),
        slot: row.slot,
        recipeId: row.recipe_id,
        servings: row.servings,
      })),
    });
  } catch (e) {
    next(e);
  }
});

// PUT /api/plan/entry  body { day, slot, recipeId, servings } -> assign / update
router.put("/entry", async (req, res, next) => {
  const { day, slot, recipeId, servings } = req.body || {};
  if (!day || !slot || !recipeId)
    return res.status(400).json({ error: "day, slot and recipeId are required." });
  try {
    await query(
      `INSERT INTO meal_plan_entries (uid, day, slot, recipe_id, servings)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (uid, day, slot) DO UPDATE
         SET recipe_id = EXCLUDED.recipe_id, servings = EXCLUDED.servings`,
      [req.uid, day, slot, recipeId, servings ?? 2]
    );
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// DELETE /api/plan/entry?day=YYYY-MM-DD&slot=lunch -> remove a meal
router.delete("/entry", async (req, res, next) => {
  const { day, slot } = req.query;
  if (!day || !slot)
    return res.status(400).json({ error: "day and slot are required." });
  try {
    await query(
      "DELETE FROM meal_plan_entries WHERE uid = $1 AND day = $2 AND slot = $3",
      [req.uid, day, slot]
    );
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
