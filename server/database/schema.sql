CREATE TABLE IF NOT EXISTS sessions (token_hash text PRIMARY KEY, farm jsonb NOT NULL, expires_at timestamptz NOT NULL);
