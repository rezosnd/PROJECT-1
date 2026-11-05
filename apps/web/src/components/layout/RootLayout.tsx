import React, { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Header } from './Header';
import { Navigation } from './Navigation';
import { OfflineBanner } from './OfflineBanner';
import { useAuthStore } from '../../lib/auth/auth-store';

export const RootLayout: React.FC = () => {
  const { checkSession, user, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    const needsProfile =
      user.role === 'PATIENT' && (user.needsProfileSetup || user.profileComplete === false);
    if (needsProfile && location.pathname !== '/onboarding' && location.pathname !== '/login') {
      navigate('/onboarding', { replace: true });
    }
  }, [isAuthenticated, user, location.pathname, navigate]);

  const isAuthChromeFree =
    location.pathname === '/login' || location.pathname === '/onboarding';

  if (isAuthChromeFree) {
    return (
      <div className="ll-shell min-h-screen antialiased overflow-x-hidden">
        <div className="ll-orb w-[420px] h-[420px] bg-[#A8E017]/25 -top-24 -left-20 animate-glass-float" />
        <div className="ll-orb w-[360px] h-[360px] bg-[#0B3D1A]/10 top-1/3 -right-24" />
        <OfflineBanner />
        <main id="main-content" tabIndex={-1} className="relative z-10 min-h-screen focus:outline-none">
          <Outlet />
        </main>
      </div>
    );
  }

  return (
    <div className="ll-shell flex flex-col antialiased overflow-x-hidden">
      <div className="ll-orb w-[480px] h-[480px] bg-[#A8E017]/22 -top-32 left-1/4 animate-glass-float" />
      <div className="ll-orb w-[380px] h-[380px] bg-[#0B3D1A]/08 bottom-0 right-0" />
      <OfflineBanner />

      <div className="relative z-10 flex-1 flex w-full min-h-screen">
        <Navigation />

        <div className="flex-1 flex flex-col min-w-0 bg-transparent">
          <Header />

          <main
            id="main-content"
            tabIndex={-1}
            className="flex-1 w-full max-w-[1200px] mx-auto px-4 sm:px-5 lg:px-8 pt-3 lg:pt-4 pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-10 focus:outline-none"
          >
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};
