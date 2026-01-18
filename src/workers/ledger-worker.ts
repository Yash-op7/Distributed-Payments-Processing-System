import { createConsumer } from '../kafka/consumer';
import { withTransaction } from '../db/client';
import { DBTables, KafkaConsumerGroups, KafkaEvents, KafkaTopics, LEDGER_ENTRY_TYPES, PaymentDirection } from '../constants';
import { PoolClient } from 'pg';

export async function runLedgerWorker() {
    const consumer = createConsumer(KafkaConsumerGroups.LEDGER_WORKERS);

    await consumer.connect();
    await consumer.subscribe({ topic: KafkaTopics.PAYMENTS_EVENTS, fromBeginning: true });

    console.log('📒 Ledger worker started');

    await consumer.run({
        autoCommit: false,
        eachBatch: async ({ batch, resolveOffset, heartbeat, commitOffsetsIfNecessary }) => {
            for (const message of batch.messages) {
                const ok = await processLedgerWriteEvent(message);
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

async function processLedgerWriteEvent(message: any): Promise<boolean> {
    if (!message.value) return true;
    let event;
    try {
        event = JSON.parse(message.value.toString());
    } catch {
        return true; // poison message → skip
    }

    if (event.event_type !== KafkaEvents.PAYMENT_SETTLED) return true;

    try {
        return await withTransaction(async (client: PoolClient) => {
            const exists = await client.query(
                `SELECT 1 FROM ${DBTables.PROCESSED_EVENTS} WHERE event_id=$1`,
                [event.event_id]
            );

            // Idempotency: already handled → no-op
            if (exists.rowCount && exists.rowCount > 0) {
                return true;
            }

            const entryType =
                event.direction === PaymentDirection.IN ? LEDGER_ENTRY_TYPES.CREDIT : LEDGER_ENTRY_TYPES.DEBIT;

            await client.query(
                `INSERT INTO ${DBTables.LEDGER_ENTRIES} (payment_id, currency, amount_minor, entry_type)
           VALUES ($1,$2,$3,$4)`,
                [event.payment_id, event.currency, event.amount_minor, entryType]
            );

            await client.query(
                `INSERT INTO ${DBTables.PROCESSED_EVENTS} (event_id) VALUES ($1)`,
                [event.event_id]
            );
            console.log(`📒 Ledger entry created for payment ${event.payment_id}`);
            return true;
        })
    } catch (err) {
        console.error('Ledger write failed', err);
        return false
    }
}

runLedgerWorker().catch((err) => {
    console.error('❌ Ledger worker failed to start', err);
    process.exit(1);
});