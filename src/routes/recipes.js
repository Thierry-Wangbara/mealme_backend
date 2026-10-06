// /api/recipes — global seed recipes plus the user's own custom recipes.
const router = require("express").Router();
const { pool, query } = require("../db");

function toRecipeJson(row, ingredients) {
  return {
    id: row.id,
    title: row.title,
    emoji: row.emoji,
    cuisine: row.cuisine,
    mealTypes: row.meal_types || [],
    cookTimeMinutes: row.cook_time_minutes,
    servings: row.servings,
    difficulty: row.difficulty,
    costEstimateFcfa: row.cost_estimate_fcfa,
    calories: row.calories,
    description: row.description,
    steps: row.steps || [],
    tags: row.tags || [],
    isCustom: row.is_custom,
    status: row.status || "approved",
    ingredients: (ingredients || []).map((i) => ({
      name: i.name,
      quantity: i.quantity,
      unit: i.unit,
      section: i.section,
    })),
  };
}

// GET /api/recipes -> { recipes: [...] }  (global + this user's custom)
router.get("/", async (req, res, next) => {
  try {
    const r = await query(
      `SELECT * FROM recipes
       WHERE owner_uid IS NULL OR owner_uid = $1
       ORDER BY is_custom DESC, title ASC`,
      [req.uid]
    );
    const ids = r.rows.map((row) => row.id);
    const ing = ids.length
      ? await query(
          "SELECT * FROM ingredients WHERE recipe_id = ANY($1) ORDER BY id",
          [ids]
        )
      : { rows: [] };
    const byRecipe = {};
    for (const i of ing.rows) (byRecipe[i.recipe_id] ||= []).push(i);
    res.json({
      recipes: r.rows.map((row) => toRecipeJson(row, byRecipe[row.id])),
    });
  } catch (e) {
    next(e);
  }
});

async function writeIngredients(client, recipeId, ingredients) {
  await client.query("DELETE FROM ingredients WHERE recipe_id = $1", [recipeId]);
  for (const i of ingredients || []) {
    await client.query(
      `INSERT INTO ingredients (recipe_id, name, quantity, unit, section)
       VALUES ($1,$2,$3,$4,$5)`,
      [recipeId, i.name, i.quantity ?? 0, i.unit || "piece", i.section || "other"]
    );
  }
}

// POST /api/recipes  body = Recipe.toJson()  -> create a custom recipe
router.post("/", async (req, res, next) => {
  const b = req.body || {};
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // New user-published recipes start as 'pending' so an admin validates them.
    await client.query(
      `INSERT INTO recipes
        (id, owner_uid, title, emoji, cuisine, meal_types, cook_time_minutes,
         servings, difficulty, cost_estimate_fcfa, calories, description, steps, tags, is_custom, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14, true, 'pending')`,
      [
        b.id, req.uid, b.title, b.emoji, b.cuisine, b.mealTypes || [],
        b.cookTimeMinutes ?? 30, b.servings ?? 2, b.difficulty,
        b.costEstimateFcfa ?? 0, b.calories ?? 0, b.description,
        b.steps || [], b.tags || [],
      ]
    );
    await writeIngredients(client, b.id, b.ingredients);
    await client.query("COMMIT");
    res.status(201).json({ ok: true });
  } catch (e) {
    await client.query("ROLLBACK");
    next(e);
  } finally {
    client.release();
  }
});

// PUT /api/recipes/:id  -> update the user's own recipe
router.put("/:id", async (req, res, next) => {
  const b = req.body || {};
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const upd = await client.query(
      `UPDATE recipes SET
         title=$2, emoji=$3, cuisine=$4, meal_types=$5, cook_time_minutes=$6,
         servings=$7, difficulty=$8, cost_estimate_fcfa=$9, calories=$10,
         description=$11, steps=$12, tags=$13
       WHERE id=$1 AND owner_uid=$14`,
      [
        req.params.id, b.title, b.emoji, b.cuisine, b.mealTypes || [],
        b.cookTimeMinutes ?? 30, b.servings ?? 2, b.difficulty,
        b.costEstimateFcfa ?? 0, b.calories ?? 0, b.description,
        b.steps || [], b.tags || [], req.uid,
      ]
    );
    if (upd.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Recipe not found or not yours." });
    }
    await writeIngredients(client, req.params.id, b.ingredients);
    await client.query("COMMIT");
    res.json({ ok: true });
  } catch (e) {
    await client.query("ROLLBACK");
    next(e);
  } finally {
    client.release();
  }
});

// DELETE /api/recipes/:id  -> delete the user's own recipe
router.delete("/:id", async (req, res, next) => {
  try {
    const del = await query(
      "DELETE FROM recipes WHERE id = $1 AND owner_uid = $2",
      [req.params.id, req.uid]
    );
    if (del.rowCount === 0)
      return res.status(404).json({ error: "Recipe not found or not yours." });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
