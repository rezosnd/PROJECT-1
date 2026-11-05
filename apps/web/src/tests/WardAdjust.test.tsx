import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WardAdjustCard } from '../features/hospital/WardAdjustCard';
import { WardInventory, bedsApi } from '../lib/api/beds.api';
import { ToastProvider } from '../components/ui/Toast';

vi.mock('../lib/api/beds.api', () => ({
  bedsApi: {
    adjustBedInventory: vi.fn(),
  },
}));

const mockWard: WardInventory = {
  id: 'w-1',
  hospitalId: 'hosp-001',
  wardType: 'ICU',
  total: 20,
  occupied: 14,
  reserved: 2,
  cleaning: 1,
  maintenance: 0,
  hasVentilatorBeds: 12,
  free: 3, // 20 - (14 + 2 + 1 + 0) = 3
  version: 1,
  updatedAt: new Date().toISOString(),
};

describe('WardAdjustCard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders ward type and derived free beds', () => {
    render(
      <ToastProvider>
        <WardAdjustCard ward={mockWard} hospitalId="hosp-001" />
      </ToastProvider>
    );

    expect(screen.getByText('ICU Ward')).toBeInTheDocument();
    expect(screen.getByText('3 Free')).toBeInTheDocument();
    expect(screen.getByText('14')).toBeInTheDocument(); // Occupied
    expect(screen.getByText('2')).toBeInTheDocument();  // Reserved
  });

  it('performs optimistic update and calls adjustBedInventory when incrementing occupied', async () => {
    (bedsApi.adjustBedInventory as any).mockResolvedValueOnce({
      ...mockWard,
      occupied: 15,
      free: 2,
    });

    render(
      <ToastProvider>
        <WardAdjustCard ward={mockWard} hospitalId="hosp-001" />
      </ToastProvider>
    );

    const increaseOccupiedBtn = screen.getByRole('button', { name: /Increase Occupied/i });
    fireEvent.click(increaseOccupiedBtn);

    // Optimistically occupied goes from 14 to 15, free goes from 3 to 2
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('2 Free')).toBeInTheDocument();

    expect(bedsApi.adjustBedInventory).toHaveBeenCalledWith('hosp-001', 'ICU', {
      deltaOccupied: 1,
    });
  });

  it('rolls back optimistic update when API call fails', async () => {
    (bedsApi.adjustBedInventory as any).mockRejectedValueOnce({
      response: { data: { error: { message: 'Version conflict error' } } },
    });

    render(
      <ToastProvider>
        <WardAdjustCard ward={mockWard} hospitalId="hosp-001" />
      </ToastProvider>
    );

    const increaseOccupiedBtn = screen.getByRole('button', { name: /Increase Occupied/i });
    fireEvent.click(increaseOccupiedBtn);

    // Wait for rollback after error
    await waitFor(() => {
      expect(screen.getByText('14')).toBeInTheDocument();
      expect(screen.getByText('3 Free')).toBeInTheDocument();
    });
  });
});

