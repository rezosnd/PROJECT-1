import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { AbhaCardView } from '../features/patient/AbhaCardView';
import { AbhaProfile } from '../lib/api/abha.api';

const mockProfile: AbhaProfile = {
  maskedNumber: '91-8843-1290-4412',
  abhaAddress: 'subhashree.nayak@abdm',
  name: 'Subhashree Nayak',
  gender: 'F',
  yearOfBirth: 1998,
  status: 'LINKED',
  badge: 'Sandbox / Mock',
  verifiedAt: new Date().toISOString(),
};

describe('AbhaCardView (Mobile)', () => {
  it('renders masked ABHA number, user details, and sandbox badge', async () => {
    const handleUnlink = jest.fn().mockResolvedValue(undefined);

    const screen = (await render(
      <AbhaCardView profile={mockProfile} onUnlink={handleUnlink} />
    )) as any;

    expect(screen.getByText('Ayushman Bharat Health Card')).toBeTruthy();
    expect(screen.getByText('Sandbox / Mock')).toBeTruthy();
    expect(screen.getByText('91-8843-1290-4412')).toBeTruthy();
    expect(screen.getByText('subhashree.nayak@abdm')).toBeTruthy();
    expect(screen.getByText('Subhashree Nayak')).toBeTruthy();
  });

  it('opens confirmation modal and calls onUnlink on confirmation', async () => {
    const handleUnlink = jest.fn().mockResolvedValue(undefined);

    const screen = (await render(
      <AbhaCardView profile={mockProfile} onUnlink={handleUnlink} />
    )) as any;

    const unlinkBtn = screen.getByText('Unlink');
    fireEvent.press(unlinkBtn);

    expect(screen.getByText('Unlink ABHA Account?')).toBeTruthy();

    const confirmBtn = screen.getByText('Confirm Unlink');
    fireEvent.press(confirmBtn);

    expect(handleUnlink).toHaveBeenCalled();
  });
});
