// currency-safe arithmetic
export function addMinor(a: number, b: number): number {
    return a + b;
}

export function subtractMinor(a: number, b: number): number {
    return a - b;
}

export function validateAmount(amount: number) {
    if (!Number.isInteger(amount) || amount <= 0) {
        throw new Error('Amount must be a positive integer in minor units');
    }
}