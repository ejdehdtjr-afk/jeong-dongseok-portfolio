-- Apply in this project's Supabase SQL Editor before enabling the v3 report UI.
-- Existing submit_phone_report rows are intentionally not reclassified or migrated.
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.pd_reports_v3 (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  kind text not null check (kind in ('suspicious','dangerous')),
  body text not null,
  secret_hash text not null,
  status text not null default 'received' check (status in ('received','reviewing','verified','dismissed','withdrawn')),
  correction_status text not null default 'none' check (correction_status in ('none','pending','resolved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.pd_report_corrections_v3 (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.pd_reports_v3(id) on delete cascade,
  reason text not null,
  created_at timestamptz not null default now()
);
create index if not exists pd_reports_v3_created_at on public.pd_reports_v3(created_at);
create index if not exists pd_report_corrections_v3_report on public.pd_report_corrections_v3(report_id,created_at);
alter table public.pd_reports_v3 enable row level security;
alter table public.pd_report_corrections_v3 enable row level security;
revoke all on public.pd_reports_v3, public.pd_report_corrections_v3 from public, anon, authenticated;

create or replace function public.pd_report_health() returns boolean
language sql stable security definer set search_path = '' as $$ select true $$;

create or replace function public.pd_create_report(p_phone text, p_kind text, p_text text, p_secret text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r public.pd_reports_v3;
begin
  if p_phone !~ '^0[0-9]{1,2}-?[0-9]{3,4}-?[0-9]{4}$'
    or p_kind not in ('suspicious','dangerous')
    or length(trim(p_text)) not between 10 and 500
    or p_secret !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid report input';
  end if;
  insert into public.pd_reports_v3(phone,kind,body,secret_hash)
  values (p_phone,p_kind,trim(p_text),encode(extensions.digest(p_secret,'sha256'),'hex')) returning * into r;
  return jsonb_build_object('id',r.id,'status',r.status,'correction_status',r.correction_status,'created_at',r.created_at);
end $$;

create or replace function public.pd_report_status(p_id uuid, p_secret text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r public.pd_reports_v3;
begin
  if p_secret is null or p_secret !~ '^[0-9a-f]{64}$' then return null; end if;
  select * into r from public.pd_reports_v3
    where id=p_id and secret_hash=encode(extensions.digest(p_secret,'sha256'),'hex');
  if not found then return null; end if;
  return jsonb_build_object('id',r.id,'status',r.status,'correction_status',r.correction_status,
    'created_at',r.created_at,'updated_at',r.updated_at);
end $$;

create or replace function public.pd_correct_report(p_id uuid, p_secret text, p_reason text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r public.pd_reports_v3;
begin
  if p_secret is null or p_secret !~ '^[0-9a-f]{64}$'
    or p_reason is null or length(trim(p_reason)) not between 10 and 500 then
    raise exception 'invalid correction input';
  end if;
  select * into r from public.pd_reports_v3
    where id=p_id and secret_hash=encode(extensions.digest(p_secret,'sha256'),'hex') for update;
  if not found then return null; end if;
  insert into public.pd_report_corrections_v3(report_id,reason) values (r.id,trim(p_reason));
  update public.pd_reports_v3 set correction_status='pending', updated_at=now() where id=r.id returning * into r;
  return jsonb_build_object('id',r.id,'status',r.status,'correction_status',r.correction_status,
    'created_at',r.created_at,'updated_at',r.updated_at);
end $$;

revoke all on function public.pd_report_health() from public;
revoke all on function public.pd_create_report(text,text,text,text) from public;
revoke all on function public.pd_report_status(uuid,text) from public;
revoke all on function public.pd_correct_report(uuid,text,text) from public;
grant execute on function public.pd_report_health() to anon, authenticated;
grant execute on function public.pd_create_report(text,text,text,text) to anon, authenticated;
grant execute on function public.pd_report_status(uuid,text) to anon, authenticated;
grant execute on function public.pd_correct_report(uuid,text,text) to anon, authenticated;

-- Operator-only review example (SQL Editor, never a browser RPC):
-- update public.pd_reports_v3 set status='reviewing', updated_at=now() where id='<receipt id>';
-- After checking evidence, use verified or dismissed; correction_status='resolved' after reviewing a correction.
-- Agree on retention and abuse controls before accepting public production reports.
