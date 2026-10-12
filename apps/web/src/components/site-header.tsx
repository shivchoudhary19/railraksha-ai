'use client';

import {useState,useEffect} from 'react';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {
  ArrowUpRight,
  ShieldCheck,
  User,
  LogOut,
  Menu,
  X,
  LayoutDashboard,
  Settings,
  Shield,
  CheckCircle2,
} from 'lucide-react';
import {canOperate,type Session} from '@railraksha/schemas';
import {Brand} from '@/components/brand';
import {Controls} from '@/components/controls';

export interface SiteHeaderProps {
  locale: string;
  initialSession: Session | null;
  tagline: string;
  translations: {
    about: string;
    how: string;
    tips: string;
    login: string;
    dashboard: string;
    logout: string;
    profile: string;
    operator: string;
    scams: string;
    contact: string;
    languageLabel: string;
    themeLabel: string;
    skip: string;
  };
}

export function SiteHeader({
  locale,
  initialSession,
  tagline,
  translations: t,
}: SiteHeaderProps) {
  const [session, setSession] = useState<Session | null>(initialSession);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  // Close mobile menu whenever pathname changes
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Sync session client-side to ensure zero delay on SPA route changes
  useEffect(() => {
    let mounted = true;
    const fetchSession = async () => {
      try {
        const res = await fetch('/api/auth/session', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (mounted) {
            setSession(data.authenticated && data.session ? data.session : null);
          }
        }
      } catch {
        // Fall back to initialSession
      }
    };
    fetchSession();

    const handleAuthChange = () => fetchSession();
    window.addEventListener('railraksha-auth-changed', handleAuthChange);
    return () => {
      mounted = false;
      window.removeEventListener('railraksha-auth-changed', handleAuthChange);
    };
  }, []);

  const isOperator = session ? canOperate(session.roles) : false;
  const firstName = session?.name ? session.name.split(' ')[0] : '';

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Brand locale={locale} tagline={tagline} />

        {/* Desktop Navigation Links */}
        <nav
          className="main-nav desktop-nav"
          aria-label={locale === 'hi' ? 'मुख्य नेविगेशन' : 'Main navigation'}
        >
          <Link href={`/${locale}/about`} className={pathname === `/${locale}/about` ? 'active' : ''}>
            {t.about}
          </Link>
          <Link
            href={`/${locale}/how-it-works`}
            className={pathname === `/${locale}/how-it-works` ? 'active' : ''}
          >
            {t.how}
          </Link>
          <Link
            href={`/${locale}/safety-tips`}
            className={pathname === `/${locale}/safety-tips` ? 'active' : ''}
          >
            {t.tips}
          </Link>
          {isOperator && (
            <Link
              href={`/${locale}/operator`}
              className={`operator-nav-link ${pathname === `/${locale}/operator` ? 'active' : ''}`}
            >
              <Shield size={14} aria-hidden="true" />
              <span>{t.operator}</span>
            </Link>
          )}
        </nav>

        {/* Desktop Header Actions */}
        <div className="header-actions">
          <Controls locale={locale} languageLabel={t.languageLabel} themeLabel={t.themeLabel} />

          {session ? (
            <div className="auth-header-group">
              <Link
                className="button button-small user-account-button"
                href={`/${locale}/dashboard`}
                title={session.name}
              >
                <span className="user-status-dot" aria-hidden="true" />
                <span className="user-short-name">{firstName || t.dashboard}</span>
                <ArrowUpRight size={15} aria-hidden="true" />
              </Link>
              <form method="POST" action="/api/auth/logout" className="header-logout-form">
                <input type="hidden" name="csrf" value={session.csrf} />
                <input type="hidden" name="locale" value={locale} />
                <button
                  type="submit"
                  className="header-logout-btn"
                  title={locale === 'hi' ? 'लॉग आउट' : 'Log out'}
                  aria-label={locale === 'hi' ? 'लॉग आउट' : 'Log out'}
                >
                  <LogOut size={16} aria-hidden="true" />
                  <span className="logout-text">{locale === 'hi' ? 'लॉग आउट' : 'Log out'}</span>
                </button>
              </form>
            </div>
          ) : (
            <Link className="button button-small" href={`/${locale}/login`}>
              {t.login}
              <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          )}

          {/* Mobile Menu Hamburger Toggle */}
          <button
            type="button"
            className="mobile-menu-toggle"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          >
            {menuOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Navigation Panel */}
      {menuOpen && (
        <div className="mobile-drawer-overlay" onClick={() => setMenuOpen(false)}>
          <div
            className="mobile-drawer-panel"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={locale === 'hi' ? 'मोबाइल नेविगेशन मेन्यू' : 'Mobile navigation menu'}
          >
            {/* User Session Banner (if logged in) */}
            {session ? (
              <div className="mobile-user-card">
                <div className="mobile-user-header">
                  <div className="mobile-user-avatar">
                    <User size={18} aria-hidden="true" />
                  </div>
                  <div className="mobile-user-info">
                    <span className="mobile-user-name">{session.name}</span>
                    <span className="mobile-user-email">{session.email}</span>
                  </div>
                </div>
                <div className="mobile-user-badge">
                  <CheckCircle2 size={13} aria-hidden="true" />
                  <span>
                    {isOperator
                      ? locale === 'hi'
                        ? 'रेलवे सुरक्षा ऑपरेटर'
                        : 'Railway Security Operator'
                      : locale === 'hi'
                        ? 'प्रमाणित नागरिक'
                        : 'Verified Citizen'}
                  </span>
                </div>
                <div className="mobile-user-links">
                  <Link
                    href={`/${locale}/dashboard`}
                    className="mobile-quick-link"
                    onClick={() => setMenuOpen(false)}
                  >
                    <LayoutDashboard size={16} aria-hidden="true" />
                    <span>{t.dashboard}</span>
                  </Link>
                  <Link
                    href={`/${locale}/profile`}
                    className="mobile-quick-link"
                    onClick={() => setMenuOpen(false)}
                  >
                    <Settings size={16} aria-hidden="true" />
                    <span>{t.profile}</span>
                  </Link>
                  {isOperator && (
                    <Link
                      href={`/${locale}/operator`}
                      className="mobile-quick-link"
                      onClick={() => setMenuOpen(false)}
                    >
                      <Shield size={16} aria-hidden="true" />
                      <span>{t.operator}</span>
                    </Link>
                  )}
                </div>
              </div>
            ) : (
              <div className="mobile-guest-card">
                <Link
                  href={`/${locale}/login`}
                  className="button mobile-login-btn"
                  onClick={() => setMenuOpen(false)}
                >
                  <span>{t.login}</span>
                  <ArrowUpRight size={17} aria-hidden="true" />
                </Link>
              </div>
            )}

            {/* Mobile Nav Links */}
            <nav className="mobile-nav-list" aria-label="Mobile links">
              <Link
                href={`/${locale}/about`}
                className="mobile-nav-item"
                onClick={() => setMenuOpen(false)}
              >
                {t.about}
              </Link>
              <Link
                href={`/${locale}/how-it-works`}
                className="mobile-nav-item"
                onClick={() => setMenuOpen(false)}
              >
                {t.how}
              </Link>
              <Link
                href={`/${locale}/safety-tips`}
                className="mobile-nav-item"
                onClick={() => setMenuOpen(false)}
              >
                {t.tips}
              </Link>
              <Link
                href={`/${locale}/scams`}
                className="mobile-nav-item"
                onClick={() => setMenuOpen(false)}
              >
                {t.scams}
              </Link>
              <Link
                href={`/${locale}/contact`}
                className="mobile-nav-item"
                onClick={() => setMenuOpen(false)}
              >
                {t.contact}
              </Link>
            </nav>

            {/* Mobile Sign Out Button */}
            {session && (
              <div className="mobile-drawer-footer">
                <form method="POST" action="/api/auth/logout">
                  <input type="hidden" name="csrf" value={session.csrf} />
                  <input type="hidden" name="locale" value={locale} />
                  <button type="submit" className="button button-outline mobile-logout-btn">
                    <LogOut size={16} aria-hidden="true" />
                    <span>{locale === 'hi' ? 'लॉग आउट' : 'Log out'}</span>
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
