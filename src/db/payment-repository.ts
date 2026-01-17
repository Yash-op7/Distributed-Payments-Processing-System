import { KafkaTopics, PaymentProps, PaymentState } from '../constants';
import { Payment } from '../core/payment';
import { PaymentRow } from '../types';
import { withTransaction } from './client';

export class PaymentRepository {
    async create(props: Omit<PaymentProps, 'createdAt' | 'updatedAt'>): Promise<Payment> {
        return withTransaction(async (client) => {
            const result = await client.query(
                `INSERT INTO payments (id, amount_minor, currency, direction, state)
VALUES ($1,$2,$3,$4,$5)
RETURNING *`,
                [props.id, props.amountMinor, props.currency, props.direction, props.state]
            );


            return this.mapRow(result.rows[0]);
        });
    }

    async findById(id: string): Promise<Payment | null> {
        const result = await withTransaction(async (client) =>
            client.query('SELECT * FROM payments WHERE id = $1', [id])
        );

        if (result.rows.length === 0) return null;
        return this.mapRow(result.rows[0]);
    }

    async updateState(id: string, newState: PaymentState): Promise<void> {
        await withTransaction(async (client) => {
            await client.query(
                `UPDATE payments SET state=$1, updated_at=now() WHERE id=$2`,
                [newState, id]
            );
        });
    }

    async saveOutboxEvent(
        client: any,
        event: { topic: KafkaTopics; payload: any; partition_key?: string }
    ) {
        await client.query(
            `INSERT INTO outbox_events (topic, partition_key, payload)
     VALUES ($1, $2, $3)`,
            [event.topic, event.partition_key ?? null, event.payload]
        );
    }


    private mapRow(row: PaymentRow): Payment {
        return new Payment({
            id: row.id,
            amountMinor: Number(row.amount_minor),
            currency: row.currency,
            direction: row.direction,
            state: row.state,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        });
    }
}