/**
 * Firebase Client & Configuration Module for RailRaksha AI
 * Powers Sovereign Citizen Google Authentication
 */

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

export function getFirebaseConfig(): FirebaseConfig {
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'railraksha-defense.firebaseapp.com',
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'railraksha-defense',
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'railraksha-defense.firebasestorage.app',
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '829104928172',
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:829104928172:web:9c7a2e8f1b4d',
  };
}

export function isFirebaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY !== 'placeholder'
  );
}

export interface GoogleAuthPayload {
  idToken?: string;
  demoPersona?: 'citizen' | 'verified_reporter' | 'rpf_cyber' | 'analyst';
  locale?: string;
  returnTo?: string;
}

export async function submitGoogleAuth(payload: GoogleAuthPayload): Promise<{ ok: boolean; returnTo?: string; error?: string }> {
  try {
    const response = await fetch('/api/auth/google', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { ok: false, error: data.error || 'Authentication failed' };
    }
    return { ok: true, returnTo: data.returnTo || `/${payload.locale || 'en'}/dashboard` };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Network error connecting to auth service' };
  }
}
