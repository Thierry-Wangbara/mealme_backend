// Verifies a Firebase ID token WITHOUT the heavy firebase-admin SDK.
//
// Firebase ID tokens are standard RS256 JWTs signed by Google. We fetch
// Google's public certificates, check the token's signature, and confirm the
// audience/issuer match this Firebase project. This is exactly what
// firebase-admin does internally — just lighter.
const jwt = require("jsonwebtoken");
require("dotenv").config();

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID;
const CERT_URL =
  "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";

let cache = { keys: null, expires: 0 };

async function getCertificates() {
  const now = Date.now();
  if (cache.keys && now < cache.expires) return cache.keys;
  const res = await fetch(CERT_URL); // Node 18+ has global fetch
  if (!res.ok) throw new Error("Could not fetch Google certificates");
  const keys = await res.json(); // { kid: "-----BEGIN CERTIFICATE-----..." }
  const cc = res.headers.get("cache-control") || "";
  const m = /max-age=(\d+)/.exec(cc);
  const maxAgeMs = (m ? Number(m[1]) : 3600) * 1000;
  cache = { keys, expires: now + maxAgeMs };
  return keys;
}

async function verifyFirebaseToken(token) {
  if (!PROJECT_ID) throw new Error("FIREBASE_PROJECT_ID is not set in .env");

  const decoded = jwt.decode(token, { complete: true });
  const kid = decoded && decoded.header && decoded.header.kid;
  if (!kid) throw new Error("Malformed token (no key id)");

  const certs = await getCertificates();
  const cert = certs[kid];
  if (!cert) throw new Error("No matching Google certificate for this token");

  const payload = jwt.verify(token, cert, {
    algorithms: ["RS256"],
    audience: PROJECT_ID,
    issuer: `https://securetoken.google.com/${PROJECT_ID}`,
  });

  return {
    uid: payload.sub || payload.user_id,
    email: payload.email || null,
    name: payload.name || null,
  };
}

module.exports = { verifyFirebaseToken };
