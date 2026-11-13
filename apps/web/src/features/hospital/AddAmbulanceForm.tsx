import React, { useEffect, useState } from 'react';
import { adminApi } from '../../lib/api/admin.api';
import { Hospital } from '../../lib/api/hospitals.api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useToast } from '../../components/ui/Toast';
import { Ambulance, Mail, Truck } from 'lucide-react';

type AmbulanceType = 'BLS' | 'ALS' | 'ICU' | 'NEONATAL' | 'AIR';

interface AddAmbulanceFormProps {
  hospitals: Hospital[];
  onRegistered?: () => void;
  className?: string;
}

export const AddAmbulanceForm: React.FC<AddAmbulanceFormProps> = ({
  hospitals,
  onRegistered,
  className = '',
}) => {
  const { addToast } = useToast();
  const [email, setEmail] = useState('');
  const [hospitalId, setHospitalId] = useState(hospitals[0]?.id || '');
  const [callSign, setCallSign] = useState('');
  const [vehicleNo, setVehicleNo] = useState('');
  const [ambulanceType, setAmbulanceType] = useState<AmbulanceType>('ALS');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lockedToOneHospital = hospitals.length === 1;

  useEffect(() => {
    if (hospitals[0]?.id) setHospitalId(hospitals[0].id);
  }, [hospitals]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.toLowerCase().endsWith('@gmail.com')) {
      setError('Ambulance login must be a valid @gmail.com address for Google sign-in');
      return;
    }
    if (!hospitalId) {
      setError('Select the hospital this unit belongs to');
      return;
    }
    if (!vehicleNo.trim()) {
      setError('Vehicle / plate number is required');
      return;
    }

    setIsSubmitting(true);
    try {
      await adminApi.preRegisterStaff({
        email: email.trim().toLowerCase(),
        hospitalId,
        role: 'AMBULANCE',
        specialty: callSign.trim() || null,
        licenseNo: vehicleNo.trim(),
        vehicleNo: vehicleNo.trim(),
        ambulanceType,
      });

      addToast({
        type: 'success',
        title: 'Ambulance login created',
        message: `${email} can now open the GetMyHospital Ambulance app and sign in with Google.`,
      });

      setEmail('');
      setCallSign('');
      setVehicleNo('');
      setAmbulanceType('ALS');
      onRegistered?.();
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Failed to register ambulance login';
      setError(msg);
      addToast({ type: 'error', title: 'Registration Error', message: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={`bg-white rounded-card border border-hairline/80 shadow-soft p-5 text-left ${className}`}
    >
      <div className="pb-3 border-b border-hairline/60 mb-4">
        <h3 className="font-display font-bold text-base text-ink flex items-center gap-2">
          <Ambulance className="w-4 h-4 text-navy" />
          Add ambulance login
        </h3>
        <p className="text-xs text-muted mt-0.5">
          Pre-register a crew Gmail. When they open the <strong>Ambulance</strong> Expo app and
          sign in with that Google account, they get the AMBULANCE role and receive nearby SOS
          offers.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Crew Google (Gmail) address"
          placeholder="e.g. amb.unit01.apollo@gmail.com"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={error || undefined}
          leftIcon={<Mail className="w-4 h-4 text-muted" />}
          required
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
              Home hospital
            </label>
            <select
              value={hospitalId}
              onChange={(e) => setHospitalId(e.target.value)}
              disabled={lockedToOneHospital}
              className="w-full h-12 bg-card rounded-pill px-4 text-xs font-semibold text-ink border border-hairline focus:border-blue focus:outline-none disabled:opacity-70"
              required
            >
              {hospitals.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                  {h.city ? ` (${h.city})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
              Unit type
            </label>
            <select
              value={ambulanceType}
              onChange={(e) => setAmbulanceType(e.target.value as AmbulanceType)}
              className="w-full h-12 bg-card rounded-pill px-4 text-xs font-semibold text-ink border border-hairline focus:border-blue focus:outline-none"
            >
              <option value="BLS">BLS — Basic life support</option>
              <option value="ALS">ALS — Advanced life support</option>
              <option value="ICU">ICU — Critical care</option>
              <option value="NEONATAL">NEONATAL</option>
              <option value="AIR">AIR</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Call sign (optional)"
            placeholder="e.g. BBSR-ALS-01"
            value={callSign}
            onChange={(e) => setCallSign(e.target.value)}
            leftIcon={<Truck className="w-4 h-4 text-muted" />}
          />
          <Input
            label="Vehicle / plate no."
            placeholder="e.g. OD02AB1001"
            value={vehicleNo}
            onChange={(e) => setVehicleNo(e.target.value)}
            required
          />
        </div>

        <div className="rounded-2xl bg-[#F3F8EE] border border-[#D5E8C0] px-4 py-3 text-xs text-muted leading-relaxed">
          After you save, the crew installs <span className="font-semibold text-ink">GetMyHospital Ambulance</span>{' '}
          (`npm run dev:ambulance`), taps <span className="font-semibold text-ink">Sign in with Google</span>, and
          uses this Gmail. The web hospital dashboard and patient SOS stay separate — only the Ambulance app
          opens as AMBULANCE.
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="primary" size="md" type="submit" isLoading={isSubmitting}>
            Create ambulance login
          </Button>
        </div>
      </form>
    </div>
  );
};
