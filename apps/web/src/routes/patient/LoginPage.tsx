import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore, UserRole } from '../../lib/auth/auth-store';
import { Card } from '../../components/ui/Card';
import {
  ArrowLeft,
  User,
  Building2,
  Shield,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { BrandMark } from '../../components/brand/BrandMark';

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

  // Official Google Identity Services only — no demo / fake accounts
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
          width: 360,
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
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 bg-page">
      <div className="w-full max-w-md space-y-6 text-left">
        <button
          onClick={() => navigate(-1)}
          aria-label="Go back"
          className="w-11 h-11 rounded-2xl border border-hairline bg-white flex items-center justify-center text-ink hover:bg-card-soft transition shadow-soft"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <div className="rounded-[28px] bg-black border border-hairline p-5 shadow-soft">
          <BrandMark variant="full" className="h-12 max-w-full" />
        </div>

        <div className="space-y-2">
          <p className="ll-kicker">GetMyHospital access</p>
          <h1 className="text-3xl font-extrabold font-display text-ink tracking-tight">
            Sign in with Google
          </h1>
          <p className="text-sm text-muted">
            Real Gmail only. Roles come from staff pre-registration — no demo accounts.
          </p>
        </div>

        <div className="flex p-1 bg-card-soft rounded-2xl border border-hairline gap-1">
          <button
            type="button"
            onClick={() => setSelectedPortal('PATIENT')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              selectedPortal === 'PATIENT'
                ? 'bg-ink text-white font-bold shadow-soft'
                : 'text-muted hover:text-ink'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Patient</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedPortal('HOSPITAL')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              selectedPortal === 'HOSPITAL'
                ? 'bg-ink text-white font-bold shadow-soft'
                : 'text-muted hover:text-ink'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Hospital</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedPortal('CITY_ADMIN')}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              selectedPortal === 'CITY_ADMIN'
                ? 'bg-ink text-white font-bold shadow-soft'
                : 'text-muted hover:text-ink'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>City Admin</span>
          </button>
        </div>

        <Card variant="surface" className="p-7 shadow-float space-y-5">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-2 text-xs text-red-600 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {selectedPortal === 'PATIENT' && (
            <div className="p-3.5 bg-blue-50/70 border border-blue-100 rounded-2xl">
              <h2 className="text-xs font-bold text-blue-900">Patient access</h2>
              <p className="text-xs text-blue-700/80 mt-1 leading-relaxed">
                Find live beds, request a 15-minute hold, and link your ABHA with your real Google account.
              </p>
            </div>
          )}

          {selectedPortal === 'HOSPITAL' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-teal-50/70 border border-teal-100 rounded-2xl">
                <h2 className="text-xs font-bold text-teal-900">Hospital staff</h2>
                <p className="text-xs text-teal-700/80 mt-1 leading-relaxed">
                  Your Gmail must be pre-registered by a hospital or city admin. Sign in with that same Google account.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Facility (for first-time staff binding)</label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {HOSPITALS.map((h) => (
                    <button
                      key={h.id}
                      type="button"
                      onClick={() => setSelectedHospitalId(h.id)}
                      className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                        selectedHospitalId === h.id
                          ? 'border-navy bg-navy/5 text-navy font-bold shadow-xs'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-xs font-semibold">{h.name}</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          selectedHospitalId === h.id ? 'bg-navy text-white' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {h.badge}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Expected role</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setHospitalRoleType('HOSPITAL_STAFF')}
                    className={`py-2 px-3 rounded-xl border text-center text-xs font-semibold transition-all ${
                      hospitalRoleType === 'HOSPITAL_STAFF'
                        ? 'border-teal-600 bg-teal-50 text-teal-800 font-bold shadow-xs'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Ward Staff
                  </button>
                  <button
                    type="button"
                    onClick={() => setHospitalRoleType('HOSPITAL_ADMIN')}
                    className={`py-2 px-3 rounded-xl border text-center text-xs font-semibold transition-all ${
                      hospitalRoleType === 'HOSPITAL_ADMIN'
                        ? 'border-purple-600 bg-purple-50 text-purple-800 font-bold shadow-xs'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Hospital Admin
                  </button>
                </div>
              </div>
            </div>
          )}

          {selectedPortal === 'CITY_ADMIN' && (
            <div className="p-3.5 bg-amber-50/70 border border-amber-100 rounded-2xl">
              <h2 className="text-xs font-bold text-amber-900">City command</h2>
              <p className="text-xs text-amber-700/80 mt-1 leading-relaxed">
                Only the seeded municipal admin Gmail can open City Command. Sign in with that Google account.
              </p>
            </div>
          )}

          <div className="pt-2 space-y-3">
            {isLoggingIn && (
              <div className="text-center text-xs font-semibold text-muted py-2">Verifying Google account…</div>
            )}

            <div id="google-signin-btn" className="w-full flex justify-center items-center min-h-[44px]" />

            {!gisRendered && (
              <p className="text-center text-xs text-muted">Loading secure Google Sign-In…</p>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-start gap-2 text-xs text-slate-600">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span className="leading-snug">
              Google verifies your identity. GetMyHospital never stores your password. New patients get a welcome email after first sign-in.
            </span>
          </div>

          <div className="flex items-center justify-center gap-1.5 text-[11px] font-semibold text-slate-500 pt-1">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Google OAuth • JWT session • ABDM ready</span>
          </div>
        </Card>

        <p className="text-center text-[11px] text-muted px-2">
          Hospital staff: ask your admin to pre-register your Gmail under Staff Access before signing in.
        </p>
      </div>
    </div>
  );
};
