
'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase() {
  if (getApps().length) {
    return getSdks(getApp());
  }

  let firebaseApp;
  // In a production environment (like the deployed preview URL), Firebase App Hosting
  // provides the necessary configuration automatically. Calling initializeApp() with
  // no arguments allows it to use this automatically provided config.
  if (process.env.NODE_ENV === 'production' && typeof window !== 'undefined' && window.location.hostname.endsWith('.hosted.app')) {
    try {
      firebaseApp = initializeApp();
    } catch (e) {
      console.warn('Automatic Firebase initialization failed in production. Falling back to firebaseConfig.', e);
      // As a fallback in case auto-init fails, use the local config.
      firebaseApp = initializeApp(firebaseConfig);
    }
  } else {
    // In the development environment (the workstation), we use our explicit config file.
    firebaseApp = initializeApp(firebaseConfig);
  }

  return getSdks(firebaseApp);
}

export function getSdks(firebaseApp: FirebaseApp) {
  const firestore = getFirestore(firebaseApp);
  const auth = getAuth(firebaseApp);
  const realtimeDB = getDatabase(firebaseApp);
  return {
    firebaseApp,
    auth,
    firestore,
    realtimeDB,
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
