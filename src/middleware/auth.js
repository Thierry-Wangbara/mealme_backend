// Authentication middleware.
//
// The Flutter app attaches the signed-in user's Firebase ID token in the
// "Authorization: Bearer <token>" header. Here we verify it against Google's
// public certificates, then make sure a matching row exists in our own users
// table, and finally attach req.uid so the route handlers know who is calling.
const { verifyFirebaseToken } = require("../verifyFirebaseToken");
const { query } = require("../db");

async function authenticate(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: "Missing authentication token." });
  }

  try {
    const user = await verifyFirebaseToken(token);
    req.uid = user.uid;
    req.userEmail = user.email;
    req.userName = user.name;

    // Upsert the user so every table can safely reference users(uid).
    const upserted = await query(
      `INSERT INTO users (uid, email, name)
       VALUES ($1, $2, $3)
       ON CONFLICT (uid) DO UPDATE
         SET email = COALESCE(EXCLUDED.email, users.email),
             name  = COALESCE(EXCLUDED.name,  users.name)
       RETURNING disabled`,
      [req.uid, req.userEmail, req.userName]
    );

    // An account an admin has disabled cannot use the API.
    if (upserted.rows[0] && upserted.rows[0].disabled) {
      return res.status(403).json({ error: "This account has been disabled." });
    }

    next();
  } catch (e) {
    return res.status(401).json({ error: "Invalid or expired token." });
  }
}

module.exports = { authenticate };
