'use client';

import {useState} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {ArrowLeft,ArrowRight,ShieldCheck,Lock,KeyRound,Sparkles,CheckCircle2,AlertCircle,Loader2,ShieldAlert,UserCheck,Radio} from 'lucide-react';
import {submitGoogleAuth} from '@/lib/firebase';

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

  const handleGoogleLogin=async(demoPersona?:'citizen'|'verified_reporter'|'rpf_cyber'|'analyst')=>{
    try{
      setLoading(true);
      setClientError(null);
      if(demoPersona)setActivePersona(demoPersona);

      const result=await submitGoogleAuth({
        demoPersona:demoPersona||'citizen',
        locale,
        returnTo:`/${locale}/dashboard`,
      });

      if(result.ok&&result.returnTo){
        router.push(result.returnTo);
      }else{
        setClientError(result.error||t.error);
        setLoading(false);
        setActivePersona(null);
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
              onClick={()=>handleGoogleLogin('citizen')}
              aria-label={t.google_signin}
            >
              {loading&&(!activePersona||activePersona==='citizen')?(
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
                <span className="google-btn-title">{loading&&(!activePersona||activePersona==='citizen')?t.google_connecting:t.google_signin}</span>
                <span className="google-btn-badge">{locale==='hi'?'अनुशंसित':'Recommended'}</span>
              </div>
            </button>
            <p className="google-subtext">{t.google_subtext}</p>
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
    </section>
  );
}
