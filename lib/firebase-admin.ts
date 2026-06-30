import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

let adminApp: App | undefined;

function getAdminApp(): App {
  if (!adminApp) {
    if (getApps().length > 0) {
      adminApp = getApps()[0];
    } else {
      const base64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
      if (!base64) {
        throw new Error(
          "FIREBASE_SERVICE_ACCOUNT_BASE64 environment variable is not set"
        );
      }

      const serviceAccount = JSON.parse(
        Buffer.from(base64, "base64").toString("utf-8")
      );

      adminApp = initializeApp({
        credential: cert(serviceAccount),
      });
    }
  }
  return adminApp;
}

/**
 * Verify a Firebase ID token from the client.
 * Returns the decoded token containing the user's phone number.
 */
export async function verifyIdToken(idToken: string) {
  const auth = getAuth(getAdminApp());
  return auth.verifyIdToken(idToken);
}
