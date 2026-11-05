import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { changeLanguage } from '../../i18n';
import { useAuthStore } from '../../lib/auth/auth-store';
import {
  Globe,
  User,
  LogOut,
  ChevronDown,
  Bell,
  Search,
  Sparkles,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { useSidebarStore } from '../../lib/ui/sidebar-store';

export const Header: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { collapsed, toggle } = useSidebarStore();
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [query, setQuery] = useState('');

  const currentLang = i18n.language || 'en';
  const role = user?.role;
  const isHospital = role === 'HOSPITAL_STAFF' || role === 'HOSPITAL_ADMIN';
  const isCityAdmin = role === 'CITY_ADMIN';

  /** Home already has app-style identity header — hide chrome there on phone */
  const hideMobileChrome =
    location.pathname === '/' ||
    location.pathname === '/onboarding' ||
    location.pathname === '/login';

  const languages = [
    { code: 'en' as const, label: 'EN', full: 'English' },
    { code: 'hi' as const, label: 'हिं', full: 'हिन्दी' },
    { code: 'or' as const, label: 'ଓଡ଼ି', full: 'ଓଡ଼ିଆ' },
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    navigate(`/results?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <>
      {/* Desktop header */}
      <header className="hidden lg:block sticky top-0 z-30 px-4 sm:px-6 lg:px-8 pt-4 pb-2 bg-transparent">
        <div className="max-w-[1200px] mx-auto flex items-center gap-3 ll-glass-strong rounded-[22px] px-3 py-2.5 border border-white/50">
          <button
            type="button"
            onClick={toggle}
            className="w-11 h-11 rounded-2xl ll-glass border border-white/60 flex items-center justify-center text-muted hover:text-ink hover:bg-white/50 transition cursor-pointer shrink-0"
            aria-label={collapsed ? 'Open sidebar' : 'Close sidebar'}
            title={collapsed ? 'Open menu' : 'Close menu'}
          >
            {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>

          <form onSubmit={handleSearch} className="relative flex-1 max-w-xl">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="ll-search pl-10"
              placeholder="Search condition, hospital, or doctor..."
              aria-label="Search"
            />
          </form>

          <button
            type="button"
            onClick={() => navigate('/abha')}
            className="inline-flex items-center gap-2 h-11 px-4 rounded-2xl bg-white border border-hairline text-xs font-bold text-ink hover:bg-card-soft transition shadow-soft"
          >
            <Sparkles className="w-4 h-4 text-teal" />
            ABHA
          </button>

          <div className="relative">
            <button
              onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
              className="inline-flex items-center gap-1.5 h-11 px-3 bg-white hover:bg-card-soft text-ink rounded-2xl text-xs font-bold border border-hairline transition shadow-soft"
              aria-label="Change Language"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{languages.find((l) => l.code === currentLang)?.label || 'EN'}</span>
              <ChevronDown className="w-3 h-3 text-muted" />
            </button>
            {isLangMenuOpen && (
              <div className="absolute right-0 mt-2 w-36 bg-surface rounded-2xl shadow-float border border-hairline p-1.5 z-50">
                {languages.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => {
                      changeLanguage(l.code);
                      setIsLangMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs rounded-xl font-semibold ${
                      currentLang === l.code ? 'bg-ink text-white' : 'hover:bg-card-soft text-ink'
                    }`}
                  >
                    {l.full}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            className="relative w-11 h-11 rounded-2xl bg-white border border-hairline flex items-center justify-center text-ink hover:bg-card-soft transition shadow-soft"
            aria-label="Notifications"
            onClick={() => navigate('/requests')}
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-orange" />
          </button>

          {isAuthenticated && user ? (
            <div className="flex items-center gap-2">
              <Link
                to="/profile"
                className="flex items-center gap-2 h-11 pl-1.5 pr-3 bg-white rounded-2xl border border-hairline hover:bg-card-soft transition shadow-soft"
              >
                {user.pictureUrl || user.abhaPhotoUrl ? (
                  <img
                    src={user.abhaPhotoUrl || user.pictureUrl || ''}
                    alt=""
                    className="w-8 h-8 rounded-xl object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-xl bg-ink text-white text-xs font-bold flex items-center justify-center">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="text-xs font-bold text-ink truncate max-w-[110px]">{user.name}</span>
              </Link>
              <button
                onClick={async () => {
                  await logout();
                  navigate('/login');
                }}
                title="Logout"
                className="w-11 h-11 rounded-2xl bg-white border border-hairline flex items-center justify-center text-muted hover:text-red hover:bg-red-light transition shadow-soft"
                aria-label="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 h-11 px-5 bg-ink text-white text-xs font-bold rounded-2xl hover:bg-ink-light transition shadow-soft"
            >
              <User className="w-3.5 h-3.5" />
              <span>{t('nav.login')}</span>
            </Link>
          )}
        </div>
      </header>

      {/* Mobile app top bar — slim, only when page isn't already app-headed */}
      {!hideMobileChrome && (
        <header className="lg:hidden sticky top-0 z-30 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2 bg-[#F8FAFC]/95 backdrop-blur-md border-b border-slate-100">
          <div className="flex items-center gap-3 max-w-lg mx-auto">
            <Link
              to={isCityAdmin ? '/admin' : isHospital ? '/hospital' : '/'}
              className="flex items-center gap-2 shrink-0"
            >
              <div className="w-9 h-9 rounded-2xl bg-ink text-white flex items-center justify-center font-display font-bold text-sm">
                LL
              </div>
            </Link>
            <form onSubmit={handleSearch} className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full h-10 rounded-2xl bg-white border border-slate-200 pl-9 pr-3 text-sm text-ink placeholder:text-slate-400 focus:outline-none focus:border-slate-300"
                placeholder="Search hospitals…"
                aria-label="Search"
              />
            </form>
            <button
              type="button"
              className="relative w-10 h-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center"
              aria-label="Notifications"
              onClick={() => navigate('/requests')}
            >
              <Bell className="w-4 h-4 text-ink" />
              <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-orange" />
            </button>
          </div>
        </header>
      )}
    </>
  );
};
