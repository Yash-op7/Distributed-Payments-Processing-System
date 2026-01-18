import { createConsumer } from '../kafka/consumer';
import { withTransaction } from '../db/client';
import { DBTables, KafkaConsumerGroups, KafkaEvents, KafkaTopics, PaymentState } from '../constants';
import { v4 as uuidv4 } from 'uuid';
import { KafkaEventBaseType, PaymentEventPayload } from '../types';

export async function runSettlementWorker() {
    const consumer = createConsumer(KafkaConsumerGroups.SETTLEMENT_WORKERS);

    await consumer.connect();
    await consumer.subscribe({ topic: KafkaTopics.PAYMENTS_EVENTS, fromBeginning: true });

    console.log('⚙️ Settlement worker started');

    await consumer.run({
        eachBatch: async ({ batch, resolveOffset, heartbeat, commitOffsetsIfNecessary, }) => {
            for (const message of batch.messages) {
                const ok = await processSettlementEvent(message);
                if (ok) {
                    resolveOffset(message.offset);
                } else {
                    // not resolving offset, so message will be retried, and breaking the batch to prevent incorrect offset commit by kafkaJS
                    break;
                }
                await heartbeat();
            }
            await commitOffsetsIfNecessary();
        },
    });
}

async function processSettlementEvent(message: any): Promise<boolean> {
    if (!message.value) return true;

    let event;
    try {
        event = JSON.parse(message.value.toString());
    } catch {
        return true;
    }


    if (event.event_type !== KafkaEvents.PAYMENT_CAPTURED) return true;

    try {
        return await withTransaction(async (client) => {
            const exists = await client.query(
                `SELECT 1 FROM ${DBTables.PROCESSED_EVENTS} WHERE event_id=$1`,
                [event.event_id]
            );

            // Idempotency: already handled → no-op
            if (exists.rowCount && exists.rowCount > 0) {
                return true;
            }

            const paymentRes = await client.query(
                `SELECT state FROM ${DBTables.PAYMENTS} WHERE id=$1 FOR UPDATE`,
                [event.payment_id]
            );

            if (paymentRes.rowCount === 0) throw new Error('Payment not found');

            if (paymentRes.rows[0].state !== PaymentState.CAPTURED) {
                throw new Error('Invalid payment state for settlement');
            }

            await client.query(
                `UPDATE ${DBTables.PAYMENTS} SET state=$1, updated_at=now() WHERE id=$2`,
                [PaymentState.SETTLED, event.payment_id]
            );

            const settledEvent: KafkaEventBaseType<PaymentEventPayload> = {
                event_id: uuidv4(),
                event_type: KafkaEvents.PAYMENT_SETTLED,
                payment_id: event.payment_id,
                amount_minor: event.amount_minor,
                currency: event.currency,
                direction: event.direction,
                timestamp: new Date().toISOString(),
            };

            await client.query(
                `INSERT INTO ${DBTables.OUTBOX_EVENTS} (topic, payload, partition_key)
           VALUES ($1,$2,$3)`,
                [KafkaTopics.PAYMENTS_EVENTS, JSON.stringify(settledEvent), event.payment_id]
            );

            await client.query(
                `INSERT INTO ${DBTables.PROCESSED_EVENTS} (event_id) VALUES ($1)`,
                [event.event_id]
            );
            return true;
        })
    } catch (err) {
        console.error('Settlement failed', err);
        return false;
    } finally {
    }
}

/**
 * This file is fine for now, later points can be improved:
 * 1. Performance: Currently, one transaction per message
 * 2. Implement DLQ for poison messages
 */

runSettlementWorker().catch((err) => {
    console.error('❌ Settlement worker failed to start', err);
    process.exit(1);
});