import { initializeApp, getApps } from 'firebase/app'
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore'
import { getMessaging, isSupported } from 'firebase/messaging'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig)

export const firestoreClient = getFirestore(app)

// Try to enable IndexedDB persistence to reduce network reads for repeated queries.
// This is best-effort: if it fails (e.g., multiple tabs), we silently ignore.
try {
  enableIndexedDbPersistence(firestoreClient).catch((err) => {
    // Persistence can fail with 'failed-precondition' (multiple tabs) or 'unimplemented' (browser)
    console.info('Firestore persistence not enabled:', err.code || err.message || err)
  })
} catch (e) {
  // Older browsers or environments may throw synchronously
}

export async function getMessagingIfSupported() {
  const supported = await isSupported()
  if (!supported) return null
  return getMessaging(app)
}
