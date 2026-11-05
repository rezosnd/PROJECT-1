import React, { useState } from 'react';
import { Doctor } from '../../lib/doctors-data';
import { SpecialtyIcon } from '../../components/graphics/SpecialtyIcons';
import {
  X,
  MapPin,
  Info,
  Star,
  Calendar,
  Check,
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
  if (!isOpen || !doctor) return null;

  const [activeTab, setActiveTab] = useState<'info' | 'location' | 'reviews' | 'slots'>('location');
  const [selectedSlot, setSelectedSlot] = useState<string>('10:30 AM');
  const [selectedDay, setSelectedDay] = useState<'today' | 'tomorrow'>('today');
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isBooked, setIsBooked] = useState(false);

  const handleBookingConfirm = () => {
    setIsBooked(true);
    alert(
      `Appointment Confirmed! 🎉\n\nYour consultation with ${doctor.name} at ${doctor.hospitalName} has been booked for ${
        selectedDay === 'today' ? 'Today' : 'Tomorrow'
      } at ${selectedSlot}.\n\nConfirmation sent to your email with ABHA health locker sync.`
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col"
        style={{ backgroundColor: '#0E0F12', maxHeight: '92vh' }}
      >
        {/* Top Floating Controls */}
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

        {/* Doctor Hero Portrait */}
        <div className="relative w-full h-64 bg-[#0E0F12] flex items-end justify-center overflow-hidden pt-6">
          <img
            src={doctor.heroImageUrl}
            alt={doctor.name}
            className="h-full object-contain object-bottom scale-105"
          />
          <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
        </div>

        {/* Bottom Curved Sheet (Warm Yellow) */}
        <div
          className="flex-1 overflow-y-auto rounded-t-[36px] p-6 text-left flex flex-col justify-between"
          style={{ backgroundColor: doctor.cardColor || '#FEE244' }}
        >
          <div>
            {/* Top Sheet Handle */}
            <div className="w-12 h-1 bg-black/20 rounded-full mx-auto mb-4" />

            {/* Doctor & Price Header Row */}
            <div className="flex items-center justify-between gap-3 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm shrink-0">
                  <SpecialtyIcon type={doctor.specialtyType} size={22} color="#111111" />
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-[#111111] leading-tight">
                    {doctor.name}
                  </h2>
                  <p className="text-sm font-semibold text-neutral-800">
                    {doctor.specialty}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xl font-extrabold text-[#111111] block leading-tight">
                  ₹ {doctor.fee.toFixed(2)}
                </span>
                <span className="text-xs font-bold text-neutral-600 block">
                  +GST
                </span>
              </div>
            </div>

            {/* Mint Green Pill Tab Container */}
            <div className="flex items-center justify-between bg-[#B9F84B] rounded-full p-1.5 mb-5 shadow-xs">
              {/* Tab 1: Info */}
              <button
                type="button"
                onClick={() => setActiveTab('info')}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  activeTab === 'info' ? 'bg-[#111111] text-white' : 'text-[#111111] hover:bg-black/10'
                }`}
                title="Doctor Information"
              >
                <Info className="w-5 h-5" />
              </button>

              {/* Tab 2: Location (Active Pill) */}
              <button
                type="button"
                onClick={() => setActiveTab('location')}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full font-bold text-xs transition-all ${
                  activeTab === 'location' ? 'bg-[#111111] text-white shadow-sm' : 'text-[#111111] hover:bg-black/10'
                }`}
              >
                <MapPin className="w-4 h-4" />
                <span>Location</span>
              </button>

              {/* Tab 3: Reviews */}
              <button
                type="button"
                onClick={() => setActiveTab('reviews')}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  activeTab === 'reviews' ? 'bg-[#111111] text-white' : 'text-[#111111] hover:bg-black/10'
                }`}
                title="Reviews"
              >
                <Star className="w-5 h-5" />
              </button>

              {/* Tab 4: Slots */}
              <button
                type="button"
                onClick={() => setActiveTab('slots')}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  activeTab === 'slots' ? 'bg-[#111111] text-white' : 'text-[#111111] hover:bg-black/10'
                }`}
                title="Booking Slots"
              >
                <Calendar className="w-5 h-5" />
              </button>
            </div>

            {/* TAB CONTENT */}
            {/* 1. LOCATION TAB (Matches Reference Screenshot) */}
            {activeTab === 'location' && (
              <div className="relative rounded-2xl overflow-hidden shadow-md bg-white border border-black/10 mb-5">
                <img
                  src="https://images.unsplash.com/photo-1524661135-423995f22d0b?w=700&q=80"
                  alt="Clinic Map"
                  className="w-full h-44 object-cover"
                />

                {/* Street markers overlay */}
                <div className="absolute top-4 left-4 bg-white/95 px-2.5 py-1 rounded-md text-[11px] font-bold text-neutral-800 shadow-sm">
                  Law Garden
                </div>
                <div className="absolute bottom-14 left-6 bg-white/95 px-2 py-0.5 rounded text-[10px] font-bold text-neutral-700">
                  Gandhigram
                </div>
                <div className="absolute bottom-12 right-4 bg-white/95 px-2 py-0.5 rounded text-[10px] font-bold text-neutral-700">
                  Sabarmati Riverfront
                </div>

                {/* Hospital Pin Badge */}
                <div className="absolute top-10 left-28 bg-white px-2.5 py-1 rounded-full shadow-md flex items-center gap-1.5 border border-red-500/20">
                  <div className="w-4 h-4 rounded-full bg-red-600 flex items-center justify-center">
                    <MapPin className="w-2.5 h-2.5 text-white" />
                  </div>
                  <span className="text-xs font-bold text-[#111111]">{doctor.hospitalName.split('&')[0]}</span>
                </div>

                {/* Bottom Address Bar */}
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

            {/* 2. INFO TAB */}
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

            {/* 3. REVIEWS TAB */}
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
                    <span className="text-xs text-neutral-600">{doctor.reviewsCount} verified patient consultations</span>
                  </div>
                </div>
                <p className="text-xs italic text-neutral-700">
                  &ldquo;Consultation was prompt and very professional. Dr. {doctor.name.split(' ')[1]} explained the diagnosis clearly with immediate prescription access.&rdquo;
                </p>
              </div>
            )}

            {/* 4. SLOTS TAB */}
            {activeTab === 'slots' && (
              <div className="p-4 bg-white/95 rounded-2xl shadow-sm mb-5 space-y-3">
                {/* Day selector */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedDay('today')}
                    className={`py-2 rounded-xl text-xs font-bold transition-all ${
                      selectedDay === 'today' ? 'bg-[#111111] text-white' : 'bg-neutral-100 text-neutral-700'
                    }`}
                  >
                    Today (Priority)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedDay('tomorrow')}
                    className={`py-2 rounded-xl text-xs font-bold transition-all ${
                      selectedDay === 'tomorrow' ? 'bg-[#111111] text-white' : 'bg-neutral-100 text-neutral-700'
                    }`}
                  >
                    Tomorrow
                  </button>
                </div>

                {/* Morning Slots */}
                <div>
                  <span className="text-[11px] font-bold text-neutral-700 block mb-1.5">Morning Consultation</span>
                  <div className="flex flex-wrap gap-2">
                    {doctor.slots.morning.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSelectedSlot(s)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                          selectedSlot === s
                            ? 'bg-[#111111] text-white border-[#111111]'
                            : 'bg-white text-neutral-800 border-neutral-300 hover:bg-neutral-50'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Evening Slots */}
                <div>
                  <span className="text-[11px] font-bold text-neutral-700 block mb-1.5">Evening Consultation</span>
                  <div className="flex flex-wrap gap-2">
                    {doctor.slots.evening.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSelectedSlot(s)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                          selectedSlot === s
                            ? 'bg-[#111111] text-white border-[#111111]'
                            : 'bg-white text-neutral-800 border-neutral-300 hover:bg-neutral-50'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Floating Slider Bar: [ ✓ ] › › [ ✓ ] (Matches Reference Button) */}
          <button
            type="button"
            onClick={handleBookingConfirm}
            className="w-full bg-[#111111] hover:bg-neutral-900 text-white rounded-full p-2 flex items-center justify-between shadow-xl transition-transform active:scale-[0.99] group"
          >
            <div className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center font-bold shadow-md">
              <Check className="w-6 h-6 stroke-[3]" />
            </div>

            <div className="flex items-center gap-1 text-sm font-extrabold tracking-widest text-neutral-300 group-hover:text-white transition-colors">
              <span>CONFIRM APPOINTMENT</span>
              <span className="text-lg">› ›</span>
            </div>

            <div className="w-12 h-12 rounded-full bg-[#262933] text-white flex items-center justify-center">
              <Check className="w-5 h-5 stroke-[2.5]" />
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

