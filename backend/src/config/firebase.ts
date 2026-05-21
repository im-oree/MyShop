import admin from 'firebase-admin'
import { config } from './index.js'

let firebaseApp: admin.app.App | null = null

/**
 * Initialize Firebase Admin SDK
 */
export function initializeFirebase(): admin.app.App {
  if (firebaseApp) {
    return firebaseApp
  }
  
  firebaseApp = admin.initializeApp({
    credential: admin.credential.cert({
      projectId: config.firebase.projectId,
      privateKey: config.firebase.privateKey,
      clientEmail: config.firebase.clientEmail,
    }),
  })
  
  return firebaseApp
}

/**
 * Get Firestore instance
 */
export function getFirestore(): admin.firestore.Firestore {
  if (!firebaseApp) {
    initializeFirebase()
  }
  return admin.firestore()
}

/**
 * Get Auth instance
 */
export function getAuth(): admin.auth.Auth {
  if (!firebaseApp) {
    initializeFirebase()
  }
  return admin.auth()
}

export default {
  initializeFirebase,
  getFirestore,
  getAuth,
}
