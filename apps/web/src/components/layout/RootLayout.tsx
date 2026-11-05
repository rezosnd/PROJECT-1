import React, { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Header } from './Header';
import { Navigation } from './Navigation';
import { OfflineBanner } from './OfflineBanner';
import { PageTransition } from './PageTransition';
import { useAuthStore } from '../../lib/auth/auth-store';

export const RootLayout: React.FC = () => {
  const { checkSession, user, isAuthenticated, isLoading } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  useEffect(() => {
    if (isLoading || !isAuthenticated || !user) return;
    const needsProfile =
      user.role === 'PATIENT' && (user.needsProfileSetup || user.profileComplete === false);
    if (needsProfile && location.pathname !== '/onboarding' && location.pathname !== '/login') {
      navigate('/onboarding', { replace: true });
      return;
    }
    // Logged-in users stuck on /login → send them home
    if (location.pathname === '/login') {
      const dest =
        user.role === 'CITY_ADMIN'
          ? '/admin'
          : user.role === 'HOSPITAL_STAFF' || user.role === 'HOSPITAL_ADMIN'
            ? '/hospital'
            : needsProfile
              ? '/onboarding'
              : '/';
      navigate(dest, { replace: true });
    }
  }, [isLoading, isAuthenticated, user, location.pathname, navigate]);

  const isAuthChromeFree =
    location.pathname === '/login' || location.pathname === '/onboarding';

  if (isAuthChromeFree) {
    return (
      <div className="ll-shell min-h-[100dvh] antialiased overflow-x-hidden">
        <OfflineBanner />
        <main id="main-content" tabIndex={-1} className="relative z-10 min-h-[100dvh] focus:outline-none">
          <Outlet />
        </main>
      </div>
    );
  }

  return (
    <div className="ll-shell flex flex-col antialiased overflow-x-hidden min-h-[100dvh]">
      <div className="ll-orb w-[420px] h-[420px] bg-[#F0B48A]/35 -top-32 left-[15%] hidden sm:block" />
      <div className="ll-orb w-[380px] h-[380px] bg-[#9ED4B8]/30 top-20 -right-16 hidden sm:block" />
      <div className="ll-orb w-[320px] h-[320px] bg-[#C8C4D8]/25 bottom-10 left-10 hidden lg:block" />
      <OfflineBanner />

      <div className="relative z-10 flex-1 flex w-full min-h-[100dvh]">
        <Navigation />

        <div className="flex-1 flex flex-col min-w-0 bg-transparent overflow-x-hidden">
          <Header />

          <main
            id="main-content"
            tabIndex={-1}
            className="flex-1 w-full max-w-[1200px] mx-auto px-3 xs:px-4 sm:px-5 lg:px-8 pt-2 sm:pt-3 lg:pt-4 pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-10 focus:outline-none overflow-x-hidden"
          >
            <PageTransition>
              <Outlet />
            </PageTransition>
          </main>
        </div>
      </div>
    </div>
  );
};
