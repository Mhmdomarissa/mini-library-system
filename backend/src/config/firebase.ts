import admin from 'firebase-admin';

/**
 * Lazy Firebase initialization — only initializes when first called.
 * This prevents a startup crash when FIREBASE_* env vars are not yet set
 * (e.g. local dev without a Firebase project, or during CI).
 * Any request that hits authenticate() will still fail with a clear error
 * if credentials are missing, but the DB + server will start cleanly.
 */
const getFirebaseAdmin = (): admin.app.App => {
  if (!admin.apps.length) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error(
        'Firebase credentials are missing. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in .env',
      );
    }

    admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    });
  }

  return admin.app();
};

export default getFirebaseAdmin;
