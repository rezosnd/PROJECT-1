import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useGeolocation } from '../../hooks/useGeolocation';
import { useAuthStore } from '../../lib/auth/auth-store';
import { abhaApi } from '../../lib/api/abha.api';
import { bedsApi } from '../../lib/api/beds.api';
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
  BedDouble,
  Crosshair,
  ShieldCheck,
  AlertTriangle,
  Stethoscope,
  Sparkles,
} from 'lucide-react';

const QUICK_TAGS = [
  { id: 'stroke', label: 'Stroke / ICU', icon: Brain },
  { id: 'heart-attack', label: 'Cardiac', icon: Heart },
  { id: 'premature-baby', label: 'NICU', icon: Baby },
  { id: 'trauma', label: 'Trauma', icon: Activity },
];

function SparkBars({
  heights,
  fill = 0.55,
}: {
  heights: number[];
  /** 0–1 how many bars are filled from the left */
  fill?: number;
}) {
  const filled = Math.max(1, Math.round(heights.length * fill));
  return (
    <div className="mt-3 flex items-end gap-[3px] h-8">
      {heights.map((h, i) => (
        <span
          key={i}
          className="w-[3px] rounded-full"
          style={{
            height: `${Math.max(18, Math.min(100, h * 100))}%`,
            background: i < filled ? 'rgba(17,17,17,0.55)' : 'rgba(255,255,255,0.55)',
          }}
        />
      ))}
    </div>
  );
}

/** Frosted available-beds panel — overlapping circular score like the CityCare ref */
function AvailableBedsPanel({
  freeBeds,
  pendingHolds,
  availabilityPct,
  onFind,
}: {
  freeBeds: number;
  pendingHolds: number;
  availabilityPct: number;
  onFind: () => void;
}) {
  const columns = [
    {
      label: 'Free now',
      pct: Math.min(99, Math.max(8, Math.round((freeBeds / Math.max(freeBeds + 40, 1)) * 100))),
      bars: [0.35, 0.55, 0.45, 0.7, 0.5, 0.85, 0.6, 0.4],
      fill: 0.7,
    },
    {
      label: 'On hold',
      pct: Math.min(60, Math.max(6, pendingHolds * 8 + 12)),
      bars: [0.4, 0.65, 0.5, 0.8, 0.55, 0.7, 0.45, 0.6],
      fill: 0.45,
    },
    {
      label: 'Critical wards',
      pct: Math.min(95, Math.max(20, 100 - Math.round(freeBeds / 3))),
      bars: [0.5, 0.35, 0.75, 0.55, 0.9, 0.4, 0.65, 0.5],
      fill: 0.55,
    },
  ];

  return (
    <div className="relative pt-12 sm:pt-14">
      {/* Overlapping circular badge */}
      <div className="absolute left-1/2 top-0 z-20 -translate-x-1/2">
        <div
          className="w-[108px] h-[108px] sm:w-[120px] sm:h-[120px] rounded-full grid place-items-center"
          style={{
            background: 'rgba(255,255,255,0.42)',
            backdropFilter: 'blur(18px)',
            WebkitBackdropFilter: 'blur(18px)',
            boxShadow:
              '0 10px 30px rgba(17,17,17,0.06), inset 0 0 0 1px rgba(255,255,255,0.65)',
          }}
        >
          <div
            className="w-[88%] h-[88%] rounded-full grid place-items-center"
            style={{
              border: '1.5px dashed rgba(255,255,255,0.95)',
            }}
          >
            <div className="text-center px-2">
              <p className="font-display text-2xl sm:text-[1.75rem] font-bold text-ink tabular-nums leading-none tracking-tight">
                {availabilityPct}%
              </p>
              <p className="mt-1 text-[9px] sm:text-[10px] font-medium text-muted leading-tight">
                Beds
                <br />
                available
              </p>
            </div>
          </div>
        </div>
      </div>

      <div
        className="relative rounded-[28px] sm:rounded-[32px] px-4 sm:px-6 pt-16 sm:pt-[4.75rem] pb-5 sm:pb-6"
        style={{
          background: 'rgba(255,255,255,0.38)',
          backdropFilter: 'blur(28px) saturate(160%)',
          WebkitBackdropFilter: 'blur(28px) saturate(160%)',
          border: '1px solid rgba(255,255,255,0.7)',
          boxShadow:
            '0 16px 48px rgba(17,17,17,0.05), inset 0 1px 0 rgba(255,255,255,0.8)',
        }}
      >
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="font-display text-base sm:text-lg font-bold text-ink tracking-tight">
              Available beds
            </h3>
            <p className="text-xs text-muted mt-0.5">
              {freeBeds} free citywide · live grid
            </p>
          </div>
          <button
            type="button"
            onClick={onFind}
            className="h-9 px-3.5 rounded-full bg-ink text-white text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-ink-light transition shrink-0"
          >
            Find
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3 sm:gap-5">
          {columns.map((col) => (
            <div key={col.label} className="min-w-0">
              <p className="text-[11px] sm:text-xs text-ink/80 leading-snug">
                <span className="text-muted">{col.label}:</span>{' '}
                <span className="font-semibold tabular-nums">{col.pct}%</span>
              </p>
              <SparkBars heights={col.bars} fill={col.fill} />
            </div>
          ))}
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

  const stats = [
    { label: 'Free beds', value: String(freeBeds), hint: 'Citywide' },
    { label: 'Open holds', value: String(pendingHolds), hint: pendingHolds ? 'Active' : 'Clear' },
    { label: 'ABHA', value: abhaReady ? 'Ready' : 'Link', hint: abhaReady ? 'Verified' : 'Pending' },
    { label: 'Doctors', value: String(TOP_DOCTORS.length), hint: 'Nearby' },
  ];

  return (
    <div className="pb-10 text-left max-w-6xl mx-auto space-y-5">
      {/* Hero — CityCare style */}
      <section className="relative overflow-hidden rounded-[32px] ll-glass-strong p-5 sm:p-7 min-h-[280px]">
        <div
          className="pointer-events-none absolute -top-24 left-[20%] w-72 h-72 rounded-full opacity-70"
          style={{ background: 'radial-gradient(circle, rgba(240,180,138,0.55), transparent 70%)' }}
        />
        <div
          className="pointer-events-none absolute -bottom-28 right-[5%] w-80 h-80 rounded-full opacity-60"
          style={{ background: 'radial-gradient(circle, rgba(158,212,184,0.55), transparent 70%)' }}
        />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-end">
          <div className="lg:col-span-5 pb-1">
            <p className="text-sm text-muted">Care updates · last 7 days</p>
            <h1 className="mt-1 font-display text-3xl sm:text-[2.5rem] font-bold text-ink tracking-tight leading-[1.05]">
              Hello! {firstName}
            </h1>
            <p className="mt-3 text-sm text-muted max-w-sm leading-relaxed">
              Live beds near {addressLabel || 'Bhubaneswar'} — hold in 15 minutes when it matters.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => launchSearch('emergency', 5, 'EMERGENCY')}
                className="h-11 px-5 rounded-full bg-ink text-white text-sm font-semibold inline-flex items-center gap-2 hover:bg-ink-light transition"
              >
                Hold emergency bed
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => navigate('/ai')}
                className="h-11 px-5 rounded-full bg-[#B9F84B] text-[#0B3D1A] text-sm font-semibold hover:brightness-105 transition"
              >
                Ask CityHealth AI
              </button>
              <button
                type="button"
                onClick={() => navigate('/blood')}
                className="h-11 px-5 rounded-full ll-glass border border-white/70 text-sm font-semibold text-ink hover:bg-white/70 transition"
              >
                Find blood
              </button>
              <button
                type="button"
                onClick={() => navigate(abhaReady ? '/requests' : '/abha')}
                className="h-11 px-5 rounded-full ll-glass border border-white/70 text-sm font-semibold text-ink hover:bg-white/70 transition"
              >
                {abhaReady ? 'My requests' : 'Link ABHA'}
              </button>
            </div>
          </div>

          <div className="lg:col-span-7">
            <AvailableBedsPanel
              freeBeds={freeBeds}
              pendingHolds={pendingHolds}
              availabilityPct={Math.min(99, Math.max(12, Math.round((freeBeds / Math.max(freeBeds + 28, 1)) * 100)))}
              onFind={() => launchSearch(selectedTag, 4, searchText.trim() || selectedTag)}
            />
          </div>
        </div>
      </section>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s) => (
          <article key={s.label} className="rounded-[24px] ll-glass-strong p-4 sm:p-5">
            <p className="text-xs text-muted">{s.label}</p>
            <div className="mt-2 flex items-end justify-between gap-2">
              <p className="font-display text-2xl sm:text-3xl font-bold text-ink tabular-nums tracking-tight">
                {s.value}
              </p>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-ink text-white">
                {s.hint}
              </span>
            </div>
          </article>
        ))}
      </div>

      {/* Find beds */}
      <section className="rounded-[28px] ll-glass-strong p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-2xl bg-ink text-white flex items-center justify-center">
              <BedDouble className="w-5 h-5" />
            </span>
            <div>
              <h2 className="font-display text-lg font-bold text-ink">Find beds</h2>
              <p className="text-xs text-muted flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3" />
                {addressLabel || 'Bhubaneswar'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
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
              className="w-full h-12 rounded-full bg-white/70 border border-white/80 pl-11 pr-4 text-sm text-ink placeholder:text-muted/70 focus:outline-none focus:ring-2 focus:ring-[#9ED4B8]/50"
            />
          </div>
          <button
            type="button"
            onClick={() => detectLocation()}
            disabled={isDetecting}
            className="h-12 px-4 rounded-full ll-glass border border-white/70 text-sm font-semibold text-ink inline-flex items-center justify-center gap-2 hover:bg-white/80 transition disabled:opacity-60"
          >
            <Crosshair className="w-4 h-4" />
            {isDetecting ? 'Locating…' : 'Near me'}
          </button>
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
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold transition border ${
                  active
                    ? 'bg-ink text-white border-ink'
                    : 'll-glass text-ink border-white/70 hover:bg-white/75'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tag.label}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => launchSearch(selectedTag, 4, searchText.trim() || selectedTag)}
          className="mt-5 h-11 px-6 rounded-full bg-ink text-white text-sm font-semibold inline-flex items-center gap-2 hover:bg-ink-light transition"
        >
          Search free beds
          <ArrowRight className="w-4 h-4" />
        </button>
      </section>

      {/* Dark ops strip — CityCare bottom vibe */}
      <section className="rounded-[28px] bg-[#111111] text-white p-5 sm:p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <p className="text-xs text-white/50 mb-3">Care focus</p>
          <div className="flex flex-wrap gap-2">
            {QUICK_TAGS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setSelectedTag(t.id);
                  setSearchText(t.label);
                  launchSearch(t.id, 5, t.label);
                }}
                className="px-3 py-1.5 rounded-full text-[11px] font-semibold bg-white/10 hover:bg-white/15 border border-white/10 transition"
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[
            { name: 'ICU', pct: 97, glow: 'shadow-[0_0_24px_rgba(123,201,166,0.35)] border-[#7BC9A6]/40' },
            { name: 'NICU', pct: 91, glow: 'shadow-[0_0_24px_rgba(232,154,92,0.35)] border-[#E89A5C]/40' },
            { name: 'ER', pct: 95, glow: 'shadow-[0_0_24px_rgba(76,125,255,0.35)] border-[#4C7DFF]/40' },
          ].map((d) => (
            <div
              key={d.name}
              className={`rounded-2xl border bg-white/[0.04] px-2.5 py-3 text-center ${d.glow}`}
            >
              <p className="text-[10px] text-white/50">{d.name}</p>
              <p className="mt-1 text-lg font-bold tabular-nums">{d.pct}%</p>
            </div>
          ))}
        </div>

        <div className="space-y-2.5">
          <p className="text-xs text-white/50">Alerts</p>
          {[
            { icon: AlertTriangle, text: `${freeBeds} beds free citywide`, ago: 'live' },
            {
              icon: ShieldCheck,
              text: abhaReady ? 'ABHA ready for triage' : 'ABHA not linked',
              ago: 'now',
            },
            { icon: Stethoscope, text: `${pendingHolds} open bed holds`, ago: 'sync' },
          ].map((a) => (
            <div key={a.text} className="flex items-center gap-2.5 text-xs">
              <a.icon className="w-3.5 h-3.5 text-white/45 shrink-0" />
              <span className="flex-1 text-white/85 truncate">{a.text}</span>
              <span className="text-white/35 shrink-0">{a.ago}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Doctors */}
      <section className="rounded-[28px] ll-glass-strong p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="font-display text-lg font-bold text-ink">Top doctors</h3>
            <p className="text-sm text-muted mt-0.5">Nearby specialists</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/doctors')}
            className="text-sm font-semibold text-ink hover:underline"
          >
            View all
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {TOP_DOCTORS.slice(0, 3).map((doc) => (
            <button
              key={doc.id}
              type="button"
              onClick={() => setSelectedDoctor(doc)}
              className="rounded-2xl ll-glass border border-white/70 p-3.5 text-left hover:bg-white/75 transition flex items-center gap-3"
            >
              <img src={doc.avatarUrl} alt="" className="w-12 h-12 rounded-full object-cover shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink truncate">{doc.name}</p>
                <p className="text-xs text-muted truncate">{doc.specialty}</p>
                <span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-ink">
                  <Star className="w-3.5 h-3.5 fill-[#E89A5C] text-[#E89A5C]" />
                  {doc.rating.toFixed(1)}
                </span>
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
