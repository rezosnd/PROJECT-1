import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { bedsApi, BedRequest } from '../../lib/api/beds.api';
import { useAuthStore } from '../../lib/auth/auth-store';
import { Card } from '../../components/ui/Card';
import { Chip } from '../../components/ui/Chip';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { Skeleton } from '../../components/ui/Skeleton';
import {
  Clock,
  ShieldCheck,
  Building2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRight
} from 'lucide-react';

function HoldCountdown({ expiresAt }: { expiresAt: string | undefined }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (!expiresAt) return;

    const timer = () => {
      const now = Date.now();
      const target = new Date(expiresAt).getTime();
      const diffSec = Math.max(0, Math.floor((target - now) / 1000));

      if (diffSec <= 0) {
        setTimeLeft('Expired');
        return;
      }

      const mins = Math.floor(diffSec / 60);
      const secs = diffSec % 60;
      setTimeLeft(`${mins}:${secs < 10 ? '0' : ''}${secs}`);
    };

    timer();
    const interval = setInterval(timer, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  if (!expiresAt) return null;

  return (
    <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-light text-blue rounded-pill text-xs font-bold border border-blue/20">
      <Clock className="w-3.5 h-3.5 animate-spin" />
      <span>Hold expires in: <strong className="font-mono">{timeLeft}</strong></span>
    </div>
  );
}

export const MyRequestsPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  const { data: requests = [], isLoading, refetch } = useQuery({
    queryKey: ['my-bed-requests'],
    queryFn: () => bedsApi.getMyRequests(),
    enabled: isAuthenticated,
    refetchInterval: 5000 // Poll every 5 seconds for status change updates
  });

  if (!isAuthenticated) {
    return (
      <EmptyState
        title="Sign In Required"
        description="Please sign in with your Google account to track active bed reservation holds."
        actionLabel="Sign In"
        onAction={() => navigate('/login')}
      />
    );
  }

  const statusVariantMap = {
    APPROVED: 'green' as const,
    PENDING: 'orange' as const,
    REJECTED: 'red' as const,
    ADMITTED: 'blue' as const,
    EXPIRED: 'neutral' as const
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 text-left">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold font-display text-navy tracking-tight">
          {t('requests.title')}
        </h1>
        <p className="text-xs text-muted mt-0.5">
          {t('requests.subtitle')}
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton variant="card" className="h-36" />
          <Skeleton variant="card" className="h-36" />
        </div>
      ) : requests.length === 0 ? (
        <EmptyState
          title={t('requests.empty')}
          description={t('requests.emptySub')}
          actionLabel="Find Emergency Beds"
          onAction={() => navigate('/')}
        />
      ) : (
        <div className="space-y-4">
          {requests.map((r) => (
            <Card
              key={r.id}
              variant="surface"
              className="p-5 border border-hairline/80 shadow-soft space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-base text-ink">{r.wardType} Ward Bed</span>
                    <Chip variant={statusVariantMap[r.status] || 'neutral'} dot>
                      {r.status}
                    </Chip>
                  </div>
                  <p className="text-xs text-muted mt-0.5 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-muted shrink-0" />
                    <span>Hospital ID: {r.hospitalId.slice(0, 8)}...</span>
                    <span>•</span>
                    <span>Requested: {new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </p>
                </div>

                {r.status === 'APPROVED' && (
                  <HoldCountdown expiresAt={r.holdExpiresAt} />
                )}
              </div>

              {/* Status explanation */}
              <div className="p-3 bg-card-soft rounded-2xl text-xs text-ink/80 flex items-start gap-2 border border-hairline/60">
                {r.status === 'APPROVED' ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-green shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-green font-bold">Bed Reserved:</strong> Hospital staff approved your request. An exclusive 15-minute hold is reserved for your arrival.
                    </span>
                  </>
                ) : r.status === 'PENDING' ? (
                  <>
                    <Clock className="w-4 h-4 text-orange shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-orange font-bold">Awaiting Triage:</strong> Your emergency reservation request was received and is currently being evaluated by on-duty nursing staff.
                    </span>
                  </>
                ) : r.status === 'ADMITTED' ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-blue shrink-0 mt-0.5" />
                    <span>Patient has been admitted to the facility. Hold cycle completed.</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-muted shrink-0 mt-0.5" />
                    <span>Reservation request has concluded ({r.status}).</span>
                  </>
                )}
              </div>

              {/* Masked ABHA Status */}
              {r.shareAbha && (
                <div className="flex items-center gap-1.5 text-xs text-teal font-semibold pt-1">
                  <ShieldCheck className="w-4 h-4 text-teal shrink-0" />
                  <span>Masked ABHA shared with facility triage staff</span>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

