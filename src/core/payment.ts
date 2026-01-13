// This file defines a payment as a domain entity with a controlled lifecycle, enforcing valid state transitions and preventing invalid or accidental mutations.
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

export interface PaymentProps {
    id: string;
    amountMinor: number;
    currency: string;
    direction: PaymentDirection;
    state: PaymentState;
    createdAt: Date;
    updatedAt: Date;
}


export class Payment {
    private props: PaymentProps;

    constructor(props: PaymentProps) {
        this.props = props;
    }

    get id() { return this.props.id; }
    get state() { return this.props.state; }
    get amountMinor() { return this.props.amountMinor; }
    get currency() { return this.props.currency; }
    get direction() { return this.props.direction; }


    authorize() {
        if (this.props.state !== PaymentState.CREATED) {
            throw new Error(`Cannot authorize payment in state ${this.props.state}`);
        }
        this.props.state = PaymentState.AUTHORIZED;
    }


    capture() {
        if (this.props.state !== PaymentState.AUTHORIZED) {
            throw new Error(`Cannot capture payment in state ${this.props.state}`);
        }
        this.props.state = PaymentState.CAPTURED;
    }


    settle() {
        if (this.props.state !== PaymentState.CAPTURED) {
            throw new Error(`Cannot settle payment in state ${this.props.state}`);
        }
        this.props.state = PaymentState.SETTLED;
    }


    fail() {
        this.props.state = PaymentState.FAILED;
    }


    toJSON() {
        return { ...this.props };
    }

    // A payment is final if no more transitions are allowed
    get isFinal() {
        return this.props.state === PaymentState.SETTLED ||
            this.props.state === PaymentState.FAILED;
    }

}