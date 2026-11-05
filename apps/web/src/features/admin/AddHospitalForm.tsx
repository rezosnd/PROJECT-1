import React, { useState } from 'react';
import { hospitalsApi, CreateHospitalPayload } from '../../lib/api/hospitals.api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { useToast } from '../../components/ui/Toast';
import {
  Building2,
  PlusCircle,
  MapPin,
  Phone,
  Mail,
  ShieldCheck,
  Activity,
  Check,
  Compass
} from 'lucide-react';

interface AddHospitalFormProps {
  onHospitalAdded?: () => void;
  className?: string;
}

const AVAILABLE_SPECIALTIES = [
  'General Medicine',
  'Emergency Care',
  'Critical Care',
  'Cardiology',
  'Neurology',
  'Pediatrics',
  'Orthopedics',
  'Nephrology',
  'Cardiac Surgery',
  'Neurosurgery',
  'Neonatology',
  'Obstetrics',
  'Gastroenterology',
  'Pulmonology'
];

const AVAILABLE_FACILITIES = [
  '24/7 Pharmacy',
  'Emergency Ambulance Bay',
  'Pathology Lab',
  'Blood Bank',
  'Trauma Centre',
  'Oxygen Generation Plant',
  'CT Scan',
  'MRI Facility',
  'Burn Unit'
];

const BHUBANESWAR_PRESETS = [
  { label: 'Central (Khandagiri)', lat: 20.2589, lng: 85.7824 },
  { label: 'North (Patia Info City)', lat: 20.3542, lng: 85.8189 },
  { label: 'East (Rasulgarh / NH16)', lat: 20.2982, lng: 85.8694 },
  { label: 'South (Old Town / Lingaraj)', lat: 20.2394, lng: 85.8341 },
  { label: 'West (Nayapalli / IRC Village)', lat: 20.3015, lng: 85.8082 }
];

export const AddHospitalForm: React.FC<AddHospitalFormProps> = ({
  onHospitalAdded,
  className = ''
}) => {
  const { addToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [type, setType] = useState<'GOVERNMENT' | 'PRIVATE' | 'TRUST'>('PRIVATE');
  const [registrationNo, setRegistrationNo] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Bhubaneswar');
  const [pin, setPin] = useState('751024');
  const [latitude, setLatitude] = useState(20.2961);
  const [longitude, setLongitude] = useState(85.8245);
  const [phone, setPhone] = useState('+91-674-');
  const [email, setEmail] = useState('');
  const [emergency24x7, setEmergency24x7] = useState(true);
  const [traumaLevel, setTraumaLevel] = useState<number>(2);

  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([
    'General Medicine',
    'Emergency Care',
    'Critical Care'
  ]);

  const [selectedFacilities, setSelectedFacilities] = useState<string[]>([
    '24/7 Pharmacy',
    'Emergency Ambulance Bay',
    'Trauma Centre'
  ]);

  const toggleSpecialty = (item: string) => {
    setSelectedSpecialties(prev =>
      prev.includes(item) ? prev.filter(s => s !== item) : [...prev, item]
    );
  };

  const toggleFacility = (item: string) => {
    setSelectedFacilities(prev =>
      prev.includes(item) ? prev.filter(f => f !== item) : [...prev, item]
    );
  };

  const handleApplyPreset = (lat: number, lng: number) => {
    setLatitude(lat);
    setLongitude(lng);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Hospital name is required');
      return;
    }
    if (!registrationNo.trim()) {
      setError('Registration / License number is required');
      return;
    }
    if (!address.trim()) {
      setError('Street address is required');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Valid contact email is required');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: CreateHospitalPayload = {
        name: name.trim(),
        type,
        registrationNo: registrationNo.trim(),
        address: address.trim(),
        city: city.trim() || 'Bhubaneswar',
        pin: pin.trim(),
        latitude: Number(latitude),
        longitude: Number(longitude),
        phone: phone.trim(),
        email: email.trim().toLowerCase(),
        emergency24x7,
        traumaLevel: Number(traumaLevel),
        specialties: selectedSpecialties,
        facilities: selectedFacilities
      };

      const newHospital = await hospitalsApi.createHospital(payload);

      addToast({
        type: 'success',
        title: 'Hospital Successfully Onboarded',
        message: `${newHospital.name} was registered into the City Emergency Network. Initial ICU, HDU, and Emergency wards auto-provisioned.`
      });

      // Reset form
      setName('');
      setRegistrationNo('');
      setAddress('');
      setEmail('');
      setPhone('+91-674-');

      if (onHospitalAdded) onHospitalAdded();
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Failed to create hospital';
      setError(msg);
      addToast({ type: 'error', title: 'Registration Failed', message: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className={`bg-white border border-hairline/80 shadow-soft p-6 text-left ${className}`}>
      {/* Title & Badge */}
      <div className="flex items-center justify-between pb-4 border-b border-hairline mb-6">
        <div>
          <h3 className="text-xl font-bold font-display text-navy flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue" />
            Add New Hospital to City Network
          </h3>
          <p className="text-xs text-muted mt-1">
            City Admin Provisioning: Register licensed healthcare facilities, deploy standard ward inventories, and enable real-time emergency routing.
          </p>
        </div>
        <span className="text-xs font-semibold px-3 py-1 bg-blue/10 text-blue rounded-full border border-blue/20">
          Admin Governance
        </span>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-light border border-red/20 rounded-xl text-xs text-red font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Facility Details */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted">
            1. Hospital Identification & License
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Hospital Name *"
              placeholder="e.g. Khandagiri Super Specialty & Trauma Hospital"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Facility Classification *
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full h-11 px-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-ink focus:outline-none focus:border-blue"
              >
                <option value="PRIVATE">Private Hospital</option>
                <option value="GOVERNMENT">Government / Municipal Hospital</option>
                <option value="TRUST">Trust / Non-Profit Hospital</option>
              </select>
            </div>

            <Input
              label="State Reg / NABH License No *"
              placeholder="e.g. OD-BBSR-HOSP-2026-881"
              value={registrationNo}
              onChange={(e) => setRegistrationNo(e.target.value)}
              required
            />

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Designated Trauma Care Level
              </label>
              <select
                value={traumaLevel}
                onChange={(e) => setTraumaLevel(Number(e.target.value))}
                className="w-full h-11 px-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-ink focus:outline-none focus:border-blue"
              >
                <option value={3}>Level 3 — Comprehensive Tertiary / Poly-Trauma Centre</option>
                <option value={2}>Level 2 — Major Emergency & Surgical Intervention</option>
                <option value={1}>Level 1 — Primary Trauma Stabilization</option>
                <option value={0}>Level 0 — Basic Clinical Emergency Station</option>
              </select>
            </div>
          </div>
        </div>

        {/* Location & GPS */}
        <div className="space-y-4 pt-4 border-t border-hairline">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted">
              2. Location & Geographic Coordinates
            </h4>
            <div className="flex items-center gap-1.5 text-xs text-muted">
              <Compass className="w-3.5 h-3.5 text-blue" />
              <span>Quick Presets:</span>
              {BHUBANESWAR_PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => handleApplyPreset(p.lat, p.lng)}
                  className="px-2 py-0.5 text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-medium transition-colors"
                >
                  {p.label.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <Input
                label="Street Address / Campus *"
                placeholder="e.g. Sector 12, Khandagiri-Patia Corridor, Bhubaneswar"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                leftIcon={<MapPin className="w-4 h-4 text-muted" />}
                required
              />
            </div>

            <Input
              label="PIN Code *"
              placeholder="751024"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Latitude (WGS 84)"
              type="number"
              step="0.0001"
              value={latitude}
              onChange={(e) => setLatitude(Number(e.target.value))}
              required
            />
            <Input
              label="Longitude (WGS 84)"
              type="number"
              step="0.0001"
              value={longitude}
              onChange={(e) => setLongitude(Number(e.target.value))}
              required
            />
          </div>
        </div>

        {/* Contact & 24x7 Operations */}
        <div className="space-y-4 pt-4 border-t border-hairline">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted">
            3. Communications & Emergency Readiness
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Emergency Phone *"
              placeholder="+91-674-2476000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              leftIcon={<Phone className="w-4 h-4 text-muted" />}
              required
            />

            <Input
              label="Official Facility Email *"
              type="email"
              placeholder="emergency@kims-odisha.org"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail className="w-4 h-4 text-muted" />}
              required
            />
          </div>

          <label className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer select-none">
            <input
              type="checkbox"
              checked={emergency24x7}
              onChange={(e) => setEmergency24x7(e.target.checked)}
              className="w-4 h-4 rounded text-blue accent-navy"
            />
            <div>
              <span className="text-xs font-bold text-ink flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-blue" />
                24x7 Emergency Trauma & Resuscitation Center
              </span>
              <span className="text-[11px] text-muted block mt-0.5">
                Enables continuous routing of 112 emergency and acute critical care admissions.
              </span>
            </div>
          </label>
        </div>

        {/* Specialties Multi-select */}
        <div className="space-y-3 pt-4 border-t border-hairline">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted">
            4. Clinical Specialties & Departments
          </h4>
          <div className="flex flex-wrap gap-2">
            {AVAILABLE_SPECIALTIES.map((spec) => {
              const isSelected = selectedSpecialties.includes(spec);
              return (
                <button
                  key={spec}
                  type="button"
                  onClick={() => toggleSpecialty(spec)}
                  className={`px-3 py-1.5 text-xs rounded-xl font-medium border transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-navy text-white border-navy shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3 text-white" />}
                  <span>{spec}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Emergency Facilities Multi-select */}
        <div className="space-y-3 pt-4 border-t border-hairline">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted">
            5. Facilities & Equipment Infrastructure
          </h4>
          <div className="flex flex-wrap gap-2">
            {AVAILABLE_FACILITIES.map((fac) => {
              const isSelected = selectedFacilities.includes(fac);
              return (
                <button
                  key={fac}
                  type="button"
                  onClick={() => toggleFacility(fac)}
                  className={`px-3 py-1.5 text-xs rounded-xl font-medium border transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-teal text-white border-teal shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3 text-white" />}
                  <span>{fac}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Automated Setup Banner */}
        <div className="p-3 bg-blue-light/60 border border-blue/20 rounded-xl text-xs text-blue flex items-start gap-2.5">
          <Activity className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            <strong>Automatic Ward Inventory:</strong> Upon submission, LifeLink automatically configures standard clinical ward quotas (ICU: 10 beds, HDU: 10 beds, General: 30 beds, Emergency: 15 beds, NICU: 6 beds) in the Neon PostgreSQL grid.
          </span>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isSubmitting}
            leftIcon={<PlusCircle className="w-4 h-4" />}
          >
            Register Hospital to Grid
          </Button>
        </div>
      </form>
    </Card>
  );
};

