import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  FileText,
  Image as ImageIcon,
  PlayCircle,
  ShieldCheck,
} from 'lucide-react';

import { supabase } from '../lib/supabase';
import { formatDate } from '../lib/ui';
import { signedUrl } from '../services/db';

export default function RepairCaseDetail() {
  const { id } = useParams();

  const [repair, setRepair] = useState<any>(null);
  const [equipment, setEquipment] = useState<any>(null);
  const [engineer, setEngineer] = useState<any>(null);
  const [media, setMedia] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;

    const load = async () => {
      setLoading(true);
      setError('');

      try {
        /*
         * ---------------------------------------------------------
         * GET REPAIR CASE
         * ---------------------------------------------------------
         */
        const { data: repairData, error: repairError } =
          await supabase
            .from('repair_cases')
            .select('*')
            .eq('id', id)
            .eq('approval_status', 'APPROVED')
            .single();

        if (repairError) {
          throw repairError;
        }

        if (!repairData) {
          throw new Error(
            'Repair case not found or it has not been approved.'
          );
        }

        setRepair(repairData);

        /*
         * ---------------------------------------------------------
         * GET EQUIPMENT
         * ---------------------------------------------------------
         */
        if (repairData.equipment_id) {
          const {
            data: equipmentData,
            error: equipmentError,
          } = await supabase
            .from('equipment')
            .select('*')
            .eq('id', repairData.equipment_id)
            .single();

          if (equipmentError) {
            throw equipmentError;
          }

          setEquipment(equipmentData);
        }

        /*
         * ---------------------------------------------------------
         * GET ENGINEER PROFILE
         * ---------------------------------------------------------
         *
         * repair_cases.engineer stores the user's UUID.
         * We use that UUID to find the profile.
         */
        if (repairData.engineer) {
          const {
            data: engineerData,
            error: engineerError,
          } = await supabase
            .from('profiles')
            .select('id, full_name, email, avatar_url')
            .eq('id', repairData.engineer)
            .maybeSingle();

          if (!engineerError && engineerData) {
            setEngineer(engineerData);
          }
        }

        /*
         * ---------------------------------------------------------
         * GET APPROVED MEDIA
         * ---------------------------------------------------------
         */
        const {
          data: mediaData,
          error: mediaError,
        } = await supabase
          .from('media')
          .select('*')
          .eq('repair_case_id', id)
          .eq('approval_status', 'APPROVED')
          .order('created_at', {
            ascending: false,
          });

        if (mediaError) {
          throw mediaError;
        }

        setMedia(mediaData || []);
      } catch (err: any) {
        setError(
          err?.message ||
            'Unable to load repair case.'
        );
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  /*
   * ---------------------------------------------------------
   * LOADING
   * ---------------------------------------------------------
   */

  if (loading) {
    return (
      <div className="p-6">
        Loading repair case…
      </div>
    );
  }

  /*
   * ---------------------------------------------------------
   * ERROR
   * ---------------------------------------------------------
   */

  if (error) {
    return (
      <div className="p-6 space-y-4">
        <Link
          to={
            equipment?.id
              ? `/equipment/${equipment.id}`
              : '/equipment'
          }
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft size={16} />
          Back to Equipment
        </Link>

        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-700">
          {error}
        </div>
      </div>
    );
  }

  if (!repair) {
    return null;
  }

  /*
   * ---------------------------------------------------------
   * MEDIA FILTERING
   * ---------------------------------------------------------
   */

  const photos = media.filter(
    (m) =>
      m.media_type === 'PHOTO' ||
      m.mime_type?.startsWith('image/')
  );

  const videos = media.filter(
    (m) =>
      m.media_type === 'VIDEO' ||
      m.mime_type?.startsWith('video/')
  );

  /*
   * ---------------------------------------------------------
   * ENGINEER DISPLAY NAME
   * ---------------------------------------------------------
   *
   * Priority:
   * 1. full_name
   * 2. email
   * 3. UUID
   * 4. Not specified
   */

  const engineerName =
    engineer?.full_name?.trim() ||
    engineer?.email ||
    repair.engineer ||
    'Not specified';

  return (
    <div className="p-6 space-y-6">

      {/* ---------------------------------------------------------
          BACK
      --------------------------------------------------------- */}

      <Link
        to={
          equipment?.id
            ? `/equipment/${equipment.id}`
            : '/equipment'
        }
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft size={16} />
        Back to equipment
      </Link>

      {/* ---------------------------------------------------------
          HEADER
      --------------------------------------------------------- */}

      <section className="rounded-xl border bg-white p-6 shadow-sm">

        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">

          <div>
            <div className="text-sm text-slate-500">
              REPAIR CASE
            </div>

            <h1 className="text-2xl font-bold mt-1">
              {repair.problem_title}
            </h1>

            {equipment && (
              <div className="mt-2 text-slate-500">
                {equipment.manufacturer}{' '}
                {equipment.device_name}
                {' • '}
                {equipment.model}
              </div>
            )}
          </div>

          <div className="inline-flex items-center gap-2 text-sm font-medium text-green-700">
            <ShieldCheck size={18} />
            Approved
          </div>

        </div>

        {/* Metadata */}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-5 border-t">

          <Info
            label="Repair date"
            value={
              repair.repair_date
                ? formatDate(repair.repair_date)
                : formatDate(repair.created_at)
            }
          />

          <Info
            label="Created"
            value={formatDate(repair.created_at)}
          />

          <Info
            label="Engineer"
            value={engineerName}
          />

        </div>
      </section>

      {/* ---------------------------------------------------------
          PROBLEM
      --------------------------------------------------------- */}

      <section className="rounded-xl border bg-white p-6 shadow-sm">

        <SectionTitle
          title="Problem & Initial Assessment"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          <Info
            label="Problem title"
            value={repair.problem_title}
          />

          <Info
            label="Reported fault"
            value={repair.reported_fault}
          />

          <Info
            label="Symptoms"
            value={repair.symptoms}
          />

          <Info
            label="Initial inspection"
            value={repair.initial_inspection}
          />

          <Info
            label="Measurements"
            value={repair.measurements}
          />

        </div>
      </section>

      {/* ---------------------------------------------------------
          DIAGNOSIS
      --------------------------------------------------------- */}

      <section className="rounded-xl border bg-white p-6 shadow-sm">

        <SectionTitle title="Diagnosis" />

        <div className="space-y-5">

          <Info
            label="Diagnosis"
            value={repair.diagnosis}
          />

          <Info
            label="Root cause"
            value={repair.root_cause}
          />

        </div>
      </section>

      {/* ---------------------------------------------------------
          REPAIR PROCEDURE
      --------------------------------------------------------- */}

      <section className="rounded-xl border bg-white p-6 shadow-sm">

        <SectionTitle title="Repair Procedure" />

        <div className="space-y-5">

          <Info
            label="Corrective action"
            value={repair.corrective_action}
          />

          <Info
            label="Parts replaced"
            value={repair.parts_replaced}
          />

          <Info
            label="Tools used"
            value={repair.tools_used}
          />

          <Info
            label="Testing procedure"
            value={repair.testing_procedure}
          />

        </div>
      </section>

      {/* ---------------------------------------------------------
          FINAL RESULT
      --------------------------------------------------------- */}

      <section className="rounded-xl border bg-white p-6 shadow-sm">

        <SectionTitle title="Final Result" />

        <div className="space-y-5">

          <Info
            label="Final result"
            value={repair.final_result}
          />

          <Info
            label="Recommendations"
            value={repair.recommendations}
          />

        </div>
      </section>

      {/* ---------------------------------------------------------
          PHOTOS
      --------------------------------------------------------- */}

      <section className="rounded-xl border bg-white p-6 shadow-sm">

        <SectionTitle
          title={`Photos (${photos.length})`}
        />

        {photos.length ? (

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">

            {photos.map((m) => (
              <AttachmentCard
                key={m.id}
                media={m}
              />
            ))}

          </div>

        ) : (

          <div className="text-slate-500">
            No approved photos attached to this repair case.
          </div>

        )}

      </section>

      {/* ---------------------------------------------------------
          VIDEOS
      --------------------------------------------------------- */}

      <section className="rounded-xl border bg-white p-6 shadow-sm">

        <SectionTitle
          title={`Videos (${videos.length})`}
        />

        {videos.length ? (

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            {videos.map((m) => (
              <AttachmentCard
                key={m.id}
                media={m}
              />
            ))}

          </div>

        ) : (

          <div className="text-slate-500">
            No approved videos attached to this repair case.
          </div>

        )}

      </section>

    </div>
  );
}

/* ---------------------------------------------------------
   INFO
--------------------------------------------------------- */

function Info({
  label,
  value,
}: {
  label: string;
  value: any;
}) {
  return (
    <div>
      <div className="text-sm font-medium text-slate-500">
        {label}
      </div>

      <div className="mt-1 whitespace-pre-wrap">
        {value || 'Not specified'}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   SECTION TITLE
--------------------------------------------------------- */

function SectionTitle({
  title,
}: {
  title: string;
}) {
  return (
    <h2 className="text-xl font-semibold mb-5">
      {title}
    </h2>
  );
}

/* ---------------------------------------------------------
   ATTACHMENT CARD
--------------------------------------------------------- */

function AttachmentCard({
  media,
}: {
  media: any;
}) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isVideo =
    media.media_type === 'VIDEO' ||
    media.mime_type?.startsWith('video/');

  const isImage =
    media.media_type === 'PHOTO' ||
    media.mime_type?.startsWith('image/');

  const isPdf =
    media.mime_type === 'application/pdf' ||
    media.file_name
      ?.toLowerCase()
      .endsWith('.pdf');

  const openFile = async () => {
    if (!media.storage_path) {
      setError('Storage path is missing.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      let bucket = 'photos';

      if (isVideo) {
        bucket = 'videos';
      }

      /*
       * PDFs attached to repair cases
       * are stored in photos bucket.
       */
      if (isPdf) {
        bucket = 'photos';
      }

      const signed = await signedUrl(
        bucket,
        media.storage_path
      );

      setUrl(signed);

      window.open(
        signed,
        '_blank',
        'noopener,noreferrer'
      );
    } catch (err: any) {
      setError(
        err?.message ||
          'Unable to open attachment.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border overflow-hidden bg-white">

      {/* IMAGE */}

      {isImage && (
        <button
          type="button"
          onClick={openFile}
          disabled={loading}
          className="block w-full bg-slate-100"
        >
          {url ? (
            <img
              src={url}
              alt={
                media.title ||
                media.file_name ||
                'Repair case photo'
              }
              className="w-full h-64 object-contain"
            />
          ) : (
            <div className="h-64 flex flex-col items-center justify-center gap-3">
              <ImageIcon size={48} />

              <span className="font-medium">
                {loading
                  ? 'Opening image…'
                  : 'Open image'}
              </span>
            </div>
          )}
        </button>
      )}

      {/* VIDEO */}

      {isVideo && (
        <div className="h-64 bg-slate-100 flex flex-col items-center justify-center gap-3">

          <PlayCircle size={52} />

          <button
            type="button"
            className="primary"
            onClick={openFile}
            disabled={loading}
          >
            {loading
              ? 'Opening…'
              : 'Open video'}
          </button>

        </div>
      )}

      {/* PDF */}

      {isPdf && (
        <div className="h-48 bg-slate-50 flex flex-col items-center justify-center gap-3">

          <FileText size={45} />

          <button
            type="button"
            className="secondary"
            onClick={openFile}
            disabled={loading}
          >
            {loading
              ? 'Opening…'
              : 'Open PDF'}
          </button>

        </div>
      )}

      {/* DETAILS */}

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
          <div className="text-sm text-slate-600 mt-3">
            {media.caption}
          </div>
        )}

        {error && (
          <div className="mt-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {url && (
          <button
            type="button"
            className="secondary mt-3 inline-flex items-center gap-2"
            onClick={() =>
              window.open(
                url,
                '_blank',
                'noopener,noreferrer'
              )
            }
          >
            <Download size={16} />
            Open again
          </button>
        )}

      </div>
    </div>
  );
}