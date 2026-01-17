DROP TABLE IF EXISTS idempotency_keys;

CREATE TABLE idempotency_keys (
    key TEXT PRIMARY KEY,
    request_hash TEXT NOT NULL,
    response_json JSONB NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL
);
