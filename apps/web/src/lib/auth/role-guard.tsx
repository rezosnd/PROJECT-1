import React from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { useAuthStore, UserRole } from './auth-store';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

interface RequireRoleProps {
  roles: UserRole[];
  children: React.ReactNode;
}

export const RequireRole: React.FC<RequireRoleProps> = ({ roles, children }) => {
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-10 h-10 border-4 border-ink/20 border-t-ink rounded-full animate-spin mb-4" />
        <p className="text-muted text-sm font-medium">Verifying authorization...</p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!roles.includes(user.role)) {
    const home =
      user.role === 'CITY_ADMIN'
        ? '/admin'
        : user.role === 'HOSPITAL_STAFF' || user.role === 'HOSPITAL_ADMIN'
        ? '/hospital'
        : '/';
    const homeLabel =
      home === '/admin'
        ? 'City Command'
        : home === '/hospital'
        ? 'Hospital Dashboard'
        : 'Patient Home';
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
        <div className="w-16 h-16 rounded-full bg-red-light text-red flex items-center justify-center mb-6">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold font-display text-ink mb-2">Access Restricted</h1>
        <p className="text-muted text-sm mb-6 leading-relaxed">
          Your account role (<span className="font-semibold text-ink">{user.role}</span>) does not have clearance for this operational zone.
        </p>
        <Link
          to={home}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-ink text-white font-medium rounded-pill hover:bg-ink-light transition-all shadow-soft"
        >
          <ArrowLeft className="w-4 h-4" />
          Go to {homeLabel}
        </Link>
      </div>
    );
  }

  return <>{children}</>;
};

export const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-ink/20 border-t-ink rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

