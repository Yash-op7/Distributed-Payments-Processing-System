import crypto from 'crypto';
import { withTransaction } from '../db/client';

export async function handleIdempotency(
    key: string,
    body: any,
    handler: () => Promise<any>
): Promise<any> {
    const hash = crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex');

    return withTransaction(async (client) => {
        const existing = await client.query(
            'SELECT * FROM idempotency_keys WHERE key=$1',
            [key]
        );

        if (existing.rows.length > 0) {
            const row = existing.rows[0];
            if (row.request_hash !== hash) {
                throw new Error('Idempotency key reused with different request');
            }
            return row.response_json;
        }

        const response = await handler();

        await client.query(
            `INSERT INTO idempotency_keys (key, request_hash, response_json, expires_at)
VALUES ($1,$2,$3, now() + interval '24 hours')`,
            [key, hash, response]
        );

        return response;
    });
}