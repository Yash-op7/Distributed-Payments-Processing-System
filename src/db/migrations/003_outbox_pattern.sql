CREATE TABLE outbox_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    topic TEXT NOT NULL,
    partition_key TEXT,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    published_at TIMESTAMPTZ
);

-- Partial Index to quickly find unpublished events (sort of like creating a to do list of events to be published, instead of scanning the whole table)
CREATE INDEX idx_outbox_unpublished
ON outbox_events (published_at)
WHERE published_at IS NULL;
