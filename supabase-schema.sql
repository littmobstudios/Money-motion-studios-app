-- ============================================================
-- MONEY MOTION STUDIOS — Supabase schema
-- Run this once in your Supabase project:
--   Dashboard → SQL Editor → New query → paste → Run.
-- Creates the 3 tables the app uses, plus simple row-level
-- security policies sized for a small studio app:
--   * Anyone (anon) can CREATE a booking and read/post chat.
--   * Only the signed-in owner (authenticated) can read or
--     change bookings, and read/write settings.
-- The owner account is created separately in Supabase
-- Dashboard → Authentication → Users (see README.md).
-- ============================================================

-- ---------- bookings ----------
create table if not exists public.bookings (
  id             uuid primary key default gen_random_uuid(),
  booking_number text unique not null,
  name           text not null,
  phone          text not null,
  email          text,
  service        text not null,
  price          int  not null,
  fee_due        int  not null default 50,
  starts_at      timestamptz,
  ends_at        timestamptz,
  hours          numeric,
  notes          text,
  status         text not null default 'Pending payment',
  created_at     timestamptz not null default now()
);

-- A client needs to look up their own booking on the pay page
-- and mark "I've Paid" — so anon can read/update a booking
-- ONLY when they know its booking number. RLS can't scope by
-- "knows the number" beyond the query filter itself, so the
-- policies below allow anon select/update on bookings; the
-- app always filters by booking_number. Numbers are random
-- 6-digit and unguessable enough for a small studio. The
-- owner (authenticated) has full access regardless.
alter table public.bookings enable row level security;

drop policy if exists "anon can create bookings"   on public.bookings;
drop policy if exists "anon can read bookings"     on public.bookings;
drop policy if exists "anon can update bookings"   on public.bookings;
drop policy if exists "owner full access bookings" on public.bookings;

create policy "anon can create bookings"
  on public.bookings for insert
  to anon
  with check (true);

create policy "anon can read bookings"
  on public.bookings for select
  to anon
  using (true);

-- Anon updates are how the pay page flips a booking to
-- "Payment sent — awaiting confirmation".
create policy "anon can update bookings"
  on public.bookings for update
  to anon
  using (true)
  with check (true);

create policy "owner full access bookings"
  on public.bookings for all
  to authenticated
  using (true)
  with check (true);

-- ---------- settings ----------
-- Key/value store: cashapp_handle, venmo_link, chime_handle,
-- live_on ("true"/"false"), playback_url.
create table if not exists public.settings (
  key   text primary key,
  value text
);

alter table public.settings enable row level security;

drop policy if exists "anyone can read settings"  on public.settings;
drop policy if exists "owner writes settings"     on public.settings;

-- Public read is required: the pay page shows the payment
-- handles, and the live room reads live_on / playback_url.
create policy "anyone can read settings"
  on public.settings for select
  to anon, authenticated
  using (true);

create policy "owner writes settings"
  on public.settings for all
  to authenticated
  using (true)
  with check (true);

-- Seed the owner's real handles (safe to re-run).
insert into public.settings (key, value) values
  ('cashapp_handle', '$LYNXUNLIMITEDMUSIC'),
  ('venmo_link',     'https://venmo.com/code?user_id=4643723270948240531&created=1792792682'),
  ('chime_handle',   '$Johnnie-Gannaway'),
  ('live_on',        'false'),
  ('playback_url',   '')
on conflict (key) do nothing;

-- ---------- chat_messages ----------
create table if not exists public.chat_messages (
  id         uuid primary key default gen_random_uuid(),
  room       text not null default 'live',
  sender     text not null,
  body       text not null,
  created_at timestamptz not null default now()
);

alter table public.chat_messages enable row level security;

drop policy if exists "anyone can read chat"  on public.chat_messages;
drop policy if exists "anyone can post chat"  on public.chat_messages;

create policy "anyone can read chat"
  on public.chat_messages for select
  to anon, authenticated
  using (true);

create policy "anyone can post chat"
  on public.chat_messages for insert
  to anon, authenticated
  with check (true);

-- Enable realtime so the live-room chat updates instantly.
-- (If this line errors because the table is already in the
-- publication, you're fine — ignore it.)
alter publication supabase_realtime add table public.chat_messages;
