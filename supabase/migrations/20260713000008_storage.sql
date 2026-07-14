-- PeelPrep migration 008 — Phase 3: private storage buckets + policies
-- (DATABASE.md §8.5, SECURITY.md §5).
--
-- Two private buckets. Objects live under a `{userId}/…` prefix so
-- `storage.foldername(name)[1] = auth.uid()` is both the RLS predicate and a
-- structural guarantee against path traversal. Downloads additionally go
-- through short-lived signed URLs issued server-side after a DAL ownership
-- check (defense in depth).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'documents', 'documents', false, 5242880,
    array[
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/markdown'
    ]
  ),
  -- exports: JSON archives written by the service role, fetched via signed URL.
  ('exports', 'exports', false, 52428800, array['application/json', 'application/zip'])
on conflict (id) do nothing;

-- ── documents bucket: full owner CRUD on the user's own prefix ───────────
create policy "documents_select_own" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy "documents_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy "documents_update_own" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy "documents_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- ── exports bucket: owner may read/delete; writes come from the service role ─
create policy "exports_select_own" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'exports'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy "exports_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'exports'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
