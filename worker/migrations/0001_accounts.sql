-- Accounts signed in with Google or Facebook ('dev' only exists in local development).
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL CHECK (provider IN ('google', 'facebook', 'dev')),
  provider_user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  avatar_url TEXT,
  created_at INTEGER NOT NULL,
  last_login_at INTEGER NOT NULL,
  UNIQUE (provider, provider_user_id)
);

-- Sign-in sessions. Only a SHA-256 hash of the cookie token is stored.
CREATE TABLE auth_sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX auth_sessions_user ON auth_sessions (user_id);
CREATE INDEX auth_sessions_expiry ON auth_sessions (expires_at);

-- One saved game snapshot per account (gzip-compressed JSON), versioned for safe sync.
CREATE TABLE user_data (
  user_id TEXT PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  data BLOB NOT NULL,
  size INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
