import { pool } from '../db/client';
import { producer } from './producer';

const BATCH_SIZE = 100;

export async function runOutboxPublisher() {
  console.log('🚀 Outbox publisher started');

  while (true) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const { rows } = await client.query(
        `
        SELECT id, topic, partition_key, payload
        FROM outbox_events
        WHERE published_at IS NULL
        ORDER BY created_at
        LIMIT $1
        FOR UPDATE SKIP LOCKED
        `,
        [BATCH_SIZE]
      );

      if (rows.length === 0) {
        await client.query('COMMIT');
        await sleep(500);
        continue;
      }

      console.log(`Publishing ${rows.length} events from outbox...`);

      for (const row of rows) {
        await producer.send({
          topic: row.topic,
          messages: [
            {
              key: row.partition_key ?? undefined,
              value: JSON.stringify(row.payload),
            },
          ],
        });

        await client.query(
          `UPDATE outbox_events
           SET published_at = now()
           WHERE id = $1`,
          [row.id]
        );
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Outbox publish failed:', err);
      await sleep(1000);
    } finally {
      client.release();
    }
  }
}

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}
