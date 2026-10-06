// /api/profile — the user's health/nutrition profile.
const router = require("express").Router();
const { query } = require("../db");

// Map a DB row to the JSON shape the Flutter UserProfile expects.
function toJson(row, name) {
  if (!row) return null;
  return {
    name: name || "there",
    age: row.age,
    sex: row.sex,
    heightCm: row.height_cm,
    weightKg: row.weight_kg,
    activity: row.activity,
    goal: row.goal,
    diet: row.diet,
    priority: row.priority,
    dietOther: row.diet_other,
    priorityOther: row.priority_other,
  };
}

// GET /api/profile  -> { profile: {...} | null }
router.get("/", async (req, res, next) => {
  try {
    const p = await query("SELECT * FROM profiles WHERE uid = $1", [req.uid]);
    const u = await query("SELECT name FROM users WHERE uid = $1", [req.uid]);
    const name = u.rows[0]?.name;
    res.json({ profile: toJson(p.rows[0], name) });
  } catch (e) {
    next(e);
  }
});

// PUT /api/profile  body = UserProfile.toJson()
router.put("/", async (req, res, next) => {
  const b = req.body || {};
  try {
    if (b.name) {
      await query("UPDATE users SET name = $1 WHERE uid = $2", [b.name, req.uid]);
    }
    await query(
      `INSERT INTO profiles
        (uid, age, sex, height_cm, weight_kg, activity, goal, diet, diet_other, priority, priority_other, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, now())
       ON CONFLICT (uid) DO UPDATE SET
         age=$2, sex=$3, height_cm=$4, weight_kg=$5, activity=$6, goal=$7,
         diet=$8, diet_other=$9, priority=$10, priority_other=$11, updated_at=now()`,
      [
        req.uid, b.age, b.sex, b.heightCm, b.weightKg, b.activity, b.goal,
        b.diet, b.dietOther, b.priority, b.priorityOther,
      ]
    );
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
