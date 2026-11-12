import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TOP_DOCTORS, Doctor } from '../../lib/doctors-data';
import { DoctorCard } from '../../features/patient/DoctorCard';
import { DoctorDetailModal } from '../../features/patient/DoctorDetailModal';
import { ArrowLeft, Search, X, QrCode } from 'lucide-react';
import { Link } from 'react-router-dom';

export const TopDoctorsPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const filteredDoctors = TOP_DOCTORS.filter((doc) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      doc.name.toLowerCase().includes(q) ||
      doc.specialty.toLowerCase().includes(q) ||
      doc.hospitalName.toLowerCase().includes(q)
    );
  });

  const handleSelectDoctor = (doctor: Doctor) => {
    setSelectedDoctor(doctor);
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen max-w-4xl mx-auto py-4 px-2 space-y-6 text-left">
      {/* Top Header Matching Mobile Design */}
      <div className="flex items-center justify-between py-2 border-b border-slate-100">
        <button
          onClick={() => navigate(-1)}
          aria-label="Back"
          className="w-10 h-10 rounded-full bg-slate-50 border border-slate-200 text-slate-800 flex items-center justify-center hover:bg-slate-100 transition-colors shadow-xs"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <h1 className="text-2xl font-extrabold font-display tracking-tight text-navy">
          Top Doctors
        </h1>

        <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-200 text-slate-800 flex items-center justify-center">
          <Search className="w-5 h-5 text-slate-600" />
        </div>
      </div>

      <div className="rounded-2xl bg-[#EEF8D8] border border-[#A8E017]/30 px-4 py-3 flex items-start gap-3">
        <QrCode className="w-5 h-5 text-[#0B3D1A] shrink-0 mt-0.5" />
        <p className="text-sm text-[#0B3D1A] leading-relaxed">
          Doctors place referrals and 15-minute bed holds via the Doctor app after scanning your{' '}
          <Link to="/profile" className="font-bold underline">
            Care QR
          </Link>
          . This directory is for discovery only — not online appointment booking.
        </p>
      </div>

      {/* Search Bar Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search doctor, specialty, or clinic..."
          className="w-full pl-11 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue/20 focus:border-blue shadow-xs"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Doctor Cards Responsive Grid (2 columns on tablet/desktop, 1 column on mobile) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredDoctors.map((doc) => (
          <DoctorCard
            key={doc.id}
            doctor={doc}
            onSelect={handleSelectDoctor}
          />
        ))}
      </div>

      {/* Interactive Detail Modal */}
      <DoctorDetailModal
        doctor={selectedDoctor}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
};
