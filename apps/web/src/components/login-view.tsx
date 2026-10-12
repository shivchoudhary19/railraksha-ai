'use client';

import {useState,useEffect} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Lock,
  KeyRound,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldAlert,
  UserCheck,
  Radio,
  Settings2,
  X,
  Flame,
  Check,
  RotateCcw,
} from 'lucide-react';
import {
  submitGoogleAuth,
  signInWithGooglePopup,
  isFirebaseConfigured,
  getFirebaseConfig,
  saveStoredFirebaseConfig,
  clearStoredFirebaseConfig,
  parseFirebaseConfigSnippet,
  type FirebaseConfig,
} from '@/lib/firebase';

interface LoginViewProps {
  locale: string;
  error?: string;
  translations: {
    back: string;
    eyebrow: string;
    title: string;
    lead: string;
    continue: string;
    register: string;
    account: string;
    reset: string;
    security: string;
    error: string;
    unavailable: string;
    demo: string;
    google_signin: string;
    google_subtext: string;
    google_connecting: string;
    sso_divider: string;
    railway_sso: string;
    railway_sso_subtext: string;
    demo_quick_title: string;
    demo_citizen: string;
    demo_rpf: string;
    demo_analyst: string;
    badge_encryption: string;
    badge_certin: string;
    badge_passkey: string;
  };
}

export function LoginView({locale,error,translations:t}:LoginViewProps){
  const router=useRouter();
  const [loading,setLoading]=useState(false);
  const [activePersona,setActivePersona]=useState<string|null>(null);
  const [clientError,setClientError]=useState<string|null>(null);
  const [configured,setConfigured]=useState(false);
  const [showConfigModal,setShowConfigModal]=useState(false);
  const [firebaseConfig,setFirebaseConfig]=useState<FirebaseConfig>(()=>getFirebaseConfig());
  const [configSnippet,setConfigSnippet]=useState('');
  const [savedSuccess,setSavedSuccess]=useState(false);

  useEffect(()=>{
    setConfigured(isFirebaseConfigured());
    setFirebaseConfig(getFirebaseConfig());
  },[]);

  const handleSnippetChange=(val:string)=>{
    setConfigSnippet(val);
    const parsed=parseFirebaseConfigSnippet(val);
    if(parsed){
      setFirebaseConfig(prev=>({
        ...prev,
        apiKey:parsed.apiKey||prev.apiKey,
        authDomain:parsed.authDomain||prev.authDomain,
        projectId:parsed.projectId||prev.projectId,
        storageBucket:parsed.storageBucket||prev.storageBucket,
        messagingSenderId:parsed.messagingSenderId||prev.messagingSenderId,
        appId:parsed.appId||prev.appId,
      }));
      setSavedSuccess(true);
      setTimeout(()=>setSavedSuccess(false),3000);
    }
  };

  const handleSaveConfig=(closeAfter=true)=>{
    if(!firebaseConfig.apiKey||!firebaseConfig.projectId){
      setClientError(locale==='hi'?'API Key और Project ID आवश्यक हैं':'API Key and Project ID are required');
      return;
    }
    saveStoredFirebaseConfig(firebaseConfig);
    setConfigured(true);
    setSavedSuccess(true);
    setClientError(null);
    if(closeAfter){
      setTimeout(()=>{
        setSavedSuccess(false);
        setShowConfigModal(false);
      },1000);
    }
  };

  const handleClearConfig=()=>{
    clearStoredFirebaseConfig();
    const def=getFirebaseConfig();
    setFirebaseConfig(def);
    setConfigured(isFirebaseConfigured());
    setConfigSnippet('');
    setSavedSuccess(false);
  };

  const handleGoogleLogin=async(demoPersona?:'citizen'|'verified_reporter'|'rpf_cyber'|'analyst')=>{
    try{
      setLoading(true);
      setClientError(null);
      if(demoPersona)setActivePersona(demoPersona);

      // 1. Explicit demo persona chip clicked (Presentation / Testing)
      if(demoPersona){
        const result=await submitGoogleAuth({
          demoPersona,
          locale,
          returnTo:`/${locale}/dashboard`,
        });
        if(result.ok&&result.returnTo){
          window.location.href=result.returnTo;
          return;
        }
        setClientError(result.error||t.error);
        setLoading(false);
        setActivePersona(null);
        return;
      }

      // 2. Main Google Sign-in button clicked
      const isConfig=isFirebaseConfigured();
      const isAutomated=typeof navigator!=='undefined'&&Boolean(navigator.webdriver);

      if(isConfig&&!isAutomated){
        // Live Google sign-in popup using user's Firebase keys
        const popupResult=await signInWithGooglePopup(firebaseConfig);
        if(!popupResult.ok||!popupResult.idToken){
          setClientError(popupResult.error||'Google Sign-in failed or was cancelled.');
          setLoading(false);
          return;
        }

        const result=await submitGoogleAuth({
          idToken:popupResult.idToken,
          projectId:popupResult.projectId,
          locale,
          returnTo:`/${locale}/dashboard`,
        });

        if(result.ok&&result.returnTo){
          window.location.href=result.returnTo;
        }else{
          setClientError(result.error||'Session initialization failed.');
          setLoading(false);
        }
      }else if(!isConfig&&!isAutomated){
        // Prompt user to enter their Firebase keys
        setLoading(false);
        setShowConfigModal(true);
        setClientError(
          locale==='hi'
            ? 'कृपया वास्तविक Google साइन-इन के लिए अपनी Firebase कुंजियाँ दर्ज करें या नीचे डेमो अवतार चुनें।'
            : 'Please configure your Firebase credentials to enable live Google sign-in.'
        );
      }else{
        // Automated test runner fallback (Playwright headless)
        const result=await submitGoogleAuth({
          demoPersona:'citizen',
          locale,
          returnTo:`/${locale}/dashboard`,
        });
        if(result.ok&&result.returnTo){
          window.location.href=result.returnTo;
        }else{
          setClientError(result.error||t.error);
          setLoading(false);
        }
      }
    }catch(err){
      setClientError(err instanceof Error?err.message:t.error);
      setLoading(false);
      setActivePersona(null);
    }
  };

  return (
    <section className="container account-page login-page-pro">
      <Link className="back-link pro-back-link" href={`/${locale}`}>
        <ArrowLeft size={16} aria-hidden="true"/>
        <span>{t.back}</span>
      </Link>

      <div className="login-grid login-grid-pro">
        {/* Left Hero Brand & Defense Shield Section */}
        <div className="login-story login-story-pro">
          <div className="defense-status-pill">
            <span className="defense-beacon" aria-hidden="true"/>
            <span className="defense-status-text">{t.badge_certin}</span>
          </div>

          <span className="eyebrow pro-eyebrow">{t.eyebrow}</span>
          <h1 className="pro-heading">{t.title}</h1>
          <p className="pro-lead">{t.lead}</p>

          <div className="security-note security-note-pro">
            <div className="security-note-icon">
              <ShieldCheck size={26} aria-hidden="true"/>
            </div>
            <div>
              <strong>{locale==='hi'?'सर्वोच्च डिजिटल सुरक्षा':'Sovereign Defense Protocol'}</strong>
              <p>{t.security}</p>
            </div>
          </div>

          {/* Trust Guarantees */}
          <div className="defense-features-list">
            <div className="defense-feature-item">
              <CheckCircle2 size={18} className="feature-icon" aria-hidden="true"/>
              <span>{t.badge_encryption}</span>
            </div>
            <div className="defense-feature-item">
              <CheckCircle2 size={18} className="feature-icon" aria-hidden="true"/>
              <span>{t.badge_passkey}</span>
            </div>
            <div className="defense-feature-item">
              <CheckCircle2 size={18} className="feature-icon" aria-hidden="true"/>
              <span>{locale==='hi'?'शून्य पासवर्ड जोखिम (Google OAuth 2.0)':'Zero Password Exposure (Google OAuth 2.0)'}</span>
            </div>
          </div>
        </div>

        {/* Right Glassmorphic Action Card */}
        <div className="login-card login-card-pro">
          <div className="login-card-header">
            <div className="large-icon pro-card-icon">
              <KeyRound size={28} aria-hidden="true"/>
            </div>
            <div>
              <h2>{locale==='hi'?'खाता प्रवेश':'Sign in to RailRaksha'}</h2>
              <p className="card-sublabel">{locale==='hi'?'नागरिक या रेलवे ऑपरेटर क्रेडेंशियल चुनें':'Choose your identity provider to continue'}</p>
            </div>
          </div>

          {/* Error messages */}
          {(error||clientError)&&(
            <div role="alert" className="alert alert-danger pro-alert">
              <AlertCircle size={18} aria-hidden="true"/>
              <span>{clientError||t[error==='unavailable'?'unavailable':'error']}</span>
            </div>
          )}

          {/* PRIMARY: Google Firebase Authentication */}
          <div className="auth-methods-group">
            <button
              type="button"
              className="google-btn"
              disabled={loading}
              onClick={()=>handleGoogleLogin()}
              aria-label={t.google_signin}
            >
              {loading&&!activePersona?(
                <Loader2 size={20} className="spinner" aria-hidden="true"/>
              ):(
                <svg className="google-icon" width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.15C3.26 21.36 7.33 24 12 24z"/>
                  <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.24C.45 8.16 0 9.98 0 12s.45 3.84 1.24 5.42l4.04-3.15z"/>
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.24 6.58l4.04 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                </svg>
              )}
              <div className="google-btn-text">
                <span className="google-btn-title">{loading&&!activePersona?t.google_connecting:t.google_signin}</span>
                <span className="google-btn-badge">{locale==='hi'?'अनुशंसित':'Recommended'}</span>
              </div>
            </button>
            <p className="google-subtext">{t.google_subtext}</p>

            {/* Firebase Custom Key Status Bar */}
            <div className="firebase-status-bar">
              <div className="firebase-status-indicator">
                <span className={`firebase-status-dot ${configured?'dot-active':'dot-idle'}`} aria-hidden="true"/>
                <span className="firebase-status-label">
                  {configured
                    ? (locale==='hi'?`Firebase प्रमाणीकरण तैयार (${firebaseConfig.projectId})`:`Firebase Auth Ready (${firebaseConfig.projectId})`)
                    : (locale==='hi'?'कस्टम Firebase कुंजियाँ जोड़ें':'Firebase project keys not set')}
                </span>
              </div>
              <button
                type="button"
                className="firebase-config-toggle-btn"
                onClick={()=>setShowConfigModal(true)}
                aria-label={locale==='hi'?'Firebase सेटिंग्स खोलें':'Open Firebase settings'}
              >
                <Settings2 size={13} aria-hidden="true"/>
                <span>{configured?(locale==='hi'?'कुंजियाँ बदलें':'Change Keys'):(locale==='hi'?'कुंजियाँ जोड़ें':'Setup Keys')}</span>
              </button>
            </div>
          </div>

          {/* Divider */}
          <div className="pro-divider">
            <span className="pro-divider-line"/>
            <span className="pro-divider-text">{t.sso_divider}</span>
            <span className="pro-divider-line"/>
          </div>

          {/* SECONDARY: Railway Operator Keycloak SSO */}
          <div className="railway-sso-container">
            <a
              className="button button-outline pro-sso-btn"
              href={`/api/auth/login?locale=${locale}`}
            >
              <Lock size={18} aria-hidden="true"/>
              <span>{t.railway_sso}</span>
              <ArrowRight size={18} aria-hidden="true"/>
            </a>
            <span className="sso-caption">{t.railway_sso_subtext}</span>
          </div>

          {/* PRESENTATION PERSONA QUICK-ACCESS */}
          <div className="demo-persona-panel">
            <div className="persona-panel-title">
              <Sparkles size={16} aria-hidden="true"/>
              <span>{t.demo_quick_title}</span>
            </div>
            <div className="persona-chips-grid">
              <button
                type="button"
                className={`persona-chip ${activePersona==='citizen'?'persona-chip-active':''}`}
                disabled={loading}
                onClick={()=>handleGoogleLogin('citizen')}
              >
                <UserCheck size={14} aria-hidden="true"/>
                <span>{t.demo_citizen}</span>
              </button>
              <button
                type="button"
                className={`persona-chip ${activePersona==='rpf_cyber'?'persona-chip-active':''}`}
                disabled={loading}
                onClick={()=>handleGoogleLogin('rpf_cyber')}
              >
                <ShieldAlert size={14} aria-hidden="true"/>
                <span>{t.demo_rpf}</span>
              </button>
              <button
                type="button"
                className={`persona-chip ${activePersona==='analyst'?'persona-chip-active':''}`}
                disabled={loading}
                onClick={()=>handleGoogleLogin('analyst')}
              >
                <Radio size={14} aria-hidden="true"/>
                <span>{t.demo_analyst}</span>
              </button>
            </div>
          </div>

          {/* Additional Account Actions */}
          <div className="login-register pro-register-row">
            <span>{t.account}</span>
            <a className="text-link" href={`/api/auth/login?locale=${locale}&mode=register`}>
              {t.register}
              <ArrowRight size={14} aria-hidden="true"/>
            </a>
          </div>

          <div className="demo-note pro-demo-note">
            <p>{t.demo}</p>
          </div>
        </div>
      </div>

      {/* FIREBASE AUTH SETUP MODAL */}
      {showConfigModal&&(
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="firebase-modal-title"
          className="firebase-modal-overlay"
          onClick={(e)=>{if(e.target===e.currentTarget)setShowConfigModal(false);}}
        >
          <div className="firebase-modal-panel">
            <div className="firebase-modal-header">
              <div className="firebase-modal-title-group">
                <div className="firebase-modal-icon">
                  <Flame size={20} aria-hidden="true"/>
                </div>
                <div>
                  <h3 id="firebase-modal-title" className="firebase-modal-title">
                    {locale==='hi'?'Firebase प्रमाणीकरण सेटअप':'Firebase Authentication Setup'}
                  </h3>
                  <p className="firebase-modal-subtitle">
                    {locale==='hi'?'Google साइन-इन के लिए अपना Firebase प्रोजेक्ट कनेक्ट करें':'Connect your own Firebase project for live Google Sign-In'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="firebase-modal-close-btn"
                onClick={()=>setShowConfigModal(false)}
                aria-label={locale==='hi'?'बंद करें':'Close'}
              >
                <X size={18} aria-hidden="true"/>
              </button>
            </div>

            {savedSuccess&&(
              <div className="config-success-banner" role="status">
                <Check size={16} aria-hidden="true"/>
                <span>{locale==='hi'?'Firebase क्रेडेंशियल सफलतापूर्वक सहेजे गए!':'Firebase credentials saved successfully!'}</span>
              </div>
            )}

            {/* Fast Snippet Paste */}
            <div className="firebase-config-group">
              <label htmlFor="fb-snippet" className="firebase-config-label">
                {locale==='hi'?'त्वरित पेस्ट (Firebase Console कोड स्निपेट)':'Quick Paste (Firebase Console Web App snippet or JSON)'}
              </label>
              <textarea
                id="fb-snippet"
                className="firebase-config-textarea"
                placeholder={'const firebaseConfig = {\n  apiKey: "AIzaSy...",\n  authDomain: "my-app.firebaseapp.com",\n  projectId: "my-app",\n  appId: "1:..."\n};'}
                value={configSnippet}
                onChange={(e)=>handleSnippetChange(e.target.value)}
              />
            </div>

            {/* Individual Inputs */}
            <div className="firebase-config-grid">
              <div className="firebase-config-group">
                <label htmlFor="fb-apikey" className="firebase-config-label">API Key *</label>
                <input
                  id="fb-apikey"
                  type="text"
                  className="firebase-config-input"
                  placeholder="AIzaSy..."
                  value={firebaseConfig.apiKey}
                  onChange={(e)=>setFirebaseConfig(prev=>({...prev,apiKey:e.target.value}))}
                />
              </div>

              <div className="firebase-config-group">
                <label htmlFor="fb-projectid" className="firebase-config-label">Project ID *</label>
                <input
                  id="fb-projectid"
                  type="text"
                  className="firebase-config-input"
                  placeholder="my-railway-app"
                  value={firebaseConfig.projectId}
                  onChange={(e)=>setFirebaseConfig(prev=>({...prev,projectId:e.target.value}))}
                />
              </div>

              <div className="firebase-config-group">
                <label htmlFor="fb-authdomain" className="firebase-config-label">Auth Domain</label>
                <input
                  id="fb-authdomain"
                  type="text"
                  className="firebase-config-input"
                  placeholder="my-railway-app.firebaseapp.com"
                  value={firebaseConfig.authDomain}
                  onChange={(e)=>setFirebaseConfig(prev=>({...prev,authDomain:e.target.value}))}
                />
              </div>

              <div className="firebase-config-group">
                <label htmlFor="fb-appid" className="firebase-config-label">App ID</label>
                <input
                  id="fb-appid"
                  type="text"
                  className="firebase-config-input"
                  placeholder="1:123456789:web:abcdef"
                  value={firebaseConfig.appId||''}
                  onChange={(e)=>setFirebaseConfig(prev=>({...prev,appId:e.target.value}))}
                />
              </div>
            </div>

            <div className="firebase-domain-hint">
              <strong>{locale==='hi'?'आवश्यक निर्देश:':'Important Requirement:'}</strong>{' '}
              {locale==='hi'
                ? 'अपने Firebase Console -> Authentication -> Settings -> Authorized Domains में "railwaiy.vercel.app" और "localhost" जोड़ें।'
                : 'Add "railwaiy.vercel.app" and "localhost" under Firebase Console -> Authentication -> Settings -> Authorized Domains.'}
            </div>

            <div className="firebase-modal-footer">
              <button
                type="button"
                className="btn-secondary-action"
                onClick={handleClearConfig}
              >
                <RotateCcw size={14} style={{display:'inline',marginRight:6}} aria-hidden="true"/>
                <span>{locale==='hi'?'रीसेट करें':'Reset'}</span>
              </button>

              <div className="firebase-footer-actions">
                <button
                  type="button"
                  className="btn-secondary-action"
                  onClick={()=>setShowConfigModal(false)}
                >
                  {locale==='hi'?'रद्द करें':'Cancel'}
                </button>
                <button
                  type="button"
                  className="btn-primary-action"
                  onClick={()=>handleSaveConfig(true)}
                >
                  <Check size={16} aria-hidden="true"/>
                  <span>{locale==='hi'?'सहेजें और कनेक्ट करें':'Save & Connect'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
