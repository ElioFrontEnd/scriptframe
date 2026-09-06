-- Cutframe migration 002 — styles from a reference image
--
-- Run this in the Supabase SQL editor. It is additive: nothing existing is
-- dropped or rewritten, and jobs made before it keep working.
--
-- Two changes:
--   1. custom_styles — a style the user made from their own reference image,
--      reusable across projects.
--   2. jobs.style — a snapshot of the style a job was generated with. Jobs are
--      historical records, so they must not change meaning when a style is
--      later edited or deleted. Older jobs have NULL here and fall back to
--      their preset id.

-- ---------------------------------------------------------- custom_styles --

create table if not exists public.custom_styles (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  name          text not null,
  /** Appended verbatim to every prompt, exactly like a preset's block. */
  block         text not null,
  /** Steers the prompt writer toward scenes this look can actually render. */
  guidance      text not null default '',
  /** Three hex colours for the swatch panel. */
  swatch        text[] not null default '{}',
  texture       text not null default 'flat',
  /** Storage key of the reference image, so the user can see what it came from. */
  reference_key text,
  created_at    timestamptz not null default now()
);

create index if not exists custom_styles_user_idx
  on public.custom_styles (user_id, created_at desc);

-- ------------------------------------------------------------ job snapshot --

alter table public.jobs
  add column if not exists style jsonb;

comment on column public.jobs.style is
  'Snapshot of the style used: {id,name,block,guidance,swatch,texture}. NULL on jobs created before migration 002 — fall back to style_id.';

-- ----------------------------------------------------------------- storage --

-- References live in the same private bucket as generated frames, under a
-- separate prefix. Nothing reads it directly; the app hands out signed URLs.
insert into storage.buckets (id, name, public)
values ('images', 'images', false)
on conflict (id) do nothing;

-- --------------------------------------------------------------------- RLS --

alter table public.custom_styles enable row level security;

-- Readable by their owner only. As everywhere else, writes go through server
-- routes using the service role after the caller has been established.
drop policy if exists "own custom styles" on public.custom_styles;
create policy "own custom styles" on public.custom_styles
  for select using (auth.uid() = user_id);
