import {describe,expect,it} from 'vitest';
import {parseFirebaseConfigSnippet,isFirebaseConfigured,getFirebaseConfig} from '../src/lib/firebase';

describe('Firebase Configuration & Snippet Parser', () => {
  it('correctly parses user provided JSON snippet', () => {
    const rawSnippet = `{
  "apiKey": "AIzaSyCZnc2GKT9dnxymPpG1qJi0BRIvnl2tPsw",
  "authDomain": "windy-ward-jk6n5.firebaseapp.com",
  "projectId": "windy-ward-jk6n5",
  "storageBucket": "windy-ward-jk6n5.firebasestorage.app",
  "messagingSenderId": "440972724929",
  "appId": "1:440972724929:web:dcd39252e78a10b0dfa240"
}`;

    const parsed = parseFirebaseConfigSnippet(rawSnippet);
    expect(parsed).not.toBeNull();
    expect(parsed?.apiKey).toBe('AIzaSyCZnc2GKT9dnxymPpG1qJi0BRIvnl2tPsw');
    expect(parsed?.authDomain).toBe('windy-ward-jk6n5.firebaseapp.com');
    expect(parsed?.projectId).toBe('windy-ward-jk6n5');
    expect(parsed?.storageBucket).toBe('windy-ward-jk6n5.firebasestorage.app');
    expect(parsed?.messagingSenderId).toBe('440972724929');
    expect(parsed?.appId).toBe('1:440972724929:web:dcd39252e78a10b0dfa240');
  });

  it('correctly parses JS const snippet from Firebase Console', () => {
    const jsSnippet = `const firebaseConfig = {
      apiKey: "AIzaSyCZnc2GKT9dnxymPpG1qJi0BRIvnl2tPsw",
      authDomain: "windy-ward-jk6n5.firebaseapp.com",
      projectId: "windy-ward-jk6n5",
      storageBucket: "windy-ward-jk6n5.firebasestorage.app",
      messagingSenderId: "440972724929",
      appId: "1:440972724929:web:dcd39252e78a10b0dfa240"
    };`;

    const parsed = parseFirebaseConfigSnippet(jsSnippet);
    expect(parsed).not.toBeNull();
    expect(parsed?.apiKey).toBe('AIzaSyCZnc2GKT9dnxymPpG1qJi0BRIvnl2tPsw');
    expect(parsed?.projectId).toBe('windy-ward-jk6n5');
  });

  it('validates default windy-ward-jk6n5 configuration', () => {
    const config = getFirebaseConfig();
    expect(config.apiKey).toBe('AIzaSyCZnc2GKT9dnxymPpG1qJi0BRIvnl2tPsw');
    expect(config.projectId).toBe('windy-ward-jk6n5');
    expect(isFirebaseConfigured()).toBe(true);
  });
});
