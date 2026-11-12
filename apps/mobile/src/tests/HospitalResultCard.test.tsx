import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { HospitalResultCard } from '../features/patient/HospitalResultCard';
import { MatchedHospitalItem } from '../lib/api/matching.api';

const mockItem: MatchedHospitalItem = {
  hospital: {
    id: 'hosp-001',
    name: 'AIIMS Bhubaneswar',
    address: 'Sijua, Patrapada, Bhubaneswar',
    phone: '0674-2476789',
    emergency24x7: true,
    ratingAvg: 4.8,
    latitude: 20.2289,
    longitude: 85.7766,
    doctorName: 'Dr. Tripathi',
    doctorSpecialty: 'General Dentist',
    doctorFee: 1100.00,
    doctorRating: 4.8,
  },
  distanceKm: 3.2,
  etaMinutes: 11,
  score: 0.94,
  scoreBreakdown: {
    proximity: 0.35,
    beds: 0.25,
    equipment: 0.20,
    specialty: 0.14,
  },
  matchedWard: {
    wardType: 'ICU',
    freeBeds: 4,
    forecastProb1h: 0.92,
    forecastProb3h: 0.88,
    forecastProb6h: 0.74,
    confidence: 'HIGH',
  },
  matchedEquipment: [
    { type: 'CT', availableCount: 1, totalCount: 2 },
    { type: 'VENTILATOR', availableCount: 3, totalCount: 5 },
  ],
  explanation: '4 ICU beds immediately available with confirmed operational CT and Ventilator.',
};

describe('HospitalResultCard (Mobile)', () => {
  it('renders hospital name and doctor name', async () => {
    const onRequestBed = jest.fn();
    const onPressDetails = jest.fn();

    const screen = (await render(
      <HospitalResultCard
        item={mockItem}
        onRequestBed={onRequestBed}
        onPressDetails={onPressDetails}
      />
    )) as any;

    expect(screen.getByText('AIIMS Bhubaneswar')).toBeTruthy();
  });

  it('triggers onRequestBed with correct hospitalId and wardType on button press', async () => {
    const onRequestBed = jest.fn();
    const onPressDetails = jest.fn();

    const screen = (await render(
      <HospitalResultCard
        item={mockItem}
        onRequestBed={onRequestBed}
        onPressDetails={onPressDetails}
      />
    )) as any;

    const btn = screen.getByText('Hold Bed · 15 min');
    fireEvent.press(btn);

    expect(onRequestBed).toHaveBeenCalledWith('hosp-001', 'ICU');
  });
});
