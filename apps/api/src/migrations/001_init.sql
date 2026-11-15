-- The Learning Machine publisher schema. Releases are immutable once inserted.
CREATE TABLE IF NOT EXISTS users (id text PRIMARY KEY, email text UNIQUE NOT NULL, role text NOT NULL CHECK (role IN ('author','reviewer','publisher')),
  password_hash text NOT NULL, totp_secret text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS records (kind text NOT NULL CHECK (kind IN ('draft','source','media')), id text NOT NULL, body jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (kind, id));
CREATE TABLE IF NOT EXISTS releases (id text PRIMARY KEY, digest text NOT NULL UNIQUE, manifest jsonb NOT NULL, created_by text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS activations (seq bigserial PRIMARY KEY, release_id text NOT NULL REFERENCES releases(id), activated_by text NOT NULL, reason text NOT NULL, activated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS audit_log (seq bigserial PRIMARY KEY, actor text NOT NULL, action text NOT NULL, target text NOT NULL, at timestamptz NOT NULL DEFAULT now());
CREATE OR REPLACE FUNCTION tlm_releases_immutable() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'releases are immutable'; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS releases_immutable ON releases;
CREATE TRIGGER releases_immutable BEFORE UPDATE OR DELETE ON releases FOR EACH ROW EXECUTE FUNCTION tlm_releases_immutable();
CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now());
