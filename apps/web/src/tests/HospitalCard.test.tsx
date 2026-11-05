import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import { HospitalCard } from '../features/patient/HospitalCard';
import { MatchedHospital } from '../lib/api/matching.api';

const mockMatch: MatchedHospital = {
  hospital: {
    id: 'hosp-001',
    name: 'AIIMS Bhubaneswar',
    address: 'Sijua, Patrapada, Bhubaneswar',
    phone: '0674-2476789',
    emergency24x7: true,
    traumaLevel: 1,
    ratingAvg: 4.8,
    latitude: 20.2289,
    longitude: 85.7766,
  },
  distanceKm: 3.2,
  etaMinutes: 12,
  score: 0.94,
  scoreBreakdown: {
    proximity: 0.9,
    beds: 0.95,
    equipment: 1.0,
    specialty: 0.9,
  },
  matchedWard: {
    wardType: 'ICU',
    freeBeds: 4,
    forecastProb1h: 0.85,
    forecastProb3h: 0.92,
    forecastProb6h: 0.98,
    confidence: 'HIGH',
  },
  matchedEquipment: [
    { type: 'CT', availableCount: 1, totalCount: 2 },
    { type: 'VENTILATOR', availableCount: 3, totalCount: 5 },
  ],
  explanation: '4 ICU beds immediately available with confirmed operational CT and Ventilator.',
};

describe('HospitalCard Component', () => {
  it('renders hospital name, score pill, and distance', () => {
    render(
      <BrowserRouter>
        <HospitalCard match={mockMatch} />
      </BrowserRouter>
    );

    expect(screen.getByText('AIIMS Bhubaneswar')).toBeInTheDocument();
    expect(screen.getByText('94%')).toBeInTheDocument();
    expect(screen.getByText(/3.2/)).toBeInTheDocument();
    expect(screen.getByText('24x7 Emergency')).toBeInTheDocument();
  });

  it('renders free beds count with ward type', () => {
    render(
      <BrowserRouter>
        <HospitalCard match={mockMatch} />
      </BrowserRouter>
    );

    expect(screen.getByText(/4 ICU free now/i)).toBeInTheDocument();
  });

  it('renders confidence badge and clinical explanation narrative', () => {
    render(
      <BrowserRouter>
        <HospitalCard match={mockMatch} />
      </BrowserRouter>
    );

    expect(screen.getByText(/HIGH/i)).toBeInTheDocument();
    expect(
      screen.getByText(/4 ICU beds immediately available with confirmed operational CT and Ventilator/i)
    ).toBeInTheDocument();
  });

  it('calls onRequestBed when clicking request button', () => {
    const handleRequest = vi.fn();
    render(
      <BrowserRouter>
        <HospitalCard match={mockMatch} onRequestBed={handleRequest} />
      </BrowserRouter>
    );

    const button = screen.getByRole('button', { name: /Request Bed/i });
    fireEvent.click(button);

    expect(handleRequest).toHaveBeenCalledWith('hosp-001', 'ICU');
  });
});
