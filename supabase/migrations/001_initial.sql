-- MedEq Vault production schema
create extension if not exists pgcrypto;

create type public.app_role as enum ('ADMIN','CONTRIBUTOR','VIEWER');
create type public.content_status as enum ('PENDING','APPROVED','REJECTED','CHANGES_REQUESTED');
create type public.submission_type as enum ('NEW_EQUIPMENT','REPAIR_CASE','MANUAL','SPARE_PART','PHOTO','VIDEO','TROUBLESHOOTING','TECHNICAL_DOCUMENT','SUGGESTED_EDIT');

create table public.roles (role public.app_role primary key, description text not null);
insert into public.roles values
('ADMIN','Full platform administration and technical content control'),
('CONTRIBUTOR','Can submit technical content for approval'),
('VIEWER','Read-only access to approved content')
on conflict do nothing;

create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 full_name text not null default '',
 email text not null,
 avatar_url text,
 role public.app_role not null default 'VIEWER',
 is_active boolean not null default true,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create or replace function public.get_my_role() returns public.app_role
language sql stable security definer set search_path=public
as $$ select role from public.profiles where id=auth.uid() and is_active = true $$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path=public
as $$ select coalesce(public.get_my_role() = 'ADMIN', false) $$;

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end; $$;

create table public.equipment (
 id uuid primary key default gen_random_uuid(),
 manufacturer text not null,
 device_name text not null,
 model text not null,
 serial_number text,
 category text not null,
 device_type text,
 year integer,
 country text,
 description text,
 clinical_application text,
 operating_principle text,
 status text not null default 'ACTIVE',
 approval_status public.content_status not null default 'PENDING',
 created_by uuid not null references public.profiles(id),
 updated_by uuid references public.profiles(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create table public.equipment_identifiers (
 id uuid primary key default gen_random_uuid(),
 equipment_id uuid not null references public.equipment(id) on delete cascade,
 field_name text not null,
 field_value text,
 unit text,
 created_by uuid references public.profiles(id),
 created_at timestamptz not null default now(),
 unique(equipment_id, field_name)
);

create table public.manuals (
 id uuid primary key default gen_random_uuid(),
 equipment_id uuid references public.equipment(id) on delete set null,
 title text not null,
 document_type text not null,
 manufacturer text,
 model text,
 version text,
 description text,
 storage_path text not null,
 file_name text not null,
 mime_type text,
 file_size bigint,
 approval_status public.content_status not null default 'PENDING',
 created_by uuid not null references public.profiles(id),
 updated_by uuid references public.profiles(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create table public.repair_cases (
 id uuid primary key default gen_random_uuid(),
 equipment_id uuid not null references public.equipment(id) on delete cascade,
 problem_title text not null,
 reported_fault text,
 symptoms text,
 initial_inspection text,
 measurements text,
 diagnosis text,
 root_cause text,
 corrective_action text,
 parts_replaced text,
 tools_used text,
 testing_procedure text,
 final_result text,
 recommendations text,
 engineer uuid references public.profiles(id),
 repair_date date,
 approval_status public.content_status not null default 'PENDING',
 created_by uuid not null references public.profiles(id),
 updated_by uuid references public.profiles(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create table public.repair_steps (
 id uuid primary key default gen_random_uuid(),
 repair_case_id uuid not null references public.repair_cases(id) on delete cascade,
 step_order integer not null,
 title text,
 description text not null,
 measurement text,
 result text,
 created_at timestamptz not null default now()
);

create table public.spare_parts (
 id uuid primary key default gen_random_uuid(),
 equipment_id uuid references public.equipment(id) on delete set null,
 part_number text,
 part_name text not null,
 description text,
 manufacturer text,
 model text,
 category text,
 compatibility text,
 quantity integer,
 supplier text,
 notes text,
 approval_status public.content_status not null default 'PENDING',
 created_by uuid not null references public.profiles(id),
 updated_by uuid references public.profiles(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create table public.media (
 id uuid primary key default gen_random_uuid(),
 equipment_id uuid references public.equipment(id) on delete set null,
 repair_case_id uuid references public.repair_cases(id) on delete set null,
 media_type text not null check(media_type in ('PHOTO','VIDEO')),
 category text not null,
 title text,
 caption text,
 description text,
 storage_path text not null,
 file_name text not null,
 mime_type text,
 file_size bigint,
 approval_status public.content_status not null default 'PENDING',
 created_by uuid not null references public.profiles(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create table public.troubleshooting_guides (
 id uuid primary key default gen_random_uuid(),
 equipment_id uuid references public.equipment(id) on delete cascade,
 problem text not null,
 possible_causes text,
 diagnostic_steps text,
 measurements text,
 solution text,
 warnings text,
 notes text,
 approval_status public.content_status not null default 'PENDING',
 created_by uuid not null references public.profiles(id),
 updated_by uuid references public.profiles(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

create table public.equipment_revisions (
 id uuid primary key default gen_random_uuid(),
 equipment_id uuid not null references public.equipment(id) on delete cascade,
 proposed_changes jsonb not null,
 reason text,
 status public.content_status not null default 'PENDING',
 submitted_by uuid not null references public.profiles(id),
 reviewed_by uuid references public.profiles(id),
 reviewed_at timestamptz,
 created_at timestamptz not null default now()
);

create table public.submissions (
 id uuid primary key default gen_random_uuid(),
 submission_type public.submission_type not null,
 entity_id uuid,
 equipment_id uuid references public.equipment(id) on delete set null,
 title text not null,
 description text,
 status public.content_status not null default 'PENDING',
 submitted_by uuid not null references public.profiles(id),
 reviewed_by uuid references public.profiles(id),
 review_note text,
 created_at timestamptz not null default now(),
 reviewed_at timestamptz
);

create table public.submission_items (
 id uuid primary key default gen_random_uuid(),
 submission_id uuid not null references public.submissions(id) on delete cascade,
 item_type text not null,
 item_id uuid,
 snapshot jsonb,
 created_at timestamptz not null default now()
);

create table public.notifications (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.profiles(id) on delete cascade,
 title text not null,
 message text not null,
 type text not null default 'INFO',
 related_submission_id uuid references public.submissions(id) on delete set null,
 is_read boolean not null default false,
 created_at timestamptz not null default now()
);

create table public.activity_logs (
 id uuid primary key default gen_random_uuid(),
 user_id uuid references public.profiles(id) on delete set null,
 action text not null,
 object_type text,
 object_id uuid,
 metadata jsonb,
 created_at timestamptz not null default now()
);

create index equipment_search_idx on public.equipment using gin (to_tsvector('simple', coalesce(manufacturer,'') || ' ' || coalesce(device_name,'') || ' ' || coalesce(model,'') || ' ' || coalesce(serial_number,'')));
create index repair_search_idx on public.repair_cases using gin (to_tsvector('simple', coalesce(problem_title,'') || ' ' || coalesce(reported_fault,'') || ' ' || coalesce(symptoms,'') || ' ' || coalesce(diagnosis,'')));
create index spare_search_idx on public.spare_parts using gin (to_tsvector('simple', coalesce(part_number,'') || ' ' || coalesce(part_name,'') || ' ' || coalesce(model,'')));
create index submissions_status_idx on public.submissions(status, created_at desc);
create index notifications_user_idx on public.notifications(user_id, is_read, created_at desc);
create index activity_logs_time_idx on public.activity_logs(created_at desc);

create trigger equipment_updated before update on public.equipment for each row execute function public.touch_updated_at();
create trigger manuals_updated before update on public.manuals for each row execute function public.touch_updated_at();
create trigger repairs_updated before update on public.repair_cases for each row execute function public.touch_updated_at();
create trigger parts_updated before update on public.spare_parts for each row execute function public.touch_updated_at();
create trigger media_updated before update on public.media for each row execute function public.touch_updated_at();
create trigger troubleshooting_updated before update on public.troubleshooting_guides for each row execute function public.touch_updated_at();
create trigger profiles_updated before update on public.profiles for each row execute function public.touch_updated_at();

-- Automatically create a profile on signup. First user must be promoted to ADMIN manually (see README).
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin insert into public.profiles(id, full_name, email) values(new.id, coalesce(new.raw_user_meta_data->>'full_name',''), new.email); return new; end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.equipment enable row level security;
alter table public.equipment_identifiers enable row level security;
alter table public.manuals enable row level security;
alter table public.repair_cases enable row level security;
alter table public.repair_steps enable row level security;
alter table public.spare_parts enable row level security;
alter table public.media enable row level security;
alter table public.troubleshooting_guides enable row level security;
alter table public.equipment_revisions enable row level security;
alter table public.submissions enable row level security;
alter table public.submission_items enable row level security;
alter table public.notifications enable row level security;
alter table public.activity_logs enable row level security;
alter table public.roles enable row level security;

create policy roles_read on public.roles for select to authenticated using (true);
create policy profiles_self_or_admin_read on public.profiles for select to authenticated using (id=auth.uid() or public.is_admin());
create policy profiles_self_update on public.profiles for update to authenticated using (id=auth.uid()) with check (id=auth.uid());
create policy profiles_admin_update on public.profiles for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- Approved content is visible to all authenticated users; owners can see their pending records; admins see all.
create policy equipment_read on public.equipment for select to authenticated using (approval_status='APPROVED' or created_by=auth.uid() or public.is_admin());
create policy equipment_insert on public.equipment for insert to authenticated with check (created_by=auth.uid() and (public.is_admin() or approval_status='PENDING'));
create policy equipment_update on public.equipment for update to authenticated using (created_by=auth.uid() or public.is_admin()) with check (public.is_admin() or (created_by=auth.uid() and approval_status='PENDING'));
create policy equipment_delete on public.equipment for delete to authenticated using (public.is_admin());

create policy identifiers_read on public.equipment_identifiers for select to authenticated using (exists(select 1 from equipment e where e.id=equipment_id and (e.approval_status='APPROVED' or e.created_by=auth.uid() or public.is_admin())));
create policy identifiers_write on public.equipment_identifiers for all to authenticated using (public.is_admin() or created_by=auth.uid()) with check (public.is_admin() or created_by=auth.uid());

create policy manuals_read on public.manuals for select to authenticated using (approval_status='APPROVED' or created_by=auth.uid() or public.is_admin());
create policy manuals_insert on public.manuals for insert to authenticated with check (created_by=auth.uid() and (public.is_admin() or approval_status='PENDING'));
create policy manuals_update on public.manuals for update to authenticated using (created_by=auth.uid() or public.is_admin()) with check (public.is_admin() or (created_by=auth.uid() and approval_status='PENDING'));
create policy manuals_delete on public.manuals for delete to authenticated using (public.is_admin());

create policy repairs_read on public.repair_cases for select to authenticated using (approval_status='APPROVED' or created_by=auth.uid() or public.is_admin());
create policy repairs_insert on public.repair_cases for insert to authenticated with check (created_by=auth.uid() and (public.is_admin() or approval_status='PENDING'));
create policy repairs_update on public.repair_cases for update to authenticated using (created_by=auth.uid() or public.is_admin()) with check (public.is_admin() or (created_by=auth.uid() and approval_status='PENDING'));
create policy repairs_delete on public.repair_cases for delete to authenticated using (public.is_admin());

create policy repair_steps_read on public.repair_steps for select to authenticated using (exists(select 1 from repair_cases r where r.id=repair_case_id and (r.approval_status='APPROVED' or r.created_by=auth.uid() or public.is_admin())));
create policy repair_steps_write on public.repair_steps for all to authenticated using (public.is_admin() or exists(select 1 from repair_cases r where r.id=repair_case_id and r.created_by=auth.uid())) with check (public.is_admin() or exists(select 1 from repair_cases r where r.id=repair_case_id and r.created_by=auth.uid()));

create policy parts_read on public.spare_parts for select to authenticated using (approval_status='APPROVED' or created_by=auth.uid() or public.is_admin());
create policy parts_insert on public.spare_parts for insert to authenticated with check (created_by=auth.uid() and (public.is_admin() or approval_status='PENDING'));
create policy parts_update on public.spare_parts for update to authenticated using (created_by=auth.uid() or public.is_admin()) with check (public.is_admin() or (created_by=auth.uid() and approval_status='PENDING'));
create policy parts_delete on public.spare_parts for delete to authenticated using (public.is_admin());

create policy media_read on public.media for select to authenticated using (approval_status='APPROVED' or created_by=auth.uid() or public.is_admin());
create policy media_insert on public.media for insert to authenticated with check (created_by=auth.uid() and (public.is_admin() or approval_status='PENDING'));
create policy media_update on public.media for update to authenticated using (created_by=auth.uid() or public.is_admin()) with check (public.is_admin() or (created_by=auth.uid() and approval_status='PENDING'));
create policy media_delete on public.media for delete to authenticated using (public.is_admin());

create policy troubleshooting_read on public.troubleshooting_guides for select to authenticated using (approval_status='APPROVED' or created_by=auth.uid() or public.is_admin());
create policy troubleshooting_insert on public.troubleshooting_guides for insert to authenticated with check (created_by=auth.uid() and (public.is_admin() or approval_status='PENDING'));
create policy troubleshooting_update on public.troubleshooting_guides for update to authenticated using (created_by=auth.uid() or public.is_admin()) with check (public.is_admin() or (created_by=auth.uid() and approval_status='PENDING'));
create policy troubleshooting_delete on public.troubleshooting_guides for delete to authenticated using (public.is_admin());

create policy revisions_read on public.equipment_revisions for select to authenticated using (submitted_by=auth.uid() or public.is_admin());
create policy revisions_insert on public.equipment_revisions for insert to authenticated with check (submitted_by=auth.uid() and status='PENDING');
create policy revisions_admin_update on public.equipment_revisions for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy submissions_read on public.submissions for select to authenticated using (submitted_by=auth.uid() or public.is_admin());
create policy submissions_insert on public.submissions for insert to authenticated with check (submitted_by=auth.uid() and status='PENDING');
create policy submissions_admin_update on public.submissions for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy submission_items_read on public.submission_items for select to authenticated using (exists(select 1 from submissions s where s.id=submission_id and (s.submitted_by=auth.uid() or public.is_admin())));
create policy submission_items_insert on public.submission_items for insert to authenticated with check (exists(select 1 from submissions s where s.id=submission_id and s.submitted_by=auth.uid()));

create policy notifications_own on public.notifications for select to authenticated using (user_id=auth.uid() or public.is_admin());
create policy notifications_update on public.notifications for update to authenticated using (user_id=auth.uid() or public.is_admin()) with check (user_id=auth.uid() or public.is_admin());
create policy notifications_admin_insert on public.notifications for insert to authenticated with check (public.is_admin());

create policy activity_read on public.activity_logs for select to authenticated using (public.is_admin() or user_id=auth.uid());
create policy activity_insert on public.activity_logs for insert to authenticated with check (user_id=auth.uid());

-- Storage: private buckets. Object access is granted only to authenticated users; application-level entity RLS determines metadata visibility.
insert into storage.buckets(id,name,public) values
('manuals','manuals',false),('photos','photos',false),('videos','videos',false),('schematics','schematics',false),('documents','documents',false),('avatars','avatars',false)
on conflict (id) do nothing;
create policy storage_authenticated_read on storage.objects for select to authenticated using (
  (bucket_id='avatars' and (owner_id=auth.uid()::text or public.is_admin()))
  or public.is_admin()
  or (bucket_id in ('manuals','photos','videos','schematics','documents') and exists (
    select 1 from public.equipment e
    where e.id = (storage.foldername(name))[1]::uuid and e.approval_status='APPROVED'
  ))
  or (bucket_id in ('manuals','photos','videos','schematics','documents') and owner_id=auth.uid()::text)
);
create policy storage_authenticated_upload on storage.objects for insert to authenticated with check (
  bucket_id in ('manuals','photos','videos','schematics','documents','avatars') and owner_id=auth.uid()::text
);
create policy storage_owner_delete on storage.objects for delete to authenticated using (owner_id=auth.uid()::text or public.is_admin());

-- Admin-only approval RPC. It changes the approved state server-side, not through client-controlled UI checks.
create or replace function public.review_submission(p_submission_id uuid, p_decision public.content_status, p_note text default null)
returns public.submissions language plpgsql security definer set search_path=public
as $$
declare s public.submissions;
begin
 if not public.is_admin() then raise exception 'admin_required'; end if;
 if p_decision not in ('APPROVED','REJECTED','CHANGES_REQUESTED') then raise exception 'invalid_decision'; end if;
 select * into s from public.submissions where id=p_submission_id for update;
 if not found then raise exception 'submission_not_found'; end if;
 update public.submissions set status=p_decision, reviewed_by=auth.uid(), reviewed_at=now(), review_note=p_note where id=p_submission_id returning * into s;
 if s.entity_id is not null then
   case s.submission_type
    when 'NEW_EQUIPMENT' then update public.equipment set approval_status=p_decision, updated_by=auth.uid() where id=s.entity_id;
    when 'REPAIR_CASE' then update public.repair_cases set approval_status=p_decision, updated_by=auth.uid() where id=s.entity_id;
    when 'MANUAL' then update public.manuals set approval_status=p_decision, updated_by=auth.uid() where id=s.entity_id;
    when 'SPARE_PART' then update public.spare_parts set approval_status=p_decision, updated_by=auth.uid() where id=s.entity_id;
    when 'PHOTO','VIDEO' then update public.media set approval_status=p_decision, updated_at=now() where id=s.entity_id;
    when 'TROUBLESHOOTING' then update public.troubleshooting_guides set approval_status=p_decision, updated_by=auth.uid() where id=s.entity_id;
    else null;
   end case;
 end if;
 insert into public.notifications(user_id,title,message,type,related_submission_id)
 values(s.submitted_by,
   case p_decision when 'APPROVED' then 'Submission approved' when 'REJECTED' then 'Submission rejected' else 'Changes requested' end,
   coalesce(p_note,'Your contribution status was updated by an administrator.'),
   case p_decision when 'APPROVED' then 'SUCCESS' when 'REJECTED' then 'ERROR' else 'WARNING' end,
   s.id);
 insert into public.activity_logs(user_id,action,object_type,object_id,metadata) values(auth.uid(),'SUBMISSION_'||p_decision::text,'submission',s.id,jsonb_build_object('note',p_note,'type',s.submission_type));
 return s;
end; $$;

grant execute on function public.get_my_role() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.review_submission(uuid, public.content_status, text) to authenticated;

-- Seed equipment after a user exists via seed.sql. This script only provides the canonical record values.

-- Notify all active admins when a new contribution is submitted.
create or replace function public.notify_admins_on_submission() returns trigger language plpgsql security definer set search_path=public as $$
begin
 insert into public.notifications(user_id,title,message,type,related_submission_id)
 select id,'New contribution requires approval',new.title || ' was submitted for review.','WARNING',new.id
 from public.profiles where role='ADMIN' and is_active=true;
 return new;
end; $$;
create trigger submission_admin_notification after insert on public.submissions for each row execute function public.notify_admins_on_submission();

-- Prevent privilege escalation through direct profile updates. Only an admin may change a role.
create or replace function public.prevent_non_admin_role_change() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if old.role is distinct from new.role and not public.is_admin() then raise exception 'only_admin_can_change_role'; end if;
 if old.id is distinct from auth.uid() and not public.is_admin() then raise exception 'profile_update_forbidden'; end if;
 return new;
end; $$;
create trigger profile_role_guard before update on public.profiles for each row execute function public.prevent_non_admin_role_change();
