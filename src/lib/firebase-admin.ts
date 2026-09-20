import "server-only";

/**
 * Server-side Firebase ID-token verification (production-grade).
 *
 * Requires env:
 *   FIREBASE_SERVICE_ACCOUNT_JSON = full service-account JSON stringified
 *   (or FIREBASE_PROJECT_ID as fallback for unverified dev mode)
 *
 * If no service account is configured, verifyFirebaseIdToken() returns null
 * and the caller falls back to trusted-dev mode (client-provided profile).
 * Set the service account in Vercel env before launching publicly.
 */
export type VerifiedFirebaseUser = {
  uid: string;
  email: string | null;
  phone: string | null;
  name: string | null;
  provider: string;
};

export async function verifyFirebaseIdToken(idToken: string): Promise<VerifiedFirebaseUser | null> {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!serviceAccountJson) return null;

  const { default: admin } = await import("firebase-admin");

  const apps = (admin as unknown as { apps: unknown[] }).apps;
  if (!apps.length) {
    const { cert, initializeApp } = await import("firebase-admin/app");
    const serviceAccount = JSON.parse(serviceAccountJson);
    initializeApp({ credential: cert(serviceAccount) });
  }

  const { getAuth } = await import("firebase-admin/auth");
  const decoded = await getAuth().verifyIdToken(idToken);
  return {
    uid: decoded.uid,
    email: decoded.email ?? null,
    phone: decoded.phone_number ?? null,
    name: decoded.name ?? null,
    provider: decoded.firebase?.sign_in_provider ?? "unknown",
  };
}
