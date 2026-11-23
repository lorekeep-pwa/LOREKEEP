CREATE TABLE IF NOT EXISTS lorekeep_sync_records (
  owner_id TEXT NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('documents', 'games', 'collections', 'revisions', 'gameSessions', 'archiveKeyCheck')),
  record_id UUID NOT NULL,
  change_id UUID NOT NULL,
  revision INTEGER NOT NULL CHECK (revision > 0),
  ciphertext TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (owner_id, entity_type, record_id)
);

CREATE INDEX IF NOT EXISTS lorekeep_sync_records_owner_updated_idx
  ON lorekeep_sync_records (owner_id, updated_at DESC);
