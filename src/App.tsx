import { useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import {
  Clock,
  RefreshCw,
  LogOut,
  User,
  Mail,
  ShieldAlert,
} from 'lucide-react';

import { useAuth } from './hooks/useAuth';
import { AppLayout } from './layouts/AppLayout';
import { supabase } from './lib/supabase';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Equipment from './pages/Equipment';
import EquipmentDetail from './pages/EquipmentDetail';
import RepairCaseDetail from './pages/RepairCaseDetail';
import Contributions from './pages/Contributions';
import Approvals from './pages/Approvals';
import Users from './pages/Users';
import Activity from './pages/Activity';
import Search from './pages/Search';
import PublicProfile from './pages/PublicProfile';

/* =========================================================
   PENDING ACCOUNT SCREEN
========================================================= */
function PendingAccountScreen({ user, profile }: { user: any; profile: any }) {
  const [checking, setChecking] = useState(false);

  // إعادة تحميل الصفحة لفحص ما إذا كان الأدمن قد فعّل الحساب
  const handleCheckStatus = () => {
    setChecking(true);
    window.location.reload();
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 space-y-6 text-center">
        {/* Header Animated Icon */}
        <div className="relative inline-flex items-center justify-center">
          <div className="h-16 w-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center shadow-inner">
            <Clock size={32} className="animate-pulse" />
          </div>
          <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500"></span>
          </span>
        </div>

        {/* Title & Description */}
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-slate-900">Account Pending Activation</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Welcome to MedEq Vault. Your Biomedical Engineer registration request has been received and is currently under review by an administrator.
          </p>
        </div>

        {/* User Profile Card Summary */}
        <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-4 text-left space-y-2.5">
          <div className="flex items-center justify-between border-b pb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Registration Info
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
              Pending Approval
            </span>
          </div>

          <div className="flex items-center gap-2.5 text-xs text-slate-700">
            <User size={15} className="text-slate-400 shrink-0" />
            <span className="font-semibold text-slate-900 truncate">
              {profile?.full_name || 'Biomedical Engineer'}
            </span>
          </div>

          <div className="flex items-center gap-2.5 text-xs text-slate-700">
            <Mail size={15} className="text-slate-400 shrink-0" />
            <span className="truncate text-slate-600">{user?.email}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5 pt-1">
          <button
            type="button"
            onClick={handleCheckStatus}
            disabled={checking}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 text-white py-3 text-xs font-semibold hover:bg-blue-700 transition shadow-md disabled:opacity-50"
          >
            <RefreshCw size={15} className={checking ? 'animate-spin' : ''} />
            <span>{checking ? 'Checking Status…' : 'Check Approval Status'}</span>
          </button>

          <button
            type="button"
            onClick={handleSignOut}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-slate-700 py-2.5 text-xs font-semibold hover:bg-slate-50 hover:text-slate-900 transition"
          >
            <LogOut size={15} className="text-slate-400" />
            <span>Sign Out / Back to Login</span>
          </button>
        </div>

        {/* Helpful Footnote */}
        <p className="text-[11px] text-slate-400 leading-normal">
          Once an administrator approves your account, clicking <strong>Check Approval Status</strong> will grant instant access to your workspace.
        </p>
      </div>
    </div>
  );
}

/* =========================================================
   GUARD ROUTE COMPONENT
========================================================= */
function Guard({
  children,
  admin = false,
}: {
  children: React.ReactNode;
  admin?: boolean;
}) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400 text-xs">
        Loading MedEq Vault…
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!profile?.is_active) {
    return <PendingAccountScreen user={user} profile={profile} />;
  }

  if (admin && profile.role !== 'ADMIN') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

/* =========================================================
   MAIN APP ROUTES
========================================================= */
export default function App() {
  return (
    <Routes>
      {/* Login */}
      <Route path="/login" element={<Login />} />

      {/* Protected application */}
      <Route
        element={
          <Guard>
            <AppLayout />
          </Guard>
        }
      >
        {/* Dashboard */}
        <Route index element={<Dashboard />} />

        {/* Equipment */}
        <Route path="equipment" element={<Equipment />} />

        {/* Equipment details */}
        <Route path="equipment/:id" element={<EquipmentDetail />} />

        {/* Repair case details */}
        <Route path="repair-cases/:id" element={<RepairCaseDetail />} />

        {/* Public profile */}
        <Route path="profile/:userId" element={<PublicProfile />} />

        {/* Global search */}
        <Route path="search" element={<Search />} />

        {/* Contributions */}
        <Route path="contributions" element={<Contributions />} />

        {/* Admin */}
        <Route
          path="approvals"
          element={
            <Guard admin>
              <Approvals />
            </Guard>
          }
        />

        <Route
          path="users"
          element={
            <Guard admin>
              <Users />
            </Guard>
          }
        />

        <Route
          path="activity"
          element={
            <Guard admin>
              <Activity />
            </Guard>
          }
        />
      </Route>

      {/* Unknown route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}