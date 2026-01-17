export enum PaymentDirection {
    IN = 'IN',
    OUT = 'OUT',
}
export enum PaymentState {
    CREATED = 'CREATED',
    AUTHORIZED = 'AUTHORIZED',
    CAPTURED = 'CAPTURED',
    SETTLED = 'SETTLED',
    FAILED = 'FAILED',
}

export enum KafkaEvents {
    PAYMENT_CREATED = 'PAYMENT_CREATED',
    PAYMENT_AUTHORIZED = 'PAYMENT_AUTHORIZED',
    PAYMENT_CAPTURED = 'PAYMENT_CAPTURED',
    PAYMENT_SETTLED = 'PAYMENT_SETTLED',
    PAYMENT_FAILED = 'PAYMENT_FAILED',
}

export interface PaymentProps {
    id: string;
    amountMinor: number;
    currency: string;
    direction: PaymentDirection;
    state: PaymentState;
    createdAt: Date;
    updatedAt: Date;
}

export enum KafkaTopics {
    PAYMENTS_EVENTS = 'payments.events',
}

export enum CustomHTTPHeaders {
    IDEMPOTENCY_KEY = 'Idempotency-Key',
}

export enum APIRoutes {
    CREATE_PAYMENT = '/payments',
    AUTHORIZE_PAYMENT = '/payments/:id/authorize',
    CAPTURE_PAYMENT = '/payments/:id/capture',
}