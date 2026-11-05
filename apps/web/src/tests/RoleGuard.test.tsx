import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RequireRole } from '../lib/auth/role-guard';
import { useAuthStore } from '../lib/auth/auth-store';

describe('RoleGuard (RequireRole)', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  });

  it('redirects to /login if user is not authenticated', () => {
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route path="/login" element={<div>Login Page Mock</div>} />
          <Route
            path="/admin"
            element={
              <RequireRole roles={['CITY_ADMIN']}>
                <div>Protected Admin Dashboard</div>
              </RequireRole>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Login Page Mock')).toBeInTheDocument();
    expect(screen.queryByText('Protected Admin Dashboard')).not.toBeInTheDocument();
  });

  it('displays Access Restricted when user role does not match required roles', () => {
    useAuthStore.setState({
      user: {
        id: 'usr-patient',
        email: 'patient@example.com',
        name: 'Patient User',
        role: 'PATIENT',
        hospitalId: null,
      },
      isAuthenticated: true,
      isLoading: false,
    });

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route
            path="/admin"
            element={
              <RequireRole roles={['CITY_ADMIN']}>
                <div>Protected Admin Dashboard</div>
              </RequireRole>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Access Restricted')).toBeInTheDocument();
    expect(screen.getByText(/Required roles: \[CITY_ADMIN\]/)).toBeInTheDocument();
    expect(screen.queryByText('Protected Admin Dashboard')).not.toBeInTheDocument();
  });

  it('renders protected children when user role matches', () => {
    useAuthStore.setState({
      user: {
        id: 'usr-admin',
        email: 'admin@bhubaneswar.gov.in',
        name: 'City Health Admin',
        role: 'CITY_ADMIN',
        hospitalId: null,
      },
      isAuthenticated: true,
      isLoading: false,
    });

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route
            path="/admin"
            element={
              <RequireRole roles={['CITY_ADMIN']}>
                <div>Protected Admin Dashboard</div>
              </RequireRole>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('Protected Admin Dashboard')).toBeInTheDocument();
  });
});

