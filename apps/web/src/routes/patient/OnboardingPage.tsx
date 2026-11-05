import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/api/client';
import { useAuthStore } from '../../lib/auth/auth-store';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';

const GENDERS = ['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'] as const;
const BLOOD = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'UNKNOWN'] as const;

export const OnboardingPage: React.FC = () => {
  const { user, checkSession } = useAuthStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    fullName: user?.name || '',
    ageYears: '',
    gender: 'MALE' as (typeof GENDERS)[number],
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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await apiClient.put('/auth/users/me/profile', {
        ...form,
        ageYears: form.ageYears ? Number(form.ageYears) : null,
        allergies: form.allergies || null,
        medicalNotes: form.medicalNotes || null,
        pinCode: form.pinCode || null,
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

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
      <div>
        <h1 className="text-2xl font-bold font-heading text-ink">Complete your care profile</h1>
        <p className="text-sm text-muted mt-1">
          Required once so hospitals receive your details with every bed request. Sign-in remains Google-only.
        </p>
      </div>

      <Card className="p-6 bg-white border border-hairline">
        <form onSubmit={submit} className="space-y-4">
          {[
            ['fullName', 'Full name', 'text'],
            ['ageYears', 'Age (years)', 'number'],
            ['addressLine', 'Address', 'text'],
            ['cityName', 'City', 'text'],
            ['pinCode', 'PIN code', 'text'],
            ['emergencyContactName', 'Emergency contact name', 'text'],
            ['emergencyContactPhone', 'Emergency contact phone', 'tel'],
            ['allergies', 'Allergies (optional)', 'text'],
            ['medicalNotes', 'Medical notes (optional)', 'text'],
          ].map(([key, label, type]) => (
            <label key={key} className="block text-xs font-semibold text-muted uppercase tracking-wide">
              {label}
              <input
                required={!label.includes('optional')}
                type={type}
                className="mt-1 w-full h-11 px-3 rounded-xl border border-hairline text-sm text-ink"
                value={(form as any)[key]}
                onChange={(e) => update(key, e.target.value)}
              />
            </label>
          ))}

          <label className="block text-xs font-semibold text-muted uppercase tracking-wide">
            Gender
            <select
              className="mt-1 w-full h-11 px-3 rounded-xl border border-hairline text-sm"
              value={form.gender}
              onChange={(e) => update('gender', e.target.value)}
            >
              {GENDERS.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </label>

          <label className="block text-xs font-semibold text-muted uppercase tracking-wide">
            Blood group
            <select
              className="mt-1 w-full h-11 px-3 rounded-xl border border-hairline text-sm"
              value={form.bloodGroup}
              onChange={(e) => update('bloodGroup', e.target.value)}
            >
              {BLOOD.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </label>

          {error && <p className="text-sm text-red font-medium">{error}</p>}

          <Button type="submit" variant="primary" isLoading={loading} className="w-full">
            Save & continue
          </Button>
        </form>
      </Card>
    </div>
  );
};
