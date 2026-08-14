import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  ArrowLeft,
  FileText,
  Image as ImageIcon,
  PlayCircle,
  Search,
  ShieldCheck,
  Plus,
  X,
  Wrench,
  BookOpen,
  FileCog,
  AlertTriangle,
  Settings,
  Trash2,
} from 'lucide-react';

import {
  Link,
  useParams,
} from 'react-router-dom';

import { supabase } from '../lib/supabase';

import {
  formatDate,
} from '../lib/ui';

import {
  useAuth,
} from '../hooks/useAuth';

/* =========================================================
   TYPES
========================================================= */

type ContentType =
  | 'TECHNICAL_SPECIFICATION'
  | 'USER_MANUAL'
  | 'SERVICE_MANUAL'
  | 'SPARE_PART'
  | 'REPAIR_CASE'
  | 'TROUBLESHOOTING_GUIDE'
  | 'PHOTO'
  | 'VIDEO'
  | 'DOCUMENT'
  | 'SCHEMATIC';

/* =========================================================
   HELPER COMPONENTS
========================================================= */

function AuthorBadge({ profile }: { profile?: { id: string; full_name: string } | null }) {
  if (!profile?.full_name) return null;
  return (
    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
      <span>Added by:</span>
      <Link
        to={`/profile/${profile.id}`}
        className="font-medium text-blue-600 hover:text-blue-800 hover:underline transition-colors"
      >
        Eng. {profile.full_name}
      </Link>
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string | number | null }) {
  if (!value) return null;
  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </div>
      <div className="mt-1 text-sm font-medium text-slate-800">{value}</div>
    </div>
  );
}

function LocalEmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed p-8 text-center text-slate-500 bg-slate-50/50">
      {text}
    </div>
  );
}

/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function EquipmentDetail() {
  const { id } = useParams();

  const {
    user,
    profile,
  } = useAuth();

  const [equipment, setEquipment] = useState<any>(null);
  const [identifiers, setIdentifiers] = useState<any[]>([]);
  const [repairs, setRepairs] = useState<any[]>([]);
  const [manuals, setManuals] = useState<any[]>([]);
  const [parts, setParts] = useState<any[]>([]);
  const [media, setMedia] = useState<any[]>([]);

  const [tab, setTab] = useState('Overview');
  const [error, setError] = useState('');
  const [repairSearch, setRepairSearch] = useState('');

  const [showAddContent, setShowAddContent] = useState(false);
  const [contentType, setContentType] = useState<ContentType | null>(null);

  const canAdd = profile?.role !== 'VIEWER';
  const isAdmin = profile?.role === 'ADMIN';

  /* =======================================================
     LOAD EQUIPMENT
  ======================================================= */

  const loadEquipment = async () => {
    if (!id) return;

    try {
      setError('');

      const [
        equipmentResult,
        identifiersResult,
        repairsResult,
        manualsResult,
        partsResult,
        mediaResult,
      ] = await Promise.all([
        supabase
          .from('equipment')
          .select('*')
          .eq('id', id)
          .single(),

        supabase
          .from('equipment_identifiers')
          .select('*, profiles:created_by(id, full_name)')
          .eq('equipment_id', id)
          .order('created_at', { ascending: true }),

        supabase
          .from('repair_cases')
          .select('*, profiles:created_by(id, full_name)')
          .eq('equipment_id', id)
          .eq('approval_status', 'APPROVED')
          .order('created_at', { ascending: false }),

        supabase
          .from('manuals')
          .select('*, profiles:created_by(id, full_name)')
          .eq('equipment_id', id)
          .eq('approval_status', 'APPROVED')
          .order('created_at', { ascending: false }),

        supabase
          .from('spare_parts')
          .select('*, profiles:created_by(id, full_name)')
          .eq('equipment_id', id)
          .eq('approval_status', 'APPROVED')
          .order('created_at', { ascending: false }),

        supabase
          .from('media')
          .select('*, profiles:created_by(id, full_name)')
          .eq('equipment_id', id)
          .eq('approval_status', 'APPROVED')
          .order('created_at', { ascending: false }),
      ]);

      if (equipmentResult.error) throw equipmentResult.error;
      if (identifiersResult.error) throw identifiersResult.error;
      if (repairsResult.error) throw repairsResult.error;
      if (manualsResult.error) throw manualsResult.error;
      if (partsResult.error) throw partsResult.error;
      if (mediaResult.error) throw mediaResult.error;

      setEquipment(equipmentResult.data);
      setIdentifiers(identifiersResult.data || []);
      setRepairs(repairsResult.data || []);
      setManuals(manualsResult.data || []);
      setParts(partsResult.data || []);
      setMedia(mediaResult.data || []);
    } catch (error: any) {
      setError(error?.message || 'Unable to load equipment information.');
    }
  };

  useEffect(() => {
    loadEquipment();
  }, [id]);

  /* =======================================================
     DELETE ITEM
  ======================================================= */

  const deleteItem = async (table: string, itemId: string, itemName: string) => {
    if (!isAdmin) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete "${itemName}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      setError('');
      const { error } = await supabase.from(table).delete().eq('id', itemId);
      if (error) throw error;
      await loadEquipment();
    } catch (error: any) {
      console.error(error);
      setError(error?.message || 'Unable to delete this item.');
    }
  };

  /* =======================================================
     FILTER REPAIRS
  ======================================================= */

  const filteredRepairs = useMemo(() => {
    const query = repairSearch.trim().toLowerCase();
    if (!query) return repairs;

    return repairs.filter((repair) => {
      const text = [
        repair.problem_title,
        repair.reported_fault,
        repair.symptoms,
        repair.initial_inspection,
        repair.measurements,
        repair.diagnosis,
        repair.root_cause,
        repair.corrective_action,
        repair.parts_replaced,
        repair.tools_used,
        repair.testing_procedure,
        repair.final_result,
        repair.recommendations,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return text.includes(query);
    });
  }, [repairs, repairSearch]);

  if (error) {
    return (
      <div className="space-y-4">
        <Link
          to="/equipment"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft size={16} />
          Equipment Library
        </Link>
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-700">
          {error}
        </div>
      </div>
    );
  }

  if (!equipment) {
    return <div className="p-6 text-slate-500">Loading equipment dossier…</div>;
  }

  const tabs = [
    'Overview',
    'Technical Specifications',
    'User Manual',
    'Service Manual',
    'Spare Parts',
    'Repair Cases',
    'Troubleshooting',
    'Schematics',
    'Photos',
    'Videos',
    'Documents',
    'Revision History',
  ];

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Link
              to="/equipment"
              className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 mb-4"
            >
              <ArrowLeft size={16} />
              Equipment Library
            </Link>

            <div className="text-sm text-slate-500">{equipment.category}</div>
            <h1 className="text-2xl font-bold">
              {equipment.manufacturer} {equipment.device_name}
            </h1>
            <div className="text-slate-500">
              {equipment.model} • SN {equipment.serial_number || 'Not specified'}
            </div>
          </div>

          {canAdd && (
            <button
              type="button"
              className="primary inline-flex items-center gap-2 shrink-0"
              onClick={() => setShowAddContent(true)}
            >
              <Plus size={18} />
              Add Content
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2 border-b pb-3">
          {tabs.map((item) => (
            <button
              key={item}
              type="button"
              className={tab === item ? 'active font-semibold text-blue-600 border-b-2 border-blue-600 pb-1' : 'text-slate-600 hover:text-slate-900 pb-1'}
              onClick={() => {
                setTab(item);
                if (item !== 'Repair Cases') setRepairSearch('');
              }}
            >
              {item}
            </button>
          ))}
        </div>

        {tab === 'Overview' && (
          <section className="space-y-6">
            <h2 className="text-xl font-semibold">Engineering overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Info label="Manufacturer" value={equipment.manufacturer} />
              <Info label="Device" value={equipment.device_name} />
              <Info label="Model" value={equipment.model} />
              <Info label="Serial Number" value={equipment.serial_number} />
              <Info label="Year" value={equipment.year} />
              <Info label="Country" value={equipment.country} />
              <Info label="Status" value={equipment.status} />
            </div>

            <Info label="Description" value={equipment.description} />
            <Info label="Clinical application" value={equipment.clinical_application} />
            <Info label="Operating principle" value={equipment.operating_principle} />

            <div>
              <h3 className="font-semibold mb-3">Technical identifiers</h3>
              {identifiers.length > 0 ? (
                <div className="space-y-2">
                  {identifiers.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-lg border p-3 bg-white flex flex-col justify-between"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-medium">{item.field_name}</div>
                          <div className="text-slate-600 text-sm mt-0.5">
                            {item.field_value || 'Not specified'}
                            {item.unit ? ` ${item.unit}` : ''}
                          </div>
                        </div>
                        {isAdmin && (
                          <button
                            type="button"
                            className="text-slate-400 hover:text-red-600"
                            onClick={() =>
                              deleteItem(
                                'equipment_identifiers',
                                item.id,
                                item.field_name
                              )
                            }
                          >
                            <Trash2 size={17} />
                          </button>
                        )}
                      </div>
                      <AuthorBadge profile={item.profiles} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-slate-500">No additional specifications recorded.</div>
              )}
            </div>
          </section>
        )}

        {tab === 'Technical Specifications' && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold">Technical specifications</h2>
                <p className="text-sm text-slate-500">Engineering parameters and specifications.</p>
              </div>
              {canAdd && (
                <button
                  type="button"
                  className="secondary inline-flex items-center gap-2"
                  onClick={() => setContentType('TECHNICAL_SPECIFICATION')}
                >
                  <Plus size={16} />
                  Add Specification
                </button>
              )}
            </div>

            {identifiers.length > 0 ? (
              <div className="space-y-2">
                {identifiers.map((item) => (
                  <div key={item.id} className="rounded-lg border p-4 bg-white flex flex-col justify-between">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium">{item.field_name}</div>
                        <div className="text-slate-600 text-sm mt-1">
                          {item.field_value || 'Not specified'}
                          {item.unit ? ` ${item.unit}` : ''}
                        </div>
                      </div>
                      {isAdmin && (
                        <button
                          type="button"
                          className="text-slate-400 hover:text-red-600"
                          onClick={() =>
                            deleteItem('equipment_identifiers', item.id, item.field_name)
                          }
                        >
                          <Trash2 size={17} />
                        </button>
                      )}
                    </div>
                    <AuthorBadge profile={item.profiles} />
                  </div>
                ))}
              </div>
            ) : (
              <LocalEmptyState text="No technical specifications recorded." />
            )}
          </section>
        )}

        {tab === 'Repair Cases' && (
          <section className="space-y-5">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">Repair cases</h2>
                <p className="text-sm text-slate-500">Approved service history for this device.</p>
              </div>

              <div className="flex gap-2 w-full md:w-auto">
                <div className="relative w-full md:w-96">
                  <Search
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="search"
                    value={repairSearch}
                    onChange={(e) => setRepairSearch(e.target.value)}
                    placeholder="Search problem, fault, diagnosis..."
                    className="w-full rounded-lg border pl-10 pr-3 py-2 outline-none"
                  />
                </div>

                {canAdd && (
                  <button
                    type="button"
                    className="primary inline-flex items-center gap-2 shrink-0"
                    onClick={() => setContentType('REPAIR_CASE')}
                  >
                    <Plus size={16} />
                    Add
                  </button>
                )}
              </div>
            </div>

            {repairSearch && (
              <div className="text-sm text-slate-500">
                Showing <strong>{filteredRepairs.length}</strong> of <strong>{repairs.length}</strong> repair cases
              </div>
            )}

            {filteredRepairs.length > 0 ? (
              <div className="space-y-4">
                {filteredRepairs.map((repair) => {
                  const attachments = media.filter((item) => item.repair_case_id === repair.id);

                  return (
                    <article
                      key={repair.id}
                      className="rounded-xl border bg-white p-5 shadow-sm space-y-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-sm text-slate-500">
                            {formatDate(repair.repair_date || repair.created_at)}
                          </div>
                          <Link
                            to={`/repair-cases/${repair.id}`}
                            className="text-lg font-semibold mt-1 block hover:underline text-blue-900"
                          >
                            {repair.problem_title}
                          </Link>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="inline-flex items-center gap-1 text-sm font-medium text-green-700">
                            <ShieldCheck size={16} />
                            Approved
                          </span>

                          {isAdmin && (
                            <button
                              type="button"
                              className="text-slate-400 hover:text-red-600"
                              onClick={() =>
                                deleteItem(
                                  'repair_cases',
                                  repair.id,
                                  repair.problem_title || 'this repair case'
                                )
                              }
                            >
                              <Trash2 size={17} />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <Info label="Reported fault" value={repair.reported_fault} />
                        <Info label="Root cause" value={repair.root_cause} />
                        <Info label="Corrective action" value={repair.corrective_action} />
                        <Info label="Final result" value={repair.final_result} />
                      </div>

                      {attachments.length > 0 && (
                        <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                          📎 {attachments.length} approved attachment{attachments.length !== 1 ? 's' : ''} attached to this case.
                        </div>
                      )}

                      <div className="flex items-center justify-between border-t pt-3">
                        <Link to={`/repair-cases/${repair.id}`} className="text-xs font-semibold text-blue-600 hover:underline">
                          Open full repair case →
                        </Link>
                      </div>

                      <AuthorBadge profile={repair.profiles} />
                    </article>
                  );
                })}
              </div>
            ) : (
              <LocalEmptyState
                text={
                  repairSearch
                    ? 'No repair cases match your search.'
                    : 'No approved repair cases.'
                }
              />
            )}
          </section>
        )}

        {[
          'User Manual',
          'Service Manual',
          'Schematics',
          'Documents',
          'Troubleshooting',
        ].includes(tab) && (
          <DocumentTab
            title={tab}
            docs={manuals.filter((manual) => {
              if (tab === 'User Manual') return manual.document_type === 'User Manual';
              if (tab === 'Service Manual') return manual.document_type === 'Service Manual';
              if (tab === 'Schematics') return manual.document_type?.toLowerCase().includes('schematic');
              if (tab === 'Troubleshooting') return manual.document_type === 'Troubleshooting Guide';
              return manual.document_type === 'Document' || !['User Manual', 'Service Manual', 'Troubleshooting Guide'].includes(manual.document_type);
            })}
            canAdd={canAdd}
            isAdmin={isAdmin}
            onAdd={() => {
              if (tab === 'User Manual') setContentType('USER_MANUAL');
              else if (tab === 'Service Manual') setContentType('SERVICE_MANUAL');
              else if (tab === 'Schematics') setContentType('SCHEMATIC');
              else if (tab === 'Troubleshooting') setContentType('TROUBLESHOOTING_GUIDE');
              else setContentType('DOCUMENT');
            }}
            onDelete={deleteItem}
          />
        )}

        {tab === 'Spare Parts' && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold">Spare parts</h2>
                <p className="text-sm text-slate-500">Approved replacement parts.</p>
              </div>

              {canAdd && (
                <button
                  type="button"
                  className="primary inline-flex items-center gap-2"
                  onClick={() => setContentType('SPARE_PART')}
                >
                  <Plus size={16} />
                  Add Spare Part
                </button>
              )}
            </div>

            {parts.length > 0 ? (
              <div className="space-y-3">
                {parts.map((part) => (
                  <div key={part.id} className="rounded-lg border p-4 bg-white flex flex-col justify-between">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="font-semibold">{part.part_name}</div>
                        <div className="text-sm text-slate-500">
                          {part.part_number || 'Part number not specified'} • {part.compatibility || 'Compatibility not specified'}
                        </div>
                        {part.description && (
                          <div className="text-sm text-slate-600 mt-2">{part.description}</div>
                        )}
                      </div>

                      {isAdmin && (
                        <button
                          type="button"
                          className="shrink-0 text-slate-400 hover:text-red-600"
                          onClick={() => deleteItem('spare_parts', part.id, part.part_name || 'this spare part')}
                        >
                          <Trash2 size={17} />
                        </button>
                      )}
                    </div>
                    <AuthorBadge profile={part.profiles} />
                  </div>
                ))}
              </div>
            ) : (
              <LocalEmptyState text="No approved spare parts." />
            )}
          </section>
        )}

        {tab === 'Photos' && (
          <MediaTab
            title="Photos"
            items={media.filter((item) => item.media_type === 'PHOTO')}
            canAdd={canAdd}
            isAdmin={isAdmin}
            onAdd={() => setContentType('PHOTO')}
            onDelete={deleteItem}
          />
        )}

        {tab === 'Videos' && (
          <MediaTab
            title="Videos"
            items={media.filter((item) => item.media_type === 'VIDEO')}
            canAdd={canAdd}
            isAdmin={isAdmin}
            onAdd={() => setContentType('VIDEO')}
            onDelete={deleteItem}
          />
        )}

        {tab === 'Revision History' && (
          <section>
            <h2 className="text-xl font-semibold mb-3">Revision History</h2>
            <div className="text-slate-500">No revision history is available for this record.</div>
          </section>
        )}
      </div>

      {showAddContent && (
        <AddContentSelector
          onClose={() => setShowAddContent(false)}
          onSelect={(type) => {
            setShowAddContent(false);
            setContentType(type);
          }}
        />
      )}

      {contentType && id && (
        <AddContentForm
          equipmentId={id}
          type={contentType}
          userId={user?.id}
          onClose={() => setContentType(null)}
          onDone={async () => {
            setContentType(null);
            await loadEquipment();
          }}
        />
      )}
    </>
  );
}

/* =========================================================
   DOCUMENT TAB COMPONENT
========================================================= */

function DocumentTab({
  title,
  docs,
  canAdd,
  isAdmin,
  onAdd,
  onDelete,
}: {
  title: string;
  docs: any[];
  canAdd: boolean;
  isAdmin: boolean;
  onAdd: () => void;
  onDelete: (table: string, id: string, name: string) => void;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">{title}</h2>
          <p className="text-sm text-slate-500">Approved documentation and files.</p>
        </div>
        {canAdd && (
          <button type="button" className="secondary inline-flex items-center gap-2" onClick={onAdd}>
            <Plus size={16} /> Add {title}
          </button>
        )}
      </div>

      {docs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {docs.map((doc) => (
            <div key={doc.id} className="rounded-xl border bg-white p-4 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 text-blue-600 font-semibold">
                    <FileText size={18} />
                    <span>{doc.title || doc.document_type}</span>
                  </div>
                  {isAdmin && (
                    <button
                      type="button"
                      className="text-slate-400 hover:text-red-600"
                      onClick={() => onDelete('manuals', doc.id, doc.title || title)}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
                {doc.description && <p className="text-xs text-slate-600 mt-2">{doc.description}</p>}
              </div>
              <AuthorBadge profile={doc.profiles} />
            </div>
          ))}
        </div>
      ) : (
        <LocalEmptyState text={`No ${title.toLowerCase()} recorded.`} />
      )}
    </section>
  );
}

/* =========================================================
   MEDIA TAB COMPONENT
========================================================= */

function MediaTab({
  title,
  items,
  canAdd,
  isAdmin,
  onAdd,
  onDelete,
}: {
  title: string;
  items: any[];
  canAdd: boolean;
  isAdmin: boolean;
  onAdd: () => void;
  onDelete: (table: string, id: string, name: string) => void;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">{title}</h2>
          <p className="text-sm text-slate-500">Approved visual media.</p>
        </div>
        {canAdd && (
          <button type="button" className="secondary inline-flex items-center gap-2" onClick={onAdd}>
            <Plus size={16} /> Add {title === 'Photos' ? 'Photo' : 'Video'}
          </button>
        )}
      </div>

      {items.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {items.map((item) => (
            <div key={item.id} className="rounded-xl border bg-white p-3 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-slate-500 truncate">{item.title || title}</span>
                  {isAdmin && (
                    <button
                      type="button"
                      className="text-slate-400 hover:text-red-600"
                      onClick={() => onDelete('media', item.id, item.title || title)}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
                {item.storage_path && (
                  <div className="rounded bg-slate-100 aspect-video flex items-center justify-center overflow-hidden mb-2">
                    {item.media_type === 'PHOTO' ? (
                      <img src={item.storage_path} alt={item.title} className="w-full h-full object-cover" />
                    ) : (
                      <PlayCircle className="text-slate-400" size={32} />
                    )}
                  </div>
                )}
                {item.caption && <p className="text-xs text-slate-600">{item.caption}</p>}
              </div>
              <AuthorBadge profile={item.profiles} />
            </div>
          ))}
        </div>
      ) : (
        <LocalEmptyState text={`No ${title.toLowerCase()} uploaded.`} />
      )}
    </section>
  );
}

/* =========================================================
   ADD CONTENT SELECTOR COMPONENT
========================================================= */

function AddContentSelector({
  onClose,
  onSelect,
}: {
  onClose: () => void;
  onSelect: (type: ContentType) => void;
}) {
  const options: {
    type: ContentType;
    title: string;
    description: string;
    icon: any;
  }[] = [
    {
      type: 'TECHNICAL_SPECIFICATION',
      title: 'Technical Specification',
      description: 'Add an engineering parameter or specification.',
      icon: Settings,
    },
    {
      type: 'USER_MANUAL',
      title: 'User Manual',
      description: 'Upload an operator or user manual.',
      icon: BookOpen,
    },
    {
      type: 'SERVICE_MANUAL',
      title: 'Service Manual',
      description: 'Upload a service or technical manual.',
      icon: FileCog,
    },
    {
      type: 'SPARE_PART',
      title: 'Spare Part',
      description: 'Add a compatible part or component.',
      icon: Wrench,
    },
    {
      type: 'REPAIR_CASE',
      title: 'Repair Case',
      description: 'Document a repair or maintenance case.',
      icon: AlertTriangle,
    },
    {
      type: 'TROUBLESHOOTING_GUIDE',
      title: 'Troubleshooting Guide',
      description: 'Upload a guide for diagnostic steps.',
      icon: FileText,
    },
    {
      type: 'PHOTO',
      title: 'Photo',
      description: 'Upload an image of the equipment or part.',
      icon: ImageIcon,
    },
    {
      type: 'VIDEO',
      title: 'Video',
      description: 'Upload a procedural or demonstration video.',
      icon: PlayCircle,
    },
    {
      type: 'DOCUMENT',
      title: 'Document',
      description: 'Upload general documentation or reports.',
      icon: FileText,
    },
    {
      type: 'SCHEMATIC',
      title: 'Schematic',
      description: 'Upload electrical or mechanical diagrams.',
      icon: FileText,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl space-y-4 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="text-lg font-bold">Add Content to Equipment</h3>
          <button type="button" className="text-slate-400 hover:text-slate-600" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {options.map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.type}
                type="button"
                className="flex items-start gap-3 rounded-xl border p-4 text-left transition hover:border-blue-500 hover:bg-blue-50/50"
                onClick={() => onSelect(opt.type)}
              >
                <div className="rounded-lg bg-blue-100 p-2 text-blue-600 shrink-0">
                  <Icon size={20} />
                </div>
                <div>
                  <div className="font-semibold text-sm text-slate-800">{opt.title}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{opt.description}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   ADD CONTENT FORM COMPONENT
========================================================= */

function AddContentForm({
  equipmentId,
  type,
  userId,
  onClose,
  onDone,
}: {
  equipmentId: string;
  type: ContentType;
  userId?: string;
  onClose: () => void;
  onDone: () => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState('');

  const [fieldName, setFieldName] = useState('');
  const [fieldValue, setFieldValue] = useState('');
  const [unit, setUnit] = useState('');

  const [partName, setPartName] = useState('');
  const [partNumber, setPartNumber] = useState('');
  const [compatibility, setCompatibility] = useState('');
  const [description, setDescription] = useState('');

  const [problemTitle, setProblemTitle] = useState('');
  const [reportedFault, setReportedFault] = useState('');
  const [rootCause, setRootCause] = useState('');
  const [correctiveAction, setCorrectiveAction] = useState('');
  const [finalResult, setFinalResult] = useState('');

  const [title, setTitle] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFormError('');

    try {
      if (type === 'TECHNICAL_SPECIFICATION') {
        if (!fieldName.trim()) throw new Error('Field name is required.');
        const { error } = await supabase.from('equipment_identifiers').insert({
          equipment_id: equipmentId,
          field_name: fieldName.trim(),
          field_value: fieldValue.trim(),
          unit: unit.trim(),
          created_by: userId,
        });
        if (error) throw error;
      } else if (type === 'SPARE_PART') {
        if (!partName.trim()) throw new Error('Part name is required.');
        const { error } = await supabase.from('spare_parts').insert({
          equipment_id: equipmentId,
          part_name: partName.trim(),
          part_number: partNumber.trim(),
          compatibility: compatibility.trim(),
          description: description.trim(),
          approval_status: 'PENDING',
          created_by: userId,
        });
        if (error) throw error;
      } else if (type === 'REPAIR_CASE') {
        if (!problemTitle.trim()) throw new Error('Problem title is required.');
        const { error } = await supabase.from('repair_cases').insert({
          equipment_id: equipmentId,
          problem_title: problemTitle.trim(),
          reported_fault: reportedFault.trim(),
          root_cause: rootCause.trim(),
          corrective_action: correctiveAction.trim(),
          final_result: finalResult.trim(),
          approval_status: 'PENDING',
          created_by: userId,
        });
        if (error) throw error;
      } else if (['USER_MANUAL', 'SERVICE_MANUAL', 'TROUBLESHOOTING_GUIDE', 'DOCUMENT', 'SCHEMATIC'].includes(type)) {
        const { error } = await supabase.from('manuals').insert({
          equipment_id: equipmentId,
          title: title.trim() || type.replace('_', ' '),
          document_type: type.replace('_', ' '),
          description: description.trim(),
          approval_status: 'PENDING',
          created_by: userId,
        });
        if (error) throw error;
      } else if (['PHOTO', 'VIDEO'].includes(type)) {
        const { error } = await supabase.from('media').insert({
          equipment_id: equipmentId,
          title: title.trim() || (type === 'PHOTO' ? 'Photo' : 'Video'),
          media_type: type,
          caption: description.trim(),
          approval_status: 'PENDING',
          created_by: userId,
        });
        if (error) throw error;
      }

      await onDone();
    } catch (err: any) {
      setFormError(err?.message || 'Failed to submit content.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="text-lg font-bold">Add {type.replace('_', ' ')}</h3>
          <button type="button" className="text-slate-400 hover:text-slate-600" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {formError && (
          <div className="rounded-lg bg-red-50 p-3 text-xs text-red-600 border border-red-200">
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {type === 'TECHNICAL_SPECIFICATION' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Specification Name *</label>
                <input
                  type="text"
                  value={fieldName}
                  onChange={(e) => setFieldName(e.target.value)}
                  placeholder="e.g. Operating Voltage"
                  className="w-full rounded-lg border p-2 text-sm outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Value</label>
                <input
                  type="text"
                  value={fieldValue}
                  onChange={(e) => setFieldValue(e.target.value)}
                  placeholder="e.g. 220"
                  className="w-full rounded-lg border p-2 text-sm outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Unit</label>
                <input
                  type="text"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="e.g. V AC"
                  className="w-full rounded-lg border p-2 text-sm outline-none"
                />
              </div>
            </>
          )}

          {type === 'SPARE_PART' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Part Name *</label>
                <input
                  type="text"
                  value={partName}
                  onChange={(e) => setPartName(e.target.value)}
                  placeholder="e.g. Power Supply Board"
                  className="w-full rounded-lg border p-2 text-sm outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Part Number</label>
                <input
                  type="text"
                  value={partNumber}
                  onChange={(e) => setPartNumber(e.target.value)}
                  placeholder="e.g. PN-99201"
                  className="w-full rounded-lg border p-2 text-sm outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Compatibility</label>
                <input
                  type="text"
                  value={compatibility}
                  onChange={(e) => setCompatibility(e.target.value)}
                  placeholder="e.g. Series A & B"
                  className="w-full rounded-lg border p-2 text-sm outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border p-2 text-sm outline-none"
                />
              </div>
            </>
          )}

          {type === 'REPAIR_CASE' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Problem Title *</label>
                <input
                  type="text"
                  value={problemTitle}
                  onChange={(e) => setProblemTitle(e.target.value)}
                  placeholder="e.g. Display backlight flickering"
                  className="w-full rounded-lg border p-2 text-sm outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Reported Fault</label>
                <textarea
                  value={reportedFault}
                  onChange={(e) => setReportedFault(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border p-2 text-sm outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Root Cause</label>
                <textarea
                  value={rootCause}
                  onChange={(e) => setRootCause(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border p-2 text-sm outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Corrective Action</label>
                <textarea
                  value={correctiveAction}
                  onChange={(e) => setCorrectiveAction(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border p-2 text-sm outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Final Result</label>
                <input
                  type="text"
                  value={finalResult}
                  onChange={(e) => setFinalResult(e.target.value)}
                  placeholder="e.g. System fully functional"
                  className="w-full rounded-lg border p-2 text-sm outline-none"
                />
              </div>
            </>
          )}

          {['USER_MANUAL', 'SERVICE_MANUAL', 'TROUBLESHOOTING_GUIDE', 'DOCUMENT', 'SCHEMATIC', 'PHOTO', 'VIDEO'].includes(type) && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter title..."
                  className="w-full rounded-lg border p-2 text-sm outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Description / Caption</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border p-2 text-sm outline-none"
                />
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t">
            <button
              type="button"
              className="rounded-lg border px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Submitting…' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}