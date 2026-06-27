-- Reading status on saved items: "Want to read" / "Reading" / "Finished".

-- Add the column. NOT NULL with a default backfills every existing saved row
-- as "want_to_read"; the check keeps it to the three known shelves.
alter table public.saved_items
  add column status text not null default 'want_to_read'
  check (status in ('want_to_read', 'reading', 'finished'));

-- The initial schema gave saved_items SELECT/INSERT/DELETE policies but no
-- UPDATE policy. Changing a reading status is an UPDATE, so add one (owner-only,
-- matching the other saved_items policies).
create policy "users update their own saved items"
  on public.saved_items for update using (auth.uid() = user_id);
