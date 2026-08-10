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
  Upload,
  Wrench,
  BookOpen,
  FileCog,
  AlertTriangle,
  Settings,
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
  signedUrl,
} from '../services/db';

import {
  useAuth,
} from '../hooks/useAuth';

import type {
  SubmissionType,
} from '../types';

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
   MAIN COMPONENT
========================================================= */

export default function EquipmentDetail() {
  const { id } = useParams();

  const {
    user,
    profile,
  } = useAuth();

  const [equipment, setEquipment] =
    useState<any>(null);

  const [identifiers, setIdentifiers] =
    useState<any[]>([]);

  const [repairs, setRepairs] =
    useState<any[]>([]);

  const [manuals, setManuals] =
    useState<any[]>([]);

  const [parts, setParts] =
    useState<any[]>([]);

  const [media, setMedia] =
    useState<any[]>([]);

  const [tab, setTab] =
    useState('Overview');

  const [error, setError] =
    useState('');

  const [
    repairSearch,
    setRepairSearch,
  ] = useState('');

  const [
    showAddContent,
    setShowAddContent,
  ] = useState(false);

  const [
    contentType,
    setContentType,
  ] =
    useState<ContentType | null>(
      null
    );

  const canAdd =
    profile?.role !== 'VIEWER';

  /* =======================================================
     LOAD EQUIPMENT
  ======================================================= */

  const loadEquipment =
    async () => {
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
            .from(
              'equipment_identifiers'
            )
            .select('*')
            .eq(
              'equipment_id',
              id
            )
            .order(
              'created_at',
              {
                ascending: true,
              }
            ),

          supabase
            .from('repair_cases')
            .select('*')
            .eq(
              'equipment_id',
              id
            )
            .eq(
              'approval_status',
              'APPROVED'
            )
            .order(
              'created_at',
              {
                ascending: false,
              }
            ),

          supabase
            .from('manuals')
            .select('*')
            .eq(
              'equipment_id',
              id
            )
            .eq(
              'approval_status',
              'APPROVED'
            )
            .order(
              'created_at',
              {
                ascending: false,
              }
            ),

          supabase
            .from('spare_parts')
            .select('*')
            .eq(
              'equipment_id',
              id
            )
            .eq(
              'approval_status',
              'APPROVED'
            )
            .order(
              'created_at',
              {
                ascending: false,
              }
            ),

          supabase
            .from('media')
            .select('*')
            .eq(
              'equipment_id',
              id
            )
            .eq(
              'approval_status',
              'APPROVED'
            )
            .order(
              'created_at',
              {
                ascending: false,
              }
            ),
        ]);

        if (
          equipmentResult.error
        ) {
          throw equipmentResult.error;
        }

        setEquipment(
          equipmentResult.data
        );

        setIdentifiers(
          identifiersResult.data ||
            []
        );

        setRepairs(
          repairsResult.data ||
            []
        );

        setManuals(
          manualsResult.data ||
            []
        );

        setParts(
          partsResult.data ||
            []
        );

        setMedia(
          mediaResult.data ||
            []
        );
      } catch (
        error: any
      ) {
        setError(
          error?.message ||
            'Unable to load equipment information.'
        );
      }
    };

  useEffect(() => {
    loadEquipment();
  }, [id]);

  /* =======================================================
     FILTER REPAIRS
  ======================================================= */

  const filteredRepairs =
    useMemo(() => {
      const query =
        repairSearch
          .trim()
          .toLowerCase();

      if (!query) {
        return repairs;
      }

      return repairs.filter(
        (repair) => {
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

          return text.includes(
            query
          );
        }
      );
    }, [
      repairs,
      repairSearch,
    ]);

  /* =======================================================
     ERROR
  ======================================================= */

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

  /* =======================================================
     LOADING
  ======================================================= */

  if (!equipment) {
    return (
      <div className="p-6 text-slate-500">
        Loading equipment dossier…
      </div>
    );
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

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <>
      <div className="space-y-6">
        {/* HEADER */}

        <div className="flex items-start justify-between gap-4">
          <div>
            <Link
              to="/equipment"
              className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 mb-4"
            >
              <ArrowLeft size={16} />
              Equipment Library
            </Link>

            <div className="text-sm text-slate-500">
              {equipment.category}
            </div>

            <h1 className="text-2xl font-bold">
              {equipment.manufacturer}{' '}
              {equipment.device_name}
            </h1>

            <div className="text-slate-500">
              {equipment.model}
              {' • '}
              SN{' '}
              {equipment.serial_number ||
                'Not specified'}
            </div>
          </div>

          {canAdd && (
            <button
              type="button"
              className="primary inline-flex items-center gap-2 shrink-0"
              onClick={() =>
                setShowAddContent(
                  true
                )
              }
            >
              <Plus size={18} />
              Add Content
            </button>
          )}
        </div>

        {/* TABS */}

        <div className="flex flex-wrap gap-2 border-b pb-3">
          {tabs.map((item) => (
            <button
              key={item}
              type="button"
              className={
                tab === item
                  ? 'active'
                  : ''
              }
              onClick={() => {
                setTab(item);

                if (
                  item !==
                  'Repair Cases'
                ) {
                  setRepairSearch(
                    ''
                  );
                }
              }}
            >
              {item}
            </button>
          ))}
        </div>

        {/* OVERVIEW */}

        {tab === 'Overview' && (
          <section className="space-y-6">
            <h2 className="text-xl font-semibold">
              Engineering overview
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Info
                label="Manufacturer"
                value={
                  equipment.manufacturer
                }
              />

              <Info
                label="Device"
                value={
                  equipment.device_name
                }
              />

              <Info
                label="Model"
                value={
                  equipment.model
                }
              />

              <Info
                label="Serial Number"
                value={
                  equipment.serial_number
                }
              />

              <Info
                label="Year"
                value={
                  equipment.year
                }
              />

              <Info
                label="Country"
                value={
                  equipment.country
                }
              />

              <Info
                label="Status"
                value={
                  equipment.status
                }
              />
            </div>

            <Info
              label="Description"
              value={
                equipment.description
              }
            />

            <Info
              label="Clinical application"
              value={
                equipment.clinical_application
              }
            />

            <Info
              label="Operating principle"
              value={
                equipment.operating_principle
              }
            />

            <div>
              <h3 className="font-semibold mb-3">
                Technical identifiers
              </h3>

              {identifiers.length >
              0 ? (
                <div className="space-y-2">
                  {identifiers.map(
                    (item) => (
                      <div
                        key={
                          item.id
                        }
                        className="rounded-lg border p-3"
                      >
                        <div className="font-medium">
                          {
                            item.field_name
                          }
                        </div>

                        <div className="text-slate-600">
                          {item.field_value ||
                            'Not specified'}

                          {item.unit
                            ? ` ${item.unit}`
                            : ''}
                        </div>
                      </div>
                    )
                  )}
                </div>
              ) : (
                <div className="text-slate-500">
                  No additional specifications
                  recorded.
                </div>
              )}
            </div>
          </section>
        )}

        {/* TECHNICAL SPECIFICATIONS */}

        {tab ===
          'Technical Specifications' && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold">
                  Technical specifications
                </h2>

                <p className="text-sm text-slate-500">
                  Engineering parameters
                  and specifications.
                </p>
              </div>

              {canAdd && (
                <button
                  type="button"
                  className="secondary inline-flex items-center gap-2"
                  onClick={() =>
                    setContentType(
                      'TECHNICAL_SPECIFICATION'
                    )
                  }
                >
                  <Plus size={16} />
                  Add Specification
                </button>
              )}
            </div>

            {identifiers.length >
            0 ? (
              <div className="space-y-2">
                {identifiers.map(
                  (item) => (
                    <div
                      key={
                        item.id
                      }
                      className="rounded-lg border p-4 bg-white"
                    >
                      <div className="font-medium">
                        {
                          item.field_name
                        }
                      </div>

                      <div className="text-slate-600 mt-1">
                        {item.field_value ||
                          'Not specified'}

                        {item.unit
                          ? ` ${item.unit}`
                          : ''}
                      </div>
                    </div>
                  )
                )}
              </div>
            ) : (
              <EmptyState
                text="No technical specifications recorded."
              />
            )}
          </section>
        )}

        {/* REPAIR CASES */}

        {tab ===
          'Repair Cases' && (
          <section className="space-y-5">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">
                  Repair cases
                </h2>

                <p className="text-sm text-slate-500">
                  Approved service
                  history for this
                  device.
                </p>
              </div>

              <div className="flex gap-2 w-full md:w-auto">
                <div className="relative w-full md:w-96">
                  <Search
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type="search"
                    value={
                      repairSearch
                    }
                    onChange={(
                      event
                    ) =>
                      setRepairSearch(
                        event.target
                          .value
                      )
                    }
                    placeholder="Search problem, fault, diagnosis..."
                    className="w-full rounded-lg border pl-10 pr-3 py-2 outline-none"
                  />
                </div>

                {canAdd && (
                  <button
                    type="button"
                    className="primary inline-flex items-center gap-2 shrink-0"
                    onClick={() =>
                      setContentType(
                        'REPAIR_CASE'
                      )
                    }
                  >
                    <Plus size={16} />
                    Add
                  </button>
                )}
              </div>
            </div>

            {repairSearch && (
              <div className="text-sm text-slate-500">
                Showing{' '}
                <strong>
                  {
                    filteredRepairs.length
                  }
                </strong>{' '}
                of{' '}
                <strong>
                  {repairs.length}
                </strong>{' '}
                repair cases
              </div>
            )}

            {filteredRepairs.length >
            0 ? (
              <div className="space-y-4">
                {filteredRepairs.map(
                  (repair) => {
                    const attachments =
                      media.filter(
                        (item) =>
                          item.repair_case_id ===
                            repair.id
                      );

                    return (
                      <article
                        key={
                          repair.id
                        }
                        className="rounded-xl border bg-white p-5 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="text-sm text-slate-500">
                              {formatDate(
                                repair.repair_date ||
                                  repair.created_at
                              )}
                            </div>

                            <Link
                              to={`/repair-cases/${repair.id}`}
                              className="text-lg font-semibold mt-1 block hover:underline"
                            >
                              {
                                repair.problem_title
                              }
                            </Link>
                          </div>

                          <span className="inline-flex items-center gap-1 text-sm font-medium text-green-700">
                            <ShieldCheck
                              size={16}
                            />
                            Approved
                          </span>
                        </div>

                        <div className="mt-5 space-y-4">
                          <Info
                            label="Reported fault"
                            value={
                              repair.reported_fault
                            }
                          />

                          <Info
                            label="Root cause"
                            value={
                              repair.root_cause
                            }
                          />

                          <Info
                            label="Corrective action"
                            value={
                              repair.corrective_action
                            }
                          />

                          <Info
                            label="Final result"
                            value={
                              repair.final_result
                            }
                          />
                        </div>

                        {attachments.length >
                          0 && (
                          <div className="mt-5 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                            📎{' '}
                            {
                              attachments.length
                            }{' '}
                            approved attachment
                            {attachments.length !==
                            1
                              ? 's'
                              : ''}{' '}
                            attached to
                            this case.
                          </div>
                        )}

                        <div className="mt-5 pt-4 border-t">
                          <Link
                            to={`/repair-cases/${repair.id}`}
                            className="secondary inline-flex"
                          >
                            Open full repair
                            case
                          </Link>
                        </div>
                      </article>
                    );
                  }
                )}
              </div>
            ) : (
              <EmptyState
                text={
                  repairSearch
                    ? 'No repair cases match your search.'
                    : 'No approved repair cases.'
                }
              />
            )}
          </section>
        )}

        {/* DOCUMENTS */}

        {[
          'User Manual',
          'Service Manual',
          'Schematics',
          'Documents',
          'Troubleshooting',
        ].includes(tab) && (
          <DocumentTab
            title={tab}
            docs={manuals.filter(
              (manual) => {
                if (
                  tab ===
                  'User Manual'
                ) {
                  return (
                    manual.document_type ===
                    'User Manual'
                  );
                }

                if (
                  tab ===
                  'Service Manual'
                ) {
                  return (
                    manual.document_type ===
                    'Service Manual'
                  );
                }

                if (
                  tab ===
                  'Schematics'
                ) {
                  return manual.document_type
                    ?.toLowerCase()
                    .includes(
                      'schematic'
                    );
                }

                if (
                  tab ===
                  'Troubleshooting'
                ) {
                  return (
                    manual.document_type ===
                    'Troubleshooting Guide'
                  );
                }

                return (
                  manual.document_type ===
                    'Document' ||
                  ![
                    'User Manual',
                    'Service Manual',
                    'Troubleshooting Guide',
                  ].includes(
                    manual.document_type
                  )
                );
              }
            )}
            canAdd={canAdd}
            onAdd={() => {
              if (
                tab ===
                'User Manual'
              ) {
                setContentType(
                  'USER_MANUAL'
                );
              } else if (
                tab ===
                'Service Manual'
              ) {
                setContentType(
                  'SERVICE_MANUAL'
                );
              } else if (
                tab ===
                'Schematics'
              ) {
                setContentType(
                  'SCHEMATIC'
                );
              } else if (
                tab ===
                'Troubleshooting'
              ) {
                setContentType(
                  'TROUBLESHOOTING_GUIDE'
                );
              } else {
                setContentType(
                  'DOCUMENT'
                );
              }
            }}
          />
        )}

        {/* SPARE PARTS */}

        {tab ===
          'Spare Parts' && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold">
                  Spare parts
                </h2>

                <p className="text-sm text-slate-500">
                  Approved replacement
                  parts.
                </p>
              </div>

              {canAdd && (
                <button
                  type="button"
                  className="primary inline-flex items-center gap-2"
                  onClick={() =>
                    setContentType(
                      'SPARE_PART'
                    )
                  }
                >
                  <Plus size={16} />
                  Add Spare Part
                </button>
              )}
            </div>

            {parts.length >
            0 ? (
              <div className="space-y-3">
                {parts.map(
                  (part) => (
                    <div
                      key={
                        part.id
                      }
                      className="rounded-lg border p-4 bg-white"
                    >
                      <div className="font-semibold">
                        {
                          part.part_name
                        }
                      </div>

                      <div className="text-sm text-slate-500">
                        {part.part_number ||
                          'Part number not specified'}
                        {' • '}
                        {part.compatibility ||
                          'Compatibility not specified'}
                      </div>

                      {part.description && (
                        <div className="text-sm text-slate-600 mt-2">
                          {
                            part.description
                          }
                        </div>
                      )}
                    </div>
                  )
                )}
              </div>
            ) : (
              <EmptyState
                text="No approved spare parts."
              />
            )}
          </section>
        )}

        {/* PHOTOS */}

        {tab ===
          'Photos' && (
          <MediaTab
            title="Photos"
            items={media.filter(
              (item) =>
                item.media_type ===
                'PHOTO'
            )}
            canAdd={canAdd}
            onAdd={() =>
              setContentType(
                'PHOTO'
              )
            }
          />
        )}

        {/* VIDEOS */}

        {tab ===
          'Videos' && (
          <MediaTab
            title="Videos"
            items={media.filter(
              (item) =>
                item.media_type ===
                'VIDEO'
            )}
            canAdd={canAdd}
            onAdd={() =>
              setContentType(
                'VIDEO'
              )
            }
          />
        )}

        {/* REVISION HISTORY */}

        {tab ===
          'Revision History' && (
          <section>
            <h2 className="text-xl font-semibold mb-3">
              Revision History
            </h2>

            <div className="text-slate-500">
              No revision history is
              available for this
              record.
            </div>
          </section>
        )}
      </div>

      {/* ADD CONTENT SELECTOR */}

      {showAddContent && (
        <AddContentSelector
          onClose={() =>
            setShowAddContent(
              false
            )
          }
          onSelect={(type) => {
            setShowAddContent(
              false
            );
            setContentType(type);
          }}
        />
      )}

      {/* ADD CONTENT FORM */}

      {contentType && id && (
        <AddContentForm
          equipmentId={id}
          type={contentType}
          userId={user?.id}
          onClose={() =>
            setContentType(null)
          }
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
   ADD CONTENT SELECTOR
========================================================= */

function AddContentSelector({
  onClose,
  onSelect,
}: {
  onClose: () => void;
  onSelect: (
    type: ContentType
  ) => void;
}) {
  const options: {
    type: ContentType;
    title: string;
    description: string;
    icon: any;
  }[] = [
    {
      type:
        'TECHNICAL_SPECIFICATION',
      title:
        'Technical Specification',
      description:
        'Add an engineering parameter or specification.',
      icon: Settings,
    },
    {
      type: 'USER_MANUAL',
      title: 'User Manual',
      description:
        'Upload a user manual.',
      icon: BookOpen,
    },
    {
      type: 'SERVICE_MANUAL',
      title: 'Service Manual',
      description:
        'Upload a service manual.',
      icon: FileCog,
    },
    {
      type: 'SPARE_PART',
      title: 'Spare Part',
      description:
        'Add a replacement part and compatibility information.',
      icon: Wrench,
    },
    {
      type: 'REPAIR_CASE',
      title: 'Repair Case',
      description:
        'Add a new repair/service case.',
      icon: Wrench,
    },
    {
      type:
        'TROUBLESHOOTING_GUIDE',
      title:
        'Troubleshooting Guide',
      description:
        'Upload a troubleshooting guide.',
      icon: AlertTriangle,
    },
    {
      type: 'PHOTO',
      title: 'Photo',
      description:
        'Upload equipment photos.',
      icon: ImageIcon,
    },
    {
      type: 'VIDEO',
      title: 'Video',
      description:
        'Upload equipment videos.',
      icon: PlayCircle,
    },
    {
      type: 'DOCUMENT',
      title: 'Document',
      description:
        'Upload technical documents.',
      icon: FileText,
    },
    {
      type: 'SCHEMATIC',
      title: 'Schematic',
      description:
        'Upload electrical/system schematics.',
      icon: FileText,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden">
        <div className="flex items-center justify-between border-b p-5">
          <div>
            <h2 className="text-lg font-semibold">
              Add Content
            </h2>

            <p className="text-sm text-slate-500 mt-1">
              Select the type of
              information you want
              to add to this
              equipment.
            </p>
          </div>

          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
          >
            <X size={19} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-5 max-h-[70vh] overflow-y-auto">
          {options.map(
            (option) => {
              const Icon =
                option.icon;

              return (
                <button
                  key={
                    option.type
                  }
                  type="button"
                  onClick={() =>
                    onSelect(
                      option.type
                    )
                  }
                  className="text-left rounded-xl border p-4 hover:border-slate-400 hover:bg-slate-50 transition"
                >
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 shrink-0 rounded-lg bg-slate-100 flex items-center justify-center">
                      <Icon
                        size={19}
                      />
                    </div>

                    <div>
                      <div className="font-semibold text-sm">
                        {
                          option.title
                        }
                      </div>

                      <div className="text-xs text-slate-500 mt-1 leading-5">
                        {
                          option.description
                        }
                      </div>
                    </div>
                  </div>
                </button>
              );
            }
          )}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   ADD CONTENT FORM
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
  onDone: () => void;
}) {
  const [busy, setBusy] =
    useState(false);

  const [error, setError] =
    useState('');

  const [title, setTitle] =
    useState('');

  const [
    description,
    setDescription,
  ] = useState('');

  const [
    fieldName,
    setFieldName,
  ] = useState('');

  const [
    fieldValue,
    setFieldValue,
  ] = useState('');

  const [unit, setUnit] =
    useState('');

  const [
    partNumber,
    setPartNumber,
  ] = useState('');

  const [
    compatibility,
    setCompatibility,
  ] = useState('');

  const [
    problemTitle,
    setProblemTitle,
  ] = useState('');

  const [
    reportedFault,
    setReportedFault,
  ] = useState('');

  const [
    rootCause,
    setRootCause,
  ] = useState('');

  const [
    correctiveAction,
    setCorrectiveAction,
  ] = useState('');

  const [
    finalResult,
    setFinalResult,
  ] = useState('');

  const [files, setFiles] =
    useState<File[]>([]);

  const isFileType = [
    'USER_MANUAL',
    'SERVICE_MANUAL',
    'TROUBLESHOOTING_GUIDE',
    'PHOTO',
    'VIDEO',
    'DOCUMENT',
    'SCHEMATIC',
  ].includes(type);

  const typeTitle: Record<
    ContentType,
    string
  > = {
    TECHNICAL_SPECIFICATION:
      'Technical Specification',
    USER_MANUAL:
      'User Manual',
    SERVICE_MANUAL:
      'Service Manual',
    SPARE_PART:
      'Spare Part',
    REPAIR_CASE:
      'Repair Case',
    TROUBLESHOOTING_GUIDE:
      'Troubleshooting Guide',
    PHOTO: 'Photos',
    VIDEO: 'Videos',
    DOCUMENT:
      'Document',
    SCHEMATIC:
      'Schematic',
  };

  /* =======================================================
     SUBMIT
  ======================================================= */

  const submit = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    if (!userId) {
      setError(
        'You must be logged in to add content.'
      );
      return;
    }

    setBusy(true);
    setError('');

    try {
      /* =================================================
         TECHNICAL SPECIFICATION
      ================================================= */

      if (
        type ===
        'TECHNICAL_SPECIFICATION'
      ) {
        if (
          !fieldName.trim() ||
          !fieldValue.trim()
        ) {
          throw new Error(
            'Field name and value are required.'
          );
        }

        const {
          error,
        } = await supabase
          .from(
            'equipment_identifiers'
          )
          .insert({
            equipment_id:
              equipmentId,
            field_name:
              fieldName.trim(),
            field_value:
              fieldValue.trim(),
            unit:
              unit.trim() ||
              null,
            created_by:
              userId,
          });

        if (error) {
          throw error;
        }

        onDone();
        return;
      }

      /* =================================================
         SPARE PART
      ================================================= */

      if (
        type === 'SPARE_PART'
      ) {
        if (!title.trim()) {
          throw new Error(
            'Part name is required.'
          );
        }

        const {
          data,
          error,
        } = await supabase
          .from('spare_parts')
          .insert({
            equipment_id:
              equipmentId,
            part_name:
              title.trim(),
            part_number:
              partNumber.trim() ||
              null,
            compatibility:
              compatibility.trim() ||
              null,
            description:
              description.trim() ||
              null,
            created_by:
              userId,
            approval_status:
              'PENDING',
          })
          .select()
          .single();

        if (error) {
          throw error;
        }

        await createSubmission({
          entityId: data.id,
          equipmentId,
          submissionType:
            'SPARE_PART',
          title:
            `New spare part: ${title.trim()}`,
          description:
            description.trim() ||
            'New spare part submitted for approval.',
          userId,
        });

        onDone();
        return;
      }

      /* =================================================
         REPAIR CASE
      ================================================= */

      if (
        type === 'REPAIR_CASE'
      ) {
        if (
          !problemTitle.trim()
        ) {
          throw new Error(
            'Problem title is required.'
          );
        }

        const {
          data,
          error,
        } = await supabase
          .from(
            'repair_cases'
          )
          .insert({
            equipment_id:
              equipmentId,
            problem_title:
              problemTitle.trim(),
            reported_fault:
              reportedFault.trim() ||
              null,
            root_cause:
              rootCause.trim() ||
              null,
            corrective_action:
              correctiveAction.trim() ||
              null,
            final_result:
              finalResult.trim() ||
              null,
            created_by:
              userId,
            approval_status:
              'PENDING',
          })
          .select()
          .single();

        if (error) {
          throw error;
        }

        await createSubmission({
          entityId: data.id,
          equipmentId,
          submissionType:
            'REPAIR_CASE',
          title:
            `New repair case: ${problemTitle.trim()}`,
          description:
            reportedFault.trim() ||
            'New repair case submitted for approval.',
          userId,
        });

        onDone();
        return;
      }

      /* =================================================
         FILE UPLOADS
      ================================================= */

      if (isFileType) {
        if (!files.length) {
          throw new Error(
            'Please select at least one file.'
          );
        }

        for (
          const file of files
        ) {
          if (
            file.size >
            100 *
              1024 *
              1024
          ) {
            throw new Error(
              `${file.name} exceeds 100 MB.`
            );
          }

          const safeName =
            file.name.replace(
              /[^a-zA-Z0-9._-]/g,
              '_'
            );

          const folder =
            `${equipmentId}/${crypto.randomUUID()}`;

          let bucket =
            'photos';

          if (
            type === 'VIDEO'
          ) {
            bucket =
              'videos';
          }

          if (
            [
              'USER_MANUAL',
              'SERVICE_MANUAL',
              'TROUBLESHOOTING_GUIDE',
              'DOCUMENT',
              'SCHEMATIC',
            ].includes(type)
          ) {
            bucket =
              'manuals';
          }

          const storagePath =
            `${folder}-${safeName}`;

          const {
            error:
              uploadError,
          } =
            await supabase.storage
              .from(bucket)
              .upload(
                storagePath,
                file,
                {
                  cacheControl:
                    '3600',
                  upsert:
                    false,
                }
              );

          if (uploadError) {
            throw uploadError;
          }

          /* =============================================
             MANUALS
          ============================================= */

          if (
            [
              'USER_MANUAL',
              'SERVICE_MANUAL',
              'TROUBLESHOOTING_GUIDE',
              'DOCUMENT',
              'SCHEMATIC',
            ].includes(type)
          ) {
            const documentType =
              getDocumentType(
                type
              );

            const {
              data,
              error,
            } =
              await supabase
                .from('manuals')
                .insert({
                  equipment_id:
                    equipmentId,
                  title:
                    title.trim() ||
                    file.name,
                  document_type:
                    documentType,
                  file_name:
                    file.name,
                  storage_path:
                    storagePath,
                  mime_type:
                    file.type ||
                    null,
                  file_size:
                    file.size,
                  description:
                    description.trim() ||
                    null,
                  created_by:
                    userId,
                  approval_status:
                    'PENDING',
                })
                .select()
                .single();

            if (error) {
              throw error;
            }

            const submissionType: SubmissionType =
              type ===
              'TROUBLESHOOTING_GUIDE'
                ? 'TROUBLESHOOTING'
                : 'MANUAL';

            await createSubmission({
              entityId:
                data.id,
              equipmentId,
              submissionType,
              title:
                `New ${documentType}: ${
                  title.trim() ||
                  file.name
                }`,
              description:
                description.trim() ||
                `New ${documentType} submitted for approval.`,
              userId,
            });
          }

          /* =============================================
             PHOTO / VIDEO
          ============================================= */

          if (
            type === 'PHOTO' ||
            type === 'VIDEO'
          ) {
            const {
              data,
              error,
            } =
              await supabase
                .from('media')
                .insert({
                  equipment_id:
                    equipmentId,
                  media_type:
                    type === 'PHOTO'
                      ? 'PHOTO'
                      : 'VIDEO',
                  category:
                    type === 'PHOTO'
                      ? 'Equipment Photo'
                      : 'Equipment Video',
                  title:
                    title.trim() ||
                    file.name,
                  file_name:
                    file.name,
                  storage_path:
                    storagePath,
                  mime_type:
                    file.type ||
                    null,
                  file_size:
                    file.size,
                  caption:
                    description.trim() ||
                    null,
                  created_by:
                    userId,
                  approval_status:
                    'PENDING',
                })
                .select()
                .single();

            if (error) {
              throw error;
            }

            await createSubmission({
              entityId:
                data.id,
              equipmentId,
              submissionType:
                type ===
                'PHOTO'
                  ? 'PHOTO'
                  : 'VIDEO',
              title:
                `New ${
                  type ===
                  'PHOTO'
                    ? 'photo'
                    : 'video'
                }: ${
                  title.trim() ||
                  file.name
                }`,
              description:
                description.trim() ||
                'New media submitted for approval.',
              userId,
            });
          }
        }

        onDone();
        return;
      }
    } catch (
      error: any
    ) {
      console.error(
        error
      );

      setError(
        error?.message ||
          'Unable to add content.'
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* HEADER */}

        <div className="flex items-center justify-between border-b p-5">
          <div>
            <h2 className="text-lg font-semibold">
              Add{' '}
              {
                typeTitle[
                  type
                ]
              }
            </h2>

            <p className="text-xs text-slate-500 mt-1">
              New content will
              be submitted for
              approval.
            </p>
          </div>

          <button
            type="button"
            className="icon-btn"
            onClick={
              onClose
            }
            disabled={busy}
          >
            <X size={19} />
          </button>
        </div>

        {/* FORM */}

        <form
          onSubmit={submit}
          className="overflow-y-auto p-5 space-y-5 max-h-[75vh]"
        >
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* TECHNICAL */}

          {type ===
            'TECHNICAL_SPECIFICATION' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field
                label="Specification name"
                value={
                  fieldName
                }
                onChange={
                  setFieldName
                }
                placeholder="e.g. Maximum pressure"
              />

              <Field
                label="Value"
                value={
                  fieldValue
                }
                onChange={
                  setFieldValue
                }
                placeholder="e.g. 2.5"
              />

              <Field
                label="Unit"
                value={unit}
                onChange={
                  setUnit
                }
                placeholder="e.g. bar"
              />
            </div>
          )}

          {/* SPARE PART */}

          {type ===
            'SPARE_PART' && (
            <>
              <Field
                label="Part name"
                value={
                  title
                }
                onChange={
                  setTitle
                }
                placeholder="e.g. Door gasket"
              />

              <Field
                label="Part number"
                value={
                  partNumber
                }
                onChange={
                  setPartNumber
                }
                placeholder="Optional"
              />

              <Field
                label="Compatibility"
                value={
                  compatibility
                }
                onChange={
                  setCompatibility
                }
                placeholder="Compatible model(s)"
              />

              <TextArea
                label="Description"
                value={
                  description
                }
                onChange={
                  setDescription
                }
                placeholder="Part description..."
              />
            </>
          )}

          {/* REPAIR */}

          {type ===
            'REPAIR_CASE' && (
            <>
              <Field
                label="Problem title"
                value={
                  problemTitle
                }
                onChange={
                  setProblemTitle
                }
                placeholder="e.g. Cuff pressure error"
              />

              <TextArea
                label="Reported fault"
                value={
                  reportedFault
                }
                onChange={
                  setReportedFault
                }
                placeholder="What was reported?"
              />

              <TextArea
                label="Root cause"
                value={
                  rootCause
                }
                onChange={
                  setRootCause
                }
                placeholder="What caused the problem?"
              />

              <TextArea
                label="Corrective action"
                value={
                  correctiveAction
                }
                onChange={
                  setCorrectiveAction
                }
                placeholder="What was repaired or replaced?"
              />

              <TextArea
                label="Final result"
                value={
                  finalResult
                }
                onChange={
                  setFinalResult
                }
                placeholder="Testing and final result..."
              />
            </>
          )}

          {/* FILE */}

          {isFileType && (
            <>
              <Field
                label="Title"
                value={title}
                onChange={
                  setTitle
                }
                placeholder="Optional — defaults to filename"
              />

              <TextArea
                label="Description / Caption"
                value={
                  description
                }
                onChange={
                  setDescription
                }
                placeholder="Optional description..."
              />

              <div>
                <label className="block text-xs font-medium mb-1.5 text-slate-700">
                  Files
                </label>

                <label className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 cursor-pointer hover:bg-slate-100 transition">
                  <Upload
                    size={30}
                    className="text-slate-400 mb-3"
                  />

                  <div className="font-medium text-sm">
                    Click to
                    select files
                  </div>

                  <div className="text-xs text-slate-500 mt-1">
                    Multiple files
                    are supported
                  </div>

                  <input
                    type="file"
                    multiple
                    className="hidden"
                    accept={
                      type ===
                      'PHOTO'
                        ? 'image/*'
                        : type ===
                          'VIDEO'
                        ? 'video/*'
                        : undefined
                    }
                    onChange={(
                      event
                    ) =>
                      setFiles(
                        Array.from(
                          event
                            .target
                            .files ||
                            []
                        )
                      )
                    }
                  />
                </label>

                {files.length >
                  0 && (
                  <div className="mt-3 space-y-2">
                    {files.map(
                      (
                        file,
                        index
                      ) => (
                        <div
                          key={`${file.name}-${index}`}
                          className="flex items-center justify-between rounded-lg border bg-white p-3"
                        >
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">
                              {
                                file.name
                              }
                            </div>

                            <div className="text-xs text-slate-400">
                              {formatFileSize(
                                file.size
                              )}
                            </div>
                          </div>

                          <button
                            type="button"
                            className="text-slate-400 hover:text-red-600"
                            onClick={() =>
                              setFiles(
                                files.filter(
                                  (
                                    _,
                                    i
                                  ) =>
                                    i !==
                                    index
                                )
                              )
                            }
                          >
                            <X
                              size={
                                16
                              }
                            />
                          </button>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {/* ACTIONS */}

          <div className="flex justify-end gap-2 border-t pt-4">
            <button
              type="button"
              className="secondary"
              onClick={
                onClose
              }
              disabled={busy}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="primary inline-flex items-center gap-2"
              disabled={busy}
            >
              {busy
                ? 'Submitting…'
                : 'Submit for Approval'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* =========================================================
   CREATE SUBMISSION
========================================================= */

async function createSubmission({
  entityId,
  equipmentId,
  submissionType,
  title,
  description,
  userId,
}: {
  entityId: string;
  equipmentId: string;
  submissionType: SubmissionType;
  title: string;
  description: string;
  userId: string;
}) {
  const {
    error,
  } = await supabase
    .from('submissions')
    .insert({
      submission_type:
        submissionType,
      entity_id: entityId,
      equipment_id:
        equipmentId,
      title,
      description,
      submitted_by: userId,
      status: 'PENDING',
    });

  if (error) {
    throw error;
  }
}

/* =========================================================
   DOCUMENT TYPE
========================================================= */

function getDocumentType(
  type: ContentType
) {
  switch (type) {
    case 'USER_MANUAL':
      return 'User Manual';

    case 'SERVICE_MANUAL':
      return 'Service Manual';

    case 'TROUBLESHOOTING_GUIDE':
      return 'Troubleshooting Guide';

    case 'SCHEMATIC':
      return 'Schematic';

    case 'DOCUMENT':
    default:
      return 'Document';
  }
}

/* =========================================================
   DOCUMENT TAB
========================================================= */

function DocumentTab({
  title,
  docs,
  canAdd,
  onAdd,
}: {
  title: string;
  docs: any[];
  canAdd: boolean;
  onAdd: () => void;
}) {
  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold">
            {title}
          </h2>

          <p className="text-sm text-slate-500">
            Approved documents
            associated with this
            equipment.
          </p>
        </div>

        {canAdd && (
          <button
            type="button"
            className="primary inline-flex items-center gap-2"
            onClick={onAdd}
          >
            <Plus size={16} />
            Add
          </button>
        )}
      </div>

      {docs.length > 0 ? (
        <div className="space-y-3">
          {docs.map(
            (doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between gap-4 rounded-lg border p-4 bg-white"
              >
                <div className="min-w-0">
                  <div className="font-semibold">
                    {doc.title}
                  </div>

                  <div className="text-sm text-slate-500">
                    {
                      doc.document_type
                    }
                    {' • '}
                    {doc.version ||
                      'Version not specified'}
                    {' • '}
                    {formatDate(
                      doc.created_at
                    )}
                  </div>

                  {doc.file_name && (
                    <div className="text-xs text-slate-400 mt-1 truncate">
                      {
                        doc.file_name
                      }
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  className="secondary shrink-0"
                  onClick={async () => {
                    try {
                      const url =
                        await signedUrl(
                          'manuals',
                          doc.storage_path
                        );

                      window.open(
                        url,
                        '_blank',
                        'noopener,noreferrer'
                      );
                    } catch {
                      alert(
                        'Unable to create secure download link.'
                      );
                    }
                  }}
                >
                  <FileText
                    size={16}
                  />
                  Open
                </button>
              </div>
            )
          )}
        </div>
      ) : (
        <EmptyState
          text="No approved documents."
        />
      )}
    </section>
  );
}

/* =========================================================
   MEDIA TAB
========================================================= */

function MediaTab({
  title,
  items,
  canAdd,
  onAdd,
}: {
  title: string;
  items: any[];
  canAdd: boolean;
  onAdd: () => void;
}) {
  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold">
            {title}
          </h2>

          <p className="text-sm text-slate-500">
            Approved media associated
            with this equipment.
          </p>
        </div>

        {canAdd && (
          <button
            type="button"
            className="primary inline-flex items-center gap-2"
            onClick={onAdd}
          >
            <Plus size={16} />
            Add
          </button>
        )}
      </div>

      {items.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map(
            (item) => (
              <AttachmentCard
                key={item.id}
                media={item}
              />
            )
          )}
        </div>
      ) : (
        <EmptyState
          text="No approved media."
        />
      )}
    </section>
  );
}

/* =========================================================
   ATTACHMENT CARD
========================================================= */

function AttachmentCard({
  media,
}: {
  media: any;
}) {
  const [url, setUrl] =
    useState('');

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState('');

  const isVideo =
    media.media_type ===
      'VIDEO' ||
    media.mime_type?.startsWith(
      'video/'
    );

  const isImage =
    media.media_type ===
      'PHOTO' ||
    media.mime_type?.startsWith(
      'image/'
    );

  const isPdf =
    media.mime_type ===
      'application/pdf' ||
    media.file_name
      ?.toLowerCase()
      .endsWith('.pdf');

  const openFile =
    async () => {
      if (
        !media.storage_path
      ) {
        setError(
          'Storage path is missing.'
        );
        return;
      }

      setLoading(true);
      setError('');

      try {
        let bucket =
          'photos';

        if (isVideo) {
          bucket =
            'videos';
        }

        const signed =
          await signedUrl(
            bucket,
            media.storage_path
          );

        setUrl(signed);

        window.open(
          signed,
          '_blank',
          'noopener,noreferrer'
        );
      } catch (
        error: any
      ) {
        setError(
          error?.message ||
            'Unable to open this attachment.'
        );
      } finally {
        setLoading(false);
      }
    };

  return (
    <div className="rounded-xl border bg-white overflow-hidden">
      {isImage && (
        <button
          type="button"
          className="w-full h-56 bg-slate-100 flex items-center justify-center"
          onClick={
            openFile
          }
        >
          {url ? (
            <img
              src={url}
              alt={
                media.title ||
                media.file_name ||
                'Image'
              }
              className="w-full h-56 object-contain"
            />
          ) : (
            <div className="flex flex-col items-center gap-2">
              <ImageIcon
                size={40}
              />

              <span className="font-medium">
                {loading
                  ? 'Opening image…'
                  : 'Open image'}
              </span>
            </div>
          )}
        </button>
      )}

      {isVideo && (
        <div className="h-56 bg-slate-100 flex flex-col items-center justify-center gap-3">
          <PlayCircle
            size={48}
          />

          <button
            type="button"
            className="primary"
            onClick={
              openFile
            }
            disabled={loading}
          >
            {loading
              ? 'Opening…'
              : 'Open video'}
          </button>
        </div>
      )}

      {isPdf && (
        <div className="h-40 bg-slate-50 flex flex-col items-center justify-center gap-3">
          <FileText
            size={40}
          />

          <button
            type="button"
            className="secondary"
            onClick={
              openFile
            }
            disabled={loading}
          >
            {loading
              ? 'Opening…'
              : 'Open PDF'}
          </button>
        </div>
      )}

      <div className="p-4">
        <div className="font-semibold">
          {media.title ||
            media.file_name ||
            'Attachment'}
        </div>

        <div className="text-sm text-slate-500 mt-1">
          {media.category ||
            media.media_type ||
            'Attachment'}
        </div>

        {media.file_name && (
          <div className="text-xs text-slate-400 mt-1 break-all">
            {media.file_name}
          </div>
        )}

        {media.caption && (
          <div className="text-sm text-slate-600 mt-2">
            {media.caption}
          </div>
        )}

        {error && (
          <div className="mt-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {!isImage &&
          !isVideo &&
          !isPdf && (
            <button
              type="button"
              className="secondary mt-3"
              onClick={
                openFile
              }
              disabled={
                loading
              }
            >
              {loading
                ? 'Opening…'
                : 'Open attachment'}
            </button>
          )}
      </div>
    </div>
  );
}

/* =========================================================
   INFO
========================================================= */

function Info({
  label,
  value,
}: {
  label: string;
  value: any;
}) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </div>

      <div className="mt-1 whitespace-pre-wrap">
        {value ||
          'Not specified'}
      </div>
    </div>
  );
}

/* =========================================================
   EMPTY STATE
========================================================= */

function EmptyState({
  text,
}: {
  text: string;
}) {
  return (
    <div className="rounded-xl border border-dashed p-8 text-center text-slate-500">
      {text}
    </div>
  );
}

/* =========================================================
   FIELD
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
  onChange: (
    value: string
  ) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5 text-slate-700">
        {label}
      </label>

      <input
        type={type}
        value={value}
        placeholder={
          placeholder
        }
        onChange={(event) =>
          onChange(
            event.target.value
          )
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
  onChange: (
    value: string
  ) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5 text-slate-700">
        {label}
      </label>

      <textarea
        rows={4}
        value={value}
        placeholder={
          placeholder
        }
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
      />
    </div>
  );
}

/* =========================================================
   FILE SIZE
========================================================= */

function formatFileSize(
  bytes: number
) {
  if (bytes === 0) {
    return '0 Bytes';
  }

  const units = [
    'Bytes',
    'KB',
    'MB',
    'GB',
  ];

  const index = Math.floor(
    Math.log(bytes) /
      Math.log(1024)
  );

  return `${(
    bytes /
    Math.pow(
      1024,
      index
    )
  ).toFixed(1)} ${
    units[index]
  }`;
}