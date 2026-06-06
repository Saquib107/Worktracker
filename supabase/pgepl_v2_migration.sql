-- Add approval status to existing entries table
ALTER TABLE public.pgepl_entries 
ADD COLUMN IF NOT EXISTS approval_status text not null default 'Submitted'
CHECK (approval_status in ('Submitted', 'Under Review', 'Approved', 'Rejected'));

-- Create Admin Configuration Tables
CREATE TABLE public.pgepl_departments (
  id uuid default gen_random_uuid() primary key,
  name text unique not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

CREATE TABLE public.pgepl_kras (
  id uuid default gen_random_uuid() primary key,
  name text unique not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Seed initial departments and KRAs
INSERT INTO public.pgepl_departments (name) VALUES 
('HR'), ('HR & IR'), ('Accounts'), ('Accounts Audit'), ('Accounts Compliance'),
('Purchase'), ('Purchase & Commercial'), ('PRM'), ('Intern - S/w')
ON CONFLICT DO NOTHING;

INSERT INTO public.pgepl_kras (name) VALUES 
('Attendance'), ('Recruitment'), ('Payroll'), ('PF_and_ESI'), ('Compliance'),
('Purchase'), ('Strategic_Procurement'), ('Finance__Control'), ('Tally Entry'),
('MIS_and_Cash'), ('Accounts Billings'), ('HR_IR_Leadership'), ('Miscellaneous'),
('Intern - Purchase'), ('Data Entry'), ('Costing & MIS'), ('PR_Ops')
ON CONFLICT DO NOTHING;

-- Create Audit Logs
CREATE TABLE public.pgepl_audit_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.pgepl_users(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id text,
  details text,
  timestamp timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create Notifications
CREATE TABLE public.pgepl_notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.pgepl_users(id) on delete cascade not null,
  message text not null,
  type text not null,
  is_read boolean not null default false,
  timestamp timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Disable RLS for backend proxy access
alter table public.pgepl_departments disable row level security;
alter table public.pgepl_kras disable row level security;
alter table public.pgepl_audit_logs disable row level security;
alter table public.pgepl_notifications disable row level security;

-- Enable and add allow policies for all new tables
alter table public.pgepl_departments enable row level security;
drop policy if exists "Allow all" on public.pgepl_departments;
create policy "Allow all" on public.pgepl_departments for all using (true) with check (true);

alter table public.pgepl_kras enable row level security;
drop policy if exists "Allow all" on public.pgepl_kras;
create policy "Allow all" on public.pgepl_kras for all using (true) with check (true);

alter table public.pgepl_audit_logs enable row level security;
drop policy if exists "Allow all" on public.pgepl_audit_logs;
create policy "Allow all" on public.pgepl_audit_logs for all using (true) with check (true);

alter table public.pgepl_notifications enable row level security;
drop policy if exists "Allow all" on public.pgepl_notifications;
create policy "Allow all" on public.pgepl_notifications for all using (true) with check (true);
