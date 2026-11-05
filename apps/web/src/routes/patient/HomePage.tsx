import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useGeolocation } from '../../hooks/useGeolocation';
import { useAuthStore } from '../../lib/auth/auth-store';
import { abhaApi } from '../../lib/api/abha.api';
import { TOP_DOCTORS, Doctor } from '../../lib/doctors-data';
import { DoctorDetailModal } from '../../features/patient/DoctorDetailModal';
import { BRAND } from '../../lib/brand';
import {
  Search,
  MapPin,
  ArrowRight,
  Brain,
  Heart,
  Baby,
  Activity,
  Star,
  Phone,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

const QUICK_TAGS = [
  { id: 'stroke', label: 'Stroke / ICU', icon: Brain, severity: 5 },
  { id: 'heart-attack', label: 'Cardiac', icon: Heart, severity: 5 },
  { id: 'premature-baby', label: 'NICU', icon: Baby, severity: 5 },
  { id: 'trauma', label: 'Trauma', icon: Activity, severity: 5 },
];

export const HomePage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { lat, lng, addressLabel, isDetecting, detectLocation } = useGeolocation();

  const [selectedTag, setSelectedTag] = useState('stroke');
  const [searchText, setSearchText] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);

  const { data: abhaProfile } = useQuery({
    queryKey: ['abha-profile'],
    queryFn: () => abhaApi.getMe(),
    staleTime: 60_000,
  });

  const avatar = abhaProfile?.photoUrl || user?.abhaPhotoUrl || user?.pictureUrl;
  const displayName = abhaProfile?.name || user?.name || 'Patient';
  const firstName = displayName.split(' ')[0];

  const launchSearch = (condition = selectedTag, severity = 4, q?: string) => {
    const params = new URLSearchParams({
      q: q || condition,
      lat: String(lat),
      lng: String(lng),
      severity: String(severity),
    });
    navigate(`/results?${params.toString()}`);
  };

  return (
    <div className="ll-app-screen pb-10 text-left">
      {/* Identity row */}
      <header className="flex items-end justify-between gap-4 pt-1">
        <Link to="/profile" className="flex items-center gap-3 min-w-0 group">
          {avatar ? (
            <img
              src={avatar}
              alt=""
              className="w-11 h-11 rounded-full object-cover ring-2 ring-white shadow-sm"
            />
          ) : (
            <div className="w-11 h-11 rounded-full bg-[var(--color-brand-forest)] text-[var(--color-brand-lime)] font-display font-bold flex items-center justify-center text-base">
              {displayName.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-muted tracking-wide">
              {abhaProfile
                ? t('home.abhaReady', 'ABHA linked')
                : t('home.greeting', 'Good to see you')}
            </p>
            <h1 className="font-display text-[21px] leading-tight font-extrabold text-ink truncate group-hover:text-[var(--color-brand-forest)] transition-colors">
              {firstName}
            </h1>
          </div>
        </Link>
        <a
          href="tel:112"
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-[11px] font-bold text-[#B91C1C] border border-[#FECACA] bg-[#FEF2F2] shrink-0"
        >
          <Phone className="w-3.5 h-3.5" />
          112
        </a>
      </header>

      {/* Find beds — one job */}
      <section className="mt-7">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--color-brand-forest)]">
          {BRAND.name}
        </p>
        <h2 className="mt-2 font-display text-[28px] sm:text-[32px] font-extrabold text-ink tracking-tight leading-[1.1] max-w-md">
          Find a free bed near you
        </h2>
        <p className="mt-2 text-sm text-muted max-w-md leading-relaxed">
          Search by condition or hospital. We’ll match live ward capacity around your location.
        </p>

        <div className="mt-5 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                launchSearch(selectedTag, 4, searchText.trim() || selectedTag);
              }
            }}
            placeholder="Condition, hospital, or doctor"
            className="w-full h-14 rounded-2xl bg-white border border-hairline pl-11 pr-4 text-sm text-ink placeholder:text-muted/70 shadow-soft focus:outline-none focus:border-[var(--color-brand-forest)]/40 focus:ring-2 focus:ring-[var(--color-brand-lime)]/30"
          />
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {QUICK_TAGS.map((tag) => {
            const Icon = tag.icon;
            const active = selectedTag === tag.id;
            return (
              <button
                key={tag.id}
                type="button"
                onClick={() => {
                  setSelectedTag(tag.id);
                  setSearchText(tag.label);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border transition ${
                  active
                    ? 'bg-[var(--color-brand-forest)] text-[var(--color-brand-lime)] border-[var(--color-brand-forest)]'
                    : 'bg-transparent text-ink/70 border-hairline hover:border-ink/30 hover:text-ink'
                }`}
              >
                <Icon className="w-3 h-3" strokeWidth={2.4} />
                {tag.label}
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-col sm:flex-row gap-2.5">
          <button
            type="button"
            onClick={() => launchSearch(selectedTag, 4, searchText.trim() || selectedTag)}
            className="flex-1 h-12 rounded-2xl bg-[var(--color-brand-forest)] text-[var(--color-brand-lime)] text-sm font-bold inline-flex items-center justify-center gap-2 hover:brightness-110 transition shadow-soft"
          >
            Search beds
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => detectLocation()}
            disabled={isDetecting}
            className="h-12 px-4 rounded-2xl border border-hairline bg-white text-xs font-bold text-ink hover:bg-card-soft transition inline-flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <MapPin className="w-4 h-4 text-[var(--color-brand-forest)]" />
            {isDetecting ? 'Locating…' : 'Use my location'}
          </button>
        </div>

        <p className="mt-3 text-[11px] text-muted flex items-center gap-1.5">
          <MapPin className="w-3 h-3 shrink-0 opacity-70" />
          <span className="truncate">{addressLabel || 'Bhubaneswar (default)'}</span>
        </p>
      </section>

      {/* ABHA — quiet nudge */}
      {!abhaProfile && (
        <button
          type="button"
          onClick={() => navigate('/abha')}
          className="mt-8 w-full flex items-center gap-3 py-3 text-left border-y border-hairline hover:bg-white/60 transition"
        >
          <ShieldCheck className="w-5 h-5 text-[var(--color-brand-forest)] shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-ink">Link ABHA once</p>
            <p className="text-xs text-muted">Faster hospital intake with photo & QR</p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted" />
        </button>
      )}

      {/* Doctors */}
      <section className="mt-9">
        <div className="flex items-baseline justify-between gap-3 mb-4">
          <h3 className="font-display text-lg font-bold text-ink">Doctors nearby</h3>
          <button
            type="button"
            onClick={() => navigate('/doctors')}
            className="text-xs font-bold text-[var(--color-brand-forest)] inline-flex items-center gap-0.5"
          >
            View all <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <ul className="divide-y divide-hairline border-t border-b border-hairline">
          {TOP_DOCTORS.slice(0, 4).map((doc) => (
            <li key={doc.id}>
              <button
                type="button"
                onClick={() => setSelectedDoctor(doc)}
                className="w-full py-4 flex gap-3.5 text-left hover:bg-white/70 transition"
              >
                <img
                  src={doc.avatarUrl}
                  alt=""
                  className="w-14 h-14 rounded-xl object-cover shrink-0 bg-card-soft"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-display font-bold text-ink truncate">{doc.name}</p>
                      <p className="text-xs text-muted truncate mt-0.5">{doc.specialty}</p>
                      <p className="text-[11px] text-muted/80 truncate mt-0.5">{doc.hospitalName}</p>
                    </div>
                    <span className="inline-flex items-center gap-0.5 text-xs font-bold text-ink shrink-0">
                      <Star className="w-3.5 h-3.5 fill-[var(--color-brand-lime)] text-[var(--color-brand-forest)]" />
                      {doc.rating.toFixed(1)}
                    </span>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between">
                    <span className="text-sm font-extrabold text-ink">₹{doc.fee.toFixed(0)}</span>
                    <span className="text-[11px] font-bold text-[var(--color-brand-forest)] underline-offset-2 group-hover:underline">
                      Book →
                    </span>
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <DoctorDetailModal
        doctor={selectedDoctor}
        isOpen={Boolean(selectedDoctor)}
        onClose={() => setSelectedDoctor(null)}
      />
    </div>
  );
};
