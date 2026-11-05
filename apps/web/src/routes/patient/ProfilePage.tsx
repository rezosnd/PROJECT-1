import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../lib/auth/auth-store';
import { abhaApi } from '../../lib/api/abha.api';
import { AbhaCard } from '../../features/patient/AbhaCard';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useNavigate } from 'react-router-dom';
import { Mail, Shield, Award, Hospital, LogOut, ArrowRight, CheckCircle2 } from 'lucide-react';

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
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
        <h1 className="text-2xl font-bold font-display text-ink">Sign in to LifeLink</h1>
        <p className="text-sm text-muted">
          Access your ABHA details, active reservations, and hospital bed requests.
        </p>
        <Button onClick={() => navigate('/login')} variant="primary">
          Go to Sign In
        </Button>
      </div>
    );
  }

  const profile = user.profile || {};
  const avatar = abhaProfile?.photoUrl || user.abhaPhotoUrl || user.pictureUrl;

  return (
    <div className="space-y-6">
      <div>
        <p className="ll-kicker">Account</p>
        <h1 className="text-3xl font-extrabold font-display text-ink tracking-tight mt-1">My profile</h1>
        <p className="text-sm text-muted mt-1">
          ABHA details stay saved after linking — photo, QR, and clinical fields reload every visit.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <Card className="lg:col-span-7 p-6 space-y-5">
          <div className="flex items-center gap-4">
            {avatar ? (
              <img
                src={avatar}
                alt={user.name}
                className="w-16 h-16 rounded-2xl border border-hairline object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-ink text-white flex items-center justify-center text-xl font-bold font-display">
                {user.name?.charAt(0) || 'U'}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold font-display text-ink truncate">
                {abhaProfile?.name || profile.fullName || user.name}
              </h2>
              <div className="flex items-center gap-1.5 text-sm text-muted">
                <Mail className="w-3.5 h-3.5" />
                <span className="truncate">{user.email}</span>
              </div>
              {abhaProfile?.abhaAddress ? (
                <p className="text-xs font-bold text-teal mt-1 truncate">
                  ABHA linked · {abhaProfile.abhaAddress}
                </p>
              ) : (
                <p className="text-xs font-semibold text-orange mt-1">ABHA not linked yet</p>
              )}
            </div>
            <span className="px-3 py-1.5 rounded-xl text-[11px] font-bold bg-card-soft text-ink border border-hairline">
              {user.role}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 bg-card-soft rounded-2xl">
              <span className="text-muted block">Authentication</span>
              <span className="font-bold text-ink flex items-center gap-1 mt-0.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-green" /> Google OAuth
              </span>
            </div>
            <div className="p-3.5 bg-card-soft rounded-2xl">
              <span className="text-muted block">Blood group</span>
              <span className="font-bold text-ink block mt-0.5">{profile.bloodGroup || '—'}</span>
            </div>
            <div className="p-3.5 bg-card-soft rounded-2xl">
              <span className="text-muted block">Gender</span>
              <span className="font-bold text-ink block mt-0.5">
                {abhaProfile?.gender || profile.gender || '—'}
              </span>
            </div>
            <div className="p-3.5 bg-card-soft rounded-2xl">
              <span className="text-muted block">Date of birth</span>
              <span className="font-bold text-ink block mt-0.5">
                {abhaProfile?.dob
                  ? String(abhaProfile.dob).slice(0, 10)
                  : profile.dateOfBirth
                  ? String(profile.dateOfBirth).slice(0, 10)
                  : '—'}
              </span>
            </div>
            <div className="p-3.5 bg-card-soft rounded-2xl sm:col-span-2">
              <span className="text-muted block">Address</span>
              <span className="font-bold text-ink block mt-0.5">
                {abhaProfile?.addressLine || profile.addressLine || '—'}
                {profile.cityName ? ` · ${profile.cityName}` : ''}
                {profile.pinCode ? ` · ${profile.pinCode}` : ''}
              </span>
            </div>
            {(abhaProfile?.mobile || profile.emergencyContactPhone) && (
              <div className="p-3.5 bg-card-soft rounded-2xl sm:col-span-2">
                <span className="text-muted block">Mobile / emergency</span>
                <span className="font-bold text-ink block mt-0.5">
                  {abhaProfile?.mobile ||
                    `${profile.emergencyContactName || 'Contact'} · ${profile.emergencyContactPhone}`}
                </span>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                logout();
                navigate('/login');
              }}
              leftIcon={<LogOut className="w-4 h-4 text-red" />}
              className="text-red hover:bg-red/5"
            >
              Sign Out
            </Button>
          </div>
        </Card>

        <div className="lg:col-span-5 space-y-4">
          {abhaProfile ? (
            <AbhaCard
              profile={abhaProfile}
              onUnlink={async () => {
                await abhaApi.unlink();
              }}
            />
          ) : (
            <Card className="p-6 space-y-3">
              <div className="w-11 h-11 rounded-2xl bg-card-sand text-orange flex items-center justify-center">
                <Shield className="w-5 h-5" />
              </div>
              <h3 className="font-display font-bold text-lg text-ink">Link ABHA once</h3>
              <p className="text-sm text-muted leading-relaxed">
                After ABDM verify, photo + QR + demographics are stored and shown every time you open profile.
              </p>
              <Button onClick={() => navigate('/abha')} rightIcon={<ArrowRight className="w-4 h-4" />}>
                Link ABHA
              </Button>
            </Card>
          )}

          {user.role === 'PATIENT' && (
            <div className="grid grid-cols-1 gap-3">
              <button
                type="button"
                onClick={() => navigate('/requests')}
                className="ll-card p-4 text-left hover:shadow-float transition flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2 text-ink font-bold text-sm">
                    <Award className="w-4 h-4" /> My bed requests
                  </div>
                  <p className="text-xs text-muted mt-1">Track 15-minute holds</p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted" />
              </button>
              <button
                type="button"
                onClick={() => navigate('/results')}
                className="ll-card p-4 text-left hover:shadow-float transition flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2 text-ink font-bold text-sm">
                    <Hospital className="w-4 h-4" /> Find free beds
                  </div>
                  <p className="text-xs text-muted mt-1">Live capacity nearby</p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
