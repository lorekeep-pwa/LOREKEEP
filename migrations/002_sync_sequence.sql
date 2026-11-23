ALTER TABLE lorekeep_sync_records
  ADD COLUMN IF NOT EXISTS sync_seq BIGSERIAL;

CREATE UNIQUE INDEX IF NOT EXISTS lorekeep_sync_records_sync_seq_idx
  ON lorekeep_sync_records (sync_seq);

CREATE INDEX IF NOT EXISTS lorekeep_sync_records_owner_seq_idx
  ON lorekeep_sync_records (owner_id, sync_seq);
