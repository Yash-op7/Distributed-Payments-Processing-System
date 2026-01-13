import { PaymentState } from './payment';

export const validTransitions: Record<PaymentState, PaymentState[]> = {
    CREATED: [PaymentState.AUTHORIZED, PaymentState.FAILED],
    AUTHORIZED: [PaymentState.CAPTURED, PaymentState.FAILED],
    CAPTURED: [PaymentState.SETTLED, PaymentState.FAILED],
    SETTLED: [],
    FAILED: []
};

export function canTransition(from: PaymentState, to: PaymentState): boolean {
    return validTransitions[from].includes(to);
}