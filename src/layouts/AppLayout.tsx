import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Activity,
  Bell,
  BookOpen,
  Check,
  CheckCheck,
  ClipboardCheck,
  FileSearch,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  Wrench,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import type { Notification } from '../types';

const links = [
  ['/', 'Dashboard', LayoutDashboard],
  ['/equipment', 'Equipment Library', Wrench],
  ['/search', 'Global Search', FileSearch],
  ['/contributions', 'My Contributions', BookOpen],
  ['/approvals', 'Approval Center', ClipboardCheck],
  ['/users', 'User Management', ShieldCheck],
  ['/activity', 'Activity Log', Activity],
] as const;

export function AppLayout() {
  const { profile, signOut } = useAuth();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notes, setNotes] = useState<Notification[]>([]);
  const [loadingNotifications, setLoadingNotifications] =
    useState(false);

  const location = useLocation();

  /*
   * =========================================================
   * LOAD NOTIFICATIONS
   * =========================================================
   */

  const loadNotifications = async () => {
    if (!profile?.id) return;

    setLoadingNotifications(true);

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', {
          ascending: false,
        })
        .limit(20);

      if (error) {
        console.error(
          'Unable to load notifications:',
          error
        );
        return;
      }

      setNotes((data || []) as Notification[]);
    } finally {
      setLoadingNotifications(false);
    }
  };

  useEffect(() => {
    if (!profile?.id) return;

    loadNotifications();
  }, [profile?.id, location.pathname]);

  /*
   * =========================================================
   * UNREAD COUNT
   * =========================================================
   */

  const unread = notes.filter(
    (notification) => !notification.is_read
  ).length;

  /*
   * =========================================================
   * MARK ONE AS READ
   * =========================================================
   */

  const markAsRead = async (
    notificationId: string
  ) => {
    setNotes((current) =>
      current.map((notification) =>
        notification.id === notificationId
          ? {
              ...notification,
              is_read: true,
            }
          : notification
      )
    );

    const { error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
      })
      .eq('id', notificationId);

    if (error) {
      console.error(
        'Unable to mark notification as read:',
        error
      );

      loadNotifications();
    }
  };

  /*
   * =========================================================
   * MARK ALL AS READ
   * =========================================================
   */

  const markAllAsRead = async () => {
    if (!profile?.id || unread === 0) return;

    setNotes((current) =>
      current.map((notification) => ({
        ...notification,
        is_read: true,
      }))
    );

    /*
     * IMPORTANT:
     * If your notifications table is user-specific,
     * add .eq('user_id', profile.id) here.
     */

    const { error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
      })
      .eq('is_read', false);

    if (error) {
      console.error(
        'Unable to mark all notifications as read:',
        error
      );

      loadNotifications();
    }
  };

  /*
   * =========================================================
   * CLOSE MENUS WHEN ROUTE CHANGES
   * =========================================================
   */

  useEffect(() => {
    setSidebarOpen(false);
    setNotificationsOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-slate-50">

      {/* =====================================================
          MOBILE OVERLAY
      ===================================================== */}

      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          className="fixed inset-0 z-40 bg-black/30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* =====================================================
          SIDEBAR
      ===================================================== */}

      <aside
        className={`
          fixed
          inset-y-0
          left-0
          z-50
          w-64
          bg-white
          border-r
          shadow-sm
          flex
          flex-col
          transition-transform
          duration-200

          ${
            sidebarOpen
              ? 'translate-x-0'
              : '-translate-x-full'
          }

          md:translate-x-0
        `}
      >

        {/* Sidebar Header */}

        <div className="flex items-center justify-between p-5 border-b">

          <div>
            <div className="font-bold text-lg">
              MedEq Vault
            </div>

            <div className="text-xs text-slate-500 mt-1">
              Engineering Knowledge Base
            </div>
          </div>

          <button
            type="button"
            className="md:hidden rounded-lg p-2 hover:bg-slate-100"
            onClick={() =>
              setSidebarOpen(false)
            }
          >
            <X size={20} />
          </button>

        </div>

        {/* Navigation */}

        <nav className="flex-1 overflow-y-auto p-4 space-y-1">

          {links.map(
            ([to, label, Icon]) => {

              const admin =
                label === 'Approval Center' ||
                label === 'User Management' ||
                label === 'Activity Log';

              if (
                admin &&
                profile?.role !== 'ADMIN'
              ) {
                return null;
              }

              return (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  onClick={() =>
                    setSidebarOpen(false)
                  }
                  className={({ isActive }) =>
                    `
                    flex
                    items-center
                    gap-3
                    rounded-lg
                    px-3
                    py-2.5
                    text-sm
                    font-medium
                    transition

                    ${
                      isActive
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }
                    `
                  }
                >
                  <Icon size={18} />

                  <span>
                    {label}
                  </span>
                </NavLink>
              );
            }
          )}

        </nav>

        {/* User */}

        <div className="p-4 border-t">

          <div className="flex items-center gap-3">

            <div className="h-9 w-9 rounded-full bg-slate-200 flex items-center justify-center font-semibold uppercase">
              {profile?.full_name?.slice(
                0,
                1
              ) ||
                profile?.email?.slice(
                  0,
                  1
                ) ||
                'U'}
            </div>

            <div className="min-w-0">

              <div className="font-medium truncate text-sm">
                {profile?.full_name ||
                  profile?.email ||
                  'Engineer'}
              </div>

              <div className="text-xs text-slate-500">
                {profile?.role}
              </div>

            </div>

          </div>

          <button
            type="button"
            className="secondary mt-4 w-full inline-flex items-center justify-center gap-2"
            onClick={signOut}
          >
            <LogOut size={16} />
            Sign out
          </button>

        </div>

      </aside>

      {/* =====================================================
          MAIN CONTENT
      ===================================================== */}

      <div className="md:pl-64 min-h-screen">

        {/* ===================================================
            TOP BAR
        =================================================== */}

        <header className="sticky top-0 z-30 h-16 bg-white border-b">

          <div className="h-full px-4 md:px-6 flex items-center justify-between">

            <div className="flex items-center gap-3">

              <button
                type="button"
                className="md:hidden rounded-lg p-2 hover:bg-slate-100"
                onClick={() =>
                  setSidebarOpen(true)
                }
              >
                <Menu size={20} />
              </button>

              <div className="text-sm font-medium capitalize text-slate-700">
                {location.pathname === '/'
                  ? 'Workspace'
                  : location.pathname
                      .split('/')[1]
                      ?.replaceAll(
                        '-',
                        ' '
                      )}
              </div>

            </div>

            {/* =================================================
                NOTIFICATIONS
            ================================================= */}

            <div className="relative">

              <button
                type="button"
                className="relative rounded-lg p-2 hover:bg-slate-100"
                onClick={() =>
                  setNotificationsOpen(
                    (current) => !current
                  )
                }
                aria-label="Notifications"
              >

                <Bell size={20} />

                {unread > 0 && (
                  <span className="absolute -right-1 -top-1 min-w-5 h-5 px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center">
                    {unread > 9
                      ? '9+'
                      : unread}
                  </span>
                )}

              </button>

              {/* Notification dropdown */}

              {notificationsOpen && (
                <div className="absolute right-0 top-12 z-[100] w-[380px] max-w-[calc(100vw-2rem)] rounded-xl border bg-white shadow-2xl overflow-hidden">

                  {/* Header */}

                  <div className="flex items-center justify-between gap-3 border-b p-4">

                    <div>

                      <div className="font-semibold">
                        Notifications
                      </div>

                      <div className="text-xs text-slate-500 mt-1">
                        {unread} unread
                      </div>

                    </div>

                    {unread > 0 && (
                      <button
                        type="button"
                        onClick={
                          markAllAsRead
                        }
                        className="text-xs font-medium text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
                      >
                        <CheckCheck
                          size={15}
                        />

                        Mark all as read
                      </button>
                    )}

                  </div>

                  {/* Notification list */}

                  <div className="max-h-[500px] overflow-y-auto">

                    {loadingNotifications ? (

                      <div className="p-6 text-center text-sm text-slate-500">
                        Loading notifications…
                      </div>

                    ) : notes.length ? (

                      notes.map(
                        (notification) => (

                          <div
                            key={
                              notification.id
                            }
                            className={`
                              border-b
                              last:border-b-0
                              p-4
                              transition
                              ${
                                notification.is_read
                                  ? 'bg-white'
                                  : 'bg-blue-50'
                              }
                            `}
                          >

                            <div className="flex items-start gap-3">

                              <div
                                className={`
                                  mt-1
                                  h-2.5
                                  w-2.5
                                  rounded-full
                                  flex-shrink-0
                                  ${
                                    notification.is_read
                                      ? 'bg-slate-300'
                                      : 'bg-blue-600'
                                  }
                                `}
                              />

                              <div className="min-w-0 flex-1">

                                <div className="font-medium text-sm">
                                  {
                                    notification.title
                                  }
                                </div>

                                <div className="text-sm text-slate-600 mt-1">
                                  {
                                    notification.message
                                  }
                                </div>

                                {!notification.is_read && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      markAsRead(
                                        notification.id
                                      )
                                    }
                                    className="mt-3 text-xs font-medium text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
                                  >
                                    <Check
                                      size={14}
                                    />

                                    Mark as read
                                  </button>
                                )}

                                {notification.is_read && (
                                  <div className="mt-2 text-xs text-slate-400 inline-flex items-center gap-1">
                                    <Check
                                      size={13}
                                    />

                                    Read
                                  </div>
                                )}

                              </div>

                            </div>

                          </div>

                        )
                      )

                    ) : (

                      <div className="p-8 text-center text-sm text-slate-500">
                        No notifications
                      </div>

                    )}

                  </div>

                </div>
              )}

            </div>

          </div>

        </header>

        {/* ===================================================
            PAGE CONTENT
        =================================================== */}

        <main className="p-4 md:p-6 max-w-[1600px] mx-auto">
          <Outlet />
        </main>

      </div>

    </div>
  );
}