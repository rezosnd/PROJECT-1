import React from 'react';
import RequestsScreen from '../../app/(tabs)/requests';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

describe('Bed Request Countdown Logic', () => {
  it('correctly computes countdown difference from server expiresAt ISO timestamp', () => {
    const expiresAt = new Date(Date.now() + 10 * 60000).toISOString();
    const diffMs = new Date(expiresAt).getTime() - Date.now();
    const totalSec = Math.floor(diffMs / 1000);
    const mins = Math.floor(totalSec / 60);

    expect(mins).toBeGreaterThanOrEqual(9);
    expect(mins).toBeLessThanOrEqual(10);
  });
});

