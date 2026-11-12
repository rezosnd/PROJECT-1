import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Doctor } from '../../lib/doctors-data';
import { SpecialtyIcon } from '../../components/graphics/SpecialtyIcons';
import {
  X,
  MapPin,
  Info,
  Star,
  QrCode,
  ShieldCheck,
  Phone,
  Bookmark,
} from 'lucide-react';

interface DoctorDetailModalProps {
  doctor: Doctor | null;
  isOpen: boolean;
  onClose: () => void;
}

export const DoctorDetailModal: React.FC<DoctorDetailModalProps> = ({
  doctor,
  isOpen,
  onClose,
}) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'info' | 'location' | 'reviews' | 'referral'>(
    'referral'
  );
  const [isBookmarked, setIsBookmarked] = useState(false);

  if (!isOpen || !doctor) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col"
        style={{ backgroundColor: '#0E0F12', maxHeight: '92vh' }}
      >
        <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-auto">
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="w-10 h-10 rounded-full bg-[#1E2028] text-white flex items-center justify-center hover:bg-[#2A2E39] transition-colors shadow-md"
          >
            <X className="w-5 h-5" />
          </button>

          <button
            onClick={() => setIsBookmarked(!isBookmarked)}
            aria-label="Bookmark specialist"
            className="w-10 h-10 rounded-full bg-[#1E2028] text-white flex items-center justify-center hover:bg-[#2A2E39] transition-colors shadow-md"
          >
            <Bookmark className={`w-5 h-5 ${isBookmarked ? 'fill-white' : ''}`} />
          </button>
        </div>

        <div className="relative w-full h-64 bg-[#0E0F12] flex items-end justify-center overflow-hidden pt-6">
          <img
            src={doctor.heroImageUrl}
            alt={doctor.name}
            className="h-full object-contain object-bottom scale-105"
          />
          <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
        </div>

        <div
          className="flex-1 overflow-y-auto rounded-t-[36px] p-6 text-left flex flex-col justify-between"
          style={{ backgroundColor: doctor.cardColor || '#FEE244' }}
        >
          <div>
            <div className="w-12 h-1 bg-black/20 rounded-full mx-auto mb-4" />

            <div className="flex items-center justify-between gap-3 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm shrink-0">
                  <SpecialtyIcon type={doctor.specialtyType} size={22} color="#111111" />
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-[#111111] leading-tight">{doctor.name}</h2>
                  <p className="text-sm font-semibold text-neutral-800">{doctor.specialty}</p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xl font-extrabold text-[#111111] block leading-tight">
                  ₹ {doctor.fee.toFixed(2)}
                </span>
                <span className="text-xs font-bold text-neutral-600 block">+GST</span>
              </div>
            </div>

            <div className="flex items-center justify-between bg-[#B9F84B] rounded-full p-1.5 mb-5 shadow-xs">
              {(
                [
                  { id: 'info' as const, icon: Info, title: 'Doctor Information' },
                  { id: 'location' as const, icon: MapPin, label: 'Location' },
                  { id: 'reviews' as const, icon: Star, title: 'Reviews' },
                  { id: 'referral' as const, icon: QrCode, title: 'Referral' },
                ] as const
              ).map((tab) => {
                const Icon = tab.icon;
                const isLocation = tab.id === 'location';
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={
                      isLocation
                        ? `inline-flex items-center gap-1.5 px-4 py-2 rounded-full font-bold text-xs transition-all ${
                            activeTab === 'location'
                              ? 'bg-[#111111] text-white shadow-sm'
                              : 'text-[#111111] hover:bg-black/10'
                          }`
                        : `w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                            activeTab === tab.id
                              ? 'bg-[#111111] text-white'
                              : 'text-[#111111] hover:bg-black/10'
                          }`
                    }
                    title={'title' in tab ? tab.title : undefined}
                  >
                    <Icon className="w-5 h-5" />
                    {'label' in tab && tab.label ? <span>{tab.label}</span> : null}
                  </button>
                );
              })}
            </div>

            {activeTab === 'location' && (
              <div className="relative rounded-2xl overflow-hidden shadow-md bg-white border border-black/10 mb-5">
                <img
                  src="https://images.unsplash.com/photo-1524661135-423995f22d0b?w=700&q=80"
                  alt="Clinic Map"
                  className="w-full h-44 object-cover"
                />
                <div className="p-3 bg-white/95 border-t border-slate-100 flex items-center justify-between">
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-bold text-[#111111] truncate">{doctor.hospitalName}</p>
                    <p className="text-[11px] text-neutral-600 truncate">{doctor.hospitalAddress}</p>
                  </div>
                  <a
                    href={`tel:${doctor.phone}`}
                    className="w-8 h-8 rounded-full bg-[#111111] text-white flex items-center justify-center shrink-0 hover:bg-neutral-800"
                    title="Call Clinic"
                  >
                    <Phone className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            )}

            {activeTab === 'info' && (
              <div className="p-4 bg-white/95 rounded-2xl shadow-sm mb-5 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-700">
                  <ShieldCheck className="w-4 h-4" />
                  <span>ABDM Verified & National Medical Council Certified</span>
                </div>
                <div>
                  <p className="text-xs font-bold text-neutral-900">{doctor.degrees}</p>
                  <p className="text-xs text-neutral-600">{doctor.experience}</p>
                </div>
                <p className="text-xs text-neutral-700 leading-relaxed">{doctor.about}</p>
              </div>
            )}

            {activeTab === 'reviews' && (
              <div className="p-4 bg-white/95 rounded-2xl shadow-sm mb-5 space-y-3">
                <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
                  <span className="text-3xl font-extrabold text-[#111111]">{doctor.rating.toFixed(1)}</span>
                  <div>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className="w-4 h-4 fill-black text-black" />
                      ))}
                    </div>
                    <span className="text-xs text-neutral-600">
                      {doctor.reviewsCount} verified patient consultations
                    </span>
                  </div>
                </div>
                <p className="text-xs italic text-neutral-700">
                  &ldquo;Consultation was prompt and very professional. Dr. {doctor.name.split(' ')[1]}{' '}
                  explained the diagnosis clearly.&rdquo;
                </p>
              </div>
            )}

            {activeTab === 'referral' && (
              <div className="p-4 bg-white/95 rounded-2xl shadow-sm mb-5 space-y-3">
                <p className="text-sm font-extrabold text-[#111111]">Referrals & bed holds</p>
                <p className="text-xs text-neutral-700 leading-relaxed">
                  Bed holds and hospital referrals are created by your doctor in the{' '}
                  <span className="font-bold">GetMyHospital Doctor</span> app — not from this patient
                  web app.
                </p>
                <ol className="text-xs text-neutral-800 space-y-2 list-decimal pl-4">
                  <li>Open Profile and show your Care QR to the doctor in clinic.</li>
                  <li>They scan it in the Doctor app to view your clinical profile.</li>
                  <li>They can refer you to a ward or start a 15-minute bed hold.</li>
                </ol>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              onClose();
              navigate('/profile');
            }}
            className="w-full bg-[#111111] hover:bg-neutral-900 text-white rounded-full px-4 py-3.5 flex items-center justify-center gap-2 shadow-xl transition-transform active:scale-[0.99] text-sm font-extrabold"
          >
            <QrCode className="w-5 h-5" />
            Open my Care QR
          </button>
        </div>
      </div>
    </div>
  );
};
