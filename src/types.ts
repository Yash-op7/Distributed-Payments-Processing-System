import { PaymentDirection, PaymentState } from "./constants";

export interface PaymentRow {
    id: string;
    amount_minor: string | number; // pg can return numeric types as string sometimes
    currency: string;
    direction: PaymentDirection;
    state: PaymentState;
    created_at: Date;
    updated_at: Date;
}
