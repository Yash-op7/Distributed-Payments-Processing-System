import express from 'express';
import bodyParser from 'body-parser';
import { v4 as uuidv4 } from 'uuid';

import { PaymentRepository } from '../db/payment-repository';
import { handleIdempotency } from './idempotency';
import { initKafkaProducer, publishEvent } from '../kafka/producer';
import { APIRoutes, CustomHTTPHeaders, KafkaEvents, KafkaTopics, PaymentDirection, PaymentState } from '../constants';
import { KafkaEventBaseType } from '../types';

const app = express();
app.use(bodyParser.json());

const repo = new PaymentRepository();

function requireIdempotencyKey(req: any): string {
    const key = req.header(CustomHTTPHeaders.IDEMPOTENCY_KEY);
    if (!key) throw new Error(`Missing ${CustomHTTPHeaders.IDEMPOTENCY_KEY} header`);
    return key;
}

// Create payment
app.post(APIRoutes.CREATE_PAYMENT, async (req, res) => {
    try {
        const key = requireIdempotencyKey(req);

        const result = await handleIdempotency(key, req.body, async (dbClient: any) => {
            const { amountMinor, currency, direction } = req.body;

            const payment = await repo.create({
                id: uuidv4(),
                amountMinor,
                currency,
                direction: direction as PaymentDirection,
                state: PaymentState.CREATED,
            });

            type PaymentCreatedPayload = {
                payment_id: string;
                amount_minor: number;
                currency: string;
                direction: string;
                timestamp: string;
            };

            const event: KafkaEventBaseType<PaymentCreatedPayload> = {
                event_id: uuidv4(),
                event_type: KafkaEvents.PAYMENT_CREATED,
                payment_id: payment.id,
                amount_minor: payment.amountMinor,
                currency: payment.currency,
                direction: payment.direction,
                timestamp: new Date().toISOString(),
            };

            // await publishEvent(KafkaTopics.PAYMENTS_EVENTS, event);
            await repo.saveOutboxEvent(dbClient, {
                topic: KafkaTopics.PAYMENTS_EVENTS,
                payload: event,
            })

            return payment.toJSON();
        });

        res.json(result);
    } catch (e: any) {
        res.status(400).json({ error: e.message });
    }
});

// Authorize
app.post(APIRoutes.AUTHORIZE_PAYMENT, async (req, res) => {
    try {
        const key = requireIdempotencyKey(req);
        const id = req.params.id;

        const result = await handleIdempotency(key, req.body, async () => {
            const payment = await repo.findById(id);
            if (!payment) throw new Error('Payment not found');

            payment.authorize();
            await repo.updateState(id, payment.state);

            const event = {
                event_id: uuidv4(),
                event_type: KafkaEvents.PAYMENT_AUTHORIZED,
                payment_id: id,
                amount_minor: payment.amountMinor,
                currency: payment.currency,
                direction: payment.direction,
                timestamp: new Date().toISOString(),
            };

            await publishEvent(KafkaTopics.PAYMENTS_EVENTS, event);

            return payment.toJSON();
        });

        res.json(result);
    } catch (e: any) {
        res.status(400).json({ error: e.message });
    }
});

app.post(APIRoutes.CAPTURE_PAYMENT, async (req, res) => {
    try {
        const key = requireIdempotencyKey(req);
        const id = req.params.id;

        const result = await handleIdempotency(key, req.body, async () => {
            const payment = await repo.findById(id);
            if (!payment) throw new Error('Payment not found');

            payment.capture();
            await repo.updateState(id, payment.state);

            const event = {
                event_id: uuidv4(),
                event_type: PaymentState.CAPTURED,
                payment_id: id,
                amount_minor: payment.amountMinor,
                currency: payment.currency,
                direction: payment.direction,
                timestamp: new Date().toISOString(),
            };

            await publishEvent(KafkaTopics.PAYMENTS_EVENTS, event);

            return payment.toJSON();
        });

        res.json(result);
    } catch (e: any) {
        res.status(400).json({ error: e.message });
    }
});

async function start() {
    await initKafkaProducer();
    app.listen(3000, () => console.log('✅ API server running on port 3000'));
}

start();