import React, { useEffect, useState } from 'react';
import { adminApi } from '../../lib/api/admin.api';
import { Hospital } from '../../lib/api/hospitals.api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useToast } from '../../components/ui/Toast';
import { Mail, UserPlus } from 'lucide-react';

type StaffRole = 'HOSPITAL_STAFF' | 'HOSPITAL_ADMIN' | 'DOCTOR' | 'AMBULANCE';
type AmbulanceType = 'BLS' | 'ALS' | 'ICU' | 'NEONATAL' | 'AIR';

interface StaffPreRegFormProps {
  hospitals: Hospital[];
  onStaffRegistered?: () => void;
  className?: string;
  /** When false, hospital admins only see staff/admin roles (ambulance has its own form). Default true for City Admin. */
  allowAmbulance?: boolean;
  allowDoctor?: boolean;
}

export const StaffPreRegForm: React.FC<StaffPreRegFormProps> = ({
  hospitals,
  onStaffRegistered,
  className = '',
  allowAmbulance = true,
  allowDoctor = true,
}) => {
  const { addToast } = useToast();
  const [email, setEmail] = useState('');
  const [hospitalId, setHospitalId] = useState(hospitals[0]?.id || '');
  const [role, setRole] = useState<StaffRole>('HOSPITAL_STAFF');
  const [specialty, setSpecialty] = useState('');
  const [licenseNo, setLicenseNo] = useState('');
  const [ambulanceType, setAmbulanceType] = useState<AmbulanceType>('ALS');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lockedToOneHospital = hospitals.length === 1;
  const isDoctor = role === 'DOCTOR';
  const isAmbulance = role === 'AMBULANCE';

  useEffect(() => {
    if (hospitals[0]?.id) setHospitalId(hospitals[0].id);
  }, [hospitals]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.toLowerCase().endsWith('@gmail.com')) {
      setError('Staff email must be a valid @gmail.com address for Google OAuth verification');
      return;
    }

    if (!isDoctor && !hospitalId) {
      setError('Please select an assigned hospital domain');
      return;
    }

    if (isAmbulance && !licenseNo.trim()) {
      setError('Vehicle / plate number is required for ambulance units');
      return;
    }

    setIsSubmitting(true);
    try {
      await adminApi.preRegisterStaff({
        email: email.trim().toLowerCase(),
        hospitalId: isDoctor ? hospitalId || null : hospitalId,
        role,
        specialty: isDoctor || isAmbulance ? specialty.trim() || null : null,
        licenseNo: isDoctor || isAmbulance ? licenseNo.trim() || null : null,
        vehicleNo: isAmbulance ? licenseNo.trim() || null : null,
        ambulanceType: isAmbulance ? ambulanceType : null,
      });

      addToast({
        type: 'success',
        title: isAmbulance
          ? 'Ambulance login created'
          : isDoctor
            ? 'Doctor pre-registered'
            : 'Staff Member Pre-registered',
        message: isAmbulance
          ? `${email} can sign in on the GetMyHospital Ambulance app.`
          : `${email} will claim ${role} privileges on next Google sign-in.`,
      });

      setEmail('');
      setSpecialty('');
      setLicenseNo('');
      setAmbulanceType('ALS');
      if (onStaffRegistered) onStaffRegistered();
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Failed to pre-register staff';
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
          <UserPlus className="w-4 h-4 text-navy" />
          Pre-register staff, admins{allowDoctor ? ', doctors' : ''}
          {allowAmbulance ? ' & ambulances' : ''}
        </h3>
        <p className="text-xs text-muted mt-0.5">
          Authorize clinical personnel via Gmail. Ambulance crews sign in on the dedicated Expo
          Ambulance app.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Staff Google (Gmail) Address"
          placeholder="e.g. dr.patra.emergency@gmail.com"
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
              {isDoctor ? 'Home hospital (optional)' : 'Assigned hospital tenant'}
            </label>
            <select
              value={hospitalId}
              onChange={(e) => setHospitalId(e.target.value)}
              disabled={!isDoctor && lockedToOneHospital}
              className="w-full h-12 bg-card rounded-pill px-4 text-xs font-semibold text-ink border border-hairline focus:border-blue focus:outline-none disabled:opacity-70"
              required={!isDoctor}
            >
              {isDoctor && <option value="">No fixed hospital</option>}
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
              Designated role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as StaffRole)}
              className="w-full h-12 bg-card rounded-pill px-4 text-xs font-semibold text-ink border border-hairline focus:border-blue focus:outline-none"
            >
              <option value="HOSPITAL_STAFF">HOSPITAL_STAFF</option>
              <option value="HOSPITAL_ADMIN">HOSPITAL_ADMIN</option>
              {allowDoctor && (
                <option value="DOCTOR">DOCTOR (Care QR scan & referrals)</option>
              )}
              {allowAmbulance && (
                <option value="AMBULANCE">AMBULANCE (Expo crew app)</option>
              )}
            </select>
          </div>
        </div>

        {isDoctor && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Specialty (optional)"
              placeholder="e.g. Emergency Medicine"
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
            />
            <Input
              label="License no. (optional)"
              placeholder="e.g. OD-EM-1001"
              value={licenseNo}
              onChange={(e) => setLicenseNo(e.target.value)}
            />
          </div>
        )}

        {isAmbulance && (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Call sign (optional)"
                placeholder="e.g. BBSR-ALS-01"
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
              />
              <Input
                label="Vehicle / plate no."
                placeholder="e.g. OD02AB1001"
                value={licenseNo}
                onChange={(e) => setLicenseNo(e.target.value)}
                required
              />
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
                <option value="BLS">BLS</option>
                <option value="ALS">ALS</option>
                <option value="ICU">ICU</option>
                <option value="NEONATAL">NEONATAL</option>
                <option value="AIR">AIR</option>
              </select>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button variant="primary" size="md" type="submit" isLoading={isSubmitting}>
            Authorize personnel
          </Button>
        </div>
      </form>
    </div>
  );
};
