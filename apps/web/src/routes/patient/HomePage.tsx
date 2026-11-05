import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  ShieldCheck,
  BedDouble,
  ClipboardList,
  Crosshair,
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
    <div className="flex items-center gap-3">
      <span className="w-9 h-9 rounded-xl ll-glass border border-white/55 text-[#0B3D1A] flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4" strokeWidth={2.4} />
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-xs font-semibold text-muted truncate">{label}</p>
          <p className={`text-sm font-extrabold tabular-nums ${valueColor}`}>{value}</p>
        </div>
        <div className="mt-1.5 h-1.5 rounded-full bg-white/50 overflow-hidden border border-white/40">
          <div
            className={`h-full rounded-full ${barColor} transition-all duration-500`}
            style={{ width: `${Math.max(6, Math.min(100, bar))}%` }}
          />
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

  const careCards = [
    {
      title: 'Bed match',
      grade: freeBeds > 20 ? 'A' : freeBeds > 8 ? 'B+' : 'C',
      note: freeBeds > 20 ? 'Strong city capacity' : 'Check nearby wards',
      tint: 'rgba(223, 245, 168, 0.55)',
    },
    {
      title: 'ABHA',
      grade: abhaReady ? 'A' : '—',
      note: abhaReady ? 'Ready for intake' : 'Link to speed triage',
      tint: 'rgba(200, 232, 106, 0.55)',
    },
    {
      title: 'Requests',
      grade: pendingHolds === 0 ? 'A' : String(pendingHolds),
      note: pendingHolds === 0 ? 'No open holds' : 'Active 15-min holds',
      tint: 'rgba(180, 220, 74, 0.55)',
    },
  ];

  return (
    <div className="pb-10 text-left max-w-6xl mx-auto space-y-5">
      {/* Greeting only — no bell / 112 / avatar row */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--color-brand-forest)]">
          {BRAND.name}
        </p>
        <h1 className="mt-1 font-display text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">
          Hi {firstName}
        </h1>
        <p className="mt-1 text-sm text-muted">Find a free bed near you in a few taps.</p>
      </div>

      {/* FIND BEDS — primary glass hero */}
      <section className="relative overflow-hidden rounded-[32px] ll-glass-strong border border-white/60 p-5 sm:p-7">
        <div
          className="pointer-events-none absolute -top-20 -right-16 w-64 h-64 rounded-full opacity-50"
          style={{ background: 'radial-gradient(circle, rgba(168,224,23,0.45), transparent 68%)' }}
        />
        <div
          className="pointer-events-none absolute -bottom-24 -left-10 w-56 h-56 rounded-full opacity-40"
          style={{ background: 'radial-gradient(circle, rgba(11,61,26,0.12), transparent 70%)' }}
        />

        <div className="relative z-10">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2.5">
              <span className="w-10 h-10 rounded-2xl ll-glass-dark flex items-center justify-center border border-white/15">
                <BedDouble className="w-5 h-5 text-[#A8E017]" />
              </span>
              <div>
                <h2 className="font-display text-lg sm:text-xl font-extrabold text-ink">Find beds</h2>
                <p className="text-[11px] text-muted flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3" />
                  <span className="truncate max-w-[220px]">{addressLabel || 'Bhubaneswar'}</span>
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#0B3D1A] ll-glass px-2.5 py-1 rounded-full border border-white/55">
              <span className="w-1.5 h-1.5 rounded-full bg-[#A8E017] animate-pulse" />
              {freeBeds} free citywide
            </span>
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
                className="w-full h-14 rounded-2xl bg-white/55 backdrop-blur-xl border border-white/70 pl-11 pr-4 text-sm text-ink placeholder:text-muted/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] focus:outline-none focus:ring-2 focus:ring-[#A8E017]/40 focus:border-[#0B3D1A]/25"
              />
            </div>
            <button
              type="button"
              onClick={() => detectLocation()}
              disabled={isDetecting}
              className="h-14 px-4 rounded-2xl ll-glass border border-white/60 text-xs font-bold text-ink inline-flex items-center justify-center gap-2 hover:bg-white/70 transition disabled:opacity-60 shrink-0"
              title="Use my location"
            >
              <Crosshair className="w-4 h-4 text-[var(--color-brand-forest)]" />
              {isDetecting ? 'Locating…' : 'Near me'}
            </button>
          </div>

          <div className="mt-3.5 flex flex-wrap gap-2">
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
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[11px] font-bold transition border ${
                    active
                      ? 'bg-[#0B3D1A]/90 text-[#A8E017] border-white/10 backdrop-blur-md'
                      : 'll-glass text-[#0B3D1A] border-white/55 hover:bg-white/70'
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
            className="mt-5 w-full sm:w-auto min-w-[200px] h-13 h-[52px] px-7 rounded-2xl bg-[#0B3D1A]/92 backdrop-blur-md text-[#A8E017] text-sm font-extrabold inline-flex items-center justify-center gap-2 hover:bg-[#0B3D1A] transition border border-white/15 shadow-[0_12px_28px_rgba(11,61,26,0.22)]"
          >
            Search free beds
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* Glass card grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        <article className="rounded-[28px] ll-glass-strong border border-white/55 p-6 sm:p-7">
          <div className="flex items-start justify-between gap-3 mb-5">
            <div>
              <h3 className="font-display text-lg font-bold text-ink">Current situation</h3>
              <p className="text-xs text-muted mt-0.5">Live grid status for your session</p>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#3F7A1E] ll-glass px-2.5 py-1 rounded-full border border-white/50">
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
        </article>

        <article className="rounded-[28px] ll-glass-strong border border-white/55 p-6 sm:p-7">
          <h3 className="font-display text-lg font-bold text-ink">Care snapshot</h3>
          <p className="text-xs text-muted mt-0.5 mb-5">Your readiness across GetMyHospital</p>

          <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
            {careCards.map((c) => (
              <div
                key={c.title}
                className="rounded-[22px] px-3 py-4 text-center min-h-[120px] flex flex-col items-center justify-center border border-white/55 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]"
                style={{ background: c.tint }}
              >
                <p className="text-[10px] font-bold uppercase tracking-wide text-[#0B3D1A]/70">{c.title}</p>
                <p className="mt-2 font-display text-3xl font-extrabold text-[#0B3D1A]">{c.grade}</p>
                <p className="mt-2 text-[10px] font-semibold text-[#0B3D1A]/65 leading-snug">{c.note}</p>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => navigate(abhaReady ? '/requests' : '/abha')}
            className="mt-5 w-full h-12 rounded-full ll-glass-dark text-[#A8E017] text-sm font-bold transition border border-white/15 hover:brightness-110"
          >
            {abhaReady ? 'View my requests' : 'Link ABHA now'}
          </button>
        </article>

        <article className="rounded-[28px] ll-glass-strong border border-white/55 p-6 sm:p-7 lg:col-span-2">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="font-display text-lg font-bold text-ink">Top doctors</h3>
              <p className="text-xs text-muted mt-0.5">Nearby specialists</p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/doctors')}
              className="text-xs font-bold text-[var(--color-brand-forest)] ll-glass px-3 py-1.5 rounded-full border border-white/55"
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
                className="ll-glass border border-white/55 rounded-2xl p-3.5 text-left hover:bg-white/70 transition flex items-center gap-3"
              >
                <img
                  src={doc.avatarUrl}
                  alt=""
                  className="w-12 h-12 rounded-xl object-cover shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-ink truncate">{doc.name}</p>
                  <p className="text-[11px] text-muted truncate">{doc.specialty}</p>
                  <span className="mt-1 inline-flex items-center gap-0.5 text-xs font-bold text-[#0B3D1A]">
                    <Star className="w-3.5 h-3.5 fill-[#A8E017] text-[#A8E017]" />
                    {doc.rating.toFixed(1)}
                  </span>
                </div>
              </button>
            ))}
          </div>
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
