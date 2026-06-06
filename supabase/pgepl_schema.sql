-- Drop existing tables to ensure clean state
drop table if exists public.entries;
drop table if exists public.users;

-- Create Users table
create table public.users (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  email text unique not null,
  password_hash text not null,
  department text not null,
  role text not null check (role in ('employee', 'manager')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create Entries table
create table public.entries (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  work_date date not null,
  department text not null,
  kra_category text not null,
  tasks_text text not null,
  hours_spent numeric(4,2) not null,
  task_status text not null,
  has_issue boolean not null default false,
  issue_description text,
  plan_for_tomorrow text,
  submitted_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS (we will use anon key to hit API routes, but the API routes will use service_role to bypass RLS, OR we can just disable RLS since we proxy through our Next.js API anyway)
alter table public.users disable row level security;
alter table public.entries disable row level security;
