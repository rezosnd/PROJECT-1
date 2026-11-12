import React from 'react';
import { Link } from 'react-router-dom';
import { MatchedHospital } from '../../lib/api/matching.api';
import { Button } from '../../components/ui/Button';
import type { InsuranceCoverageLevel } from '../../lib/api/insurance.api';
import { Star, Clock, MapPin, ArrowRight, BedDouble, ShieldCheck } from 'lucide-react';

const INSURANCE_BADGE: Record<
  InsuranceCoverageLevel,
  { label: string; className: string } | null
> = {
  COVERED: {
    label: 'Insurance accepted',
    className: 'bg-[#0B3D1A]/90 text-[#A8E017] border-[#A8E017]/30',
  },
  NO_OVERLAP: {
    label: 'Not in your network',
    className: 'bg-amber-50/90 text-amber-900 border-amber-200/70',
  },
  HOSPITAL_UNKNOWN: {
    label: 'Insurance network unknown',
    className: 'bg-white/80 text-muted border-black/[0.06]',
  },
  NONE_DECLARED: null,
};

interface HospitalCardProps {
  match: MatchedHospital;
  onRequestBed?: (hospitalId: string, wardType: string) => void;
  className?: string;
  index?: number;
}

export const HospitalCard: React.FC<HospitalCardProps> = ({
  match,
  onRequestBed,
  className = '',
  index = 0,
}) => {
  const { hospital, distanceKm, etaMinutes, matchedWard } = match;
  const freeBeds = matchedWard.freeBeds;
  const chance3h = Math.round((matchedWard.forecastProb3h || 0) * 100);
  const chanceLabel =
    chance3h >= 70 ? 'Likely free' : chance3h >= 40 ? 'Possible' : 'Unlikely';
  const freeTone =
    freeBeds > 2 ? 'text-green' : freeBeds > 0 ? 'text-orange' : 'text-red';
  const tint = index % 2 === 0 ? 'bg-[#EEF8D8]' : 'bg-[#FFF1C2]';
  const coverage = match.insuranceCoverage;
  const insuranceBadge =
    coverage && INSURANCE_BADGE[coverage] ? INSURANCE_BADGE[coverage] : null;

  return (
    <article
      className={`rounded-[24px] p-5 text-left shadow-soft border border-black/[0.04] transition hover:-translate-y-0.5 hover:shadow-float ${tint} ${className}`}
    >
      <div className="flex gap-3">
        {hospital.photoUrl ? (
          <img
            src={hospital.photoUrl}
            alt=""
            className="w-16 h-16 rounded-2xl object-cover border border-black/5 shrink-0"
          />
        ) : (
          <div className="w-16 h-16 rounded-2xl bg-white/80 border border-black/5 flex items-center justify-center shrink-0 font-display font-extrabold text-ink">
            {hospital.name.slice(0, 2).toUpperCase()}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-display font-bold text-[17px] text-ink leading-tight truncate">
                {hospital.name}
              </h3>
              <p className="text-xs text-ink/60 mt-0.5 truncate flex items-center gap-1">
                <MapPin className="w-3 h-3 shrink-0" />
                {hospital.address || 'Bhubaneswar'}
              </p>
            </div>
            <span className="inline-flex items-center gap-0.5 text-xs font-bold text-ink shrink-0 bg-white/70 px-2 py-1 rounded-xl">
              <Star className="w-3.5 h-3.5 fill-ink" />
              {(hospital.ratingAvg || 4.5).toFixed(1)}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-ink/70">
            <span className="inline-flex items-center gap-1 bg-white/70 px-2 py-1 rounded-xl">
              <Clock className="w-3 h-3" />
              {etaMinutes} min · {distanceKm} km
            </span>
            <span className="inline-flex items-center gap-1 bg-white/70 px-2 py-1 rounded-xl">
              <BedDouble className="w-3 h-3" />
              {matchedWard.wardType}
            </span>
            {insuranceBadge && (
              <span
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-xl text-[10px] font-bold border ${insuranceBadge.className}`}
              >
                <ShieldCheck className="w-3 h-3" />
                {insuranceBadge.label}
                {coverage === 'COVERED' && (match.insuranceDiscountPercent || 0) > 0
                  ? ` · ${match.insuranceDiscountPercent}% benefit`
                  : ''}
                {coverage === 'COVERED' && match.insuranceCashless ? ' · cashless' : ''}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl bg-white/75 border border-black/[0.04] p-3.5">
        <p className={`text-base font-extrabold font-display ${freeTone}`}>
          {freeBeds > 0
            ? `${freeBeds} ${matchedWard.wardType} bed${freeBeds === 1 ? '' : 's'} free now`
            : `No ${matchedWard.wardType} beds free now`}
        </p>
        <p className="text-xs text-ink/70 mt-1">
          <span className="font-bold text-ink">{chance3h}%</span> chance free in ~3 hrs · {chanceLabel}
        </p>

        <div className="mt-3 grid grid-cols-3 gap-2">
          {[
            { label: '1h', p: matchedWard.forecastProb1h },
            { label: '3h', p: matchedWard.forecastProb3h },
            { label: '6h', p: matchedWard.forecastProb6h },
          ].map((row) => {
            const pct = Math.round((row.p || 0) * 100);
            return (
              <div key={row.label} className="rounded-xl bg-card-soft/90 px-2 py-2 text-center">
                <div className="text-[10px] font-bold uppercase tracking-wide text-muted">+{row.label}</div>
                <div className="text-sm font-extrabold text-ink mt-0.5">{pct}%</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <Button
          type="button"
          variant="primary"
          size="md"
          className="flex-[1.4]"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onRequestBed?.(hospital.id, matchedWard.wardType);
          }}
        >
          Hold bed (15 min)
        </Button>
        <Link to={`/hospital/${hospital.id}`} className="flex-1">
          <Button variant="secondary" size="md" className="w-full" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
            Details
          </Button>
        </Link>
      </div>
    </article>
  );
};
