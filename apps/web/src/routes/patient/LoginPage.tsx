import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore, UserRole } from '../../lib/auth/auth-store';
import {
  ArrowLeft,
  User,
  Building2,
  Shield,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  BedDouble,
  Activity,
  Lock,
} from 'lucide-react';
import { BrandMark } from '../../components/brand/BrandMark';
import { BRAND } from '../../lib/brand';

const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  '1050173417910-28c0irqqh1nhaurmognqn01c9ocvo6pb.apps.googleusercontent.com';

const HOSPITALS = [
  { id: '3256d42a-2dfe-4e1f-9d9d-867997d53d2a', name: 'AIIMS Bhubaneswar', badge: 'Level 1 Trauma' },
  { id: '0f7fafb8-7f8c-4567-acf1-e9d3ca8847e3', name: 'KIMS Hospital & Medical College', badge: 'Level 1 Trauma' },
  { id: 'e66d5397-2a29-4885-a964-56861611786d', name: 'SUM Ultimate Medicare', badge: 'Level 1 Trauma' },
  { id: '2f462f84-d929-4cc4-8920-3b4bf7803c2e', name: 'Kalinga Hospital', badge: 'Level 2 Trauma' },
  { id: '4f0a4313-9cfa-475c-8106-66f3d0a676d2', name: 'Capital Hospital (Govt)', badge: 'Govt General' },
  { id: 'b5b618f5-15e9-4731-b342-f9680a48e5eb', name: 'Apollo Hospitals Bhubaneswar', badge: 'Super Specialty' },
];

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { loginWithGoogleCredential, isAuthenticated, user, error: authError } = useAuthStore();

  const [selectedPortal, setSelectedPortal] = useState<'PATIENT' | 'HOSPITAL' | 'CITY_ADMIN'>('PATIENT');
  const [selectedHospitalId, setSelectedHospitalId] = useState(HOSPITALS[0].id);
  const [hospitalRoleType, setHospitalRoleType] = useState<'HOSPITAL_STAFF' | 'HOSPITAL_ADMIN'>('HOSPITAL_STAFF');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [gisRendered, setGisRendered] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const from = (location.state as any)?.from?.pathname || '/';

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

  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'CITY_ADMIN') {
        navigate('/admin', { replace: true });
      } else if (user.role.includes('HOSPITAL')) {
        navigate('/hospital', { replace: true });
      } else {
        navigate(from, { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate, from]);

  useEffect(() => {
    let checkInterval: ReturnType<typeof setInterval> | null = null;

    const tryRenderGIS = () => {
      const windowGoogle = (window as any).google;
      const btnContainer = document.getElementById('google-signin-btn');
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
            } catch (err: any) {
              setLocalError(
                err.response?.data?.error?.message || err.message || 'Google sign-in failed'
              );
            } finally {
              setIsLoggingIn(false);
            }
          },
        });

        btnContainer.innerHTML = '';
        windowGoogle.accounts.id.renderButton(btnContainer, {
          theme: 'outline',
          size: 'large',
          type: 'standard',
          shape: 'pill',
          text: 'continue_with',
          logo_alignment: 'left',
          width: 320,
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
  }, [loginWithGoogleCredential, gisRendered]);

  const errorMessage = localError || authError;

  return (
    <div className="min-h-screen relative overflow-hidden bg-[var(--color-page)]">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(900px 420px at 0% -10%, rgba(168,224,23,0.22), transparent 55%), radial-gradient(700px 380px at 100% 0%, rgba(11,61,26,0.10), transparent 50%), linear-gradient(180deg, #F7FAF4 0%, #EEF3EA 100%)',
        }}
      />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col lg:flex-row">
        {/* Brand panel */}
        <aside className="hidden lg:flex lg:w-[46%] flex-col justify-between p-10 xl:p-14">
          <div>
            <BrandMark variant="full" className="h-14 max-w-[280px]" />
            <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-brand-forest)]">
              {BRAND.tagline}
            </p>
          </div>

          <div className="max-w-md">
            <h1 className="font-display text-4xl xl:text-5xl font-extrabold tracking-tight text-ink leading-[1.05]">
              Care that finds you a bed — fast.
            </h1>
            <p className="mt-4 text-base text-muted leading-relaxed">
              Live ICU capacity, ABHA-ready identity, and hospital triage in one secure grid for Bhubaneswar.
            </p>

            <ul className="mt-8 space-y-3">
              {[
                { icon: BedDouble, label: 'Real-time ward & ICU availability' },
                { icon: Activity, label: '15-minute hold & hospital queue' },
                { icon: Lock, label: 'Google OAuth · JWT · ABDM ready' },
              ].map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-3 text-sm font-semibold text-ink">
                  <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white border border-hairline shadow-soft">
                    <Icon className="h-4 w-4 text-[var(--color-brand-forest)]" strokeWidth={2.4} />
                  </span>
                  {label}
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xs text-muted">National Health Authority & ABDM aligned</p>
        </aside>

        {/* Auth card */}
        <main className="flex flex-1 items-center justify-center p-4 sm:p-8">
          <div className="w-full max-w-[440px]">
            <button
              onClick={() => navigate(-1)}
              aria-label="Go back"
              className="mb-5 w-11 h-11 rounded-2xl border border-hairline bg-white/90 backdrop-blur flex items-center justify-center text-ink hover:bg-white transition shadow-soft lg:hidden"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div className="mb-6 lg:hidden">
              <BrandMark variant="full" className="h-11 max-w-[220px]" />
            </div>

            <div className="rounded-[32px] border border-hairline bg-white/95 backdrop-blur shadow-[0_24px_60px_rgba(11,61,26,0.08)] p-6 sm:p-8">
              <p className="ll-kicker text-[var(--color-brand-forest)]">Secure access</p>
              <h2 className="mt-2 font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-ink">
                Sign in to {BRAND.name}
              </h2>
              <p className="mt-2 text-sm text-muted leading-relaxed">
                Use your Google account. Staff roles require prior registration by your hospital or city admin.
              </p>

              <div className="mt-6 grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-[var(--color-card-soft)] border border-hairline">
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
                    className={`py-2.5 px-2 rounded-xl text-[11px] font-bold flex flex-col sm:flex-row items-center justify-center gap-1 transition-all ${
                      selectedPortal === id
                        ? 'bg-[var(--color-brand-forest)] text-[var(--color-brand-lime)] shadow-soft'
                        : 'text-muted hover:text-ink'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>

              <div className="mt-5 space-y-4">
                {errorMessage && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-2 text-xs text-red-700 font-medium">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {selectedPortal === 'PATIENT' && (
                  <div className="rounded-2xl border border-[#D8E0D4] bg-[#F4F7F2] p-3.5">
                    <p className="text-xs font-bold text-[var(--color-brand-forest)]">Patient portal</p>
                    <p className="mt-1 text-xs text-muted leading-relaxed">
                      Find live beds, place a 15-minute hold, and link ABHA with your Google identity.
                    </p>
                  </div>
                )}

                {selectedPortal === 'HOSPITAL' && (
                  <div className="space-y-3">
                    <div className="rounded-2xl border border-[#D8E0D4] bg-[#F4F7F2] p-3.5">
                      <p className="text-xs font-bold text-[var(--color-brand-forest)]">Hospital staff</p>
                      <p className="mt-1 text-xs text-muted leading-relaxed">
                        Your Gmail must already be registered under Staff Access.
                      </p>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wide text-muted mb-2">
                        Facility
                      </label>
                      <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                        {HOSPITALS.map((h) => (
                          <button
                            key={h.id}
                            type="button"
                            onClick={() => setSelectedHospitalId(h.id)}
                            className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                              selectedHospitalId === h.id
                                ? 'border-[var(--color-brand-forest)] bg-[var(--color-brand-forest)]/5 text-ink font-bold'
                                : 'border-hairline bg-white text-ink/80 hover:bg-card-soft'
                            }`}
                          >
                            <span className="text-xs font-semibold truncate pr-2">{h.name}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-card-soft text-muted shrink-0">
                              {h.badge}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
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
                          className={`py-2.5 px-3 rounded-xl border text-center text-xs font-bold transition-all ${
                            hospitalRoleType === id
                              ? 'border-[var(--color-brand-forest)] bg-[var(--color-brand-forest)] text-[var(--color-brand-lime)]'
                              : 'border-hairline bg-white text-muted hover:text-ink'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {selectedPortal === 'CITY_ADMIN' && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-3.5">
                    <p className="text-xs font-bold text-amber-900">City command</p>
                    <p className="mt-1 text-xs text-amber-800/80 leading-relaxed">
                      Only the municipal admin Gmail can open City Command.
                    </p>
                  </div>
                )}

                <div className="pt-1 space-y-3">
                  {isLoggingIn && (
                    <div className="text-center text-xs font-semibold text-muted py-1">
                      Verifying Google account…
                    </div>
                  )}
                  <div
                    id="google-signin-btn"
                    className="w-full flex justify-center items-center min-h-[44px]"
                  />
                  {!gisRendered && (
                    <p className="text-center text-xs text-muted">Loading secure Google Sign-In…</p>
                  )}
                </div>

                <div className="pt-4 border-t border-hairline flex items-start gap-2 text-xs text-muted">
                  <CheckCircle2 className="w-4 h-4 text-[var(--color-brand-forest)] shrink-0 mt-0.5" />
                  <span className="leading-snug">
                    Google verifies identity. {BRAND.name} never stores your password.
                  </span>
                </div>

                <div className="flex items-center justify-center gap-1.5 text-[11px] font-semibold text-muted">
                  <ShieldCheck className="w-3.5 h-3.5 text-[var(--color-brand-forest)]" />
                  <span>OAuth · JWT · ABDM</span>
                </div>
              </div>
            </div>

            <p className="mt-5 text-center text-[11px] text-muted px-2">
              Hospital staff: ask your admin to pre-register your Gmail before signing in.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
};
