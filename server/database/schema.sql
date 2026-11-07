CREATE TABLE IF NOT EXISTS sessions (token_hash text PRIMARY KEY, farm jsonb NOT NULL, expires_at timestamptz NOT NULL);
-- Only the trusted backend connects directly. No browser/anon access to saves.
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE sessions FROM PUBLIC;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN
    REVOKE ALL ON TABLE sessions FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
    REVOKE ALL ON TABLE sessions FROM authenticated;
  END IF;
END $$;
CREATE TABLE IF NOT EXISTS market_listings (id uuid PRIMARY KEY, seller_hash text NOT NULL REFERENCES sessions(token_hash), payload jsonb NOT NULL);
CREATE INDEX IF NOT EXISTS market_seller_idx ON market_listings(seller_hash);
ALTER TABLE market_listings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE market_listings FROM PUBLIC;
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN REVOKE ALL ON TABLE market_listings FROM anon; END IF;
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN REVOKE ALL ON TABLE market_listings FROM authenticated; END IF;
END $$;
