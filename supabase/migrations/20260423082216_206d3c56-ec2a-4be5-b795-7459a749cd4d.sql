
-- Roles enum
create type public.app_role as enum ('admin', 'doctor', 'patient');
create type public.intake_status as enum ('pending', 'in_review', 'completed', 'archived');
create type public.risk_level as enum ('low', 'moderate', 'high', 'critical');

-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  phone text,
  date_of_birth date,
  gender text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

-- User roles
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.get_primary_role(_user_id uuid)
returns app_role language sql stable security definer set search_path = public as $$
  select role from public.user_roles where user_id = _user_id
  order by case role when 'admin' then 1 when 'doctor' then 2 else 3 end
  limit 1
$$;

-- Patient intakes (one per submission)
create table public.patient_intakes (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references auth.users(id) on delete cascade,
  chief_complaint text not null,
  symptoms text[] not null default '{}',
  duration_days int,
  severity int check (severity between 1 and 10),
  age int,
  sex text,
  vitals jsonb default '{}'::jsonb,
  medical_history text,
  current_medications text,
  allergies text,
  notes text,
  status intake_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.patient_intakes enable row level security;
create index on public.patient_intakes (status, created_at desc);
create index on public.patient_intakes (patient_id, created_at desc);

-- AI Assessments
create table public.assessments (
  id uuid primary key default gen_random_uuid(),
  intake_id uuid not null references public.patient_intakes(id) on delete cascade,
  patient_id uuid not null references auth.users(id) on delete cascade,
  risk_score int not null check (risk_score between 0 and 100),
  risk_level risk_level not null,
  red_flags text[] default '{}',
  differentials jsonb default '[]'::jsonb,
  recommended_actions text[] default '{}',
  ai_summary text,
  ai_model text,
  rule_breakdown jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.assessments enable row level security;
create index on public.assessments (risk_score desc);

-- Doctor notes / reviews
create table public.doctor_notes (
  id uuid primary key default gen_random_uuid(),
  intake_id uuid not null references public.patient_intakes(id) on delete cascade,
  doctor_id uuid not null references auth.users(id) on delete cascade,
  diagnosis text,
  treatment_plan text,
  follow_up text,
  override_risk risk_level,
  notes text,
  created_at timestamptz not null default now()
);
alter table public.doctor_notes enable row level security;

-- Audit logs
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  resource_type text,
  resource_id uuid,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.audit_logs enable row level security;
create index on public.audit_logs (created_at desc);

-- RLS: profiles
create policy "Users view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Doctors view all profiles" on public.profiles for select using (public.has_role(auth.uid(), 'doctor') or public.has_role(auth.uid(), 'admin'));
create policy "Users update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- RLS: user_roles (read own + admin manages)
create policy "Users view own roles" on public.user_roles for select using (auth.uid() = user_id);
create policy "Admins view all roles" on public.user_roles for select using (public.has_role(auth.uid(), 'admin'));
create policy "Admins manage roles" on public.user_roles for all using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- RLS: patient_intakes
create policy "Patients view own intakes" on public.patient_intakes for select using (auth.uid() = patient_id);
create policy "Patients create own intakes" on public.patient_intakes for insert with check (auth.uid() = patient_id);
create policy "Patients update own pending intakes" on public.patient_intakes for update using (auth.uid() = patient_id and status = 'pending');
create policy "Doctors view all intakes" on public.patient_intakes for select using (public.has_role(auth.uid(), 'doctor') or public.has_role(auth.uid(), 'admin'));
create policy "Doctors update intake status" on public.patient_intakes for update using (public.has_role(auth.uid(), 'doctor') or public.has_role(auth.uid(), 'admin'));

-- RLS: assessments
create policy "Patients view own assessments" on public.assessments for select using (auth.uid() = patient_id);
create policy "Doctors view all assessments" on public.assessments for select using (public.has_role(auth.uid(), 'doctor') or public.has_role(auth.uid(), 'admin'));
create policy "System inserts assessments" on public.assessments for insert with check (auth.uid() = patient_id or public.has_role(auth.uid(), 'doctor') or public.has_role(auth.uid(), 'admin'));

-- RLS: doctor_notes
create policy "Doctors manage notes" on public.doctor_notes for all using (public.has_role(auth.uid(), 'doctor') or public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'doctor') or public.has_role(auth.uid(), 'admin'));
create policy "Patients view their notes" on public.doctor_notes for select using (
  exists(select 1 from public.patient_intakes pi where pi.id = intake_id and pi.patient_id = auth.uid())
);

-- RLS: audit_logs
create policy "Admins view audit logs" on public.audit_logs for select using (public.has_role(auth.uid(), 'admin'));
create policy "Authenticated insert audit" on public.audit_logs for insert with check (auth.uid() is not null);

-- Trigger: auto-create profile + default role on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  _role app_role;
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), new.email)
  on conflict (id) do nothing;

  _role := coalesce((new.raw_user_meta_data->>'role')::app_role, 'patient');
  insert into public.user_roles (user_id, role) values (new.id, _role)
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger profiles_updated before update on public.profiles for each row execute function public.set_updated_at();
create trigger intakes_updated before update on public.patient_intakes for each row execute function public.set_updated_at();
