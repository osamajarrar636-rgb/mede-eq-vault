


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."app_role" AS ENUM (
    'ADMIN',
    'CONTRIBUTOR',
    'VIEWER'
);


ALTER TYPE "public"."app_role" OWNER TO "postgres";


CREATE TYPE "public"."content_status" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED',
    'CHANGES_REQUESTED'
);


ALTER TYPE "public"."content_status" OWNER TO "postgres";


CREATE TYPE "public"."submission_type" AS ENUM (
    'NEW_EQUIPMENT',
    'REPAIR_CASE',
    'MANUAL',
    'SPARE_PART',
    'PHOTO',
    'VIDEO',
    'TROUBLESHOOTING',
    'TECHNICAL_DOCUMENT',
    'SUGGESTED_EDIT'
);


ALTER TYPE "public"."submission_type" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_role"() RETURNS "public"."app_role"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select role
  from public.profiles
  where id = auth.uid()
    and is_active = true
  limit 1;
$$;


ALTER FUNCTION "public"."get_my_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  insert into public.profiles (
    id,
    full_name,
    email
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.email, '')
  );

  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select coalesce(public.get_my_role() = 'ADMIN', false);
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_revision"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.revision_history (table_name, record_id, action, old_data, new_data, performed_by)
  VALUES (TG_TABLE_NAME, NEW.id, TG_OP, row_to_json(OLD), row_to_json(NEW), auth.uid());
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."log_revision"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_admins_on_submission"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin

    insert into public.notifications (
        user_id,
        title,
        message,
        type,
        related_submission_id
    )

    select
        id,
        'New contribution requires approval',
        new.title || ' was submitted for review.',
        'WARNING',
        new.id

    from public.profiles

    where role = 'ADMIN'
      and is_active = true;

    return new;

end;
$$;


ALTER FUNCTION "public"."notify_admins_on_submission"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."submissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "submission_type" "public"."submission_type" NOT NULL,
    "entity_id" "uuid",
    "equipment_id" "uuid",
    "title" "text" NOT NULL,
    "description" "text",
    "status" "public"."content_status" DEFAULT 'PENDING'::"public"."content_status" NOT NULL,
    "submitted_by" "uuid" NOT NULL,
    "reviewed_by" "uuid",
    "review_note" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "reviewed_at" timestamp with time zone
);


ALTER TABLE "public"."submissions" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."review_submission"("p_submission_id" "uuid", "p_decision" "public"."content_status", "p_note" "text" DEFAULT NULL::"text") RETURNS "public"."submissions"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
    s public.submissions;
begin

    if not public.is_admin() then
        raise exception 'admin_required';
    end if;

    if p_decision not in (
        'APPROVED',
        'REJECTED',
        'CHANGES_REQUESTED'
    ) then
        raise exception 'invalid_decision';
    end if;

    select *
    into s
    from public.submissions
    where id = p_submission_id
    for update;

    if not found then
        raise exception 'submission_not_found';
    end if;

    update public.submissions
    set
        status = p_decision,
        reviewed_by = auth.uid(),
        reviewed_at = now(),
        review_note = p_note
    where id = p_submission_id
    returning *
    into s;


    /*
     * Update the actual submitted content.
     */

    if s.entity_id is not null then

        case s.submission_type

            when 'NEW_EQUIPMENT' then

                update public.equipment
                set
                    approval_status = p_decision,
                    updated_by = auth.uid(),
                    updated_at = now()
                where id = s.entity_id;


            when 'REPAIR_CASE' then

                /*
                 * Update the Repair Case itself.
                 */
                update public.repair_cases
                set
                    approval_status = p_decision,
                    updated_by = auth.uid(),
                    updated_at = now()
                where id = s.entity_id;


                /*
                 * Update attachments belonging to this Repair Case.
                 */
                update public.media
                set
                    approval_status = p_decision,
                    updated_at = now()
                where repair_case_id = s.entity_id;


            when 'MANUAL' then

                update public.manuals
                set
                    approval_status = p_decision,
                    updated_by = auth.uid(),
                    updated_at = now()
                where id = s.entity_id;


            when 'SPARE_PART' then

                update public.spare_parts
                set
                    approval_status = p_decision,
                    updated_by = auth.uid(),
                    updated_at = now()
                where id = s.entity_id;


            when 'PHOTO', 'VIDEO' then

                update public.media
                set
                    approval_status = p_decision,
                    updated_at = now()
                where id = s.entity_id;


            when 'TROUBLESHOOTING' then

                update public.troubleshooting_guides
                set
                    approval_status = p_decision,
                    updated_by = auth.uid(),
                    updated_at = now()
                where id = s.entity_id;


            else
                null;

        end case;

    end if;


    /*
     * Notify the contributor.
     */

    insert into public.notifications (
        user_id,
        title,
        message,
        type,
        related_submission_id
    )
    values (
        s.submitted_by,

        case p_decision
            when 'APPROVED'
                then 'Submission approved'

            when 'REJECTED'
                then 'Submission rejected'

            else
                'Changes requested'
        end,

        coalesce(
            p_note,
            'Your contribution status was updated by an administrator.'
        ),

        case p_decision
            when 'APPROVED'
                then 'SUCCESS'

            when 'REJECTED'
                then 'ERROR'

            else
                'WARNING'
        end,

        s.id
    );


    /*
     * Create audit log.
     */

    insert into public.activity_logs (
        user_id,
        action,
        object_type,
        object_id,
        metadata
    )
    values (
        auth.uid(),
        'SUBMISSION_' || p_decision::text,
        'submission',
        s.id,
        jsonb_build_object(
            'note', p_note,
            'type', s.submission_type
        )
    );


    return s;

end;
$$;


ALTER FUNCTION "public"."review_submission"("p_submission_id" "uuid", "p_decision" "public"."content_status", "p_note" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."touch_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
    new.updated_at = now();
    return new;
end;
$$;


ALTER FUNCTION "public"."touch_updated_at"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."activity_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "action" "text" NOT NULL,
    "object_type" "text",
    "object_id" "uuid",
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."activity_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."equipment" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "manufacturer" "text" NOT NULL,
    "device_name" "text" NOT NULL,
    "model" "text" NOT NULL,
    "serial_number" "text",
    "category" "text" NOT NULL,
    "device_type" "text",
    "year" integer,
    "country" "text",
    "description" "text",
    "clinical_application" "text",
    "operating_principle" "text",
    "status" "text" DEFAULT 'ACTIVE'::"text" NOT NULL,
    "approval_status" "public"."content_status" DEFAULT 'PENDING'::"public"."content_status" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "updated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."equipment" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."equipment_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."equipment_categories" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."equipment_category_review" AS
 SELECT "id",
    "manufacturer",
    "device_name",
    "model",
    "category" AS "current_category",
        CASE
            WHEN ("lower"(((COALESCE("device_name", ''::"text") || ' '::"text") || COALESCE("manufacturer", ''::"text"))) ~ '(autoclave|steam sterilizer|steam sterilizer|gas sterilizer|low temperature sterilizer|sterlizer|sterilazer)'::"text") THEN 'Autoclave / Steam Sterilizer'::"text"
            WHEN ("lower"(((COALESCE("device_name", ''::"text") || ' '::"text") || COALESCE("manufacturer", ''::"text"))) ~ '(patient monitor|bed side monitor|bedside monitor|icu monitor|vital sign monitor|vital signe monitor|nibp.*spo2 monitor|blood pressure monitor)'::"text") THEN 'Patient Monitor'::"text"
            WHEN ("lower"(((COALESCE("device_name", ''::"text") || ' '::"text") || COALESCE("manufacturer", ''::"text"))) ~ '(ventilator|cpap|spap|nasal cpap|high flow nasal|vapotherm)'::"text") THEN 'Ventilator'::"text"
            WHEN ("lower"(((COALESCE("device_name", ''::"text") || ' '::"text") || COALESCE("manufacturer", ''::"text"))) ~ '(anesthesia machine)'::"text") THEN 'Anesthesia Machine'::"text"
            WHEN ("lower"(((COALESCE("device_name", ''::"text") || ' '::"text") || COALESCE("manufacturer", ''::"text"))) ~ '(hemodialysis|dialysis machine)'::"text") THEN 'Dialysis Machine'::"text"
            WHEN ("lower"(((COALESCE("device_name", ''::"text") || ' '::"text") || COALESCE("manufacturer", ''::"text"))) ~ '(infusion pump|syringe pump|infusion system)'::"text") THEN 'Infusion Pump'::"text"
            WHEN ("lower"(((COALESCE("device_name", ''::"text") || ' '::"text") || COALESCE("manufacturer", ''::"text"))) ~ '(defibrillator|defibrilator)'::"text") THEN 'Defibrillator'::"text"
            WHEN ("lower"(((COALESCE("device_name", ''::"text") || ' '::"text") || COALESCE("manufacturer", ''::"text"))) ~ '(electrocardiograph|electro cardio graph|ecg)'::"text") THEN 'ECG'::"text"
            WHEN ("lower"(((COALESCE("device_name", ''::"text") || ' '::"text") || COALESCE("manufacturer", ''::"text"))) ~ '(ultrasound|ultra sound)'::"text") THEN 'Ultrasound'::"text"
            WHEN ("lower"(((COALESCE("device_name", ''::"text") || ' '::"text") || COALESCE("manufacturer", ''::"text"))) ~ '(x-ray|x ray|radiography|c-arm|c arm|fluoroscopy|floroscpy)'::"text") THEN 'X-Ray'::"text"
            WHEN ("lower"(((COALESCE("device_name", ''::"text") || ' '::"text") || COALESCE("manufacturer", ''::"text"))) ~ '(cr system|dr system|digital radiography|mobile dr|dr x-ray)'::"text") THEN 'CR / DR System'::"text"
            WHEN ("lower"(((COALESCE("device_name", ''::"text") || ' '::"text") || COALESCE("manufacturer", ''::"text"))) ~ '(operation light|operating light|surgical light|operation lamp|led operation|xenon light source)'::"text") THEN 'Surgical Light'::"text"
            WHEN ("lower"(((COALESCE("device_name", ''::"text") || ' '::"text") || COALESCE("manufacturer", ''::"text"))) ~ '(dental chair)'::"text") THEN 'Dental Chair'::"text"
            WHEN ("lower"(((COALESCE("device_name", ''::"text") || ' '::"text") || COALESCE("manufacturer", ''::"text"))) ~ '(centrifuge|centerifuge|spectrophot|electrolyte analyzer|blood gas analyzer|hematology analyzer|blood cell counter|microscope|lab incubator|incubator|biological safety cabinet|cytotoxic safety cabinet|plate shaker|tube rotator|tube sealer|blood grouping|elisa|e l i s a|refrigerated centrifuge|balance for lab)'::"text") THEN 'Laboratory Equipment'::"text"
            ELSE 'Other'::"text"
        END AS "suggested_category"
   FROM "public"."equipment" "e";


ALTER VIEW "public"."equipment_category_review" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."equipment_identifiers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "equipment_id" "uuid" NOT NULL,
    "field_name" "text" NOT NULL,
    "field_value" "text",
    "unit" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."equipment_identifiers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."equipment_revisions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "equipment_id" "uuid" NOT NULL,
    "proposed_changes" "jsonb" NOT NULL,
    "reason" "text",
    "status" "public"."content_status" DEFAULT 'PENDING'::"public"."content_status" NOT NULL,
    "submitted_by" "uuid" NOT NULL,
    "reviewed_by" "uuid",
    "reviewed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."equipment_revisions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."manuals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "equipment_id" "uuid",
    "title" "text" NOT NULL,
    "document_type" "text" NOT NULL,
    "manufacturer" "text",
    "model" "text",
    "version" "text",
    "description" "text",
    "storage_path" "text" NOT NULL,
    "file_name" "text" NOT NULL,
    "mime_type" "text",
    "file_size" bigint,
    "approval_status" "public"."content_status" DEFAULT 'PENDING'::"public"."content_status" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "updated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."manuals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."media" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "equipment_id" "uuid",
    "repair_case_id" "uuid",
    "media_type" "text" NOT NULL,
    "category" "text" NOT NULL,
    "title" "text",
    "caption" "text",
    "description" "text",
    "storage_path" "text" NOT NULL,
    "file_name" "text" NOT NULL,
    "mime_type" "text",
    "file_size" bigint,
    "approval_status" "public"."content_status" DEFAULT 'PENDING'::"public"."content_status" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "updated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "media_media_type_check" CHECK (("media_type" = ANY (ARRAY['PHOTO'::"text", 'VIDEO'::"text"])))
);


ALTER TABLE "public"."media" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "type" "text" DEFAULT 'INFO'::"text" NOT NULL,
    "related_submission_id" "uuid",
    "is_read" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "full_name" "text" DEFAULT ''::"text" NOT NULL,
    "email" "text" NOT NULL,
    "avatar_url" "text",
    "role" "public"."app_role" DEFAULT 'VIEWER'::"public"."app_role" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."repair_cases" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "equipment_id" "uuid" NOT NULL,
    "problem_title" "text" NOT NULL,
    "reported_fault" "text",
    "symptoms" "text",
    "initial_inspection" "text",
    "measurements" "text",
    "diagnosis" "text",
    "root_cause" "text",
    "corrective_action" "text",
    "parts_replaced" "text",
    "tools_used" "text",
    "testing_procedure" "text",
    "final_result" "text",
    "recommendations" "text",
    "engineer" "uuid",
    "repair_date" "date",
    "approval_status" "public"."content_status" DEFAULT 'PENDING'::"public"."content_status" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "updated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."repair_cases" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."repair_steps" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "repair_case_id" "uuid" NOT NULL,
    "step_order" integer NOT NULL,
    "title" "text",
    "description" "text" NOT NULL,
    "measurement" "text",
    "result" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."repair_steps" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."spare_parts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "equipment_id" "uuid",
    "part_number" "text",
    "part_name" "text" NOT NULL,
    "description" "text",
    "manufacturer" "text",
    "model" "text",
    "category" "text",
    "compatibility" "text",
    "quantity" integer,
    "supplier" "text",
    "notes" "text",
    "approval_status" "public"."content_status" DEFAULT 'PENDING'::"public"."content_status" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "updated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."spare_parts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."submission_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "submission_id" "uuid" NOT NULL,
    "item_type" "text" NOT NULL,
    "item_id" "uuid",
    "snapshot" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."submission_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."troubleshooting_guides" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "equipment_id" "uuid",
    "problem" "text" NOT NULL,
    "possible_causes" "text",
    "diagnostic_steps" "text",
    "measurements" "text",
    "solution" "text",
    "warnings" "text",
    "notes" "text",
    "approval_status" "public"."content_status" DEFAULT 'PENDING'::"public"."content_status" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "updated_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."troubleshooting_guides" OWNER TO "postgres";


ALTER TABLE ONLY "public"."activity_logs"
    ADD CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."equipment_categories"
    ADD CONSTRAINT "equipment_categories_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."equipment_categories"
    ADD CONSTRAINT "equipment_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."equipment_identifiers"
    ADD CONSTRAINT "equipment_identifiers_equipment_id_field_name_key" UNIQUE ("equipment_id", "field_name");



ALTER TABLE ONLY "public"."equipment_identifiers"
    ADD CONSTRAINT "equipment_identifiers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."equipment"
    ADD CONSTRAINT "equipment_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."equipment_revisions"
    ADD CONSTRAINT "equipment_revisions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."manuals"
    ADD CONSTRAINT "manuals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."media"
    ADD CONSTRAINT "media_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."repair_cases"
    ADD CONSTRAINT "repair_cases_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."repair_steps"
    ADD CONSTRAINT "repair_steps_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."spare_parts"
    ADD CONSTRAINT "spare_parts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."submission_items"
    ADD CONSTRAINT "submission_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."submissions"
    ADD CONSTRAINT "submissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."troubleshooting_guides"
    ADD CONSTRAINT "troubleshooting_guides_pkey" PRIMARY KEY ("id");



CREATE INDEX "activity_logs_action_idx" ON "public"."activity_logs" USING "btree" ("action");



CREATE INDEX "activity_logs_object_idx" ON "public"."activity_logs" USING "btree" ("object_type", "object_id");



CREATE INDEX "activity_logs_time_idx" ON "public"."activity_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "activity_logs_user_idx" ON "public"."activity_logs" USING "btree" ("user_id");



CREATE INDEX "equipment_category_idx" ON "public"."equipment" USING "btree" ("category");



CREATE INDEX "equipment_identifiers_equipment_idx" ON "public"."equipment_identifiers" USING "btree" ("equipment_id");



CREATE INDEX "equipment_identifiers_field_idx" ON "public"."equipment_identifiers" USING "btree" ("field_name");



CREATE INDEX "equipment_manufacturer_idx" ON "public"."equipment" USING "btree" ("manufacturer");



CREATE INDEX "equipment_model_idx" ON "public"."equipment" USING "btree" ("model");



CREATE INDEX "equipment_revisions_equipment_idx" ON "public"."equipment_revisions" USING "btree" ("equipment_id");



CREATE INDEX "equipment_revisions_status_idx" ON "public"."equipment_revisions" USING "btree" ("status");



CREATE INDEX "equipment_revisions_submitter_idx" ON "public"."equipment_revisions" USING "btree" ("submitted_by");



CREATE INDEX "equipment_status_idx" ON "public"."equipment" USING "btree" ("approval_status");



CREATE INDEX "manuals_equipment_idx" ON "public"."manuals" USING "btree" ("equipment_id");



CREATE INDEX "manuals_search_idx" ON "public"."manuals" USING "gin" ("to_tsvector"('"simple"'::"regconfig", ((((((COALESCE("title", ''::"text") || ' '::"text") || COALESCE("manufacturer", ''::"text")) || ' '::"text") || COALESCE("model", ''::"text")) || ' '::"text") || COALESCE("description", ''::"text"))));



CREATE INDEX "manuals_status_idx" ON "public"."manuals" USING "btree" ("approval_status");



CREATE INDEX "manuals_type_idx" ON "public"."manuals" USING "btree" ("document_type");



CREATE INDEX "media_category_idx" ON "public"."media" USING "btree" ("category");



CREATE INDEX "media_equipment_idx" ON "public"."media" USING "btree" ("equipment_id");



CREATE INDEX "media_repair_case_idx" ON "public"."media" USING "btree" ("repair_case_id");



CREATE INDEX "media_status_idx" ON "public"."media" USING "btree" ("approval_status");



CREATE INDEX "media_type_idx" ON "public"."media" USING "btree" ("media_type");



CREATE INDEX "notifications_user_idx" ON "public"."notifications" USING "btree" ("user_id", "is_read", "created_at" DESC);



CREATE INDEX "repair_cases_date_idx" ON "public"."repair_cases" USING "btree" ("repair_date");



CREATE INDEX "repair_cases_engineer_idx" ON "public"."repair_cases" USING "btree" ("engineer");



CREATE INDEX "repair_cases_equipment_idx" ON "public"."repair_cases" USING "btree" ("equipment_id");



CREATE INDEX "repair_cases_search_idx" ON "public"."repair_cases" USING "gin" ("to_tsvector"('"simple"'::"regconfig", ((((((((((COALESCE("problem_title", ''::"text") || ' '::"text") || COALESCE("reported_fault", ''::"text")) || ' '::"text") || COALESCE("symptoms", ''::"text")) || ' '::"text") || COALESCE("diagnosis", ''::"text")) || ' '::"text") || COALESCE("root_cause", ''::"text")) || ' '::"text") || COALESCE("corrective_action", ''::"text"))));



CREATE INDEX "repair_cases_status_idx" ON "public"."repair_cases" USING "btree" ("approval_status");



CREATE INDEX "repair_steps_case_idx" ON "public"."repair_steps" USING "btree" ("repair_case_id");



CREATE INDEX "repair_steps_order_idx" ON "public"."repair_steps" USING "btree" ("repair_case_id", "step_order");



CREATE INDEX "spare_parts_equipment_idx" ON "public"."spare_parts" USING "btree" ("equipment_id");



CREATE INDEX "spare_parts_model_idx" ON "public"."spare_parts" USING "btree" ("model");



CREATE INDEX "spare_parts_part_name_idx" ON "public"."spare_parts" USING "btree" ("part_name");



CREATE INDEX "spare_parts_part_number_idx" ON "public"."spare_parts" USING "btree" ("part_number");



CREATE INDEX "spare_parts_search_idx" ON "public"."spare_parts" USING "gin" ("to_tsvector"('"simple"'::"regconfig", ((((((((((COALESCE("part_number", ''::"text") || ' '::"text") || COALESCE("part_name", ''::"text")) || ' '::"text") || COALESCE("manufacturer", ''::"text")) || ' '::"text") || COALESCE("model", ''::"text")) || ' '::"text") || COALESCE("description", ''::"text")) || ' '::"text") || COALESCE("compatibility", ''::"text"))));



CREATE INDEX "spare_parts_status_idx" ON "public"."spare_parts" USING "btree" ("approval_status");



CREATE INDEX "submission_items_item_idx" ON "public"."submission_items" USING "btree" ("item_id");



CREATE INDEX "submission_items_submission_idx" ON "public"."submission_items" USING "btree" ("submission_id");



CREATE INDEX "submission_items_type_idx" ON "public"."submission_items" USING "btree" ("item_type");



CREATE INDEX "submissions_equipment_idx" ON "public"."submissions" USING "btree" ("equipment_id");



CREATE INDEX "submissions_status_idx" ON "public"."submissions" USING "btree" ("status", "created_at" DESC);



CREATE INDEX "submissions_type_idx" ON "public"."submissions" USING "btree" ("submission_type");



CREATE INDEX "submissions_user_idx" ON "public"."submissions" USING "btree" ("submitted_by");



CREATE INDEX "troubleshooting_equipment_idx" ON "public"."troubleshooting_guides" USING "btree" ("equipment_id");



CREATE INDEX "troubleshooting_search_idx" ON "public"."troubleshooting_guides" USING "gin" ("to_tsvector"('"simple"'::"regconfig", ((((((((COALESCE("problem", ''::"text") || ' '::"text") || COALESCE("possible_causes", ''::"text")) || ' '::"text") || COALESCE("diagnostic_steps", ''::"text")) || ' '::"text") || COALESCE("solution", ''::"text")) || ' '::"text") || COALESCE("notes", ''::"text"))));



CREATE INDEX "troubleshooting_status_idx" ON "public"."troubleshooting_guides" USING "btree" ("approval_status");



CREATE OR REPLACE TRIGGER "equipment_updated" BEFORE UPDATE ON "public"."equipment" FOR EACH ROW EXECUTE FUNCTION "public"."touch_updated_at"();



CREATE OR REPLACE TRIGGER "manuals_updated" BEFORE UPDATE ON "public"."manuals" FOR EACH ROW EXECUTE FUNCTION "public"."touch_updated_at"();



CREATE OR REPLACE TRIGGER "media_updated" BEFORE UPDATE ON "public"."media" FOR EACH ROW EXECUTE FUNCTION "public"."touch_updated_at"();



CREATE OR REPLACE TRIGGER "repairs_updated" BEFORE UPDATE ON "public"."repair_cases" FOR EACH ROW EXECUTE FUNCTION "public"."touch_updated_at"();



CREATE OR REPLACE TRIGGER "spare_parts_updated" BEFORE UPDATE ON "public"."spare_parts" FOR EACH ROW EXECUTE FUNCTION "public"."touch_updated_at"();



CREATE OR REPLACE TRIGGER "submission_admin_notification" AFTER INSERT ON "public"."submissions" FOR EACH ROW EXECUTE FUNCTION "public"."notify_admins_on_submission"();



CREATE OR REPLACE TRIGGER "troubleshooting_updated" BEFORE UPDATE ON "public"."troubleshooting_guides" FOR EACH ROW EXECUTE FUNCTION "public"."touch_updated_at"();



ALTER TABLE ONLY "public"."activity_logs"
    ADD CONSTRAINT "activity_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."equipment"
    ADD CONSTRAINT "equipment_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."equipment_identifiers"
    ADD CONSTRAINT "equipment_identifiers_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."equipment_identifiers"
    ADD CONSTRAINT "equipment_identifiers_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "public"."equipment"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."equipment_revisions"
    ADD CONSTRAINT "equipment_revisions_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "public"."equipment"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."equipment_revisions"
    ADD CONSTRAINT "equipment_revisions_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."equipment_revisions"
    ADD CONSTRAINT "equipment_revisions_submitted_by_fkey" FOREIGN KEY ("submitted_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."equipment"
    ADD CONSTRAINT "equipment_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."manuals"
    ADD CONSTRAINT "manuals_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."manuals"
    ADD CONSTRAINT "manuals_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "public"."equipment"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."manuals"
    ADD CONSTRAINT "manuals_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."media"
    ADD CONSTRAINT "media_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."media"
    ADD CONSTRAINT "media_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "public"."equipment"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."media"
    ADD CONSTRAINT "media_repair_case_id_fkey" FOREIGN KEY ("repair_case_id") REFERENCES "public"."repair_cases"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."media"
    ADD CONSTRAINT "media_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_related_submission_id_fkey" FOREIGN KEY ("related_submission_id") REFERENCES "public"."submissions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."repair_cases"
    ADD CONSTRAINT "repair_cases_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."repair_cases"
    ADD CONSTRAINT "repair_cases_engineer_fkey" FOREIGN KEY ("engineer") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."repair_cases"
    ADD CONSTRAINT "repair_cases_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "public"."equipment"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."repair_cases"
    ADD CONSTRAINT "repair_cases_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."repair_steps"
    ADD CONSTRAINT "repair_steps_repair_case_id_fkey" FOREIGN KEY ("repair_case_id") REFERENCES "public"."repair_cases"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."spare_parts"
    ADD CONSTRAINT "spare_parts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."spare_parts"
    ADD CONSTRAINT "spare_parts_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "public"."equipment"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."spare_parts"
    ADD CONSTRAINT "spare_parts_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."submission_items"
    ADD CONSTRAINT "submission_items_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."submissions"
    ADD CONSTRAINT "submissions_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "public"."equipment"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."submissions"
    ADD CONSTRAINT "submissions_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."submissions"
    ADD CONSTRAINT "submissions_submitted_by_fkey" FOREIGN KEY ("submitted_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."troubleshooting_guides"
    ADD CONSTRAINT "troubleshooting_guides_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."troubleshooting_guides"
    ADD CONSTRAINT "troubleshooting_guides_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "public"."equipment"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."troubleshooting_guides"
    ADD CONSTRAINT "troubleshooting_guides_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id");



ALTER TABLE "public"."activity_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "activity_logs_insert" ON "public"."activity_logs" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "activity_logs_read" ON "public"."activity_logs" FOR SELECT TO "authenticated" USING (("public"."is_admin"() OR ("user_id" = "auth"."uid"())));



ALTER TABLE "public"."equipment" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."equipment_categories" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "equipment_delete" ON "public"."equipment" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



ALTER TABLE "public"."equipment_identifiers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "equipment_insert" ON "public"."equipment" FOR INSERT TO "authenticated" WITH CHECK ((("created_by" = "auth"."uid"()) AND ("public"."is_admin"() OR ("approval_status" = 'PENDING'::"public"."content_status"))));



CREATE POLICY "equipment_read" ON "public"."equipment" FOR SELECT TO "authenticated" USING ((("approval_status" = 'APPROVED'::"public"."content_status") OR ("created_by" = "auth"."uid"()) OR "public"."is_admin"()));



ALTER TABLE "public"."equipment_revisions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "equipment_update" ON "public"."equipment" FOR UPDATE TO "authenticated" USING ((("created_by" = "auth"."uid"()) OR "public"."is_admin"())) WITH CHECK (("public"."is_admin"() OR (("created_by" = "auth"."uid"()) AND ("approval_status" = 'PENDING'::"public"."content_status"))));



CREATE POLICY "identifiers_delete" ON "public"."equipment_identifiers" FOR DELETE TO "authenticated" USING ((("created_by" = "auth"."uid"()) OR "public"."is_admin"()));



CREATE POLICY "identifiers_insert" ON "public"."equipment_identifiers" FOR INSERT TO "authenticated" WITH CHECK ((("created_by" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."equipment" "e"
  WHERE (("e"."id" = "equipment_identifiers"."equipment_id") AND (("e"."created_by" = "auth"."uid"()) OR "public"."is_admin"()))))));



CREATE POLICY "identifiers_read" ON "public"."equipment_identifiers" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."equipment" "e"
  WHERE (("e"."id" = "equipment_identifiers"."equipment_id") AND (("e"."approval_status" = 'APPROVED'::"public"."content_status") OR ("e"."created_by" = "auth"."uid"()) OR "public"."is_admin"())))));



CREATE POLICY "identifiers_update" ON "public"."equipment_identifiers" FOR UPDATE TO "authenticated" USING ((("created_by" = "auth"."uid"()) OR "public"."is_admin"())) WITH CHECK ((("created_by" = "auth"."uid"()) OR "public"."is_admin"()));



ALTER TABLE "public"."manuals" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "manuals_delete" ON "public"."manuals" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "manuals_insert" ON "public"."manuals" FOR INSERT TO "authenticated" WITH CHECK ((("created_by" = "auth"."uid"()) AND ("public"."is_admin"() OR ("approval_status" = 'PENDING'::"public"."content_status"))));



CREATE POLICY "manuals_read" ON "public"."manuals" FOR SELECT TO "authenticated" USING ((("approval_status" = 'APPROVED'::"public"."content_status") OR ("created_by" = "auth"."uid"()) OR "public"."is_admin"()));



CREATE POLICY "manuals_update" ON "public"."manuals" FOR UPDATE TO "authenticated" USING ((("created_by" = "auth"."uid"()) OR "public"."is_admin"())) WITH CHECK (("public"."is_admin"() OR (("created_by" = "auth"."uid"()) AND ("approval_status" = 'PENDING'::"public"."content_status"))));



ALTER TABLE "public"."media" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "media_delete" ON "public"."media" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "media_insert" ON "public"."media" FOR INSERT TO "authenticated" WITH CHECK ((("created_by" = "auth"."uid"()) AND ("public"."is_admin"() OR ("approval_status" = 'PENDING'::"public"."content_status"))));



CREATE POLICY "media_read" ON "public"."media" FOR SELECT TO "authenticated" USING ((("approval_status" = 'APPROVED'::"public"."content_status") OR ("created_by" = "auth"."uid"()) OR "public"."is_admin"()));



CREATE POLICY "media_update" ON "public"."media" FOR UPDATE TO "authenticated" USING ((("created_by" = "auth"."uid"()) OR "public"."is_admin"())) WITH CHECK (("public"."is_admin"() OR (("created_by" = "auth"."uid"()) AND ("approval_status" = 'PENDING'::"public"."content_status"))));



ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "notifications_admin_insert" ON "public"."notifications" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_admin"());



CREATE POLICY "notifications_read" ON "public"."notifications" FOR SELECT TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR "public"."is_admin"()));



CREATE POLICY "notifications_update" ON "public"."notifications" FOR UPDATE TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR "public"."is_admin"())) WITH CHECK ((("user_id" = "auth"."uid"()) OR "public"."is_admin"()));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_admin_update" ON "public"."profiles" FOR UPDATE TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "profiles_self_read" ON "public"."profiles" FOR SELECT TO "authenticated" USING ((("id" = "auth"."uid"()) OR "public"."is_admin"()));



CREATE POLICY "profiles_self_update" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("id" = "auth"."uid"())) WITH CHECK (("id" = "auth"."uid"()));



ALTER TABLE "public"."repair_cases" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."repair_steps" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "repair_steps_delete" ON "public"."repair_steps" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."repair_cases" "r"
  WHERE (("r"."id" = "repair_steps"."repair_case_id") AND (("r"."created_by" = "auth"."uid"()) OR "public"."is_admin"())))));



CREATE POLICY "repair_steps_insert" ON "public"."repair_steps" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."repair_cases" "r"
  WHERE (("r"."id" = "repair_steps"."repair_case_id") AND (("r"."created_by" = "auth"."uid"()) OR "public"."is_admin"())))));



CREATE POLICY "repair_steps_read" ON "public"."repair_steps" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."repair_cases" "r"
  WHERE (("r"."id" = "repair_steps"."repair_case_id") AND (("r"."approval_status" = 'APPROVED'::"public"."content_status") OR ("r"."created_by" = "auth"."uid"()) OR "public"."is_admin"())))));



CREATE POLICY "repair_steps_update" ON "public"."repair_steps" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."repair_cases" "r"
  WHERE (("r"."id" = "repair_steps"."repair_case_id") AND (("r"."created_by" = "auth"."uid"()) OR "public"."is_admin"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."repair_cases" "r"
  WHERE (("r"."id" = "repair_steps"."repair_case_id") AND (("r"."created_by" = "auth"."uid"()) OR "public"."is_admin"())))));



CREATE POLICY "repairs_delete" ON "public"."repair_cases" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "repairs_insert" ON "public"."repair_cases" FOR INSERT TO "authenticated" WITH CHECK ((("created_by" = "auth"."uid"()) AND ("public"."is_admin"() OR ("approval_status" = 'PENDING'::"public"."content_status"))));



CREATE POLICY "repairs_read" ON "public"."repair_cases" FOR SELECT TO "authenticated" USING ((("approval_status" = 'APPROVED'::"public"."content_status") OR ("created_by" = "auth"."uid"()) OR "public"."is_admin"()));



CREATE POLICY "repairs_update" ON "public"."repair_cases" FOR UPDATE TO "authenticated" USING ((("created_by" = "auth"."uid"()) OR "public"."is_admin"())) WITH CHECK (("public"."is_admin"() OR (("created_by" = "auth"."uid"()) AND ("approval_status" = 'PENDING'::"public"."content_status"))));



CREATE POLICY "revisions_admin_update" ON "public"."equipment_revisions" FOR UPDATE TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "revisions_insert" ON "public"."equipment_revisions" FOR INSERT TO "authenticated" WITH CHECK ((("submitted_by" = "auth"."uid"()) AND ("status" = 'PENDING'::"public"."content_status")));



CREATE POLICY "revisions_read" ON "public"."equipment_revisions" FOR SELECT TO "authenticated" USING ((("submitted_by" = "auth"."uid"()) OR "public"."is_admin"()));



ALTER TABLE "public"."spare_parts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "spare_parts_delete" ON "public"."spare_parts" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "spare_parts_insert" ON "public"."spare_parts" FOR INSERT TO "authenticated" WITH CHECK ((("created_by" = "auth"."uid"()) AND ("public"."is_admin"() OR ("approval_status" = 'PENDING'::"public"."content_status"))));



CREATE POLICY "spare_parts_read" ON "public"."spare_parts" FOR SELECT TO "authenticated" USING ((("approval_status" = 'APPROVED'::"public"."content_status") OR ("created_by" = "auth"."uid"()) OR "public"."is_admin"()));



CREATE POLICY "spare_parts_update" ON "public"."spare_parts" FOR UPDATE TO "authenticated" USING ((("created_by" = "auth"."uid"()) OR "public"."is_admin"())) WITH CHECK (("public"."is_admin"() OR (("created_by" = "auth"."uid"()) AND ("approval_status" = 'PENDING'::"public"."content_status"))));



ALTER TABLE "public"."submission_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "submission_items_delete" ON "public"."submission_items" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."submissions" "s"
  WHERE (("s"."id" = "submission_items"."submission_id") AND (("s"."submitted_by" = "auth"."uid"()) OR "public"."is_admin"())))));



CREATE POLICY "submission_items_insert" ON "public"."submission_items" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."submissions" "s"
  WHERE (("s"."id" = "submission_items"."submission_id") AND ("s"."submitted_by" = "auth"."uid"()) AND ("s"."status" = 'PENDING'::"public"."content_status")))));



CREATE POLICY "submission_items_read" ON "public"."submission_items" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."submissions" "s"
  WHERE (("s"."id" = "submission_items"."submission_id") AND (("s"."submitted_by" = "auth"."uid"()) OR "public"."is_admin"())))));



ALTER TABLE "public"."submissions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "submissions_admin_update" ON "public"."submissions" FOR UPDATE TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "submissions_insert" ON "public"."submissions" FOR INSERT TO "authenticated" WITH CHECK ((("submitted_by" = "auth"."uid"()) AND ("status" = 'PENDING'::"public"."content_status")));



CREATE POLICY "submissions_read" ON "public"."submissions" FOR SELECT TO "authenticated" USING ((("submitted_by" = "auth"."uid"()) OR "public"."is_admin"()));



CREATE POLICY "troubleshooting_delete" ON "public"."troubleshooting_guides" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



ALTER TABLE "public"."troubleshooting_guides" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "troubleshooting_insert" ON "public"."troubleshooting_guides" FOR INSERT TO "authenticated" WITH CHECK ((("created_by" = "auth"."uid"()) AND ("public"."is_admin"() OR ("approval_status" = 'PENDING'::"public"."content_status"))));



CREATE POLICY "troubleshooting_read" ON "public"."troubleshooting_guides" FOR SELECT TO "authenticated" USING ((("approval_status" = 'APPROVED'::"public"."content_status") OR ("created_by" = "auth"."uid"()) OR "public"."is_admin"()));



CREATE POLICY "troubleshooting_update" ON "public"."troubleshooting_guides" FOR UPDATE TO "authenticated" USING ((("created_by" = "auth"."uid"()) OR "public"."is_admin"())) WITH CHECK (("public"."is_admin"() OR (("created_by" = "auth"."uid"()) AND ("approval_status" = 'PENDING'::"public"."content_status"))));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































GRANT ALL ON FUNCTION "public"."get_my_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."log_revision"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_revision"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_revision"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_admins_on_submission"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_admins_on_submission"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_admins_on_submission"() TO "service_role";



GRANT ALL ON TABLE "public"."submissions" TO "anon";
GRANT ALL ON TABLE "public"."submissions" TO "authenticated";
GRANT ALL ON TABLE "public"."submissions" TO "service_role";



GRANT ALL ON FUNCTION "public"."review_submission"("p_submission_id" "uuid", "p_decision" "public"."content_status", "p_note" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."review_submission"("p_submission_id" "uuid", "p_decision" "public"."content_status", "p_note" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."review_submission"("p_submission_id" "uuid", "p_decision" "public"."content_status", "p_note" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."touch_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."touch_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."touch_updated_at"() TO "service_role";


















GRANT ALL ON TABLE "public"."activity_logs" TO "anon";
GRANT ALL ON TABLE "public"."activity_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."activity_logs" TO "service_role";



GRANT ALL ON TABLE "public"."equipment" TO "anon";
GRANT ALL ON TABLE "public"."equipment" TO "authenticated";
GRANT ALL ON TABLE "public"."equipment" TO "service_role";



GRANT ALL ON TABLE "public"."equipment_categories" TO "anon";
GRANT ALL ON TABLE "public"."equipment_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."equipment_categories" TO "service_role";



GRANT ALL ON TABLE "public"."equipment_category_review" TO "anon";
GRANT ALL ON TABLE "public"."equipment_category_review" TO "authenticated";
GRANT ALL ON TABLE "public"."equipment_category_review" TO "service_role";



GRANT ALL ON TABLE "public"."equipment_identifiers" TO "anon";
GRANT ALL ON TABLE "public"."equipment_identifiers" TO "authenticated";
GRANT ALL ON TABLE "public"."equipment_identifiers" TO "service_role";



GRANT ALL ON TABLE "public"."equipment_revisions" TO "anon";
GRANT ALL ON TABLE "public"."equipment_revisions" TO "authenticated";
GRANT ALL ON TABLE "public"."equipment_revisions" TO "service_role";



GRANT ALL ON TABLE "public"."manuals" TO "anon";
GRANT ALL ON TABLE "public"."manuals" TO "authenticated";
GRANT ALL ON TABLE "public"."manuals" TO "service_role";



GRANT ALL ON TABLE "public"."media" TO "anon";
GRANT ALL ON TABLE "public"."media" TO "authenticated";
GRANT ALL ON TABLE "public"."media" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."repair_cases" TO "anon";
GRANT ALL ON TABLE "public"."repair_cases" TO "authenticated";
GRANT ALL ON TABLE "public"."repair_cases" TO "service_role";



GRANT ALL ON TABLE "public"."repair_steps" TO "anon";
GRANT ALL ON TABLE "public"."repair_steps" TO "authenticated";
GRANT ALL ON TABLE "public"."repair_steps" TO "service_role";



GRANT ALL ON TABLE "public"."spare_parts" TO "anon";
GRANT ALL ON TABLE "public"."spare_parts" TO "authenticated";
GRANT ALL ON TABLE "public"."spare_parts" TO "service_role";



GRANT ALL ON TABLE "public"."submission_items" TO "anon";
GRANT ALL ON TABLE "public"."submission_items" TO "authenticated";
GRANT ALL ON TABLE "public"."submission_items" TO "service_role";



GRANT ALL ON TABLE "public"."troubleshooting_guides" TO "anon";
GRANT ALL ON TABLE "public"."troubleshooting_guides" TO "authenticated";
GRANT ALL ON TABLE "public"."troubleshooting_guides" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































