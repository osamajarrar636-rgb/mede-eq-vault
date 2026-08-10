import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { AppLayout } from './layouts/AppLayout';

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
      <div className="loading-screen">
        Loading MedEq Vault…
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!profile?.is_active) {
    return (
      <div className="loading-screen">
        This account is inactive. Contact an administrator.
      </div>
    );
  }

  if (admin && profile.role !== 'ADMIN') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>

      {/* Login */}
      <Route
        path="/login"
        element={<Login />}
      />

      {/* Protected application */}
      <Route
        element={
          <Guard>
            <AppLayout />
          </Guard>
        }
      >

        {/* Dashboard */}
        <Route
          index
          element={<Dashboard />}
        />

        {/* Equipment */}
        <Route
          path="equipment"
          element={<Equipment />}
        />

        {/* Equipment details */}
        <Route
          path="equipment/:id"
          element={<EquipmentDetail />}
        />

        {/* Repair case details */}
        <Route
          path="repair-cases/:id"
          element={<RepairCaseDetail />}
        />

        {/* Global search */}
        <Route
          path="search"
          element={<Search />}
        />

        {/* Contributions */}
        <Route
          path="contributions"
          element={<Contributions />}
        />

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
      <Route
        path="*"
        element={<Navigate to="/" replace />}
      />

    </Routes>
  );
}