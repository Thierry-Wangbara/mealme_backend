// /api/ai — the Gemini-powered assistant.
const router = require("express").Router();
const { query } = require("../db");
const { askGemini, geminiReady } = require("../gemini");

// Mifflin-St Jeor daily calorie target, so the assistant can judge whether a
// meal suits the user's goal.
function calorieTarget(row) {
  const w = row.weight_kg, h = row.height_cm, a = row.age;
  if (!w || !h || !a) return null;
  const bmr = 10 * w + 6.25 * h - 5 * a + (row.sex === "male" ? 5 : -161);
  const factor = { low: 1.2, medium: 1.55, high: 1.725 }[row.activity] || 1.4;
  const delta = { lose: -500, maintain: 0, gain: 400 }[row.goal] || 0;
  return Math.round(bmr * factor + delta);
}

// A short description of the user so the assistant can personalise.
async function userContext(uid) {
  const u = await query("SELECT name FROM users WHERE uid = $1", [uid]);
  const p = await query(
    `SELECT age, sex, height_cm, weight_kg, activity, goal, diet, diet_other
     FROM profiles WHERE uid = $1`,
    [uid]
  );
  const name = u.rows[0]?.name || "the user";
  const row = p.rows[0];
  if (!row) return `The user's name is ${name}. No detailed profile yet.`;

  const diet =
    row.diet === "other" && row.diet_other ? row.diet_other : row.diet;
  const kcal = calorieTarget(row);
  const kcalLine = kcal
    ? ` Their daily calorie target is about ${kcal} kcal (roughly ${Math.round(kcal / 3)} kcal per meal).`
    : "";
  return `The user's name is ${name}. Their goal is "${row.goal}". Their ` +
    `dietary preference is "${diet}".${kcalLine}`;
}

const SYSTEM = `You are MealMe, the in-app assistant of the MealMe meal-planning application.

# YOUR ONLY DOMAIN
You answer ONLY questions about food, meals, cooking, recipes, ingredients,
nutrition, calories, diets, meal planning, shopping/pantry for meals, and how to
use the MealMe application. Cameroonian and West African cuisine is your speciality.

# HARD SCOPE RULE (most important)
If the user's message is NOT about food / meals / nutrition / the MealMe app —
for example questions about politics, coding, maths, history, celebrities, sport,
general knowledge, or anything unrelated to meals — you MUST refuse and reply with
EXACTLY this sentence and nothing else:
"We have not been programmed to answer this type of question. Please ask me something about your meals, nutrition or the MealMe app."
Do not apologise further, do not add extra text, do not try to be helpful about the off-topic subject.

# HOW TO ANSWER IN-SCOPE QUESTIONS
- You can greet if the user greets you but after every question asked by the user, Dont greet again. Just answer the question.
- Be able to remember the context of the previous questions and answers in the same chat session or even a different one, so you can give more personalised advice.
- When the user lists ingredients they have at home, PROPOSE 2 to 4 specific dishes they can actually cook with those ingredients, favouring Cameroonian and West African meals. You may suggest different dishes for morning, evening or as a snack.
- For EACH proposed dish give, on one line: the dish name, an estimated calorie count, and a short note on whether it fits the user's goal (e.g. "good for gaining weight" / "light, good for weight loss"). Then a few short steps.
- Be concrete and practical — actually name the meals, don't just comment on the ingredients.
- Never propose a meal that breaks the user's stated dietary preference.
- Keep it concise. Use FCFA for prices only if asked.

# PREMIUM "SNAP A MEAL" FLOW
If the user says they have taken / want to take a photo of a meal (they "snapped",
"took a picture", "scanned" their food) but has NOT said what they want to know,
do not guess. Ask them to choose, in one short line:
"Would you like to know the number of calories in this meal, how this meal is prepared, or do you have something else in mind?"
Then, based on their answer, give either the estimated calories or the cooking steps for that meal.`;

// POST /api/ai/chat  body { message } -> { reply }
router.post("/chat", async (req, res, next) => {
  const message = (req.body?.message || "").toString().trim();
  if (!message) return res.status(400).json({ error: "message is required." });
  if (!geminiReady()) {
    return res.status(503).json({ error: "AI is not configured on the server." });
  }
  try {
    const context = await userContext(req.uid);
    const reply = await askGemini(message, `${SYSTEM}\n\n${context}`);
    // Save both sides of the exchange for the user's chat history.
    await query(
      `INSERT INTO ai_messages (uid, role, text)
       VALUES ($1, 'user', $2), ($1, 'assistant', $3)`,
      [req.uid, message, reply]
    );
    res.json({ reply });
  } catch (e) {
    console.error("AI error:", e.message);
    res.status(502).json({ error: "The AI service failed. Please try again." });
  }
});

// GET /api/ai/history -> { messages: [{ role, text, at }] }
router.get("/history", async (req, res, next) => {
  try {
    const r = await query(
      "SELECT role, text, created_at FROM ai_messages WHERE uid = $1 ORDER BY id ASC",
      [req.uid]
    );
    res.json({
      messages: r.rows.map((m) => ({
        role: m.role,
        text: m.text,
        at: m.created_at,
      })),
    });
  } catch (e) {
    next(e);
  }
});

// DELETE /api/ai/history -> clear the user's chat history
router.delete("/history", async (req, res, next) => {
  try {
    await query("DELETE FROM ai_messages WHERE uid = $1", [req.uid]);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
