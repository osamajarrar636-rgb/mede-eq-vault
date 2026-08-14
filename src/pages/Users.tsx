import { useEffect, useState, useMemo } from 'react';
import {
  ShieldCheck,
  UserCheck,
  UserX,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Clock,
  UserRound,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { formatDate } from '../lib/ui';
import type { Role } from '../types';

export default function Users() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'ACTIVE'>('ALL');
  const [error, setError] = useState('');

  /* =======================================================
     LOAD PROFILES
  ======================================================= */
  const loadUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load user profiles.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  /* =======================================================
     UPDATE ROLE
  ======================================================= */
  const changeRole = async (id: string, role: Role) => {
    try {
      const { error } = await supabase.from('profiles').update({ role }).eq('id', id);
      if (error) throw error;
      await loadUsers();
    } catch (err: any) {
      alert(err?.message || 'Failed to update user role.');
    }
  };

  /* =======================================================
     TOGGLE ACTIVE STATUS
  ======================================================= */
  const toggleActiveStatus = async (user: any) => {
    try {
      const nextStatus = !user.is_active;
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: nextStatus })
        .eq('id', user.id);

      if (error) throw error;
      await loadUsers();
    } catch (err: any) {
      alert(err?.message || 'Failed to change user status.');
    }
  };

  /* =======================================================
     FILTERED USERS
  ======================================================= */
  const pendingCount = useMemo(() => {
    return users.filter((u) => !u.is_active).length;
  }, [users]);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // Search filter
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (u.full_name && u.full_name.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.bio && u.bio.toLowerCase().includes(q));

      // Tab filter
      let matchesTab = true;
      if (activeTab === 'PENDING') {
        matchesTab = !u.is_active;
      } else if (activeTab === 'ACTIVE') {
        matchesTab = u.is_active;
      }

      return matchesSearch && matchesTab;
    });
  }, [users, searchQuery, activeTab]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-600 mb-1">
            ADMINISTRATION
          </p>
          <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
          <p className="text-sm text-slate-500 mt-1">
            Control account activations, review engineer registrations, and assign security roles.
          </p>
        </div>

        {pendingCount > 0 && (
          <div className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-amber-800 text-xs font-medium">
            <Clock size={16} className="text-amber-600 animate-pulse" />
            <span>
              <strong>{pendingCount}</strong> engineer account{pendingCount !== 1 ? 's' : ''} awaiting activation
            </span>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Tabs & Search */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Tabs */}
        <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 border">
          <button
            type="button"
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === 'ALL'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            onClick={() => setActiveTab('ALL')}
          >
            All Accounts ({users.length})
          </button>

          <button
            type="button"
            className={`relative rounded-lg px-3 py-1.5 text-xs font-semibold transition flex items-center gap-1.5 ${
              activeTab === 'PENDING'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            onClick={() => setActiveTab('PENDING')}
          >
            <span>Pending / Inactive</span>
            {pendingCount > 0 && (
              <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                {pendingCount}
              </span>
            )}
          </button>

          <button
            type="button"
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              activeTab === 'ACTIVE'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            onClick={() => setActiveTab('ACTIVE')}
          >
            Active
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email..."
            className="w-full rounded-xl border pl-9 pr-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
          />
        </div>
      </div>

      {/* Users Table / List */}
      <section className="rounded-2xl border bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500 text-sm">Loading profiles…</div>
        ) : filteredUsers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b text-xs uppercase tracking-wider text-slate-500 font-semibold">
                <tr>
                  <th className="px-5 py-3.5">User Profile</th>
                  <th className="px-5 py-3.5">Role</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Registered</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((u) => {
                  const initial = u.full_name?.slice(0, 1)?.toUpperCase() || 'U';

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Profile info */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700 text-sm">
                            {initial}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                              <span>{u.full_name || 'Unnamed user'}</span>
                              <Link
                                to={`/profile/${u.id}`}
                                title="View Public Profile"
                                className="text-slate-400 hover:text-blue-600 transition-colors"
                              >
                                <ExternalLink size={14} />
                              </Link>
                            </div>
                            <div className="text-xs text-slate-500">{u.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Role dropdown */}
                      <td className="px-5 py-4">
                        <select
                          value={u.role || 'VIEWER'}
                          onChange={(e) => changeRole(u.id, e.target.value as Role)}
                          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500"
                        >
                          <option value="ADMIN">ADMIN</option>
                          <option value="CONTRIBUTOR">CONTRIBUTOR (Engineer)</option>
                          <option value="VIEWER">VIEWER</option>
                        </select>
                      </td>

                      {/* Status Badge */}
                      <td className="px-5 py-4">
                        {u.is_active ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
                            <CheckCircle2 size={13} />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 border border-amber-200">
                            <Clock size={13} />
                            Pending / Inactive
                          </span>
                        )}
                      </td>

                      {/* Date */}
                      <td className="px-5 py-4 text-xs text-slate-500 whitespace-nowrap">
                        {formatDate(u.created_at)}
                      </td>

                      {/* Action buttons */}
                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        {!u.is_active ? (
                          <button
                            type="button"
                            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 shadow-sm transition"
                            onClick={() => toggleActiveStatus(u)}
                          >
                            <UserCheck size={14} />
                            Approve & Activate
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-red-600 transition"
                            onClick={() => toggleActiveStatus(u)}
                          >
                            <UserX size={14} />
                            Deactivate
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <UserRound size={36} className="mx-auto text-slate-300" />
            <p className="font-medium text-slate-700">No user profiles found.</p>
            <p className="text-xs text-slate-400">
              {searchQuery ? 'Try adjusting your search criteria.' : 'No profiles registered yet.'}
            </p>
          </div>
        )}
      </section>

      {/* Database Guard Note */}
      <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 text-xs text-blue-900 flex items-start gap-3">
        <ShieldCheck size={20} className="text-blue-600 shrink-0 mt-0.5" />
        <div>
          <strong className="font-semibold block mb-0.5">PostgreSQL Row-Level Security Enforced</strong>
          <span>
            Role modifications and account activations are checked against Supabase Database RLS policies. Viewers and inactive users cannot create or approve technical entries.
          </span>
        </div>
      </div>
    </div>
  );
}