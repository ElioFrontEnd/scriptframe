-- Cutframe migration 003 — timestamped transcripts
--
-- Run this in the Supabase SQL editor. Additive and safe to run twice.
--
-- When a script carries timestamps, each frame belongs to a moment in the
-- video rather than to an arbitrary slice of the word count. Storing that
-- moment lets the ZIP name frames by timecode, so they drop onto a timeline
-- already in sync.
--
-- NULL means the project came from a plain script with no timing, which stays
-- the common case.

alter table public.job_images
  add column if not exists start_ms integer;

comment on column public.job_images.start_ms is
  'Milliseconds from the start of the video for this frame, when the script was a timestamped transcript. NULL for plain scripts.';

-- Frames are always read in order; including the timestamp keeps the ZIP
-- export and the gallery on the same index-only path.
create index if not exists job_images_job_idx_start
  on public.job_images (job_id, idx, start_ms);
