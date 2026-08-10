import { supabase } from '../lib/supabase';

import type {
  SubmissionType,
  Status,
} from '../types';

/* =========================================================
   ACTIVITY LOG
========================================================= */

export async function logActivity(
  action: string,
  objectType?: string,
  objectId?: string,
  metadata?: Record<string, unknown>
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return;
  }

  const { error } = await supabase
    .from('activity_logs')
    .insert({
      user_id: user.id,
      action,
      object_type:
        objectType ?? null,
      object_id:
        objectId ?? null,
      metadata:
        metadata ?? null,
    });

  if (error) {
    console.error(
      'Activity log error:',
      error
    );
  }
}

/* =========================================================
   CREATE SUBMISSION
========================================================= */

export async function submitContribution(
  type: SubmissionType,
  entityId: string | null,
  equipmentId: string | null,
  title: string,
  description: string,
  snapshot?: Record<string, unknown>
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error(
      'Authentication required'
    );
  }

  const { data, error } =
    await supabase
      .from('submissions')
      .insert({
        submission_type: type,
        entity_id: entityId,
        equipment_id:
          equipmentId,
        title,
        description,
        submitted_by: user.id,
        status: 'PENDING',
      })
      .select()
      .single();

  if (error) {
    throw error;
  }

  if (snapshot) {
    const {
      error: itemError,
    } = await supabase
      .from('submission_items')
      .insert({
        submission_id: data.id,
        item_type: type,
        item_id: entityId,
        snapshot,
      });

    if (itemError) {
      throw itemError;
    }
  }

  await logActivity(
    'SUBMISSION_CREATED',
    'submission',
    data.id,
    {
      type,
      title,
    }
  );

  return data;
}

/* =========================================================
   REVIEW SUBMISSION
========================================================= */

export async function reviewSubmission(
  id: string,
  decision: Exclude<
    Status,
    'PENDING'
  >,
  note: string
) {
  const {
    data,
    error,
  } = await supabase.rpc(
    'review_submission',
    {
      p_submission_id: id,
      p_decision: decision,
      p_note:
        note.trim() || null,
    }
  );

  if (error) {
    throw error;
  }

  return data;
}

/* =========================================================
   PRIVATE STORAGE UPLOAD
========================================================= */

export async function uploadPrivateFile(
  bucket: string,
  path: string,
  file: File,
  onProgress?: (
    progress: number
  ) => void
) {
  if (
    file.size >
    100 * 1024 * 1024
  ) {
    throw new Error(
      'File exceeds 100 MB.'
    );
  }

  onProgress?.(10);

  const {
    error,
  } = await supabase.storage
    .from(bucket)
    .upload(
      path,
      file,
      {
        upsert: false,
        contentType:
          file.type ||
          undefined,
      }
    );

  if (error) {
    throw error;
  }

  onProgress?.(100);

  return path;
}

/* =========================================================
   SIGNED URL
========================================================= */

export async function signedUrl(
  bucket: string,
  path: string,
  expires = 300
) {
  const {
    data,
    error,
  } = await supabase.storage
    .from(bucket)
    .createSignedUrl(
      path,
      expires
    );

  if (error) {
    throw error;
  }

  return data.signedUrl;
}