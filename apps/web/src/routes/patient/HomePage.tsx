import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui/Button';
import { useGeolocation } from '../../hooks/useGeolocation';
import { useAuthStore } from '../../lib/auth/auth-store';
import { abhaApi } from '../../lib/api/abha.api';
import { TOP_DOCTORS, Doctor } from '../../lib/doctors-data';
import { DoctorDetailModal } from '../../features/patient/DoctorDetailModal';
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
  { id: 'stroke', label: 'Stroke (ICU)', icon: Brain, severity: 5 },
  { id: 'heart-attack', label: 'Cardiac (CCU)', icon: Heart, severity: 5 },
  { id: 'premature-baby', label: 'NICU Incubator', icon: Baby, severity: 5 },
  { id: 'trauma', label: 'Trauma OT', icon: Activity, severity: 5 },
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
    <div className="ll-app-screen space-y-5 pb-8 text-left">
      {/* App-style top identity — phone-first */}
      <div className="flex items-center justify-between gap-3 pt-1 lg:pt-0">
        <Link to="/profile" className="flex items-center gap-3 min-w-0 group">
          {avatar ? (
            <img src={avatar} alt="" className="w-12 h-12 rounded-2xl object-cover border border-slate-200 shadow-sm" />
          ) : (
            <div className="w-12 h-12 rounded-2xl bg-ink text-white font-display font-bold flex items-center justify-center text-lg">
              {displayName.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-slate-500 truncate">
              {abhaProfile
                ? t('home.abhaReady', 'ABHA ready · tap for card & QR')
                : t('home.subtitle', 'Real-time critical care inventory')}
            </p>
            <h1 className="font-display text-[22px] leading-tight font-extrabold text-ink truncate group-hover:underline">
              {displayName}
            </h1>
          </div>
        </Link>
        <a
          href="tel:112"
          className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-full bg-[#FEE2E2] text-[#DC2626] text-xs font-bold shrink-0 border border-[#FECACA]"
        >
          <Phone className="w-3.5 h-3.5" />
          112
        </a>
      </div>

      {/* Live grid pill */}
      <div className="flex flex-wrap items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-white border border-hairline shadow-soft">
        <span className="w-2.5 h-2.5 rounded-full bg-green animate-pulse" />
        <p className="text-xs font-semibold text-ink">
          Bhubaneswar Grid: <span className="font-extrabold">34 ICU beds free</span>
        </p>
        <span className="inline-flex items-center gap-1 ml-auto text-[11px] font-bold text-blue bg-blue-light px-2 py-1 rounded-xl">
          <MapPin className="w-3 h-3" /> GPS
        </span>
      </div>

      {/* Search card — one job */}
      <section className="ll-card p-5 sm:p-6 space-y-4">
        <h2 className="font-display text-2xl font-extrabold text-ink tracking-tight">
          Find free beds now
        </h2>

        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                launchSearch(selectedTag, 4, searchText.trim() || selectedTag);
              }
            }}
            placeholder="Search condition, doctor, or hospital..."
            className="ll-search pl-10 h-12"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {QUICK_TAGS.map((tag) => {
            const Icon = tag.icon;
            const active = selectedTag === tag.id;
            return (
              <button
                key={tag.id}
                type="button"
                onClick={() => {
                  setSelectedTag(tag.id);
                  launchSearch(tag.id, tag.severity);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-bold border transition ${
                  active
                    ? 'bg-ink text-white border-ink'
                    : 'bg-card-soft text-ink border-hairline hover:border-ink/30'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tag.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          <Button
            type="button"
            size="lg"
            className="flex-1"
            onClick={() => launchSearch(selectedTag, 4, searchText.trim() || selectedTag)}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Search beds
          </Button>
          <button
            type="button"
            onClick={() => detectLocation()}
            disabled={isDetecting}
            className="h-12 px-4 rounded-2xl border border-hairline bg-white text-xs font-bold text-ink hover:bg-card-soft transition inline-flex items-center justify-center gap-2"
          >
            <MapPin className="w-4 h-4 text-blue" />
            {isDetecting ? 'Detecting…' : 'Use my location'}
          </button>
        </div>

        <p className="text-[11px] text-muted truncate flex items-center gap-1">
          <MapPin className="w-3 h-3 shrink-0" />
          {addressLabel || 'Using Bhubaneswar default location'}
        </p>
      </section>

      {/* ABHA nudge */}
      {!abhaProfile && (
        <button
          type="button"
          onClick={() => navigate('/abha')}
          className="w-full ll-card p-4 flex items-center gap-3 text-left hover:shadow-float transition"
        >
          <div className="w-10 h-10 rounded-2xl bg-card-mint text-teal flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-ink">Link ABHA for faster intake</p>
            <p className="text-xs text-muted">Photo, QR & details save once — always available</p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted" />
        </button>
      )}

      {/* Top doctors — same simple cards as mobile */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-bold text-ink">Top doctors nearby</h3>
          <button
            type="button"
            onClick={() => navigate('/doctors')}
            className="text-xs font-bold text-blue inline-flex items-center gap-1"
          >
            See all <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-3">
          {TOP_DOCTORS.slice(0, 4).map((doc, index) => (
            <button
              key={doc.id}
              type="button"
              onClick={() => setSelectedDoctor(doc)}
              className={`w-full text-left rounded-[22px] p-4 flex gap-3 border border-transparent shadow-soft transition hover:-translate-y-0.5 ${
                index % 2 === 0 ? 'bg-[#E8F8C8]' : 'bg-[#FFE9A8]'
              }`}
            >
              <img
                src={doc.avatar}
                alt={doc.name}
                className="w-16 h-16 rounded-2xl object-cover border border-black/5 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-display font-bold text-ink truncate">{doc.name}</p>
                    <p className="text-xs text-ink/70 truncate">{doc.specialty}</p>
                    <p className="text-[11px] text-ink/50 truncate">{doc.hospitalName}</p>
                  </div>
                  <span className="inline-flex items-center gap-0.5 text-xs font-bold text-ink shrink-0">
                    <Star className="w-3.5 h-3.5 fill-ink" />
                    {doc.rating.toFixed(1)}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-sm font-extrabold text-ink">₹ {doc.fee.toFixed(0)}</span>
                  <span className="text-[11px] font-bold bg-ink text-white px-3 py-1.5 rounded-xl">
                    Book
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      <DoctorDetailModal
        doctor={selectedDoctor}
        isOpen={Boolean(selectedDoctor)}
        onClose={() => setSelectedDoctor(null)}
      />
    </div>
  );
};
