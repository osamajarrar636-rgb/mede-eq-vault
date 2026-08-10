import { useEffect, useState } from 'react';
import {
  Wrench,
  FileText,
  Package,
  Image,
  Video,
  LifeBuoy,
  Plus,
  X,
} from 'lucide-react';

import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { formatDate } from '../lib/ui';
import { FileUpload } from '../components/FileUpload';
import { submitContribution } from '../services/db';

const types = [
  ['NEW_EQUIPMENT', 'New Equipment', Wrench],
  ['REPAIR_CASE', 'Repair Case', Wrench],
  ['MANUAL', 'Manual / Document', FileText],
  ['SPARE_PART', 'Spare Part', Package],
  ['PHOTO', 'Photo', Image],
  ['VIDEO', 'Video', Video],
  ['TROUBLESHOOTING', 'Troubleshooting Guide', LifeBuoy],
] as const;

type ContributionType = (typeof types)[number][0];

export default function Contributions() {
  const { profile } = useAuth();

  const [items, setItems] = useState<any[]>([]);
  const [show, setShow] = useState(false);

  const load = async () => {
    if (!profile?.id) return;

    const { data, error } = await supabase
      .from('submissions')
      .select('*')
      .eq('submitted_by', profile.id)
      .order('created_at', {
        ascending: false,
      });

    if (!error) {
      setItems(data || []);
    }
  };

  useEffect(() => {
    if (profile) {
      load();
    }
  }, [profile]);

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="text-sm text-slate-500">
            CONTRIBUTOR WORKSPACE
          </div>

          <h1 className="text-2xl font-bold">
            My Contributions
          </h1>

          <p className="text-sm text-slate-500 mt-1">
            Track technical material you've submitted for review.
          </p>
        </div>

        {profile?.role !== 'VIEWER' && (
          <button
            type="button"
            className="primary inline-flex items-center gap-2"
            onClick={() => setShow(true)}
          >
            <Plus size={18} />
            Add Contribution
          </button>
        )}
      </div>

      {/* HISTORY */}
      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">
            Submission history
          </h2>

          <p className="text-sm text-slate-500">
            Approved items become visible to authorized users.
          </p>
        </div>

        {items.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-slate-500">
                  <th className="text-left p-3">Title</th>
                  <th className="text-left p-3">Type</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">Submitted</th>
                  <th className="text-left p-3">Review note</th>
                </tr>
              </thead>

              <tbody>
                {items.map((x) => (
                  <tr
                    key={x.id}
                    className="border-b last:border-0"
                  >
                    <td className="p-3 font-medium">
                      {x.title}
                    </td>

                    <td className="p-3">
                      {x.submission_type
                        ?.replaceAll('_', ' ')}
                    </td>

                    <td className="p-3">
                      <span className="font-semibold">
                        {x.status}
                      </span>
                    </td>

                    <td className="p-3 text-slate-500">
                      {formatDate(x.created_at)}
                    </td>

                    <td className="p-3 text-slate-500">
                      {x.review_note || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-lg bg-slate-50 p-6 text-center text-slate-500">
            No submissions yet.
          </div>
        )}
      </div>

      {/* MODAL */}
      {show && (
        <ContributionModal
          onClose={() => setShow(false)}
          onDone={() => {
            setShow(false);
            load();
          }}
        />
      )}
    </div>
  );
}


/* =========================================================
   CONTRIBUTION MODAL
========================================================= */

function ContributionModal({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: () => void;
}) {
  const { user } = useAuth();

  const [type, setType] =
    useState<ContributionType>('REPAIR_CASE');

  const [equipment, setEquipment] = useState<any[]>([]);
  const [eq, setEq] = useState('');

  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');

  const [path, setPath] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  /* -------------------------------------------------------
     LOAD APPROVED EQUIPMENT
  ------------------------------------------------------- */

  useEffect(() => {
    const loadEquipment = async () => {
      const { data } = await supabase
        .from('equipment')
        .select(
          'id,manufacturer,device_name,model'
        )
        .eq('approval_status', 'APPROVED')
        .order('manufacturer');

      setEquipment(data || []);
    };

    loadEquipment();
  }, []);

  /* -------------------------------------------------------
     FILE REQUIREMENTS
  ------------------------------------------------------- */

  const needsFile = [
    'MANUAL',
    'PHOTO',
    'VIDEO',
    'REPAIR_CASE',
  ].includes(type);

  const getBucket = () => {
    if (type === 'MANUAL') {
      return 'manuals';
    }

    if (type === 'PHOTO') {
      return 'photos';
    }

    if (type === 'VIDEO') {
      return 'videos';
    }

    return 'photos';
  };

  const getAccept = () => {
    if (type === 'MANUAL') {
      return '.pdf,application/pdf';
    }

    if (type === 'PHOTO') {
      return 'image/*';
    }

    if (type === 'VIDEO') {
      return 'video/*';
    }

    return 'image/*,.pdf,application/pdf';
  };

  /* -------------------------------------------------------
     SUBMIT
  ------------------------------------------------------- */

  const submit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (!user?.id) {
      setErr('You must be logged in.');
      return;
    }

    setBusy(true);
    setErr('');

    try {
      let entityId: string | null = null;

      /* ---------------------------------------------------
         REPAIR CASE
      --------------------------------------------------- */

      if (type === 'REPAIR_CASE') {
        const { data, error } = await supabase
          .from('repair_cases')
          .insert({
            equipment_id: eq || null,
            problem_title:
              title.trim() || null,
            reported_fault:
              desc.trim() || null,
            created_by: user.id,
            engineer: user.id,
            approval_status: 'PENDING',
          })
          .select()
          .single();

        if (error) {
          throw error;
        }

        entityId = data.id;

        if (file && path) {
          const { error: mediaError } =
            await supabase
              .from('media')
              .insert({
                equipment_id: eq || null,
                repair_case_id: entityId,
                media_type:
                  file.type.startsWith('video/')
                    ? 'VIDEO'
                    : 'PHOTO',
                category:
                  'Repair Case Attachment',
                title: file.name,
                description:
                  'Attachment submitted with repair case.',
                storage_path: path,
                file_name: file.name,
                mime_type: file.type,
                file_size: file.size,
                created_by: user.id,
                approval_status: 'PENDING',
              });

          if (mediaError) {
            throw mediaError;
          }
        }
      }

      /* ---------------------------------------------------
         MANUAL
      --------------------------------------------------- */

      else if (type === 'MANUAL') {
        if (!file || !path) {
          throw new Error(
            'Please upload a PDF document.'
          );
        }

        const { data, error } =
          await supabase
            .from('manuals')
            .insert({
              equipment_id: eq || null,
              title:
                title.trim() ||
                file.name,
              document_type: 'Other',
              description:
                desc.trim() || null,
              storage_path: path,
              file_name: file.name,
              mime_type: file.type,
              file_size: file.size,
              created_by: user.id,
              approval_status: 'PENDING',
            })
            .select()
            .single();

        if (error) {
          throw error;
        }

        entityId = data.id;
      }

      /* ---------------------------------------------------
         SPARE PART
      --------------------------------------------------- */

      else if (type === 'SPARE_PART') {
        const { data, error } =
          await supabase
            .from('spare_parts')
            .insert({
              equipment_id: eq || null,
              part_name:
                title.trim() || null,
              description:
                desc.trim() || null,
              created_by: user.id,
              approval_status: 'PENDING',
            })
            .select()
            .single();

        if (error) {
          throw error;
        }

        entityId = data.id;
      }

      /* ---------------------------------------------------
         TROUBLESHOOTING
      --------------------------------------------------- */

      else if (
        type === 'TROUBLESHOOTING'
      ) {
        const { data, error } =
          await supabase
            .from('troubleshooting_guides')
            .insert({
              equipment_id: eq || null,
              problem:
                title.trim() || null,
              possible_causes:
                desc.trim() || null,
              created_by: user.id,
              approval_status: 'PENDING',
            })
            .select()
            .single();

        if (error) {
          throw error;
        }

        entityId = data.id;
      }

      /* ---------------------------------------------------
         PHOTO / VIDEO
      --------------------------------------------------- */

      else if (
        type === 'PHOTO' ||
        type === 'VIDEO'
      ) {
        if (!file || !path) {
          throw new Error(
            'Please upload a file.'
          );
        }

        const { data, error } =
          await supabase
            .from('media')
            .insert({
              equipment_id: eq || null,
              media_type: type,
              category: 'Other',
              title:
                title.trim() ||
                file.name,
              description:
                desc.trim() || null,
              storage_path: path,
              file_name: file.name,
              mime_type: file.type,
              file_size: file.size,
              created_by: user.id,
              approval_status: 'PENDING',
            })
            .select()
            .single();

        if (error) {
          throw error;
        }

        entityId = data.id;
      }

      else {
        throw new Error(
          'This contribution type is not yet configured.'
        );
      }

      /* ---------------------------------------------------
         SUBMISSION
      --------------------------------------------------- */

      await submitContribution(
        type,
        entityId,
        eq || null,
        title.trim() ||
          'New technical contribution',
        desc.trim(),
        {
          storage_path: path || null,
          file_name:
            file?.name || null,
        }
      );

      onDone();

    } catch (e: any) {
      console.error(e);

      setErr(
        e?.message ||
          'Unable to submit contribution.'
      );
    } finally {
      setBusy(false);
    }
  };

  /* -------------------------------------------------------
     MODAL UI
  ------------------------------------------------------- */

  return (
    <div className="fixed inset-0 z-[100] bg-black/40 p-4 flex items-center justify-center">

      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">

        {/* HEADER */}

        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-4">
          <div>
            <h2 className="text-xl font-bold">
              Add Contribution
            </h2>

            <p className="text-sm text-slate-500 mt-1">
              Submit technical material for approval.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            <X size={20} />
          </button>
        </div>

        {/* BODY */}

        <form
          onSubmit={submit}
          className="p-6 space-y-5"
        >

          {err && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {err}
            </div>
          )}

          {/* TYPE */}

          <div>
            <label className="block text-sm font-medium mb-1">
              Contribution type
            </label>

            <select
              className="w-full rounded-lg border px-3 py-2"
              value={type}
              onChange={(e) => {
                setType(
                  e.target.value as ContributionType
                );

                setPath('');
                setFile(null);
              }}
            >
              {types.map(
                ([value, label]) => (
                  <option
                    key={value}
                    value={value}
                  >
                    {label}
                  </option>
                )
              )}
            </select>
          </div>

          {/* EQUIPMENT */}

          <div>
            <label className="block text-sm font-medium mb-1">
              Equipment
            </label>

            <select
              className="w-full rounded-lg border px-3 py-2"
              value={eq}
              onChange={(e) =>
                setEq(e.target.value)
              }
            >
              <option value="">
                Not specified
              </option>

              {equipment.map((x) => (
                <option
                  key={x.id}
                  value={x.id}
                >
                  {x.manufacturer ||
                    'Unknown manufacturer'}{' '}
                  —{' '}
                  {x.device_name ||
                    'Unknown device'}{' '}
                  —{' '}
                  {x.model ||
                    'No model'}
                </option>
              ))}
            </select>
          </div>

          {/* TITLE */}

          <div>
            <label className="block text-sm font-medium mb-1">
              Title
            </label>

            <input
              className="w-full rounded-lg border px-3 py-2"
              value={title}
              onChange={(e) =>
                setTitle(e.target.value)
              }
              placeholder="e.g. Door bellow replacement"
            />
          </div>

          {/* DESCRIPTION */}

          <div>
            <label className="block text-sm font-medium mb-1">
              Description / technical notes
            </label>

            <textarea
              className="w-full rounded-lg border px-3 py-2"
              rows={5}
              value={desc}
              onChange={(e) =>
                setDesc(e.target.value)
              }
              placeholder="Describe the fault, finding, procedure, or document context…"
            />
          </div>

          {/* FILE */}

          {needsFile && (
            <div>
              <label className="block text-sm font-medium mb-2">
                Attachment
              </label>

              <FileUpload
                bucket={getBucket()}
                pathPrefix={
                  eq || 'unassigned'
                }
                accept={getAccept()}
                onUploaded={(p, f) => {
                  setPath(p);
                  setFile(f);
                }}
              />

              {file && (
                <div className="mt-3 rounded-lg border bg-slate-50 p-3">
                  <div className="font-medium text-sm">
                    Selected file
                  </div>

                  <div className="text-sm text-slate-600 mt-1 break-all">
                    {file.name}
                  </div>

                  <div className="text-xs text-slate-500 mt-1">
                    {(
                      file.size /
                      1024 /
                      1024
                    ).toFixed(2)}{' '}
                    MB
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ACTIONS */}

          <div className="flex justify-end gap-3 border-t pt-5">

            <button
              type="button"
              className="secondary"
              onClick={onClose}
              disabled={busy}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="primary"
              disabled={
                busy ||
                (needsFile && !path)
              }
            >
              {busy
                ? 'Submitting…'
                : 'Submit for approval'}
            </button>

          </div>

        </form>
      </div>
    </div>
  );
}