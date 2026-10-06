// (Deprecated) — token verification no longer uses firebase-admin.
// See verifyFirebaseToken.js, which verifies Firebase ID tokens using Google's
// public certificates and a lightweight JWT library. This file is kept only so
// no stale imports break; it is not used anywhere.
module.exports = {};
