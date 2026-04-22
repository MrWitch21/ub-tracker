-- =============================================================================
-- UB Tracker - Runner photos storage bucket
-- =============================================================================
-- Run once in Supabase SQL Editor. Creates a public bucket for runner photos.
-- =============================================================================

-- Create bucket (5 MB limit per file, public read)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'runner-photos',
  'runner-photos',
  true,                                                   -- public: anyone can read via URL
  5242880,                                                -- 5 MB max
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Policies: anyone (even anon) can upload / read / delete photos in this bucket.
-- Since this is MVP/demo-grade, we rely on admin PIN gating at the UI layer.
-- For stricter security later, replace these with authenticated-only policies.

DROP POLICY IF EXISTS "runner-photos-read"   ON storage.objects;
DROP POLICY IF EXISTS "runner-photos-insert" ON storage.objects;
DROP POLICY IF EXISTS "runner-photos-update" ON storage.objects;
DROP POLICY IF EXISTS "runner-photos-delete" ON storage.objects;

CREATE POLICY "runner-photos-read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'runner-photos');

CREATE POLICY "runner-photos-insert"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'runner-photos');

CREATE POLICY "runner-photos-update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'runner-photos');

CREATE POLICY "runner-photos-delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'runner-photos');
