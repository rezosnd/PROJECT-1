import React from 'react';
import { Doctor } from '../../lib/doctors-data';
import { SpecialtyIcon } from '../../components/graphics/SpecialtyIcons';
import { Star, MapPin, Phone } from 'lucide-react';

interface DoctorCardProps {
  doctor: Doctor;
  onSelect: (doctor: Doctor) => void;
}

export const DoctorCard: React.FC<DoctorCardProps> = ({ doctor, onSelect }) => {
  return (
    <div
      className="rounded-[32px] p-5 flex items-center justify-between gap-4 transition-transform hover:scale-[1.01] shadow-md text-left"
      style={{ backgroundColor: doctor.cardColor || '#B9F84B' }}
    >
      {/* Left Avatar + Star Rating */}
      <div className="flex flex-col items-center justify-center shrink-0 w-20">
        <div className="w-16 h-16 rounded-full bg-white p-1 shadow-sm overflow-hidden flex items-center justify-center">
          <img
            src={doctor.avatarUrl}
            alt={doctor.name}
            className="w-full h-full object-cover rounded-full"
          />
        </div>
        <div className="flex items-center gap-1 mt-2 text-xs font-bold text-[#111111]">
          <Star className="w-3.5 h-3.5 fill-black text-black" />
          <span>{doctor.rating.toFixed(1)}/5.0</span>
        </div>
      </div>

      {/* Center Doctor Info + Get Appointment Button */}
      <div className="flex-1 min-w-0 pr-2">
        <h3 className="font-extrabold text-lg text-[#111111] leading-tight truncate">
          {doctor.name}
        </h3>
        <p className="text-xs font-semibold text-neutral-800 mt-0.5 truncate">
          {doctor.specialty}
        </p>
        <p className="text-sm font-extrabold text-[#111111] mt-2">
          {doctor.fee > 0 ? `₹ ${doctor.fee.toFixed(2)}` : 'Care QR referral'}
        </p>

        <button
          type="button"
          onClick={() => onSelect(doctor)}
          className="mt-3 px-4 py-2 rounded-full bg-[#111111] hover:bg-neutral-800 text-white text-xs font-bold transition-all shadow-sm"
        >
          View profile
        </button>
      </div>

      {/* Right Column: 3 White Circular Action Buttons */}
      <div className="flex flex-col items-center gap-2.5 shrink-0">
        {/* 1. Specialty Icon */}
        <button
          type="button"
          onClick={() => onSelect(doctor)}
          title={doctor.specialty}
          className="w-11 h-11 rounded-full bg-white text-[#111111] flex items-center justify-center shadow-sm hover:scale-105 transition-transform"
        >
          <SpecialtyIcon type={doctor.specialtyType} size={20} color="#111111" />
        </button>

        {/* 2. Location Pin */}
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${doctor.latitude},${doctor.longitude}`}
          target="_blank"
          rel="noopener noreferrer"
          title="Open in Maps"
          className="w-11 h-11 rounded-full bg-white text-[#111111] flex items-center justify-center shadow-sm hover:scale-105 transition-transform"
        >
          <MapPin className="w-5 h-5 text-[#111111]" />
        </a>

        {/* 3. Phone Call */}
        <a
          href={`tel:${doctor.phone}`}
          title="Call Clinic"
          className="w-11 h-11 rounded-full bg-white text-[#111111] flex items-center justify-center shadow-sm hover:scale-105 transition-transform"
        >
          <Phone className="w-4 h-4 text-[#111111]" />
        </a>
      </div>
    </div>
  );
};

