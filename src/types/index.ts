export type Role =
  | 'ADMIN'
  | 'CONTRIBUTOR'
  | 'VIEWER';

export type Status =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'CHANGES_REQUESTED';

export type SubmissionType =
  | 'NEW_EQUIPMENT'
  | 'REPAIR_CASE'
  | 'MANUAL'
  | 'SPARE_PART'
  | 'PHOTO'
  | 'VIDEO'
  | 'TROUBLESHOOTING'
  | 'TECHNICAL_DOCUMENT'
  | 'SUGGESTED_EDIT';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  role: Role;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Equipment {
  id: string;
  manufacturer: string;
  device_name: string;
  model: string;
  serial_number: string | null;
  category: string;
  device_type: string | null;
  year: number | null;
  country: string | null;
  description: string | null;
  clinical_application: string | null;
  operating_principle: string | null;
  status: string;
  approval_status: Status;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Submission {
  id: string;
  submission_type: SubmissionType;
  entity_id: string | null;
  equipment_id: string | null;
  title: string;
  description: string | null;
  status: Status;
  submitted_by: string;
  reviewed_by: string | null;
  review_note: string | null;
  created_at: string;
  reviewed_at: string | null;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
  related_submission_id: string | null;
}