import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/api/client';
import { useAuthStore } from '../../lib/auth/auth-store';
import { Button } from '../../components/ui/Button';
import { Check, ChevronRight, Droplets, MapPin, Phone, ShieldCheck, User } from 'lucide-react';

const GENDERS = [
  { id: 'MALE', label: 'Male' },
  { id: 'FEMALE', label: 'Female' },
  { id: 'OTHER', label: 'Other' },
  { id: 'PREFER_NOT_TO_SAY', label: 'Skip' },
] as const;
const BLOOD = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'UNKNOWN'] as const;

const STEPS = [
  { id: 'identity', title: 'Identity', icon: User },
  { id: 'clinical', title: 'Clinical', icon: Droplets },
  { id: 'address', title: 'Address', icon: MapPin },
  { id: 'emergency', title: 'Emergency', icon: Phone },
] as const;

export const OnboardingPage: React.FC = () => {
  const { user, checkSession } = useAuthStore();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    fullName: user?.name || '',
    ageYears: '',
    gender: 'MALE' as (typeof GENDERS)[number]['id'],
    bloodGroup: 'O+' as (typeof BLOOD)[number],
    addressLine: '',
    cityName: 'Bhubaneswar',
    pinCode: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    allergies: '',
    medicalNotes: '',
  });

  const update = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));
  const progress = useMemo(() => ((step + 1) / STEPS.length) * 100, [step]);

  const validateStep = () => {
    if (step === 0 && form.fullName.trim().length < 2) {
      setError('Enter your full name as on ID / ABHA.');
      return false;
    }
    if (step === 2 && form.addressLine.trim().length < 3) {
      setError('Enter your address for hospital admission.');
      return false;
    }
    if (step === 3) {
      if (!form.emergencyContactName.trim()) {
        setError('Emergency contact name is required.');
        return false;
      }
      if (form.emergencyContactPhone.replace(/\D/g, '').length < 10) {
        setError('Enter a valid 10-digit emergency phone.');
        return false;
      }
    }
    setError(null);
    return true;
  };

  const submit = async () => {
    if (!validateStep()) return;
    setLoading(true);
    setError(null);
    try {
      await apiClient.put('/auth/users/me/profile', {
        ...form,
        ageYears: form.ageYears ? Number(form.ageYears) : null,
        allergies: form.allergies || null,
        medicalNotes: form.medicalNotes || null,
        pinCode: form.pinCode || null,
        mobilePhone: form.emergencyContactPhone || null,
        preferredLanguage: 'en',
      });
      await checkSession();
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.message || 'Could not save profile');
    } finally {
      setLoading(false);
    }
  };

  const goNext = () => {
    if (!validateStep()) return;
    if (step < STEPS.length - 1) setStep((s) => s + 1);
    else void submit();
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#F4F7F2]">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">
        <div className="rounded-[28px] bg-[#B9F84B] p-6 shadow-sm">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#0B3D1A]">
            <ShieldCheck className="w-3.5 h-3.5" />
            Shared with hospital on bed booking
          </div>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-[#111111] font-display">
            Your care profile
          </h1>
          <p className="mt-2 text-sm text-[#3F3F46] max-w-lg">
            One-time clinical intake so admitting staff know who you are. Google login stays separate.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const active = i === step;
              const done = i < step;
              return (
                <span
                  key={s.id}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-extrabold ${
                    active
                      ? 'bg-[#111111] text-white'
                      : done
                        ? 'bg-[#0B3D1A] text-white'
                        : 'bg-white/70 text-[#3F3F46]'
                  }`}
                >
                  {done ? <Check className="w-3 h-3" /> : <Icon className="w-3 h-3" />}
                  {s.title}
                </span>
              );
            })}
          </div>

          <div className="mt-5 h-1.5 rounded-full bg-[#0B3D1A]/15 overflow-hidden">
            <div
              className="h-full rounded-full bg-[#0B3D1A] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="rounded-[28px] bg-white border border-[#E2E8F0] p-6 shadow-sm space-y-4">
          {step === 0 && (
            <>
              <h2 className="text-lg font-extrabold text-ink">Who are you?</h2>
              <Field label="Full name">
                <input
                  className="field"
                  value={form.fullName}
                  onChange={(e) => update('fullName', e.target.value)}
                  placeholder="As on ID / ABHA"
                />
              </Field>
              <Field label="Age (years)">
                <input
                  className="field"
                  type="number"
                  value={form.ageYears}
                  onChange={(e) => update('ageYears', e.target.value)}
                  placeholder="e.g. 34"
                />
              </Field>
              <Field label="Gender">
                <div className="flex flex-wrap gap-2">
                  {GENDERS.map((g) => (
                    <Chip
                      key={g.id}
                      active={form.gender === g.id}
                      onClick={() => update('gender', g.id)}
                      label={g.label}
                    />
                  ))}
                </div>
              </Field>
            </>
          )}

          {step === 1 && (
            <>
              <h2 className="text-lg font-extrabold text-ink">Clinical basics</h2>
              <Field label="Blood group">
                <div className="flex flex-wrap gap-2">
                  {BLOOD.map((g) => (
                    <Chip
                      key={g}
                      active={form.bloodGroup === g}
                      onClick={() => update('bloodGroup', g)}
                      label={g === 'UNKNOWN' ? 'Unknown' : g}
                    />
                  ))}
                </div>
              </Field>
              <Field label="Allergies (optional)">
                <input
                  className="field"
                  value={form.allergies}
                  onChange={(e) => update('allergies', e.target.value)}
                  placeholder="e.g. Penicillin"
                />
              </Field>
              <Field label="Medical notes (optional)">
                <textarea
                  className="field min-h-[92px] py-3"
                  value={form.medicalNotes}
                  onChange={(e) => update('medicalNotes', e.target.value)}
                  placeholder="Chronic conditions, current medicines…"
                />
              </Field>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="text-lg font-extrabold text-ink">Where can we find you?</h2>
              <Field label="Address">
                <textarea
                  className="field min-h-[92px] py-3"
                  value={form.addressLine}
                  onChange={(e) => update('addressLine', e.target.value)}
                  placeholder="Street, area, landmark"
                />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="City">
                  <input
                    className="field"
                    value={form.cityName}
                    onChange={(e) => update('cityName', e.target.value)}
                  />
                </Field>
                <Field label="PIN code">
                  <input
                    className="field"
                    value={form.pinCode}
                    onChange={(e) => update('pinCode', e.target.value)}
                    placeholder="751001"
                  />
                </Field>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h2 className="text-lg font-extrabold text-ink">Emergency contact</h2>
              <Field label="Contact name">
                <input
                  className="field"
                  value={form.emergencyContactName}
                  onChange={(e) => update('emergencyContactName', e.target.value)}
                  placeholder="Relative / guardian"
                />
              </Field>
              <Field label="Contact phone">
                <input
                  className="field"
                  type="tel"
                  value={form.emergencyContactPhone}
                  onChange={(e) => update('emergencyContactPhone', e.target.value)}
                  placeholder="10-digit mobile"
                />
              </Field>
              <div className="rounded-2xl bg-[#F4F7F2] border border-[#D8E0D4] p-4">
                <p className="text-[11px] font-extrabold uppercase tracking-wide text-[#0B3D1A]">
                  Ready to save
                </p>
                <p className="mt-1 text-base font-extrabold text-ink">{form.fullName || '—'}</p>
                <p className="text-xs text-muted mt-1">
                  {form.bloodGroup === 'UNKNOWN' ? 'Blood unknown' : form.bloodGroup}
                  {form.ageYears ? ` · ${form.ageYears} yrs` : ''}
                  {form.cityName ? ` · ${form.cityName}` : ''}
                </p>
              </div>
            </>
          )}

          {error && <p className="text-sm font-semibold text-red">{error}</p>}

          <div className="flex items-center justify-between gap-3 pt-2">
            {step > 0 ? (
              <Button type="button" variant="outline" onClick={() => setStep((s) => s - 1)}>
                Back
              </Button>
            ) : (
              <span />
            )}
            <Button
              type="button"
              variant="primary"
              isLoading={loading}
              onClick={goNext}
              className="min-w-[160px] inline-flex items-center justify-center gap-1"
            >
              {step === STEPS.length - 1 ? 'Save profile' : 'Continue'}
              {step < STEPS.length - 1 && <ChevronRight className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>

      <style>{`
        .field {
          margin-top: 0.25rem;
          width: 100%;
          height: 2.75rem;
          border-radius: 0.9rem;
          border: 1px solid #E2E8F0;
          background: #F8FAFC;
          padding: 0 0.9rem;
          font-size: 0.875rem;
          font-weight: 600;
          color: #0F172A;
          outline: none;
        }
        .field:focus {
          border-color: #0B3D1A;
          box-shadow: 0 0 0 3px rgba(11, 61, 26, 0.12);
        }
        textarea.field {
          height: auto;
          resize: vertical;
        }
      `}</style>
    </div>
  );
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-[11px] font-extrabold uppercase tracking-wide text-muted">
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3.5 py-2 text-xs font-extrabold border transition ${
        active
          ? 'bg-[#111111] text-white border-[#111111]'
          : 'bg-[#F1F5F9] text-[#475569] border-[#E2E8F0] hover:border-[#0B3D1A]/30'
      }`}
    >
      {label}
    </button>
  );
}
