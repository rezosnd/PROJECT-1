import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AbhaCard } from '../features/patient/AbhaCard';
import { AbhaProfile } from '../lib/api/abha.api';

const mockProfile: AbhaProfile = {
  maskedNumber: '91-8843-1290-4412',
  abhaAddress: 'subhashree.nayak@abdm',
  name: 'Subhashree Nayak',
  status: 'LINKED',
  badge: 'Sandbox / Mock',
  verifiedAt: new Date().toISOString(),
};

describe('AbhaCard Component', () => {
  it('renders masked ABHA number, address, and sandbox badge', () => {
    const handleUnlink = vi.fn().mockResolvedValue(undefined);
    render(<AbhaCard profile={mockProfile} onUnlink={handleUnlink} />);

    expect(screen.getByText('Ayushman Bharat Health Card')).toBeInTheDocument();
    expect(screen.getByText('Sandbox / Mock')).toBeInTheDocument();
    expect(screen.getByText('91-8843-1290-4412')).toBeInTheDocument();
    expect(screen.getByText('subhashree.nayak@abdm')).toBeInTheDocument();
    expect(screen.getByText('Subhashree Nayak')).toBeInTheDocument();
  });

  it('opens unlink modal when clicking Unlink button and calls onUnlink on confirm', async () => {
    const handleUnlink = vi.fn().mockResolvedValue(undefined);
    render(<AbhaCard profile={mockProfile} onUnlink={handleUnlink} />);

    // Click Unlink button on card
    const unlinkBtn = screen.getByRole('button', { name: /Unlink/i });
    fireEvent.click(unlinkBtn);

    // Modal title should appear
    expect(screen.getByText('Unlink ABHA Account')).toBeInTheDocument();
    expect(
      screen.getByText(/Are you sure you want to unlink your ABHA identity from LifeLink/i)
    ).toBeInTheDocument();

    // Confirm button inside modal
    const confirmBtn = screen.getByRole('button', { name: /Confirm Unlink/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(handleUnlink).toHaveBeenCalledTimes(1);
    });
  });
});
