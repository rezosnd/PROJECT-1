import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore, UserRole } from '../../lib/auth/auth-store';
import {
  ArrowLeft,
  User,
  Building2,
  Shield,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { BrandMark } from '../../components/brand/BrandMark';

const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  '1050173417910-28c0irqqh1nhaurmognqn01c9ocvo6pb.apps.googleusercontent.com';

const HOSPITALS = [
  { id: '3256d42a-2dfe-4e1f-9d9d-867997d53d2a', name: 'AIIMS Bhubaneswar' },
  { id: '0f7fafb8-7f8c-4567-acf1-e9d3ca8847e3', name: 'KIMS Hospital' },
  { id: 'e66d5397-2a29-4885-a964-56861611786d', name: 'SUM Ultimate Medicare' },
  { id: '2f462f84-d929-4cc4-8920-3b4bf7803c2e', name: 'Kalinga Hospital' },
  { id: '4f0a4313-9cfa-475c-8106-66f3d0a676d2', name: 'Capital Hospital (Govt)' },
  { id: 'b5b618f5-15e9-4731-b342-f9680a48e5eb', name: 'Apollo Bhubaneswar' },
];

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { loginWithGoogleCredential, isAuthenticated, user, error: authError } = useAuthStore();

  const [selectedPortal, setSelectedPortal] = useState<'PATIENT' | 'HOSPITAL' | 'CITY_ADMIN'>('PATIENT');
  const [selectedHospitalId, setSelectedHospitalId] = useState(HOSPITALS[0].id);
  const [hospitalRoleType, setHospitalRoleType] = useState<'HOSPITAL_STAFF' | 'HOSPITAL_ADMIN'>(
    'HOSPITAL_STAFF'
  );
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [gisRendered, setGisRendered] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const btnHostRef = useRef<HTMLDivElement>(null);

  const fromRaw = (location.state as any)?.from?.pathname as string | undefined;

  const targetRole: UserRole =
    selectedPortal === 'CITY_ADMIN'
      ? 'CITY_ADMIN'
      : selectedPortal === 'HOSPITAL'
        ? hospitalRoleType
        : 'PATIENT';

  const targetHospital = selectedPortal === 'HOSPITAL' ? selectedHospitalId : null;

  const targetRoleRef = useRef(targetRole);
  const targetHospitalRef = useRef(targetHospital);
  useEffect(() => {
    targetRoleRef.current = targetRole;
    targetHospitalRef.current = targetHospital;
  }, [targetRole, targetHospital]);

  const homeForUser = (u: { role: UserRole; needsProfileSetup?: boolean; profileComplete?: boolean }) => {
    if (u.role === 'CITY_ADMIN') return '/admin';
    if (u.role === 'HOSPITAL_STAFF' || u.role === 'HOSPITAL_ADMIN') return '/hospital';
    if (u.needsProfileSetup || u.profileComplete === false) return '/onboarding';
    // Never bounce back to login/auth screens
    if (fromRaw && fromRaw !== '/login' && fromRaw !== '/onboarding') return fromRaw;
    return '/';
  };

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    navigate(homeForUser(user), { replace: true });
  }, [isAuthenticated, user, navigate, fromRaw]);

  useEffect(() => {
    let checkInterval: ReturnType<typeof setInterval> | null = null;

    const tryRenderGIS = () => {
      const windowGoogle = (window as any).google;
      const btnContainer = btnHostRef.current;
      if (windowGoogle?.accounts?.id && btnContainer) {
        windowGoogle.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          ux_mode: 'popup',
          cancel_on_tap_outside: true,
          auto_select: false,
          callback: async (response: any) => {
            if (!response.credential) return;
            setIsLoggingIn(true);
            setLocalError(null);
            try {
              await loginWithGoogleCredential(response.credential, {
                requestedRole: targetRoleRef.current,
                hospitalId: targetHospitalRef.current,
              });
              const u = useAuthStore.getState().user;
              if (u) {
                navigate(homeForUser(u), { replace: true });
              }
            } catch (err: any) {
              setLocalError(
                err.response?.data?.error?.message || err.message || 'Google sign-in failed'
              );
            } finally {
              setIsLoggingIn(false);
            }
          },
        });

        const width = Math.min(340, Math.max(260, btnContainer.clientWidth || 300));
        btnContainer.innerHTML = '';
        windowGoogle.accounts.id.renderButton(btnContainer, {
          theme: 'outline',
          size: 'large',
          type: 'standard',
          shape: 'pill',
          text: 'continue_with',
          logo_alignment: 'left',
          width,
        });

        setGisRendered(true);
        if (checkInterval) clearInterval(checkInterval);
      }
    };

    tryRenderGIS();
    if (!gisRendered) {
      checkInterval = setInterval(tryRenderGIS, 300);
      setTimeout(() => {
        if (checkInterval) clearInterval(checkInterval);
      }, 5000);
    }

    return () => {
      if (checkInterval) clearInterval(checkInterval);
    };
  }, [loginWithGoogleCredential, gisRendered, selectedPortal]);

  const errorMessage = localError || authError;

  return (
    <div className="min-h-[100dvh] relative overflow-x-hidden flex flex-col ll-shell">
      <div className="relative z-10 flex-1 flex flex-col w-full max-w-md mx-auto px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Go back"
            className="w-10 h-10 rounded-full ll-glass border border-white/70 flex items-center justify-center text-ink hover:bg-white/80 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <BrandMark variant="full" className="h-9 max-w-[180px]" />
        </div>

        <div className="flex-1 flex items-center py-8">
          <div className="w-full relative overflow-hidden rounded-[32px] ll-glass-strong p-6 sm:p-7">
            <div
              className="pointer-events-none absolute -top-16 -right-10 w-40 h-40 rounded-full opacity-60"
              style={{ background: 'radial-gradient(circle, rgba(240,180,138,0.5), transparent 70%)' }}
            />
            <div
              className="pointer-events-none absolute -bottom-16 -left-8 w-36 h-36 rounded-full opacity-50"
              style={{ background: 'radial-gradient(circle, rgba(158,212,184,0.45), transparent 70%)' }}
            />

            <div className="relative">
              <h1 className="font-display text-2xl font-bold tracking-tight text-ink">Sign in</h1>
              <p className="mt-1.5 text-sm text-muted">
                Continue with Google. Role follows your registration.
              </p>

              <div className="mt-5 grid grid-cols-3 gap-1 p-1 rounded-full ll-glass border border-white/70">
                {(
                  [
                    { id: 'PATIENT' as const, label: 'Patient', Icon: User },
                    { id: 'HOSPITAL' as const, label: 'Hospital', Icon: Building2 },
                    { id: 'CITY_ADMIN' as const, label: 'City', Icon: Shield },
                  ] as const
                ).map(({ id, label, Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setSelectedPortal(id)}
                    className={`py-2.5 rounded-full text-xs font-semibold flex flex-col items-center justify-center gap-1 min-h-[52px] transition ${
                      selectedPortal === id
                        ? 'bg-ink text-white'
                        : 'text-muted hover:text-ink'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {label}
                  </button>
                ))}
              </div>

              <div className="mt-4 space-y-3">
                {errorMessage && (
                  <div className="p-3 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-2 text-xs text-red-700">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {selectedPortal === 'PATIENT' && (
                  <p className="text-sm text-muted">
                    Find live beds, hold for 15 minutes, link ABHA after sign-in.
                  </p>
                )}

                {selectedPortal === 'HOSPITAL' && (
                  <div className="space-y-2">
                    <p className="text-sm text-muted">Gmail must be pre-registered under Staff Access.</p>
                    <select
                      value={selectedHospitalId}
                      onChange={(e) => setSelectedHospitalId(e.target.value)}
                      className="w-full h-11 rounded-full bg-white/70 border border-white/80 px-4 text-sm font-medium text-ink focus:outline-none"
                    >
                      {HOSPITALS.map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.name}
                        </option>
                      ))}
                    </select>
                    <div className="grid grid-cols-2 gap-2">
                      {(
                        [
                          { id: 'HOSPITAL_STAFF' as const, label: 'Ward Staff' },
                          { id: 'HOSPITAL_ADMIN' as const, label: 'Admin' },
                        ] as const
                      ).map(({ id, label }) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setHospitalRoleType(id)}
                          className={`h-10 rounded-full border text-xs font-semibold transition ${
                            hospitalRoleType === id
                              ? 'bg-ink text-white border-ink'
                              : 'll-glass text-muted border-white/70'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {selectedPortal === 'CITY_ADMIN' && (
                  <p className="text-sm text-[#8A5A2B] bg-[#FFF4E5]/80 border border-[#F0B48A]/40 rounded-2xl px-3 py-2.5">
                    Only the municipal admin Gmail can open City Command.
                  </p>
                )}

                {isLoggingIn && <p className="text-center text-sm text-muted">Verifying Google…</p>}

                <div
                  ref={btnHostRef}
                  id="google-signin-btn"
                  className="w-full flex justify-center items-center min-h-[48px]"
                />
                {!gisRendered && (
                  <p className="text-center text-sm text-muted">Loading Google Sign-In…</p>
                )}

                <p className="flex items-center justify-center gap-1.5 text-xs text-muted pt-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Google OAuth · no password stored
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
