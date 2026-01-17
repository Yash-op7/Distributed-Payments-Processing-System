-- Big picture
-- This schema is doing four distinct jobs:
-- Store payment workflow state (payments)
-- Guarantee idempotent API behavior (idempotency_keys)
-- Record money movements immutably (ledger_entries)
-- Prevent double-processing of events (processed_events)
-- This mirrors a production-grade payments architecture.
-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Payments table (workflow state)
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
    currency CHAR(3) NOT NULL,
    direction VARCHAR(3) NOT NULL CHECK (direction IN ('IN', 'OUT')),
    state VARCHAR(16) NOT NULL CHECK (
        state IN (
            'CREATED',
            'AUTHORIZED',
            'CAPTURED',
            'SETTLED',
            'FAILED'
        )
    ),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Idempotency keys table
CREATE TABLE idempotency_keys (key TEXT PRIMARY KEY);

-- Immutable ledger table
CREATE TABLE ledger_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id UUID NOT NULL REFERENCES payments(id),
    currency CHAR(3) NOT NULL,
    amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
    entry_type VARCHAR(6) NOT NULL CHECK (entry_type IN ('CREDIT', 'DEBIT')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Kafka consumer deduplication table
CREATE TABLE processed_events (
    event_id UUID PRIMARY KEY,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);