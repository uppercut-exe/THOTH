-- ============================================================
-- THOTH — Complete Database Migration (Idempotent)
-- Run this in Supabase SQL Editor to set up from scratch.
-- Safe to run on a fresh project OR a project with partial tables.
-- It drops all THOTH tables first, then recreates everything.
-- ============================================================

-- ─── Extensions ───────────────────────────────────────────
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";

-- ─── Drop existing triggers first ─────────────────────────
drop trigger if exists on_auth_user_created      on auth.users;
drop trigger if exists on_profile_created_workspace on profiles;
drop trigger if exists set_updated_at on profiles;
drop trigger if exists set_updated_at on workspaces;
drop trigger if exists set_updated_at on workspace_members;
drop trigger if exists set_updated_at on people;
drop trigger if exists set_updated_at on organizations;
drop trigger if exists set_updated_at on projects;
drop trigger if exists set_updated_at on tasks;
drop trigger if exists set_updated_at on goals;
drop trigger if exists set_updated_at on deals;
drop trigger if exists set_updated_at on invoices;
drop trigger if exists set_updated_at on payments;
drop trigger if exists set_updated_at on expenses;
drop trigger if exists set_updated_at on resources;
drop trigger if exists set_updated_at on notes;
drop trigger if exists set_updated_at on meetings;
drop trigger if exists set_updated_at on documents;
drop trigger if exists set_updated_at on activities;
drop trigger if exists set_updated_at on relationships;
drop trigger if exists set_updated_at on files;
drop trigger if exists set_updated_at on intelligence_events;
drop trigger if exists set_updated_at on audit_logs;

-- ─── Drop all tables (reverse dependency order) ───────────
drop table if exists audit_logs          cascade;
drop table if exists intelligence_events cascade;
drop table if exists files               cascade;
drop table if exists relationships       cascade;
drop table if exists activities          cascade;
drop table if exists documents           cascade;
drop table if exists meetings            cascade;
drop table if exists notes               cascade;
drop table if exists resources           cascade;
drop table if exists expenses            cascade;
drop table if exists payments            cascade;
drop table if exists invoices            cascade;
drop table if exists deals               cascade;
drop table if exists goals               cascade;
drop table if exists tasks               cascade;
drop table if exists projects            cascade;
drop table if exists organizations       cascade;
drop table if exists people              cascade;
drop table if exists workspace_members   cascade;
drop table if exists workspaces          cascade;
drop table if exists profiles            cascade;

-- ─── Drop helper functions ────────────────────────────────
drop function if exists is_workspace_member(uuid);
drop function if exists is_workspace_admin(uuid);
drop function if exists update_updated_at();
drop function if exists handle_new_user();
drop function if exists handle_new_profile_workspace();

-- ===========================================================
-- TABLES
-- ===========================================================

-- ─── profiles ─────────────────────────────────────────────
-- One row per Supabase auth user. Auto-created by trigger.
create table profiles (
  id          uuid        primary key references auth.users(id) on delete cascade,
  email       text        not null,
  full_name   text        not null default '',
  avatar_url  text,
  role        text        not null default 'user',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ─── workspaces ───────────────────────────────────────────
-- Created by the onboarding wizard after first Google login.
create table workspaces (
  id          uuid        primary key default uuid_generate_v4(),
  name        text        not null,
  slug        text        not null unique,
  plan        text        not null default 'free',
  owner_id    uuid        not null references profiles(id) on delete restrict,
  settings    jsonb       not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index workspaces_owner_idx on workspaces(owner_id);

-- ─── workspace_members ────────────────────────────────────
create table workspace_members (
  id            uuid        primary key default uuid_generate_v4(),
  workspace_id  uuid        not null references workspaces(id)  on delete cascade,
  user_id       uuid        not null references profiles(id)    on delete cascade,
  role          text        not null default 'member'
                            check (role in ('owner','admin','member','viewer')),
  joined_at     timestamptz not null default now(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create index workspace_members_workspace_idx on workspace_members(workspace_id);
create index workspace_members_user_idx      on workspace_members(user_id);

-- ─── people ───────────────────────────────────────────────
create table people (
  id              uuid        primary key default uuid_generate_v4(),
  workspace_id    uuid        not null references workspaces(id) on delete cascade,
  name_en         text        not null,
  name_ar         text,
  email           text,
  phone           text,
  role_en         text,
  role_ar         text,
  organization_id uuid,
  avatar_url      text,
  tags            text[]      not null default '{}',
  metadata        jsonb       not null default '{}',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index people_workspace_idx  on people(workspace_id);
create index people_name_trgm_idx  on people using gin(name_en gin_trgm_ops);

-- ─── organizations ────────────────────────────────────────
create table organizations (
  id            uuid        primary key default uuid_generate_v4(),
  workspace_id  uuid        not null references workspaces(id) on delete cascade,
  name_en       text        not null,
  name_ar       text,
  sector        text,
  lifecycle     text,
  health_score  integer     not null default 70 check (health_score between 0 and 100),
  headcount     integer,
  owner_id      uuid,
  website       text,
  tags          text[]      not null default '{}',
  metadata      jsonb       not null default '{}',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index organizations_workspace_idx  on organizations(workspace_id);
create index organizations_name_trgm_idx  on organizations using gin(name_en gin_trgm_ops);

-- ─── projects ─────────────────────────────────────────────
create table projects (
  id              uuid        primary key default uuid_generate_v4(),
  workspace_id    uuid        not null references workspaces(id) on delete cascade,
  title_en        text        not null,
  title_ar        text,
  status          text        not null default 'active',
  priority        text        not null default 'medium'
                              check (priority in ('urgent','high','medium','low')),
  progress        integer     not null default 0 check (progress between 0 and 100),
  owner_id        uuid,
  organization_id uuid,
  due_date        date,
  tags            text[]      not null default '{}',
  metadata        jsonb       not null default '{}',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index projects_workspace_idx on projects(workspace_id);
create index projects_status_idx    on projects(workspace_id, status);

-- ─── tasks ────────────────────────────────────────────────
create table tasks (
  id            uuid        primary key default uuid_generate_v4(),
  workspace_id  uuid        not null references workspaces(id) on delete cascade,
  project_id    uuid        references projects(id) on delete cascade,
  title_en      text        not null,
  title_ar      text,
  status        text        not null default 'todo'
                            check (status in ('todo','in_progress','review','done','blocked')),
  priority      text        not null default 'medium'
                            check (priority in ('urgent','high','medium','low')),
  assignee_id   uuid,
  due_date      date,
  progress      integer     not null default 0 check (progress between 0 and 100),
  tags          text[]      not null default '{}',
  metadata      jsonb       not null default '{}',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index tasks_workspace_idx on tasks(workspace_id);
create index tasks_project_idx   on tasks(project_id);
create index tasks_assignee_idx  on tasks(assignee_id);

-- ─── goals ────────────────────────────────────────────────
create table goals (
  id             uuid        primary key default uuid_generate_v4(),
  workspace_id   uuid        not null references workspaces(id) on delete cascade,
  title_en       text        not null,
  title_ar       text,
  status         text        not null default 'active',
  progress       integer     not null default 0 check (progress between 0 and 100),
  owner_id       uuid,
  target_date    date,
  metric         text,
  target_value   numeric,
  current_value  numeric,
  metadata       jsonb       not null default '{}',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index goals_workspace_idx on goals(workspace_id);

-- ─── deals ────────────────────────────────────────────────
create table deals (
  id                   uuid        primary key default uuid_generate_v4(),
  workspace_id         uuid        not null references workspaces(id) on delete cascade,
  title_en             text        not null,
  title_ar             text,
  value                numeric     not null default 0,
  currency             text        not null default 'SAR',
  stage                text        not null default 'lead'
                                   check (stage in ('lead','qualified','proposal','negotiation','won','lost')),
  probability          integer     not null default 0 check (probability between 0 and 100),
  org_name_en          text,
  org_name_ar          text,
  contact_name_en      text,
  contact_name_ar      text,
  organization_id      uuid,
  expected_close_date  date,
  tags                 text[]      not null default '{}',
  metadata             jsonb       not null default '{}',
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index deals_workspace_idx on deals(workspace_id);
create index deals_stage_idx     on deals(workspace_id, stage);

-- ─── invoices ─────────────────────────────────────────────
create table invoices (
  id              uuid        primary key default uuid_generate_v4(),
  workspace_id    uuid        not null references workspaces(id) on delete cascade,
  number          text        not null,
  org_name_en     text        not null,
  org_name_ar     text,
  organization_id uuid,
  deal_id         uuid,
  amount          numeric     not null default 0,
  currency        text        not null default 'SAR',
  status          text        not null default 'draft'
                              check (status in ('draft','sent','paid','overdue','cancelled')),
  due_date        date,
  paid_date       date,
  metadata        jsonb       not null default '{}',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index invoices_workspace_idx on invoices(workspace_id);
create index invoices_status_idx    on invoices(workspace_id, status);

-- ─── payments ─────────────────────────────────────────────
create table payments (
  id            uuid        primary key default uuid_generate_v4(),
  workspace_id  uuid        not null references workspaces(id) on delete cascade,
  invoice_id    uuid,
  amount        numeric     not null,
  currency      text        not null default 'SAR',
  method        text,
  status        text        not null default 'pending'
                            check (status in ('pending','completed','failed','refunded')),
  paid_at       timestamptz,
  metadata      jsonb       not null default '{}',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index payments_workspace_idx on payments(workspace_id);
create index payments_invoice_idx   on payments(invoice_id);

-- ─── expenses ─────────────────────────────────────────────
create table expenses (
  id              uuid        primary key default uuid_generate_v4(),
  workspace_id    uuid        not null references workspaces(id) on delete cascade,
  description_en  text        not null,
  description_ar  text,
  amount          numeric     not null,
  currency        text        not null default 'SAR',
  category        text,
  date            date,
  metadata        jsonb       not null default '{}',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index expenses_workspace_idx on expenses(workspace_id);

-- ─── resources ────────────────────────────────────────────
create table resources (
  id            uuid        primary key default uuid_generate_v4(),
  workspace_id  uuid        not null references workspaces(id) on delete cascade,
  name_en       text        not null,
  name_ar       text,
  type          text        not null,
  utilization   integer     not null default 0 check (utilization between 0 and 100),
  department    text,
  skills        text[]      not null default '{}',
  metadata      jsonb       not null default '{}',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index resources_workspace_idx on resources(workspace_id);

-- ─── notes ────────────────────────────────────────────────
create table notes (
  id                  uuid        primary key default uuid_generate_v4(),
  workspace_id        uuid        not null references workspaces(id) on delete cascade,
  title               text,
  content             text,
  author_id           uuid,
  related_entity_type text,
  related_entity_id   uuid,
  tags                text[]      not null default '{}',
  metadata            jsonb       not null default '{}',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index notes_workspace_idx on notes(workspace_id);
create index notes_entity_idx    on notes(related_entity_type, related_entity_id);

-- ─── meetings ─────────────────────────────────────────────
create table meetings (
  id                  uuid        primary key default uuid_generate_v4(),
  workspace_id        uuid        not null references workspaces(id) on delete cascade,
  title               text        not null,
  description         text,
  scheduled_at        timestamptz,
  duration_minutes    integer,
  attendee_ids        uuid[]      not null default '{}',
  related_entity_type text,
  related_entity_id   uuid,
  outcome             text,
  metadata            jsonb       not null default '{}',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index meetings_workspace_idx on meetings(workspace_id);

-- ─── documents ────────────────────────────────────────────
create table documents (
  id            uuid        primary key default uuid_generate_v4(),
  workspace_id  uuid        not null references workspaces(id) on delete cascade,
  title         text        not null,
  content       text,
  author_id     uuid,
  file_url      text,
  file_type     text,
  file_size     bigint,
  tags          text[]      not null default '{}',
  metadata      jsonb       not null default '{}',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index documents_workspace_idx on documents(workspace_id);

-- ─── activities ───────────────────────────────────────────
create table activities (
  id              uuid        primary key default uuid_generate_v4(),
  workspace_id    uuid        not null references workspaces(id) on delete cascade,
  actor_id        uuid,
  action          text        not null,
  entity_type     text        not null,
  entity_id       uuid        not null,
  description_en  text,
  description_ar  text,
  metadata        jsonb       not null default '{}',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index activities_workspace_idx on activities(workspace_id);
create index activities_entity_idx    on activities(entity_type, entity_id);
create index activities_created_idx   on activities(workspace_id, created_at desc);

-- ─── relationships ────────────────────────────────────────
create table relationships (
  id                uuid        primary key default uuid_generate_v4(),
  workspace_id      uuid        not null references workspaces(id) on delete cascade,
  source_type       text        not null,
  source_id         uuid        not null,
  target_type       text        not null,
  target_id         uuid        not null,
  relationship_type text        not null,
  strength          integer     not null default 5 check (strength between 1 and 10),
  notes             text,
  metadata          jsonb       not null default '{}',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (workspace_id, source_type, source_id, target_type, target_id, relationship_type)
);

create index relationships_workspace_idx on relationships(workspace_id);
create index relationships_source_idx    on relationships(workspace_id, source_type, source_id);
create index relationships_target_idx    on relationships(workspace_id, target_type, target_id);

-- ─── files ────────────────────────────────────────────────
create table files (
  id                  uuid        primary key default uuid_generate_v4(),
  workspace_id        uuid        not null references workspaces(id) on delete cascade,
  name                text        not null,
  bucket              text        not null,
  path                text        not null,
  size                bigint,
  mime_type           text,
  uploaded_by         uuid,
  related_entity_type text,
  related_entity_id   uuid,
  metadata            jsonb       not null default '{}',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index files_workspace_idx on files(workspace_id);
create index files_entity_idx    on files(related_entity_type, related_entity_id);

-- ─── intelligence_events ──────────────────────────────────
create table intelligence_events (
  id              uuid        primary key default uuid_generate_v4(),
  workspace_id    uuid        not null references workspaces(id) on delete cascade,
  type            text        not null
                              check (type in ('alert','win','opportunity','insight','risk','action','recommendation')),
  title_en        text        not null,
  title_ar        text,
  description_en  text,
  description_ar  text,
  severity        text        not null default 'medium'
                              check (severity in ('critical','high','medium','low','info')),
  entity_type     text,
  entity_id       uuid,
  resolved        boolean     not null default false,
  resolved_at     timestamptz,
  metadata        jsonb       not null default '{}',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index intelligence_events_workspace_idx on intelligence_events(workspace_id);
create index intelligence_events_type_idx      on intelligence_events(workspace_id, type);
create index intelligence_events_resolved_idx  on intelligence_events(workspace_id, resolved);

-- ─── audit_logs ───────────────────────────────────────────
create table audit_logs (
  id             uuid        primary key default uuid_generate_v4(),
  workspace_id   uuid        not null references workspaces(id) on delete cascade,
  user_id        uuid,
  action         text        not null,
  resource_type  text        not null,
  resource_id    uuid,
  before_state   jsonb       not null default '{}',
  after_state    jsonb       not null default '{}',
  ip_address     text,
  user_agent     text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index audit_logs_workspace_idx on audit_logs(workspace_id);
create index audit_logs_created_idx   on audit_logs(workspace_id, created_at desc);


-- ===========================================================
-- TRIGGERS
-- ===========================================================

-- ─── updated_at auto-stamp ────────────────────────────────
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'profiles','workspaces','workspace_members',
    'people','organizations','projects','tasks','goals',
    'deals','invoices','payments','expenses','resources',
    'notes','meetings','documents','activities',
    'relationships','files','intelligence_events','audit_logs'
  ] loop
    execute format('
      create trigger set_updated_at
        before update on %I
        for each row execute function update_updated_at();
    ', t);
  end loop;
end $$;

-- ─── Auto-create profile on Google/OAuth sign-up ──────────
-- Creates a profiles row immediately when auth.users gets a new entry.
-- This happens before the app redirect, so the profile always exists
-- by the time WorkspaceSetup tries to insert a workspace (FK: owner_id → profiles.id).
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- NOTE: Workspace creation is intentionally NOT done by a trigger.
-- WorkspaceSetup.tsx handles it during first-time onboarding only.
-- Returning users skip onboarding because workspace_members already has a row.


-- ===========================================================
-- ROW LEVEL SECURITY
-- ===========================================================

alter table profiles              enable row level security;
alter table workspaces            enable row level security;
alter table workspace_members     enable row level security;
alter table people                enable row level security;
alter table organizations         enable row level security;
alter table projects              enable row level security;
alter table tasks                 enable row level security;
alter table goals                 enable row level security;
alter table deals                 enable row level security;
alter table invoices              enable row level security;
alter table payments              enable row level security;
alter table expenses              enable row level security;
alter table resources             enable row level security;
alter table notes                 enable row level security;
alter table meetings              enable row level security;
alter table documents             enable row level security;
alter table activities            enable row level security;
alter table relationships         enable row level security;
alter table files                 enable row level security;
alter table intelligence_events   enable row level security;
alter table audit_logs            enable row level security;

-- ─── Helper functions ─────────────────────────────────────
create or replace function is_workspace_member(ws_id uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from workspace_members
    where workspace_id = ws_id
      and user_id = auth.uid()
  );
$$;

create or replace function is_workspace_admin(ws_id uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from workspace_members
    where workspace_id = ws_id
      and user_id = auth.uid()
      and role in ('owner','admin')
  );
$$;

-- ─── profiles ─────────────────────────────────────────────
create policy "profiles_select" on profiles
  for select using (id = auth.uid());

create policy "profiles_insert" on profiles
  for insert with check (id = auth.uid());

create policy "profiles_update" on profiles
  for update using (id = auth.uid());

-- ─── workspaces ───────────────────────────────────────────
create policy "workspaces_select" on workspaces
  for select using (is_workspace_member(id));

create policy "workspaces_insert" on workspaces
  for insert with check (auth.uid() = owner_id);

create policy "workspaces_update" on workspaces
  for update using (owner_id = auth.uid());

-- ─── workspace_members ────────────────────────────────────
create policy "workspace_members_select" on workspace_members
  for select using (is_workspace_member(workspace_id));

create policy "workspace_members_insert" on workspace_members
  for insert with check (
    -- only the workspace owner can add members
    exists (
      select 1 from workspaces
      where id = workspace_id
        and owner_id = auth.uid()
    )
  );

create policy "workspace_members_update" on workspace_members
  for update using (is_workspace_admin(workspace_id));

create policy "workspace_members_delete" on workspace_members
  for delete using (is_workspace_admin(workspace_id));

-- ─── All workspace-isolated tables (universal pattern) ────
do $$
declare t text;
begin
  foreach t in array array[
    'people','organizations','projects','tasks','goals',
    'deals','invoices','payments','expenses','resources',
    'notes','meetings','documents','activities',
    'relationships','files','intelligence_events','audit_logs'
  ] loop
    execute format('
      create policy "workspace_select" on %I
        for select using (is_workspace_member(workspace_id));
      create policy "workspace_insert" on %I
        for insert with check (is_workspace_member(workspace_id));
      create policy "workspace_update" on %I
        for update using (is_workspace_member(workspace_id));
      create policy "workspace_delete" on %I
        for delete using (is_workspace_admin(workspace_id));
    ', t, t, t, t);
  end loop;
end $$;
