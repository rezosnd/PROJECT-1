import { apiClient } from './client';
import { insuranceApi, HospitalInsuranceNetwork } from './insurance.api';

export const hospitalsApi = {
  async getHospitals(status = 'VERIFIED') {
    const res = await apiClient.get('/hospitals', { params: { status } });
    const raw = Array.isArray(res.data.data) ? res.data.data : res.data.data?.items || [];
    return {
      items: raw.map((h: any) => ({
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
        specialties: h.specialties || ['General Medicine', 'Emergency Care'],
        facilities: h.facilities || ['24/7 Pharmacy', 'Emergency Ambulance Bay', 'Pathology Lab'],
        photoUrl: h.photo_url || null,
        cardColor: '#B4F481',
      })),
    };
  },

  async getHospitalById(id: string) {
    const res = await apiClient.get(`/hospitals/${id}`);
    const h = res.data.data;
    let insuranceNetwork: HospitalInsuranceNetwork[] = [];
    try {
      insuranceNetwork = await insuranceApi.getHospitalNetwork(id);
    } catch {
      insuranceNetwork = [];
    }

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
      specialties: h.specialties || ['General Medicine', 'Emergency Care', 'Critical Care'],
      facilities: h.facilities || ['24/7 Pharmacy', 'Emergency Ambulance Bay', 'Pathology Lab', 'Blood Bank'],
      beds: h.beds || [],
      equipment: h.equipment || [],
      photoUrl: h.photo_url || null,
      cardColor: '#B4F481',
      insuranceNetwork,
    };
  },
};
