import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../lib/api/admin.api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { RefreshCw, Mail, Shield, User } from 'lucide-react';

export const ActiveUsersPanel: React.FC = () => {
  const [status, setStatus] = useState<'ACTIVE' | 'SUSPENDED' | ''>('ACTIVE');
  const [role, setRole] = useState<string>('');
  const [search, setSearch] = useState('');

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['admin-active-users', status, role, search],
    queryFn: () =>
      adminApi.getUsers({
        page: 1,
        limit: 100,
        status: status || undefined,
        role: (role || undefined) as any,
      }),
    staleTime: 10_000,
  });

  const users = Array.isArray(data) ? data : (data as any)?.users || (data as any)?.items || [];
  const filtered = search.trim()
    ? users.filter(
        (u: any) =>
          u.email?.toLowerCase().includes(search.toLowerCase()) ||
          u.name?.toLowerCase().includes(search.toLowerCase())
      )
    : users;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold font-heading text-ink">Active Registered Emails</h2>
          <p className="text-xs text-muted">
            Every Google account that has signed into GetMyHospital — patients, hospital staff, and city admins.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          leftIcon={<RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />}
        >
          Refresh
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search email or name"
          className="h-10 px-3 rounded-xl border border-hairline text-sm bg-white min-w-[220px]"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as any)}
          className="h-10 px-3 rounded-xl border border-hairline text-sm bg-white"
        >
          <option value="ACTIVE">Active only</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="">All statuses</option>
        </select>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="h-10 px-3 rounded-xl border border-hairline text-sm bg-white"
        >
          <option value="">All roles</option>
          <option value="PATIENT">Patient</option>
          <option value="HOSPITAL_STAFF">Hospital Staff</option>
          <option value="HOSPITAL_ADMIN">Hospital Admin</option>
          <option value="CITY_ADMIN">City Admin</option>
        </select>
        <span className="text-xs text-muted ml-auto">{filtered.length} accounts</span>
      </div>

      <Card className="overflow-hidden bg-white border border-hairline">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-muted">Loading registered emails…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted">No users match this filter.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-hairline text-muted uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Hospital</th>
                  <th className="py-3 px-4">Profile</th>
                  <th className="py-3 px-4">Last login</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {filtered.map((u: any) => (
                  <tr key={u.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2 font-medium text-ink">
                        <Mail className="w-3.5 h-3.5 text-blue" />
                        {u.email}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-ink">{u.name}</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-navy/5 text-navy font-semibold">
                        {u.role === 'CITY_ADMIN' ? <Shield className="w-3 h-3" /> : <User className="w-3 h-3" />}
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-muted">{u.hospitalName || '—'}</td>
                    <td className="py-3 px-4">
                      {u.role !== 'PATIENT' ? (
                        <span className="text-muted">N/A</span>
                      ) : u.profileComplete ? (
                        <span className="text-green font-semibold">Complete</span>
                      ) : (
                        <span className="text-orange font-semibold">Pending intake</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-muted whitespace-nowrap">
                      {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : 'Never'}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full font-semibold ${
                          u.status === 'ACTIVE' ? 'bg-green/10 text-green' : 'bg-red/10 text-red'
                        }`}
                      >
                        {u.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
