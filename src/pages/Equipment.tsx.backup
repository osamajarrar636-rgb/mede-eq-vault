import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  Search,
  Wrench,
  X,
  BookOpen,
} from 'lucide-react';

import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

const cats = [
  'All',
  'Autoclave / Steam Sterilizer',
  'Patient Monitor',
  'Ventilator',
  'Anesthesia Machine',
  'Dialysis Machine',
  'Infusion Pump',
  'Defibrillator',
  'ECG',
  'Ultrasound',
  'X-Ray',
  'CR / DR System',
  'Surgical Light',
  'Dental Chair',
  'Laboratory Equipment',
  'Other',
];

export default function Equipment() {
  const { profile } = useAuth();

  const [items, setItems] = useState<any[]>([]);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('All');
  const [loading, setLoading] = useState(true);
  const [show, setShow] = useState(false);

  const load = async () => {
    setLoading(true);

    let query = supabase
      .from('equipment')
      .select('*')
      .order('created_at', {
        ascending: false,
      });

    if (q.trim()) {
      query = query.or(
        `manufacturer.ilike.%${q}%,device_name.ilike.%${q}%,model.ilike.%${q}%,serial_number.ilike.%${q}%`
      );
    }

    if (cat !== 'All') {
      query = query.eq('category', cat);
    }

    const { data, error } = await query;

    if (error) {
      console.error(error);
      setItems([]);
    } else {
      setItems(data || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      load();
    }, 250);

    return () => clearTimeout(timer);
  }, [q, cat]);

  return (
    <div className="space-y-5">
      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Library
          </div>

          <h1 className="text-2xl font-bold text-slate-900">
            Equipment Library
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Approved technical records and your own pending
            submissions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Add Contribution */}
          {profile?.role !== 'VIEWER' && (
            <Link
              to="/contributions"
              className="secondary inline-flex items-center gap-2"
            >
              <BookOpen size={17} />
              Add Contribution
            </Link>
          )}

          {/* Add Equipment */}
          {profile?.role !== 'VIEWER' && (
            <button
              type="button"
              className="primary inline-flex items-center gap-2"
              onClick={() => setShow(true)}
            >
              <Plus size={18} />
              Add Equipment
            </button>
          )}
        </div>
      </div>

      {/* =====================================================
          FILTERS
      ===================================================== */}

      <div className="rounded-xl border bg-white p-3 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <Search
              size={17}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-slate-400 focus:bg-white"
              placeholder="Search manufacturer, model, serial…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <select
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-slate-400 focus:bg-white md:w-64"
            value={cat}
            onChange={(e) => setCat(e.target.value)}
          >
            {cats.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* =====================================================
          EQUIPMENT COUNT
      ===================================================== */}

      {!loading && (
        <div className="text-xs text-slate-400">
          {items.length} equipment record
          {items.length === 1 ? '' : 's'}
        </div>
      )}

      {/* =====================================================
          EQUIPMENT LIST
      ===================================================== */}

      {loading ? (
        <div className="rounded-xl border bg-white p-8 text-center text-sm text-slate-500">
          Loading equipment…
        </div>
      ) : items.length ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((e) => (
            <Link
              className="group block rounded-xl border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              to={`/equipment/${e.id}`}
              key={e.id}
            >
              {/* Category */}
              <div className="truncate text-[11px] font-medium uppercase tracking-wide text-slate-400">
                {e.category || 'Other'}
              </div>

              {/* Main */}
              <div className="mt-3 flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                  <Wrench size={19} />
                </div>

                <div className="min-w-0">
                  <div className="truncate font-semibold text-slate-900">
                    {e.manufacturer ||
                      'Manufacturer not specified'}
                  </div>

                  <div className="mt-0.5 truncate text-sm text-slate-700">
                    {e.device_name ||
                      'Device name not specified'}
                  </div>

                  <div className="mt-1 truncate text-xs text-slate-500">
                    {e.model || 'Model not specified'}
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
                <div className="truncate text-xs text-slate-500">
                  SN:{' '}
                  {e.serial_number || 'Not specified'}
                </div>

                {e.year && (
                  <div className="shrink-0 text-xs text-slate-400">
                    {e.year}
                  </div>
                )}
              </div>

              {/* Status */}
              {e.approval_status && (
                <div className="mt-3">
                  <span
                    className={`inline-flex rounded-full px-2 py-1 text-[11px] font-medium ${
                      e.approval_status === 'APPROVED'
                        ? 'bg-green-50 text-green-700'
                        : e.approval_status === 'PENDING'
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {e.approval_status}
                  </span>
                </div>
              )}
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border bg-white p-10 text-center text-slate-500">
          <Wrench
            size={30}
            className="mx-auto mb-3 text-slate-300"
          />

          <div className="font-medium text-slate-700">
            No equipment found
          </div>

          <div className="mt-1 text-sm">
            Try changing your search or category filter.
          </div>
        </div>
      )}

      {/* =====================================================
          ADD EQUIPMENT MODAL
      ===================================================== */}

      {show && (
        <EquipmentForm
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
   EQUIPMENT FORM
========================================================= */

function EquipmentForm({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: () => void;
}) {
  const { user } = useAuth();

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const [f, setF] = useState({
    manufacturer: '',
    device_name: '',
    model: '',
    serial_number: '',
    category: 'Other',
    year: '',
    country: '',
    description: '',
    clinical_application: '',
    operating_principle: '',
  });

  const update = (
    field: keyof typeof f,
    value: string
  ) => {
    setF((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const submit = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    if (!user?.id) {
      setErr(
        'You must be logged in to add equipment.'
      );
      return;
    }

    setBusy(true);
    setErr('');

    try {
      const { data, error } = await supabase
        .from('equipment')
        .insert({
          manufacturer:
            f.manufacturer.trim() || null,

          device_name:
            f.device_name.trim() || null,

          model:
            f.model.trim() || null,

          serial_number:
            f.serial_number.trim() || null,

          category:
            f.category || 'Other',

          year: f.year
            ? Number(f.year)
            : null,

          country:
            f.country.trim() || null,

          description:
            f.description.trim() || null,

          clinical_application:
            f.clinical_application.trim() ||
            null,

          operating_principle:
            f.operating_principle.trim() ||
            null,

          created_by: user.id,

          approval_status: 'PENDING',
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      const title =
        f.manufacturer ||
        f.device_name ||
        f.model
          ? `New equipment: ${
              f.manufacturer || ''
            } ${
              f.device_name || ''
            } ${
              f.model || ''
            }`
              .replace(/\s+/g, ' ')
              .trim()
          : 'New equipment record';

      const {
        error: submissionError,
      } = await supabase
        .from('submissions')
        .insert({
          submission_type:
            'NEW_EQUIPMENT',

          entity_id: data.id,

          title,

          description:
            f.description.trim() ||
            'New equipment record submitted for approval.',

          submitted_by: user.id,

          status: 'PENDING',
        });

      if (submissionError) {
        throw submissionError;
      }

      onDone();
    } catch (error: any) {
      console.error(error);

      setErr(
        error?.message ||
          'Unable to save equipment.'
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    /*
     * IMPORTANT:
     * This wrapper is FIXED to the viewport.
     * z-[100] keeps the modal above the sidebar.
     */
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      {/* Modal */}
      <div
        className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* =================================================
            MODAL HEADER
        ================================================= */}

        <div className="flex shrink-0 items-center justify-between border-b bg-white px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Add equipment
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              You can add the remaining information later.
            </p>
          </div>

          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
          >
            <X size={19} />
          </button>
        </div>

        {/* =================================================
            FORM
        ================================================= */}

        <form
          onSubmit={submit}
          className="min-h-0 overflow-y-auto p-5 space-y-5"
        >
          {/* Error */}
          {err && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {err}
            </div>
          )}

          {/* =================================================
              BASIC INFORMATION
          ================================================= */}

          <section>
            <h3 className="mb-3 text-sm font-semibold text-slate-900">
              Basic information
            </h3>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Field
                label="Manufacturer"
                value={f.manufacturer}
                onChange={(value) =>
                  update(
                    'manufacturer',
                    value
                  )
                }
                placeholder="e.g. Tuttnauer"
              />

              <Field
                label="Device name"
                value={f.device_name}
                onChange={(value) =>
                  update(
                    'device_name',
                    value
                  )
                }
                placeholder="e.g. Steam Sterilizer"
              />

              <Field
                label="Model"
                value={f.model}
                onChange={(value) =>
                  update(
                    'model',
                    value
                  )
                }
                placeholder="e.g. Valueklave 1730"
              />

              <Field
                label="Serial number"
                value={f.serial_number}
                onChange={(value) =>
                  update(
                    'serial_number',
                    value
                  )
                }
                placeholder="Optional"
              />

              {/* Category */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-700">
                  Category
                </label>

                <select
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                  value={f.category}
                  onChange={(e) =>
                    update(
                      'category',
                      e.target.value
                    )
                  }
                >
                  {cats
                    .slice(1)
                    .map((c) => (
                      <option
                        key={c}
                        value={c}
                      >
                        {c}
                      </option>
                    ))}
                </select>
              </div>

              <Field
                label="Year"
                type="number"
                value={f.year}
                onChange={(value) =>
                  update(
                    'year',
                    value
                  )
                }
                placeholder="Optional"
              />

              <Field
                label="Country"
                value={f.country}
                onChange={(value) =>
                  update(
                    'country',
                    value
                  )
                }
                placeholder="e.g. Germany"
              />
            </div>
          </section>

          {/* =================================================
              ENGINEERING INFORMATION
          ================================================= */}

          <section>
            <h3 className="mb-3 text-sm font-semibold text-slate-900">
              Engineering information
            </h3>

            <div className="space-y-3">
              <TextArea
                label="Description"
                value={f.description}
                onChange={(value) =>
                  update(
                    'description',
                    value
                  )
                }
                placeholder="General description of the equipment…"
              />

              <TextArea
                label="Clinical application"
                value={
                  f.clinical_application
                }
                onChange={(value) =>
                  update(
                    'clinical_application',
                    value
                  )
                }
                placeholder="What is this equipment used for?"
              />

              <TextArea
                label="Operating principle"
                value={
                  f.operating_principle
                }
                onChange={(value) =>
                  update(
                    'operating_principle',
                    value
                  )
                }
                placeholder="Brief description of how the equipment works…"
              />
            </div>
          </section>

          {/* =================================================
              OPTIONAL INFORMATION
          ================================================= */}

          <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
            <strong>Optional:</strong>{' '}
            You can add technical specifications,
            manuals, spare parts, repair cases,
            photos, videos, schematics and documents
            later.
          </div>

          {/* =================================================
              ACTIONS
          ================================================= */}

          <div className="flex justify-end gap-2 border-t pt-4">
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
              disabled={busy}
            >
              {busy
                ? 'Submitting…'
                : 'Create equipment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* =========================================================
   INPUT FIELD
========================================================= */

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-slate-700">
        {label}
      </label>

      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) =>
          onChange(e.target.value)
        }
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
      />
    </div>
  );
}

/* =========================================================
   TEXT AREA
========================================================= */

function TextArea({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-slate-700">
        {label}
      </label>

      <textarea
        rows={3}
        value={value}
        placeholder={placeholder}
        onChange={(e) =>
          onChange(e.target.value)
        }
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
      />
    </div>
  );
}