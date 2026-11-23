ALTER TABLE lorekeep_sync_records
  DROP CONSTRAINT IF EXISTS lorekeep_sync_records_entity_type_check;

ALTER TABLE lorekeep_sync_records
  ADD CONSTRAINT lorekeep_sync_records_entity_type_check
  CHECK (entity_type IN ('documents', 'games', 'collections', 'revisions', 'gameSessions', 'archiveKeyCheck'));
