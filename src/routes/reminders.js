// /api/reminders — the user's meal-reminder settings.
const router = require("express").Router();
const { query } = require("../db");

function toJson(row) {
  if (!row) {
    return {
      enabled: false,
      breakfast: { hour: 7, minute: 30 },
      lunch: { hour: 13, minute: 0 },
      dinner: { hour: 19, minute: 30 },
      nudgeIfNothingPlanned: true,
    };
  }
  return {
    enabled: row.enabled,
    breakfast: { hour: row.breakfast_hour, minute: row.breakfast_minute },
    lunch: { hour: row.lunch_hour, minute: row.lunch_minute },
    dinner: { hour: row.dinner_hour, minute: row.dinner_minute },
    nudgeIfNothingPlanned: row.nudge_if_nothing_planned,
  };
}

// GET /api/reminders -> { reminders: {...} }
router.get("/", async (req, res, next) => {
  try {
    const r = await query("SELECT * FROM reminders WHERE uid = $1", [req.uid]);
    res.json({ reminders: toJson(r.rows[0]) });
  } catch (e) {
    next(e);
  }
});

// PUT /api/reminders  body = ReminderSettings.toJson()
router.put("/", async (req, res, next) => {
  const b = req.body || {};
  const bf = b.breakfast || {};
  const lu = b.lunch || {};
  const di = b.dinner || {};
  try {
    await query(
      `INSERT INTO reminders
        (uid, enabled, breakfast_hour, breakfast_minute, lunch_hour, lunch_minute,
         dinner_hour, dinner_minute, nudge_if_nothing_planned)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (uid) DO UPDATE SET
         enabled=$2, breakfast_hour=$3, breakfast_minute=$4, lunch_hour=$5,
         lunch_minute=$6, dinner_hour=$7, dinner_minute=$8, nudge_if_nothing_planned=$9`,
      [
        req.uid, !!b.enabled, bf.hour ?? 7, bf.minute ?? 30, lu.hour ?? 13,
        lu.minute ?? 0, di.hour ?? 19, di.minute ?? 30,
        b.nudgeIfNothingPlanned ?? true,
      ]
    );
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
