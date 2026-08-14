import { FormEvent, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  KeyRound,
  Mail,
  ShieldCheck,
  User,
  Wrench,
  Eye,
  CheckCircle2,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import type { Role } from '../types';

export default function Login() {
  const { user } = useAuth();
  const nav = useNavigate();

  const [mode, setMode] = useState<'login' | 'register' | 'reset'>('login');
  
  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [selectedRole, setSelectedRole] = useState<Role>('CONTRIBUTOR');

  // UI state
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  if (user) return <Navigate to="/" replace />;

  /* =======================================================
     SUBMIT HANDLER
  ======================================================= */
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr('');
    setMsg('');

    try {
      /* --- 1. RESET PASSWORD MODE --- */
      if (mode === 'reset') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/login`,
        });
        if (error) throw error;
        setMsg('Password reset instructions have been sent to your email.');
      } 
      
      /* --- 2. REGISTER MODE --- */
      else if (mode === 'register') {
        if (!fullName.trim()) throw new Error('Please enter your full name.');

        const isViewer = selectedRole === 'VIEWER';

        // Sign up with Supabase Auth (Database trigger handles profiles safely)
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName.trim(),
              role: selectedRole,
              is_active: isViewer,
            },
          },
        });

        if (error) throw error;

        // إلغاء الجلسة التلقائية للمهندس فوراً لتجنب الدخول بحساب غير مفعل
        if (!isViewer) {
          await supabase.auth.signOut();
          setMsg(
            'Engineer account registration submitted! Your account is pending administrator approval before activation.'
          );
        } else {
          setMsg('Viewer account created successfully! You can now sign in.');
        }

        setMode('login');
      } 
      
      /* --- 3. LOGIN MODE --- */
      else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        // Check active status in profile database
        if (data.user) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('is_active, role')
            .eq('id', data.user.id)
            .single();

          if (profileData && !profileData.is_active) {
            await supabase.auth.signOut();
            throw new Error(
              'Your engineer account is currently pending administrator approval or deactivated.'
            );
          }
        }

        nav('/');
      }
    } catch (e: any) {
      setErr(e.message || 'Authentication process failed.');
    } finally {
      setBusy(false);
    }
  };

  const resetFormState = (newMode: 'login' | 'register' | 'reset') => {
    setMode(newMode);
    setErr('');
    setMsg('');
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4">
      {/* Brand Header */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-blue-600 text-white font-black text-2xl shadow-lg shadow-blue-500/30 mb-3">
          M
        </div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">MedEq Vault</h1>
        <p className="text-xs text-slate-400 mt-1">
          Private Medical Equipment Knowledge & Maintenance Platform
        </p>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 space-y-6">
        <div className="text-center space-y-1">
          <h2 className="text-xl font-bold text-slate-900">
            {mode === 'login' && 'Sign in to workspace'}
            {mode === 'register' && 'Create an account'}
            {mode === 'reset' && 'Reset your password'}
          </h2>
          <p className="text-xs text-slate-500">
            {mode === 'login' && 'Enter your credentials to access engineering dossier.'}
            {mode === 'register' && 'Join the medical engineering knowledge base.'}
            {mode === 'reset' && 'We will send reset instructions to your inbox.'}
          </p>
        </div>

        {/* Status Alerts */}
        {err && (
          <div className="rounded-xl bg-red-50 p-3.5 text-xs text-red-700 border border-red-200 flex items-start gap-2">
            <span className="font-bold shrink-0">⚠️</span>
            <div>{err}</div>
          </div>
        )}

        {msg && (
          <div className="rounded-xl bg-emerald-50 p-3.5 text-xs text-emerald-800 border border-emerald-200 flex items-start gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
            <div>{msg}</div>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={submit} className="space-y-4">
          {/* Full Name field (Register only) */}
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Full Name *
              </label>
              <div className="relative">
                <User size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Eng. Alex Morgan"
                  className="w-full rounded-xl border border-slate-200 pl-10 pr-3 py-2.5 text-sm outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                  required
                />
              </div>
            </div>
          )}

          {/* Email field */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Email Address *
            </label>
            <div className="relative">
              <Mail size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="engineer@hospital.org"
                className="w-full rounded-xl border border-slate-200 pl-10 pr-3 py-2.5 text-sm outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                required
              />
            </div>
          </div>

          {/* Password field (Login & Register) */}
          {mode !== 'reset' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Password *
              </label>
              <div className="relative">
                <KeyRound size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-200 pl-10 pr-3 py-2.5 text-sm outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                  required
                />
              </div>
            </div>
          )}

          {/* Role Selection (Register only) */}
          {mode === 'register' && (
            <div className="space-y-2 pt-1">
              <label className="block text-xs font-semibold text-slate-700">Account Type</label>
              <div className="grid grid-cols-1 gap-2">
                {/* Engineer Option */}
                <label
                  className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition ${
                    selectedRole === 'CONTRIBUTOR'
                      ? 'border-blue-600 bg-blue-50/50 ring-1 ring-blue-600'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value="CONTRIBUTOR"
                    checked={selectedRole === 'CONTRIBUTOR'}
                    onChange={() => setSelectedRole('CONTRIBUTOR')}
                    className="mt-0.5 text-blue-600"
                  />
                  <div className="text-xs">
                    <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                      <Wrench size={14} className="text-blue-600" />
                      <span>Biomedical Engineer</span>
                    </div>
                    <p className="text-slate-500 mt-0.5">
                      Can publish repair cases and technical specs. Requires Admin approval.
                    </p>
                  </div>
                </label>

                {/* Viewer Option */}
                <label
                  className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition ${
                    selectedRole === 'VIEWER'
                      ? 'border-blue-600 bg-blue-50/50 ring-1 ring-blue-600'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value="VIEWER"
                    checked={selectedRole === 'VIEWER'}
                    onChange={() => setSelectedRole('VIEWER')}
                    className="mt-0.5 text-blue-600"
                  />
                  <div className="text-xs">
                    <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                      <Eye size={14} className="text-slate-600" />
                      <span>Viewer (Read-Only)</span>
                    </div>
                    <p className="text-slate-500 mt-0.5">
                      Instant access to read equipment dossier & service manuals.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white shadow-md hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
          >
            <span>
              {busy
                ? 'Processing…'
                : mode === 'login'
                ? 'Sign in'
                : mode === 'register'
                ? 'Create Account'
                : 'Send Reset Email'}
            </span>
            {!busy && <ArrowRight size={16} />}
          </button>
        </form>

        {/* Mode Toggles */}
        <div className="border-t pt-4 text-center space-y-2 text-xs">
          {mode === 'login' && (
            <div className="flex items-center justify-between text-slate-600">
              <button
                type="button"
                onClick={() => resetFormState('reset')}
                className="hover:text-blue-600 hover:underline"
              >
                Forgot password?
              </button>
              <button
                type="button"
                onClick={() => resetFormState('register')}
                className="font-semibold text-blue-600 hover:underline"
              >
                Create an account
              </button>
            </div>
          )}

          {mode === 'register' && (
            <div className="text-slate-600">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => resetFormState('login')}
                className="font-semibold text-blue-600 hover:underline"
              >
                Sign in here
              </button>
            </div>
          )}

          {mode === 'reset' && (
            <div>
              <button
                type="button"
                onClick={() => resetFormState('login')}
                className="font-semibold text-blue-600 hover:underline"
              >
                Back to sign in
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Footer info */}
      <div className="mt-8 flex items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <ShieldCheck size={14} /> Private & Encrypted
        </span>
        <span>•</span>
        <span className="flex items-center gap-1">
          <Clock size={14} /> Admin Approval Protection
        </span>
      </div>
    </div>
  );
}