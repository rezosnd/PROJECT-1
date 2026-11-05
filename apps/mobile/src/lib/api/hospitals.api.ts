import { apiClient } from './client';

const doctorsCatalog = [
  { name: 'Dr. Shah', specialty: 'Cardiologist', fee: 1500, hero: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=800&q=80', color: '#FCE354' },
  { name: 'Dr. Tripathi', specialty: 'General Dentist', fee: 1100, hero: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=800&q=80', color: '#B4F481' },
  { name: 'Dr. Fernandes', specialty: 'Neurologist', fee: 2300, hero: 'https://images.unsplash.com/photo-1594824813518-a6f987be7d25?w=800&q=80', color: '#B4F481' },
  { name: 'Dr. Tamakuwala', specialty: 'Nephrologist', fee: 2000, hero: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=800&q=80', color: '#FCE354' },
];

export const hospitalsApi = {
  async getHospitals(status = 'VERIFIED') {
    const res = await apiClient.get('/hospitals', { params: { status } });
    const raw = Array.isArray(res.data.data) ? res.data.data : res.data.data?.items || [];
    return {
      items: raw.map((h: any, i: number) => {
        const doc = doctorsCatalog[i % doctorsCatalog.length];
        return {
          id: h.id,
          name: h.name,
          type: h.type,
          registrationNo: h.registration_no || h.registrationNo,
          address: h.address,
          city: h.city,
          pin: h.pin,
          latitude: Number(h.latitude) || 20.2961,
          longitude: Number(h.longitude) || 85.8245,
          phone: h.phone,
          email: h.email,
          emergency24x7: h.emergency_24x7 ?? true,
          traumaLevel: Number(h.trauma_level || h.traumaLevel) || 2,
          ratingAvg: Number(h.rating_avg || h.ratingAvg) || 4.5,
          specialties: h.specialties || ['General Medicine', 'Emergency Care', doc.specialty],
          facilities: h.facilities || ['24/7 Pharmacy', 'Emergency Ambulance Bay', 'Pathology Lab'],
          doctorName: doc.name,
          doctorSpecialty: doc.specialty,
          doctorFee: doc.fee,
          doctorRating: Number(h.rating_avg || h.ratingAvg) || 4.5,
          doctorHeroImage: h.photo_url || doc.hero,
          photoUrl: h.photo_url || null,
          cardColor: doc.color,
        };
      })
    };
  },

  async getHospitalById(id: string) {
    const res = await apiClient.get(`/hospitals/${id}`);
    const h = res.data.data;
    const doc = doctorsCatalog[0];

    return {
      id: h.id,
      name: h.name,
      type: h.type,
      registrationNo: h.registration_no || h.registrationNo,
      address: h.address,
      city: h.city,
      pin: h.pin,
      latitude: Number(h.latitude) || 20.2961,
      longitude: Number(h.longitude) || 85.8245,
      phone: h.phone,
      email: h.email,
      emergency24x7: h.emergency_24x7 ?? true,
      traumaLevel: Number(h.trauma_level || h.traumaLevel) || 3,
      ratingAvg: Number(h.rating_avg || h.ratingAvg) || 4.5,
      specialties: h.specialties || ['General Medicine', 'Emergency Care', 'Critical Care', 'Cardiology'],
      facilities: h.facilities || ['24/7 Pharmacy', 'Emergency Ambulance Bay', 'Pathology Lab', 'Blood Bank'],
      beds: h.beds || [],
      equipment: h.equipment || [],
      doctorName: doc.name,
      doctorSpecialty: doc.specialty,
      doctorFee: doc.fee,
      doctorRating: Number(h.rating_avg || h.ratingAvg) || 4.5,
      doctorHeroImage: h.photo_url || doc.hero,
      photoUrl: h.photo_url || null,
      cardColor: doc.color,
    };
  },
};
