/**
 * Firebase Client & Configuration Module for RailRaksha AI
 * Powers Sovereign Citizen Google Authentication & Custom Firebase Key Integration
 */

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
}

const CONFIG_STORAGE_KEY = 'railraksha_firebase_config';

/**
 * Retrieve custom Firebase credentials persisted in browser localStorage
 */
export function getStoredFirebaseConfig(): FirebaseConfig | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CONFIG_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.apiKey === 'string' && parsed.apiKey.trim().length > 0) {
      return parsed;
    }
  } catch {}
  return null;
}

/**
 * Persist custom Firebase credentials to localStorage
 */
export function saveStoredFirebaseConfig(config: FirebaseConfig): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
}

/**
 * Clear custom Firebase credentials from localStorage
 */
export function clearStoredFirebaseConfig(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(CONFIG_STORAGE_KEY);
}

/**
 * Parse a raw JS object or JSON snippet copied directly from the Firebase Console
 */
export function parseFirebaseConfigSnippet(text: string): Partial<FirebaseConfig> | null {
  if (!text || typeof text !== 'string') return null;
  const trimmed = text.trim();

  // 1. Try parsing direct JSON
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === 'object') {
      return {
        apiKey: parsed.apiKey || '',
        authDomain: parsed.authDomain || '',
        projectId: parsed.projectId || '',
        storageBucket: parsed.storageBucket || '',
        messagingSenderId: parsed.messagingSenderId || '',
        appId: parsed.appId || '',
      };
    }
  } catch {}

  // 2. Try parsing JS object / const firebaseConfig = { ... }
  const extract = (key: string): string => {
    const regex = new RegExp(`['"]?${key}['"]?\\s*:\\s*['"\`]([^'"\`]+)['"\`]`, 'i');
    const match = trimmed.match(regex);
    return match ? match[1].trim() : '';
  };

  const apiKey = extract('apiKey');
  const authDomain = extract('authDomain');
  const projectId = extract('projectId');
  const storageBucket = extract('storageBucket');
  const messagingSenderId = extract('messagingSenderId');
  const appId = extract('appId');

  if (apiKey || projectId) {
    return {
      apiKey,
      authDomain: authDomain || (projectId ? `${projectId}.firebaseapp.com` : ''),
      projectId,
      storageBucket,
      messagingSenderId,
      appId,
    };
  }

  return null;
}

/**
 * Resolve effective Firebase configuration from either custom localStorage or environment variables
 */
export function getFirebaseConfig(): FirebaseConfig {
  const stored = getStoredFirebaseConfig();
  if (stored && stored.apiKey && stored.projectId) {
    return stored;
  }
  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'railraksha-defense.firebaseapp.com',
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'railraksha-defense',
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'railraksha-defense.firebasestorage.app',
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
  };
}

/**
 * Returns true if valid Firebase credentials have been configured
 */
export function isFirebaseConfigured(): boolean {
  const cfg = getFirebaseConfig();
  return Boolean(
    cfg.apiKey &&
    cfg.apiKey.trim().length > 10 &&
    cfg.apiKey !== 'placeholder' &&
    cfg.projectId &&
    cfg.projectId.trim().length > 0 &&
    cfg.projectId !== 'placeholder'
  );
}

export interface GoogleAuthResult {
  ok: boolean;
  idToken?: string;
  projectId?: string;
  user?: {
    uid: string;
    displayName: string | null;
    email: string | null;
    photoURL: string | null;
  };
  error?: string;
}

/**
 * Triggers official Google Firebase Auth signInWithPopup using official modular Google ESM CDN
 */
export async function signInWithGooglePopup(customConfig?: FirebaseConfig): Promise<GoogleAuthResult> {
  const cfg = customConfig || getFirebaseConfig();
  if (!cfg.apiKey || cfg.apiKey === 'placeholder') {
    return { ok: false, error: 'Firebase API key is not configured.' };
  }

  try {
    const dynamicImport = <T = any>(url: string): Promise<T> => {
      // Bypasses bundler AST analysis while utilizing native browser ESM imports
      return (new Function('url', 'return import(url)'))(url);
    };

    const { initializeApp, getApps } = await dynamicImport(
      'https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js'
    );
    const { getAuth, GoogleAuthProvider, signInWithPopup } = await dynamicImport(
      'https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js'
    );

    const appName = `railraksha-${cfg.projectId || 'app'}`;
    const apps = getApps();
    let app = apps.find((a: any) => a.name === appName);
    if (!app) {
      app = initializeApp(cfg, appName);
    }

    const auth = getAuth(app);
    const provider = new GoogleAuthProvider();
    provider.addScope('email');
    provider.addScope('profile');
    provider.setCustomParameters({
      prompt: 'select_account',
    });

    const result = await signInWithPopup(auth, provider);
    const idToken = await result.user.getIdToken(true);

    return {
      ok: true,
      idToken,
      projectId: cfg.projectId,
      user: {
        uid: result.user.uid,
        displayName: result.user.displayName,
        email: result.user.email,
        photoURL: result.user.photoURL,
      },
    };
  } catch (err: any) {
    let msg = 'Google authentication encountered an unexpected error.';
    if (err.code === 'auth/popup-closed-by-user') {
      msg = 'Google sign-in popup was closed before completing.';
    } else if (err.code === 'auth/cancelled-popup-request') {
      msg = 'Popup request was cancelled.';
    } else if (err.code === 'auth/popup-blocked') {
      msg = 'Google sign-in popup was blocked by your browser. Please allow popups for this site.';
    } else if (err.code === 'auth/unauthorized-domain') {
      const host = typeof window !== 'undefined' ? window.location.hostname : 'your domain';
      msg = `Unauthorized domain: Please add "${host}" to Firebase Console -> Authentication -> Settings -> Authorized Domains.`;
    } else if (err.code === 'auth/invalid-api-key') {
      msg = 'Invalid Firebase API Key. Please verify your credentials in Firebase setup.';
    } else if (err.message) {
      msg = err.message;
    }
    return { ok: false, error: msg };
  }
}

export interface GoogleAuthPayload {
  idToken?: string;
  projectId?: string;
  demoPersona?: 'citizen' | 'verified_reporter' | 'rpf_cyber' | 'analyst';
  persona?: 'citizen' | 'verified_reporter' | 'rpf_cyber' | 'analyst';
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
