# sadahaq_service_db

PostgreSQL database schema for all Sadahaq services.

## Files
- `schema_full.sql` — DDL (table definitions, sequences, types) 
- `post_data.sql` — Indexes, constraints, and sequence values

## Restore on new VM
```bash
# 1. Create the database
createdb -U medusa_user sadahaq_service_db

# 2. Apply schema
psql -U medusa_user sadahaq_service_db < schema_full.sql

# 3. Import data (from separate backup - not in git due to size)
# pg_restore or psql < sadahaq_service_db.sql

# 4. Apply indexes/constraints
psql -U medusa_user sadahaq_service_db < post_data.sql
```

> **Note:** The full data dump (791MB) must be transferred directly to the new VM via scp/rsync. It is not stored in this repo.
