import React, { useEffect, useState } from 'react';
import { adminApi } from '../../lib/api/admin.api';
import { Hospital } from '../../lib/api/hospitals.api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useToast } from '../../components/ui/Toast';
import { Mail, Building2, UserPlus, Shield } from 'lucide-react';

interface StaffPreRegFormProps {
  hospitals: Hospital[];
  onStaffRegistered?: () => void;
  className?: string;
}

export const StaffPreRegForm: React.FC<StaffPreRegFormProps> = ({
  hospitals,
  onStaffRegistered,
  className = ''
}) => {
  const { addToast } = useToast();
  const [email, setEmail] = useState('');
  const [hospitalId, setHospitalId] = useState(hospitals[0]?.id || '');
  const [role, setRole] = useState<'HOSPITAL_STAFF' | 'HOSPITAL_ADMIN'>('HOSPITAL_STAFF');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lockedToOneHospital = hospitals.length === 1;

  useEffect(() => {
    if (hospitals[0]?.id) setHospitalId(hospitals[0].id);
  }, [hospitals]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Rule: Must be a Gmail address
    if (!email.toLowerCase().endsWith('@gmail.com')) {
      setError('Staff email must be a valid @gmail.com address for Google OAuth verification');
      return;
    }

    if (!hospitalId) {
      setError('Please select an assigned hospital domain');
      return;
    }

    setIsSubmitting(true);
    try {
      await adminApi.preRegisterStaff({
        email: email.trim().toLowerCase(),
        hospitalId,
        role
      });

      addToast({
        type: 'success',
        title: 'Staff Member Pre-registered',
        message: `${email} will automatically claim ${role} privileges upon next Google sign-in.`
      });

      setEmail('');
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
    <div className={`bg-white rounded-card border border-hairline/80 shadow-soft p-5 text-left ${className}`}>
      <div className="pb-3 border-b border-hairline/60 mb-4">
        <h3 className="font-display font-bold text-base text-ink flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-navy" />
          Pre-register Staff & Hospital Admins
        </h3>
        <p className="text-xs text-muted mt-0.5">
          Authorize clinical personnel via Gmail. Backend auto-associates hospital tenant upon first Google login.
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
              Assigned Hospital Tenant
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
                  {h.name}{h.city ? ` (${h.city})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
              Designated Role Clearance
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              className="w-full h-12 bg-card rounded-pill px-4 text-xs font-semibold text-ink border border-hairline focus:border-blue focus:outline-none"
            >
              <option value="HOSPITAL_STAFF">HOSPITAL_STAFF (Ward & Equipment Adjustments)</option>
              <option value="HOSPITAL_ADMIN">HOSPITAL_ADMIN (Full Hospital Governance)</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="primary" size="md" type="submit" isLoading={isSubmitting}>
            Authorize Personnel
          </Button>
        </div>
      </form>
    </div>
  );
};

