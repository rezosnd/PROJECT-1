import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../lib/auth/auth-store';
import { abhaApi } from '../../lib/api/abha.api';
import { AbhaCard } from '../../features/patient/AbhaCard';
import { Button } from '../../components/ui/Button';
import { useNavigate } from 'react-router-dom';
import {
  Mail,
  Shield,
  Award,
  Hospital,
  LogOut,
  ArrowRight,
  Phone,
  MapPin,
} from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();

  const { data: abhaProfile } = useQuery({
    queryKey: ['abha-profile'],
    queryFn: () => abhaApi.getMe(),
    enabled: Boolean(isAuthenticated && user?.role === 'PATIENT'),
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });

  if (!isAuthenticated || !user) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
        <h1 className="text-2xl font-display font-bold text-ink">Sign in required</h1>
        <p className="text-sm text-muted">Access ABHA, reservations, and bed requests.</p>
        <Button onClick={() => navigate('/login')} variant="primary">
          Go to Sign In
        </Button>
      </div>
    );
  }

  const profile = user.profile || {};
  const avatar = abhaProfile?.photoUrl || user.abhaPhotoUrl || user.pictureUrl;
  const displayName = abhaProfile?.name || profile.fullName || user.name;
  const abhaLinked = Boolean(abhaProfile?.abhaAddress);
  const mobile =
    abhaProfile?.mobile || (user as any).mobilePhone || profile.emergencyContactPhone || null;
  const address =
    [
      abhaProfile?.addressLine || profile.addressLine,
      profile.cityName || abhaProfile?.cityName,
      profile.pinCode || abhaProfile?.pinCode,
    ]
      .filter(Boolean)
      .join(', ') || '—';

  const rows = [
    { label: 'Blood group', value: profile.bloodGroup || abhaProfile?.bloodGroup || '—' },
    { label: 'Gender', value: abhaProfile?.gender || profile.gender || '—' },
    {
      label: 'Date of birth',
      value: abhaProfile?.dob
        ? String(abhaProfile.dob).slice(0, 10)
        : profile.dateOfBirth
          ? String(profile.dateOfBirth).slice(0, 10)
          : '—',
    },
    { label: 'Signed in with', value: 'Google' },
  ];

  return (
    <div className="max-w-4xl mx-auto pb-8 text-left space-y-5">
      <section className="relative overflow-hidden rounded-[32px] ll-glass-strong p-5 sm:p-7">
        <div
          className="pointer-events-none absolute -top-20 right-0 w-64 h-64 rounded-full opacity-60"
          style={{ background: 'radial-gradient(circle, rgba(240,180,138,0.5), transparent 70%)' }}
        />
        <div
          className="pointer-events-none absolute -bottom-24 left-10 w-56 h-56 rounded-full opacity-50"
          style={{ background: 'radial-gradient(circle, rgba(158,212,184,0.45), transparent 70%)' }}
        />

        <div className="relative flex items-start gap-4">
          {avatar ? (
            <img
              src={avatar}
              alt=""
              className="w-16 h-16 rounded-full object-cover border-2 border-white/80 shadow-soft shrink-0"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-ink text-white flex items-center justify-center text-xl font-display font-bold shrink-0">
              {displayName?.charAt(0) || 'U'}
            </div>
          )}
          <div className="min-w-0 flex-1 pt-0.5">
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-ink tracking-tight">
              {displayName}
            </h1>
            <p className="mt-1 text-sm text-muted flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" />
                {user.email}
              </span>
            </p>
            <p className={`mt-2 text-sm font-medium ${abhaLinked ? 'text-[#2F9B7A]' : 'text-[#E89A5C]'}`}>
              {abhaLinked ? `ABHA linked · ${abhaProfile!.abhaAddress}` : 'ABHA not linked'}
            </p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-5">
        <section className="lg:col-span-3 rounded-[28px] ll-glass-strong p-5 sm:p-6">
          <h2 className="font-display text-lg font-bold text-ink">Details</h2>
          <dl className="mt-3 divide-y divide-black/[0.06]">
            {rows.map((row) => (
              <div key={row.label} className="flex items-baseline justify-between gap-4 py-3">
                <dt className="text-sm text-muted shrink-0">{row.label}</dt>
                <dd className="text-sm font-semibold text-ink text-right">{row.value}</dd>
              </div>
            ))}
            <div className="flex items-baseline justify-between gap-4 py-3">
              <dt className="text-sm text-muted inline-flex items-center gap-1.5 shrink-0">
                <Phone className="w-3.5 h-3.5" /> Mobile
              </dt>
              <dd className="text-sm font-semibold text-ink text-right">
                {mobile ? (
                  <a href={`tel:${String(mobile).replace(/\s/g, '')}`} className="hover:underline">
                    {mobile}
                  </a>
                ) : (
                  '—'
                )}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-4 py-3">
              <dt className="text-sm text-muted inline-flex items-center gap-1.5 shrink-0 pt-0.5">
                <MapPin className="w-3.5 h-3.5" /> Address
              </dt>
              <dd className="text-sm font-semibold text-ink text-right max-w-[60%]">{address}</dd>
            </div>
          </dl>

          <button
            type="button"
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-red hover:underline"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </section>

        <aside className="lg:col-span-2 space-y-3">
          {abhaProfile ? (
            <AbhaCard
              profile={abhaProfile}
              onUnlink={async () => {
                await abhaApi.unlink();
              }}
              className="max-w-none"
            />
          ) : (
            <div className="rounded-[28px] ll-glass-strong p-5 space-y-3">
              <Shield className="w-5 h-5 text-ink" />
              <div>
                <h3 className="font-display font-bold text-ink">Link ABHA</h3>
                <p className="text-sm text-muted mt-1 leading-relaxed">
                  Save photo, QR, and mobile for faster triage.
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/abha')}
                className="h-11 px-4 rounded-full bg-ink text-white text-sm font-semibold inline-flex items-center gap-2 hover:bg-ink-light transition"
              >
                Link ABHA
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {user.role === 'PATIENT' && (
            <nav className="space-y-2">
              <button
                type="button"
                onClick={() => navigate('/requests')}
                className="w-full rounded-2xl ll-glass border border-white/70 px-4 py-3.5 text-left hover:bg-white/75 transition flex items-center justify-between gap-3"
              >
                <span className="inline-flex items-center gap-2.5 text-sm font-semibold text-ink">
                  <Award className="w-4 h-4" />
                  My bed requests
                </span>
                <ArrowRight className="w-4 h-4 text-muted" />
              </button>
              <button
                type="button"
                onClick={() => navigate('/results')}
                className="w-full rounded-2xl ll-glass border border-white/70 px-4 py-3.5 text-left hover:bg-white/75 transition flex items-center justify-between gap-3"
              >
                <span className="inline-flex items-center gap-2.5 text-sm font-semibold text-ink">
                  <Hospital className="w-4 h-4" />
                  Find free beds
                </span>
                <ArrowRight className="w-4 h-4 text-muted" />
              </button>
            </nav>
          )}
        </aside>
      </div>
    </div>
  );
};
