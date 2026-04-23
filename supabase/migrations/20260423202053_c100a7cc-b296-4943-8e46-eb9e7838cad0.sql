-- Add body regions to intakes
ALTER TABLE public.patient_intakes
  ADD COLUMN IF NOT EXISTS body_regions text[] NOT NULL DEFAULT '{}'::text[];

-- Add richer AI output fields to assessments
ALTER TABLE public.assessments
  ADD COLUMN IF NOT EXISTS possible_diagnoses jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS suggested_medicines jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS home_remedies text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS lifestyle_advice text[] NOT NULL DEFAULT '{}'::text[];

-- Doctor approval of medicines for the final report
ALTER TABLE public.doctor_notes
  ADD COLUMN IF NOT EXISTS approved_medicines jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz;

-- Appointment status enum
DO $$ BEGIN
  CREATE TYPE public.appointment_status AS ENUM ('requested','confirmed','declined','completed','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.appointment_mode AS ENUM ('in_person','video','phone');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  doctor_id uuid,
  intake_id uuid,
  preferred_at timestamptz NOT NULL,
  mode public.appointment_mode NOT NULL DEFAULT 'in_person',
  reason text,
  doctor_message text,
  status public.appointment_status NOT NULL DEFAULT 'requested',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Patients
CREATE POLICY "Patients view own appointments"
  ON public.appointments FOR SELECT
  USING (auth.uid() = patient_id);

CREATE POLICY "Patients create own appointments"
  ON public.appointments FOR INSERT
  WITH CHECK (auth.uid() = patient_id);

CREATE POLICY "Patients cancel own appointments"
  ON public.appointments FOR UPDATE
  USING (auth.uid() = patient_id AND status IN ('requested','confirmed'));

-- Doctors / admins
CREATE POLICY "Doctors view all appointments"
  ON public.appointments FOR SELECT
  USING (public.has_role(auth.uid(),'doctor') OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Doctors update appointments"
  ON public.appointments FOR UPDATE
  USING (public.has_role(auth.uid(),'doctor') OR public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_appointments_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_appointments_patient ON public.appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON public.appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);