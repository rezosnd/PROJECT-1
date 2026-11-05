import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Tabs } from '../../components/ui/Tabs';
import { VerificationQueue } from '../../features/admin/VerificationQueue';
import { StaffPreRegForm } from '../../features/admin/StaffPreRegForm';
import { ConditionManager } from '../../features/admin/ConditionManager';
import { CityOccupancyMap } from '../../features/admin/CityOccupancyMap';
import { AddHospitalForm } from '../../features/admin/AddHospitalForm';
import { adminApi, AuditLogEntry } from '../../lib/api/admin.api';
import { hospitalsApi } from '../../lib/api/hospitals.api';
import { conditionsApi } from '../../lib/api/conditions.api';
import { useQuery } from '@tanstack/react-query';
import { Shield, Building2, UserPlus, BookOpen, FileText, RefreshCw, PlusCircle, Mail } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { ActiveUsersPanel } from '../../features/admin/ActiveUsersPanel';

export const CityAdminPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'map' | 'verify' | 'add-hospital' | 'staff' | 'users' | 'conditions' | 'audit'>('map');

  // Hospitals list query for city administration
  const { data: hospitalsData, refetch: refetchHospitals } = useQuery({
    queryKey: ['admin-hospitals'],
    queryFn: () => hospitalsApi.getHospitals(),
    staleTime: 30_000,
  });
  const hospitals = Array.isArray(hospitalsData) ? hospitalsData : (hospitalsData as any)?.items || [];

  // Conditions list query
  const { data: conditionsData, refetch: refetchConditions } = useQuery({
    queryKey: ['admin-conditions'],
    queryFn: () => conditionsApi.searchConditions(),
    staleTime: 30_000,
  });
  const conditions = Array.isArray(conditionsData) ? conditionsData : (conditionsData as any)?.items || [];

  // Audit logs query
  const {
    data: auditData,
    isLoading: auditLoading,
    refetch: refetchAudit,
  } = useQuery({
    queryKey: ['admin-audit-logs'],
    queryFn: () => adminApi.getAuditLogs({ limit: 50 }),
    enabled: activeTab === 'audit',
    staleTime: 15_000,
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-hairline shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-navy/10 flex items-center justify-center text-navy">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold font-heading text-ink">
                City Health Administration
              </h1>
              <p className="text-sm text-muted">
                Bhubaneswar Municipal Healthcare Grid • Verification & Taxonomy Governance
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            size="sm"
            onClick={() => setActiveTab('add-hospital')}
            leftIcon={<PlusCircle className="w-4 h-4" />}
          >
            Register New Hospital
          </Button>
          <span className="text-xs px-3 py-1 bg-green/10 text-green font-semibold rounded-full border border-green/20">
            Role: CITY_ADMIN
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-hairline">
        <Tabs
          tabs={[
            { id: 'map', label: 'City ICU Heatmap', icon: <Building2 className="w-4 h-4" /> },
            { id: 'add-hospital', label: 'Register Hospital', icon: <PlusCircle className="w-4 h-4" /> },
            { id: 'verify', label: 'Hospital Verification', icon: <Shield className="w-4 h-4" /> },
            { id: 'staff', label: 'Staff Pre-Registration', icon: <UserPlus className="w-4 h-4" /> },
            { id: 'users', label: 'Active Emails', icon: <Mail className="w-4 h-4" /> },
            { id: 'conditions', label: 'Condition Taxonomy', icon: <BookOpen className="w-4 h-4" /> },
            { id: 'audit', label: 'Audit Logs', icon: <FileText className="w-4 h-4" /> },
          ]}
          activeTab={activeTab}
          onChange={(tab) => setActiveTab(tab as any)}
        />
      </div>

      {/* Tab Panels */}
      {activeTab === 'map' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold font-heading text-ink">Bhubaneswar Hospital Occupancy Grid</h2>
              <p className="text-xs text-muted">
                Live color-coded status of critical care wards across public and private hospitals.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveTab('add-hospital')}
              leftIcon={<PlusCircle className="w-4 h-4" />}
            >
              Add Hospital
            </Button>
          </div>
          <CityOccupancyMap hospitals={hospitals} />
        </div>
      )}

      {activeTab === 'add-hospital' && (
        <div className="space-y-4 animate-in fade-in">
          <AddHospitalForm
            onHospitalAdded={() => {
              refetchHospitals();
              setActiveTab('map');
            }}
          />
        </div>
      )}

      {activeTab === 'verify' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold font-heading text-ink">Hospital Verification Queue</h2>
              <p className="text-xs text-muted">
                Inspect facilities applying to join the GetMyHospital CityHealth network.
              </p>
            </div>
          </div>
          <VerificationQueue hospitals={hospitals} onUpdated={() => refetchHospitals()} />
        </div>
      )}

      {activeTab === 'staff' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold font-heading text-ink">Staff Gmail Pre-Registration</h2>
              <p className="text-xs text-muted">
                Grant staff or hospital admin privileges to Google accounts before their first login.
              </p>
            </div>
          </div>
          <StaffPreRegForm hospitals={hospitals} onStaffRegistered={() => refetchAudit()} />
        </div>
      )}

      {activeTab === 'users' && <ActiveUsersPanel />}

      {activeTab === 'conditions' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold font-heading text-ink">Clinical Condition Taxonomy</h2>
              <p className="text-xs text-muted">
                Configure primary bed types, required equipment, and default urgency for clinical matching.
              </p>
            </div>
          </div>
          <ConditionManager conditions={conditions} onUpdated={() => refetchConditions()} />
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold font-heading text-ink">System Audit Trail</h2>
              <p className="text-xs text-muted">
                Immutable security and governance log of all privileged mutations.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchAudit()}
              leftIcon={<RefreshCw className="w-4 h-4" />}
            >
              Refresh
            </Button>
          </div>

          <Card className="overflow-hidden bg-white border border-hairline">
            {auditLoading ? (
              <div className="p-8 text-center text-sm text-muted">Loading audit entries...</div>
            ) : !auditData?.items || auditData.items.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted">
                No audit events recorded yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-hairline text-muted uppercase tracking-wider font-semibold">
                    <tr>
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4">Action</th>
                      <th className="py-3 px-4">Resource</th>
                      <th className="py-3 px-4">Actor</th>
                      <th className="py-3 px-4">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline">
                    {auditData.items.map((log: AuditLogEntry) => (
                      <tr key={log.id} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4 whitespace-nowrap font-mono text-muted">
                          {new Date(log.at).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="font-semibold text-navy bg-navy/5 px-2 py-0.5 rounded">
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="font-mono text-ink">
                            {log.resourceType}:{log.resourceId || 'all'}
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap font-mono text-muted">
                          {log.actorId ? log.actorId.slice(0, 8) + '...' : 'System'}
                        </td>
                        <td className="py-3 px-4 text-muted max-w-xs truncate">
                          {log.meta ? JSON.stringify(log.meta) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
};
