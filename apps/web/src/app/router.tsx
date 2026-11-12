import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { RootLayout } from '../components/layout/RootLayout';
import { RouteErrorBoundary } from '../components/layout/RouteErrorBoundary';
import { HomePage } from '../routes/patient/HomePage';
import { ResultsPage } from '../routes/patient/ResultsPage';
import { HospitalDetailPage } from '../routes/patient/HospitalDetailPage';
import { EquipmentFinderPage } from '../routes/patient/EquipmentFinderPage';
import { MyRequestsPage } from '../routes/patient/MyRequestsPage';
import { AbhaPage } from '../routes/patient/AbhaPage';
import { LoginPage } from '../routes/patient/LoginPage';
import { ProfilePage } from '../routes/patient/ProfilePage';
import { OnboardingPage } from '../routes/patient/OnboardingPage';
import { TopDoctorsPage } from '../routes/patient/TopDoctorsPage';
import { BloodBankPage } from '../routes/patient/BloodBankPage';
import { AiAssistantPage } from '../routes/patient/AiAssistantPage';
import { SosPage } from '../routes/patient/SosPage';
import { HospitalDashboardPage } from '../routes/hospital/HospitalDashboardPage';
import { CityAdminPage } from '../routes/admin/CityAdminPage';
import { RequireRole } from '../lib/auth/role-guard';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: 'results',
        element: <ResultsPage />,
      },
      {
        path: 'hospitals/:id',
        element: <HospitalDetailPage />,
      },
      {
        // Patient hospital profile — links use /hospital/:id (staff dashboard stays at /hospital)
        path: 'hospital/:id',
        element: <HospitalDetailPage />,
      },
      {
        path: 'equipment',
        element: <EquipmentFinderPage />,
      },
      {
        path: 'blood',
        element: <BloodBankPage />,
      },
      {
        path: 'ai',
        element: <AiAssistantPage />,
      },
      {
        path: 'sos',
        element: <SosPage />,
      },
      {
        path: 'requests',
        element: <MyRequestsPage />,
      },
      {
        path: 'abha',
        element: <AbhaPage />,
      },
      {
        path: 'login',
        element: <LoginPage />,
      },
      {
        path: 'profile',
        element: <ProfilePage />,
      },
      {
        path: 'onboarding',
        element: (
          <RequireRole roles={['PATIENT']}>
            <OnboardingPage />
          </RequireRole>
        ),
      },
      {
        path: 'doctors',
        element: <TopDoctorsPage />,
      },
      {
        path: 'top-doctors',
        element: <TopDoctorsPage />,
      },
      {
        path: 'hospital',
        element: (
          <RequireRole roles={['HOSPITAL_STAFF', 'HOSPITAL_ADMIN']}>
            <HospitalDashboardPage />
          </RequireRole>
        ),
      },
      {
        path: 'admin',
        element: (
          <RequireRole roles={['CITY_ADMIN']}>
            <CityAdminPage />
          </RequireRole>
        ),
      },
      {
        path: '*',
        element: (
          <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center">
            <h1 className="text-4xl font-bold font-heading text-ink mb-2">404</h1>
            <p className="text-muted text-sm mb-6">The requested healthcare page could not be located.</p>
            <a
              href="/"
              className="px-6 py-2.5 bg-navy text-white text-sm font-semibold rounded-full hover:bg-navy/90"
            >
              Return Home
            </a>
          </div>
        ),
      },
    ],
  },
]);

