import {
  useEffect,
  useState,
} from 'react';

import {
  Check,
  RefreshCw,
  X,
} from 'lucide-react';

import { supabase } from '../lib/supabase';

import {
  reviewSubmission,
} from '../services/db';

import {
  formatDate,
} from '../lib/ui';

import {
  useAuth,
} from '../hooks/useAuth';

export default function Approvals() {
  const {
    profile,
    loading: authLoading,
  } = useAuth();

  const [items, setItems] =
    useState<any[]>([]);

  const [status, setStatus] =
    useState('PENDING');

  const [
    selected,
    setSelected,
  ] = useState<any | null>(
    null
  );

  const [note, setNote] =
    useState('');

  const [busy, setBusy] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState('');

  /* =======================================================
     LOAD
  ======================================================= */

  const load = async () => {
    setLoading(true);
    setError('');

    try {
      let query =
        supabase
          .from(
            'submissions'
          )
          .select('*')
          .order(
            'created_at',
            {
              ascending:
                false,
            }
          );

      if (
        status !== 'ALL'
      ) {
        query =
          query.eq(
            'status',
            status
          );
      }

      const {
        data,
        error,
      } = await query;

      if (error) {
        throw error;
      }

      setItems(data || []);
    } catch (
      error: any
    ) {
      setError(
        error?.message ||
          'Unable to load submissions.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (
      profile?.role ===
      'ADMIN'
    ) {
      load();
    }
  }, [
    status,
    profile?.role,
  ]);

  /* =======================================================
     REVIEW ACTION
  ======================================================= */

  const act = async (
    decision:
      | 'APPROVED'
      | 'REJECTED'
      | 'CHANGES_REQUESTED'
  ) => {
    if (!selected) {
      return;
    }

    setBusy(true);
    setError('');

    try {
      await reviewSubmission(
        selected.id,
        decision,
        note
      );

      setSelected(null);
      setNote('');

      await load();
    } catch (
      error: any
    ) {
      setError(
        error?.message ||
          'Review failed.'
      );
    } finally {
      setBusy(false);
    }
  };

  /* =======================================================
     AUTH LOADING
  ======================================================= */

  if (authLoading) {
    return (
      <div className="p-6 text-slate-500">
        Loading...
      </div>
    );
  }

  /* =======================================================
     ADMIN ONLY
  ======================================================= */

  if (
    profile?.role !==
    'ADMIN'
  ) {
    return (
      <div className="space-y-4">
        <div>
          <div className="text-sm text-slate-500">
            ADMINISTRATION
          </div>

          <h1 className="text-2xl font-bold">
            Approval Center
          </h1>
        </div>

        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-700">
          You do not have permission
          to access the Approval Center.
        </div>
      </div>
    );
  }

  /* =======================================================
     UI
  ======================================================= */

  return (
    <>
      <div className="space-y-6">
        {/* HEADER */}

        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm text-slate-500">
              ADMINISTRATION
            </div>

            <h1 className="text-2xl font-bold">
              Approval Center
            </h1>

            <p className="text-slate-500 mt-1">
              Review contributions
              before they enter the
              approved knowledge base.
            </p>
          </div>

          <button
            type="button"
            className="secondary inline-flex items-center gap-2"
            onClick={
              load
            }
            disabled={
              loading
            }
          >
            <RefreshCw
              size={16}
              className={
                loading
                  ? 'animate-spin'
                  : ''
              }
            />

            Refresh
          </button>
        </div>

        {/* FILTER */}

        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm font-medium">
            Status
          </label>

          <select
            value={status}
            onChange={(
              event
            ) =>
              setStatus(
                event.target
                  .value
              )
            }
            className="rounded-lg border px-3 py-2 text-sm bg-white"
          >
            <option value="PENDING">
              Pending
            </option>

            <option value="APPROVED">
              Approved
            </option>

            <option value="REJECTED">
              Rejected
            </option>

            <option value="CHANGES_REQUESTED">
              Changes Requested
            </option>

            <option value="ALL">
              All
            </option>
          </select>
        </div>

        {/* ERROR */}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* TABLE */}

        <div className="rounded-xl border bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">
                    Contribution
                  </th>

                  <th className="text-left px-4 py-3 font-medium">
                    Type
                  </th>

                  <th className="text-left px-4 py-3 font-medium">
                    Submitted
                  </th>

                  <th className="text-left px-4 py-3 font-medium">
                    Status
                  </th>

                  <th className="text-right px-4 py-3 font-medium">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {items.map(
                  (item) => (
                    <tr
                      key={
                        item.id
                      }
                      className="border-b last:border-b-0 hover:bg-slate-50"
                    >
                      <td className="px-4 py-4">
                        <div className="font-semibold">
                          {
                            item.title
                          }
                        </div>

                        <div className="text-xs text-slate-500 mt-1 max-w-md truncate">
                          {item.description ||
                            'No description'}
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium">
                          {formatSubmissionType(
                            item.submission_type
                          )}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-slate-600">
                        {formatDate(
                          item.created_at
                        )}
                      </td>

                      <td className="px-4 py-4">
                        <StatusBadge
                          status={
                            item.status
                          }
                        />
                      </td>

                      <td className="px-4 py-4 text-right">
                        <button
                          type="button"
                          className="secondary"
                          onClick={() =>
                            setSelected(
                              item
                            )
                          }
                        >
                          Review
                        </button>
                      </td>
                    </tr>
                  )
                )}

                {!items.length &&
                  !loading && (
                    <tr>
                      <td
                        colSpan={
                          5
                        }
                        className="px-4 py-12 text-center text-slate-500"
                      >
                        No submissions
                        found.
                      </td>
                    </tr>
                  )}

                {loading && (
                  <tr>
                    <td
                      colSpan={
                        5
                      }
                      className="px-4 py-12 text-center text-slate-500"
                    >
                      Loading
                      submissions…
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* REVIEW MODAL */}

      {selected && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b p-5">
              <div>
                <div className="text-xs text-slate-500 uppercase tracking-wide">
                  Review Submission
                </div>

                <h2 className="text-lg font-semibold mt-1">
                  {
                    selected.title
                  }
                </h2>
              </div>

              <button
                type="button"
                className="icon-btn"
                onClick={() =>
                  setSelected(
                    null
                  )
                }
                disabled={
                  busy
                }
              >
                <X size={19} />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* TYPE */}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-slate-400 uppercase">
                    Type
                  </div>

                  <div className="font-medium mt-1">
                    {formatSubmissionType(
                      selected.submission_type
                    )}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-slate-400 uppercase">
                    Submitted
                  </div>

                  <div className="font-medium mt-1">
                    {formatDate(
                      selected.created_at
                    )}
                  </div>
                </div>
              </div>

              {/* DESCRIPTION */}

              <div>
                <div className="text-xs text-slate-400 uppercase">
                  Description
                </div>

                <div className="mt-2 rounded-lg bg-slate-50 p-4 whitespace-pre-wrap">
                  {selected.description ||
                    'No description provided.'}
                </div>
              </div>

              {/* NOTE */}

              <div>
                <label className="block text-sm font-medium mb-2">
                  Review note
                </label>

                <textarea
                  rows={4}
                  value={note}
                  onChange={(
                    event
                  ) =>
                    setNote(
                      event.target
                        .value
                    )
                  }
                  placeholder="Optional reason or requested changes…"
                  className="w-full rounded-lg border px-3 py-2 outline-none focus:ring-2"
                  disabled={
                    busy
                  }
                />
              </div>

              {/* ACTIONS */}

              <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
                <button
                  type="button"
                  className="danger inline-flex items-center gap-2"
                  disabled={
                    busy
                  }
                  onClick={() =>
                    act(
                      'REJECTED'
                    )
                  }
                >
                  <X
                    size={16}
                  />
                  Reject
                </button>

                <button
                  type="button"
                  className="secondary"
                  disabled={
                    busy
                  }
                  onClick={() =>
                    act(
                      'CHANGES_REQUESTED'
                    )
                  }
                >
                  Request changes
                </button>

                <button
                  type="button"
                  className="primary inline-flex items-center gap-2"
                  disabled={
                    busy
                  }
                  onClick={() =>
                    act(
                      'APPROVED'
                    )
                  }
                >
                  <Check
                    size={16}
                  />
                  Approve
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* =========================================================
   STATUS BADGE
========================================================= */

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const classes: Record<
    string,
    string
  > = {
    PENDING:
      'bg-amber-100 text-amber-700',
    APPROVED:
      'bg-green-100 text-green-700',
    REJECTED:
      'bg-red-100 text-red-700',
    CHANGES_REQUESTED:
      'bg-blue-100 text-blue-700',
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
        classes[
          status
        ] ||
        'bg-slate-100 text-slate-600'
      }`}
    >
      {formatStatus(
        status
      )}
    </span>
  );
}

/* =========================================================
   FORMAT SUBMISSION TYPE
========================================================= */

function formatSubmissionType(
  value: string
) {
  const labels: Record<
    string,
    string
  > = {
    NEW_EQUIPMENT:
      'New Equipment',

    REPAIR_CASE:
      'Repair Case',

    MANUAL:
      'Manual',

    SPARE_PART:
      'Spare Part',

    PHOTO:
      'Photo',

    VIDEO:
      'Video',

    TROUBLESHOOTING:
      'Troubleshooting',

    TECHNICAL_DOCUMENT:
      'Technical Document',

    SUGGESTED_EDIT:
      'Suggested Edit',
  };

  return (
    labels[value] ||
    value
      .replaceAll(
        '_',
        ' '
      )
      .toLowerCase()
      .replace(
        /\b\w/g,
        (char) =>
          char.toUpperCase()
      )
  );
}

/* =========================================================
   FORMAT STATUS
========================================================= */

function formatStatus(
  value: string
) {
  return value
    .replaceAll(
      '_',
      ' '
    )
    .toLowerCase()
    .replace(
      /\b\w/g,
      (char) =>
        char.toUpperCase()
    );
}