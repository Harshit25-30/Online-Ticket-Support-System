-- ============================================================
-- Vehicle Ticket System - COMPLETE database setup
-- Supabase Dashboard -> SQL Editor -> paste all -> Run
-- (If it warns about "destructive operations", click Run query.)
-- Safe to run again. NOTE: it recreates the tickets / support_requests / fares
-- tables, so old test tickets and requests are deleted. User accounts and
-- admin roles are kept.
-- ============================================================

-- 1) profiles (one row per user, holds role + security question)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  role text not null default 'user' check (role in ('user','admin')),
  created_at timestamptz default now()
);
alter table public.profiles add column if not exists sec_question text;
alter table public.profiles add column if not exists sec_answer_hash text;

insert into public.profiles(id, full_name, email)
select id, coalesce(raw_user_meta_data->>'full_name',''), email from auth.users
on conflict (id) do nothing;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''), new.email)
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_admin() returns boolean
language sql security definer stable set search_path = public as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin')
$$;

-- 2) fresh tables
drop table if exists public.support_requests cascade;
drop table if exists public.tickets cascade;
drop table if exists public.fares cascade;

create table public.fares (
  vehicle_type text primary key,
  price_per_passenger numeric(10,2) not null
);
insert into public.fares values ('Bus',200),('Train',350),('Car',500),('Bike',100),('Auto',150);

create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_code text unique not null default ('TKT-' || upper(substr(md5(random()::text || clock_timestamp()::text),1,8))),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  vehicle_type text not null references public.fares(vehicle_type),
  vehicle_number text not null,
  route_from text not null,
  route_to text not null,
  travel_date date not null,
  passengers int not null default 1 check (passengers between 1 and 10),
  price numeric(10,2) not null default 0,
  status text not null default 'confirmed' check (status in ('confirmed','cancelled','refunded','resolved')),
  support_note text,
  created_at timestamptz default now()
);
create index on public.tickets(user_id);

create table public.support_requests (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  issue_type text not null check (issue_type in ('cancel','refund','change_details','wrong_charge','other')),
  message text not null,
  status text not null default 'open' check (status in ('open','in_progress','closed')),
  admin_reply text,
  created_at timestamptz default now()
);
create index on public.support_requests(user_id);

-- price is calculated by the database (cannot be tampered with from the browser)
create or replace function public.set_ticket_price() returns trigger
language plpgsql as $$
begin
  new.price := new.passengers * (select price_per_passenger from public.fares where vehicle_type = new.vehicle_type);
  new.status := 'confirmed';
  return new;
end $$;
create trigger ticket_price before insert on public.tickets
for each row execute function public.set_ticket_price();

-- 3) security (Row Level Security)
alter table public.profiles enable row level security;
alter table public.fares enable row level security;
alter table public.tickets enable row level security;
alter table public.support_requests enable row level security;

drop policy if exists "read own profile or admin" on public.profiles;
create policy "read own profile or admin" on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "fares readable" on public.fares for select using (true);

-- Users buy + see their own tickets. Admins see all and can update status/note, but can NEVER buy.
create policy "user buys ticket" on public.tickets for insert with check (user_id = auth.uid() and not public.is_admin());
create policy "own or admin view" on public.tickets for select using (user_id = auth.uid() or public.is_admin());
create policy "admin updates ticket" on public.tickets for update using (public.is_admin()) with check (public.is_admin());

-- Users raise requests only for their own tickets. Admins view all and reply.
create policy "user raises request" on public.support_requests for insert with check (
  user_id = auth.uid() and not public.is_admin()
  and exists (select 1 from public.tickets t where t.id = ticket_id and t.user_id = auth.uid()));
create policy "own or admin view" on public.support_requests for select using (user_id = auth.uid() or public.is_admin());
create policy "admin replies" on public.support_requests for update using (public.is_admin()) with check (public.is_admin());

-- table permissions (admins may only change status/note/reply)
grant usage on schema public to anon, authenticated;
grant select on public.profiles to authenticated;
grant select on public.fares to anon, authenticated;
revoke all on public.tickets from anon, authenticated;
revoke all on public.support_requests from anon, authenticated;
grant select, insert on public.tickets to authenticated;
grant update (status, support_note) on public.tickets to authenticated;
grant select, insert on public.support_requests to authenticated;
grant update (status, admin_reply) on public.support_requests to authenticated;

-- 4) forgot password with security question (no email, no link)
create or replace function public.set_security_qa(q text, a text) returns void
language sql security definer set search_path = public, extensions as $$
  update public.profiles set sec_question = q, sec_answer_hash = crypt(lower(trim(a)), gen_salt('bf')) where id = auth.uid();
$$;
create or replace function public.get_security_question(p_email text) returns text
language sql security definer set search_path = public as $$
  select sec_question from public.profiles where lower(email) = lower(p_email);
$$;
create or replace function public.reset_password_with_answer(p_email text, a text, new_pw text) returns boolean
language plpgsql security definer set search_path = public, extensions as $$
declare uid uuid;
begin
  select id into uid from public.profiles
   where lower(email) = lower(p_email) and sec_answer_hash is not null
     and sec_answer_hash = crypt(lower(trim(a)), sec_answer_hash);
  if uid is null or length(new_pw) < 6 then return false; end if;
  update auth.users set encrypted_password = crypt(new_pw, gen_salt('bf')), updated_at = now() where id = uid;
  return true;
end $$;
grant execute on function public.set_security_qa(text,text), public.get_security_question(text),
  public.reset_password_with_answer(text,text,text) to anon, authenticated;

notify pgrst, 'reload schema';

-- ============================================================
-- MAKE AN ADMIN (after that person has signed up). Run separately:
--   update public.profiles set role = 'admin' where email = 'admin@gmail.com';
-- Old accounts (made before this setup) have no security question; to give one:
--   update public.profiles set sec_question = 'What is your pet''s name?', sec_answer_hash = extensions.crypt('tommy', extensions.gen_salt('bf')) where email = 'old@gmail.com';
-- ============================================================
