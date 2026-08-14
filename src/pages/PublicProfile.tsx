import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Wrench,
  Settings,
  PlayCircle,
  Image as ImageIcon,
  FileText,
  Layers,
} from 'lucide-react';

import { supabase } from '../lib/supabase';
import { formatDate } from '../lib/ui';
import type { Profile } from '../types';

interface Stats {
  equipment: number;
  repairCases: number;
  specifications: number;
  spareParts: number;
  manuals: number;
  photos: number;
  videos: number;
}

export default function PublicProfile() {
  const { userId } = useParams();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!userId) return;

    const load = async () => {
      setLoading(true);
      setError('');

      try {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (profileError) throw profileError;

        setProfile(profileData as Profile);

        const [
          equipmentResult,
          repairCasesResult,
          specificationsResult,
          sparePartsResult,
          manualsResult,
          photosResult,
          videosResult,
        ] = await Promise.all([
          supabase
            .from('equipment')
            .select('id', { count: 'exact', head: true })
            .eq('created_by', userId)
            .eq('approval_status', 'APPROVED'),

          supabase
            .from('repair_cases')
            .select('id', { count: 'exact', head: true })
            .eq('created_by', userId)
            .eq('approval_status', 'APPROVED'),

          supabase
            .from('equipment_identifiers')
            .select('id', { count: 'exact', head: true })
            .eq('created_by', userId),

          supabase
            .from('spare_parts')
            .select('id', { count: 'exact', head: true })
            .eq('created_by', userId)
            .eq('approval_status', 'APPROVED'),

          supabase
            .from('manuals')
            .select('id', { count: 'exact', head: true })
            .eq('created_by', userId)
            .eq('approval_status', 'APPROVED'),

          supabase
            .from('media')
            .select('id', { count: 'exact', head: true })
            .eq('created_by', userId)
            .eq('media_type', 'PHOTO')
            .eq('approval_status', 'APPROVED'),

          supabase
            .from('media')
            .select('id', { count: 'exact', head: true })
            .eq('created_by', userId)
            .eq('media_type', 'VIDEO')
            .eq('approval_status', 'APPROVED'),
        ]);

        setStats({
          equipment: equipmentResult.count || 0,
          repairCases: repairCasesResult.count || 0,
          specifications: specificationsResult.count || 0,
          spareParts: sparePartsResult.count || 0,
          manuals: manualsResult.count || 0,
          photos: photosResult.count || 0,
          videos: videosResult.count || 0,
        });
      } catch (err: any) {
        setError(err?.message || 'Unable to load this profile.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [userId]);

  if (loading) {
    return <div className="p-6 text-slate-500">Loading profile…</div>;
  }

  if (error || !profile) {
    return (
      <div className="space-y-4">
        <Link
          to="/equipment"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft size={16} />
          Back
        </Link>

        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-700">
          {error || 'Profile not found.'}
        </div>
      </div>
    );
  }

  const total =
    (stats?.equipment || 0) +
    (stats?.repairCases || 0) +
    (stats?.specifications || 0) +
    (stats?.spareParts || 0) +
    (stats?.manuals || 0) +
    (stats?.photos || 0) +
    (stats?.videos || 0);

  const cards = [
    { label: 'Equipment Added', value: stats?.equipment || 0, icon: Layers },
    { label: 'Repair Cases', value: stats?.repairCases || 0, icon: Wrench },
    { label: 'Specifications', value: stats?.specifications || 0, icon: Settings },
    { label: 'Spare Parts', value: stats?.spareParts || 0, icon: Wrench },
    { label: 'Manuals & Documents', value: stats?.manuals || 0, icon: FileText },
    { label: 'Photos', value: stats?.photos || 0, icon: ImageIcon },
    { label: 'Videos', value: stats?.videos || 0, icon: PlayCircle },
  ];

  return (
    <div className="space-y-6">
      <Link
        to="/equipment"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft size={16} />
        Back
      </Link>

      <div className="rounded-xl border bg-white p-6 flex items-center gap-4">
        <div className="h-16 w-16 shrink-0 rounded-full bg-slate-200 flex items-center justify-center text-xl font-semibold uppercase">
          {profile.full_name?.slice(0, 1) || 'U'}
        </div>

        <div>
          <h1 className="text-xl font-bold">{profile.full_name}</h1>

          <div className="text-sm text-slate-500 mt-1">
            {profile.role}
            {' • '}
            Joined {formatDate(profile.created_at)}
          </div>

          {!profile.is_active && (
            <div className="text-sm text-red-600 mt-1">
              This account is currently inactive.
            </div>
          )}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3">
          Contributions ({total})
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {cards.map((card) => {
            const Icon = card.icon;

            return (
              <div
                key={card.label}
                className="rounded-lg border bg-white p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold">{card.value}</div>
                  <Icon size={20} className="text-slate-400" />
                </div>

                <div className="text-xs text-slate-500 mt-1">
                  {card.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}