import { KafkaEvents, PaymentDirection, PaymentState } from "./constants";

export interface PaymentRow {
    id: string;
    amount_minor: string | number; // pg can return numeric types as string sometimes
    currency: string;
    direction: PaymentDirection;
    state: PaymentState;
    created_at: Date;
    updated_at: Date;
}

export type KafkaEventBaseType<TPayload extends object = {}> = {
  event_id: string;
  event_type: KafkaEvents;
  partition_key?: string;
} & TPayload;
