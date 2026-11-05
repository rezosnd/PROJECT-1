import React, { useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useGeolocation } from '../../hooks/useGeolocation';
import { useAuthStore } from '../../lib/auth/auth-store';
import { abhaApi } from '../../lib/api/abha.api';
import { bedsApi } from '../../lib/api/beds.api';
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
  ShieldCheck,
  BedDouble,
  ClipboardList,
  Bell,
} from 'lucide-react';

const QUICK_TAGS = [
  { id: 'stroke', label: 'Stroke / ICU', icon: Brain, severity: 5 },
  { id: 'heart-attack', label: 'Cardiac', icon: Heart, severity: 5 },
  { id: 'premature-baby', label: 'NICU', icon: Baby, severity: 5 },
  { id: 'trauma', label: 'Trauma', icon: Activity, severity: 5 },
];

function MetricRow({
  icon: Icon,
  label,
  value,
  bar,
  tone = 'forest',
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  bar: number;
  tone?: 'forest' | 'lime' | 'teal';
}) {
  const barColor =
    tone === 'lime' ? 'bg-[#A8E017]' : tone === 'teal' ? 'bg-[#3F7A1E]' : 'bg-[#0B3D1A]';
  const valueColor =
    tone === 'lime' ? 'text-[#6B9A0A]' : tone === 'teal' ? 'text-[#3F7A1E]' : 'text-[#0B3D1A]';
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <span className="w-9 h-9 rounded-xl bg-[#EEF6E4] text-[#0B3D1A] flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4" strokeWidth={2.4} />
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-xs font-semibold text-muted truncate">{label}</p>
            <p className={`text-sm font-extrabold tabular-nums ${valueColor}`}>{value}</p>
          </div>
          <div className="mt-1.5 h-1.5 rounded-full bg-[#E8F0E0] overflow-hidden">
            <div
              className={`h-full rounded-full ${barColor} transition-all duration-500`}
              style={{ width: `${Math.max(6, Math.min(100, bar))}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const { lat, lng, addressLabel, isDetecting, detectLocation } = useGeolocation();

  const [selectedTag, setSelectedTag] = useState('stroke');
  const [searchText, setSearchText] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);

  const { data: abhaProfile } = useQuery({
    queryKey: ['abha-profile'],
    queryFn: () => abhaApi.getMe(),
    staleTime: 60_000,
    enabled: isAuthenticated,
  });

  const { data: myRequests = [] } = useQuery({
    queryKey: ['my-bed-requests'],
    queryFn: () => bedsApi.getMyRequests(),
    staleTime: 20_000,
    enabled: isAuthenticated,
  });

  const { data: citySummary } = useQuery({
    queryKey: ['city-summary-home'],
    queryFn: () => bedsApi.getCitySummary(),
    staleTime: 30_000,
  });

  const avatar = abhaProfile?.photoUrl || user?.abhaPhotoUrl || user?.pictureUrl;
  const displayName = abhaProfile?.name || user?.name || 'Patient';
  const firstName = displayName.split(' ')[0];

  const freeBeds = useMemo(() => {
    const s = citySummary as any;
    if (!s) return 34;
    return Number(s.freeBeds ?? s.totalFree ?? s.icuFree ?? 34);
  }, [citySummary]);

  const pendingHolds = myRequests.filter((r: any) => r.status === 'PENDING').length;
  const abhaReady = Boolean(abhaProfile);

  const launchSearch = (condition = selectedTag, severity = 4, q?: string) => {
    const params = new URLSearchParams({
      q: q || condition,
      lat: String(lat),
      lng: String(lng),
      severity: String(severity),
    });
    navigate(`/results?${params.toString()}`);
  };

  const careCards = [
    {
      title: 'Bed match',
      grade: freeBeds > 20 ? 'A' : freeBeds > 8 ? 'B+' : 'C',
      note: freeBeds > 20 ? 'Strong city capacity' : 'Check nearby wards',
      bg: 'bg-[#DFF5A8]',
      accent: 'text-[#0B3D1A]',
    },
    {
      title: 'ABHA',
      grade: abhaReady ? 'A' : '—',
      note: abhaReady ? 'Ready for intake' : 'Link to speed triage',
      bg: 'bg-[#C8E86A]',
      accent: 'text-[#0B3D1A]',
    },
    {
      title: 'Requests',
      grade: pendingHolds === 0 ? 'A' : String(pendingHolds),
      note: pendingHolds === 0 ? 'No open holds' : 'Active 15-min holds',
      bg: 'bg-[#B4DC4A]',
      accent: 'text-[#0B3D1A]',
    },
  ];

  return (
    <div className="pb-10 text-left max-w-6xl mx-auto">
      {/* Top bar — dashboard style */}
      <header className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
        <div className="min-w-0 sm:w-44 shrink-0">
          <h1 className="font-display text-xl sm:text-2xl font-extrabold text-ink tracking-tight">
            Patient Dashboard
          </h1>
          <p className="text-[11px] text-muted mt-0.5 truncate">Hi {firstName} · {BRAND.name}</p>
        </div>

        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') launchSearch(selectedTag, 4, searchText.trim() || selectedTag);
            }}
            placeholder="Search beds, hospitals, doctors…"
            className="w-full h-12 rounded-full bg-white border border-hairline pl-11 pr-4 text-sm text-ink placeholder:text-muted/70 shadow-soft focus:outline-none focus:ring-2 focus:ring-[#A8E017]/40 focus:border-[#0B3D1A]/30"
          />
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => navigate('/requests')}
            className="relative w-11 h-11 rounded-full bg-white border border-hairline flex items-center justify-center text-ink hover:bg-[#F4F7F2] transition"
            aria-label="Requests"
          >
            <Bell className="w-4 h-4" />
            {pendingHolds > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#A8E017] ring-2 ring-white" />
            )}
          </button>
          <a
            href="tel:112"
            className="h-11 px-3.5 rounded-full bg-[#FEE2E2] text-[#DC2626] text-xs font-bold inline-flex items-center gap-1.5 border border-[#FECACA]"
          >
            <Phone className="w-3.5 h-3.5" />
            112
          </a>
          <Link to="/profile" className="w-11 h-11 rounded-full overflow-hidden ring-2 ring-white shadow-sm bg-[#0B3D1A]">
            {avatar ? (
              <img src={avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="w-full h-full flex items-center justify-center text-[var(--color-brand-lime)] font-bold text-sm">
                {displayName.slice(0, 1).toUpperCase()}
              </span>
            )}
          </Link>
        </div>
      </header>

      {/* Card grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        {/* Hero overview card */}
        <article className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#0B3D1A] via-[#14532D] to-[#1B5E2F] text-white p-6 sm:p-7 min-h-[280px] flex flex-col shadow-[0_20px_50px_rgba(11,61,26,0.18)]">
          <div
            className="pointer-events-none absolute -right-8 -bottom-10 w-56 h-56 rounded-full opacity-30"
            style={{ background: 'radial-gradient(circle, #A8E017 0%, transparent 70%)' }}
          />
          <img
            src={BRAND.logoMark}
            alt=""
            className="absolute right-4 bottom-4 w-28 h-28 object-contain opacity-90 drop-shadow-lg"
          />

          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#A8E017]">Overview</p>
          <h2 className="mt-2 font-display text-2xl sm:text-[28px] font-extrabold tracking-tight leading-tight max-w-[220px] sm:max-w-[260px]">
            Find beds. Book care. Save time.
          </h2>
          <p className="mt-3 text-sm text-white/70 max-w-[240px] leading-relaxed">
            Live ward capacity across Bhubaneswar — matched to your location and urgency.
          </p>

          <div className="mt-auto pt-6 flex flex-wrap gap-2 relative z-10">
            <button
              type="button"
              onClick={() => launchSearch(selectedTag, 4, searchText.trim() || selectedTag)}
              className="h-11 px-5 rounded-full bg-[#A8E017] text-[#0B3D1A] text-sm font-extrabold inline-flex items-center gap-2 hover:brightness-105 transition shadow-soft"
            >
              Find beds
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => detectLocation()}
              disabled={isDetecting}
              className="h-11 px-4 rounded-full bg-white/10 border border-white/20 text-xs font-bold text-white inline-flex items-center gap-1.5 hover:bg-white/15 transition disabled:opacity-60"
            >
              <MapPin className="w-3.5 h-3.5" />
              {isDetecting ? 'Locating…' : 'My location'}
            </button>
          </div>
        </article>

        {/* Current situation card */}
        <article className="rounded-[28px] bg-white border border-hairline p-6 sm:p-7 shadow-soft min-h-[280px]">
          <div className="flex items-start justify-between gap-3 mb-5">
            <div>
              <h3 className="font-display text-lg font-bold text-ink">Current situation</h3>
              <p className="text-xs text-muted mt-0.5 flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                <span className="truncate max-w-[200px]">{addressLabel || 'Bhubaneswar grid'}</span>
              </p>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#3F7A1E] bg-[#EEF6E4] px-2.5 py-1 rounded-full">
              Live
            </span>
          </div>

          <div className="space-y-5">
            <MetricRow
              icon={BedDouble}
              label="City beds free"
              value={String(freeBeds)}
              bar={Math.min(100, (freeBeds / 60) * 100)}
              tone="forest"
            />
            <MetricRow
              icon={ShieldCheck}
              label="ABHA status"
              value={abhaReady ? 'Linked' : 'Not linked'}
              bar={abhaReady ? 100 : 18}
              tone="lime"
            />
            <MetricRow
              icon={ClipboardList}
              label="Open bed holds"
              value={String(pendingHolds)}
              bar={pendingHolds === 0 ? 12 : Math.min(100, pendingHolds * 28)}
              tone="teal"
            />
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
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
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold transition ${
                    active
                      ? 'bg-[#0B3D1A] text-[#A8E017]'
                      : 'bg-[#F4F7F2] text-[#0B3D1A] hover:bg-[#E8F0E0]'
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  {tag.label}
                </button>
              );
            })}
          </div>
        </article>

        {/* Care snapshot — green shade pills */}
        <article className="rounded-[28px] bg-white border border-hairline p-6 sm:p-7 shadow-soft">
          <h3 className="font-display text-lg font-bold text-ink">Care snapshot</h3>
          <p className="text-xs text-muted mt-0.5 mb-5">Your readiness across GetMyHospital</p>

          <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
            {careCards.map((c) => (
              <div
                key={c.title}
                className={`${c.bg} rounded-[22px] px-3 py-4 text-center min-h-[120px] flex flex-col items-center justify-center`}
              >
                <p className="text-[10px] font-bold uppercase tracking-wide text-[#0B3D1A]/70">{c.title}</p>
                <p className={`mt-2 font-display text-3xl font-extrabold ${c.accent}`}>{c.grade}</p>
                <p className="mt-2 text-[10px] font-semibold text-[#0B3D1A]/65 leading-snug">{c.note}</p>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => navigate(abhaReady ? '/requests' : '/abha')}
            className="mt-5 w-full h-12 rounded-full bg-[#4B7BEC] hover:bg-[#3B6DE0] text-white text-sm font-bold transition shadow-soft"
          >
            {abhaReady ? 'View my requests' : 'Link ABHA now'}
          </button>
        </article>

        {/* Doctors / activity */}
        <article className="rounded-[28px] bg-white border border-hairline p-6 sm:p-7 shadow-soft">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="font-display text-lg font-bold text-ink">Top doctors</h3>
              <p className="text-xs text-muted mt-0.5">Nearby specialists</p>
            </div>
            <div className="flex gap-1 p-1 rounded-full bg-[#F4F7F2]">
              {['Week', 'Month'].map((label, i) => (
                <span
                  key={label}
                  className={`px-3 py-1 rounded-full text-[10px] font-bold ${
                    i === 0 ? 'bg-white text-[#0B3D1A] shadow-sm' : 'text-muted'
                  }`}
                >
                  {label}
                </span>
              ))}
            </div>
          </div>

          {/* Soft bar chart motif */}
          <div className="flex items-end gap-2 h-16 mb-5 px-1">
            {[42, 68, 55, 80, 48, 72, 90, 60].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-t-lg bg-gradient-to-t from-[#0B3D1A] to-[#A8E017] opacity-80"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>

          <ul className="space-y-3">
            {TOP_DOCTORS.slice(0, 3).map((doc) => (
              <li key={doc.id}>
                <button
                  type="button"
                  onClick={() => setSelectedDoctor(doc)}
                  className="w-full flex items-center gap-3 text-left rounded-2xl p-2 hover:bg-[#F4F7F2] transition"
                >
                  <img
                    src={doc.avatarUrl}
                    alt=""
                    className="w-11 h-11 rounded-full object-cover shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-ink truncate">{doc.name}</p>
                    <p className="text-[11px] text-muted truncate">{doc.specialty}</p>
                  </div>
                  <span className="inline-flex items-center gap-0.5 text-xs font-bold text-[#0B3D1A]">
                    <Star className="w-3.5 h-3.5 fill-[#A8E017] text-[#A8E017]" />
                    {doc.rating.toFixed(1)}
                  </span>
                </button>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={() => navigate('/doctors')}
            className="mt-4 w-full h-11 rounded-full border border-hairline text-xs font-bold text-[#0B3D1A] hover:bg-[#F4F7F2] transition"
          >
            View all doctors
          </button>
        </article>
      </div>

      <DoctorDetailModal
        doctor={selectedDoctor}
        isOpen={Boolean(selectedDoctor)}
        onClose={() => setSelectedDoctor(null)}
      />
    </div>
  );
};
