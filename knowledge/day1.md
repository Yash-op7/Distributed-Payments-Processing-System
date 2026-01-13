# Write down the state machine formally:

The idea: to model the entire lifecyle of a payment as state transitions
We have 3 processes all listening to certain kafka topics:
1. api-server: create payments, authorize payments, capture payment, enforce idempotency, persist state in db, emit kafka events
2. settlement-worker: consume payment events, perform settlement logic (update db and payment state), Transition CAPTURED → SETTLED, emit settlement events
3. ledger-worker: consume settlement events, update immutable ledger

States:
- CREATED
- AUTHORIZED
- CAPTURED
- SETTLED

Event Types
- PAYMENT_CREATED
- PAYMENT_AUTHORIZED
- PAYMENT_CAPTURED
- PAYMENT_SETTLED

Topics:
- payments.events
- payments.settlement
- payments.dlq

Transitions:
1. API request from POSTMAN or curl triggers this state transition on api-server: CREATED --(API authorize)--> AUTHORIZED -> emits PAYMENT_AUTHORIZED in payments.events topic
2. api server on consuming event PAYMENT_AUTHORIZED triggers this state transition: AUTHORIZED --(API capture)--> CAPTURED -> emits PAYMENT_CAPTURED in payments.events topic
3. settlement worker on consuming event PAYMENT_CAPTURED triggers this state transition: CAPTURED --(settlement-worker)--> SETTLED -> emits PAYMENT_SETTLED in payments.settlement topic
4. ledger worker on consuming event PAYMENT_SETTLED triggers this state transition: SETTLED --(ledger-worker)--> (updates immutable ledger in db)

1. CREATED → AUTHORIZED
   Trigger: API call POST /payments/{id}/authorize
   Component: api-server
   Action:
     - update payments.state
     - emit PAYMENT_AUTHORIZED → payments.events

2. AUTHORIZED → CAPTURED
   Trigger: API call POST /payments/{id}/capture
   Component: api-server
   Action:
     - update payments.state
     - emit PAYMENT_CAPTURED → payments.events

3. CAPTURED → SETTLED
   Trigger: Kafka consumer
   Component: settlement-worker$$
   Input event: PAYMENT_CAPTURED
   Action:
     - perform settlement logic
     - update payments.state
     - emit PAYMENT_SETTLED → payments.settlement

4. Ledger write (not a state transition)
   Trigger: Kafka consumer
   Component: ledger-worker
   Input event: PAYMENT_SETTLED
   Action:
     - write ledger_entries (append-only)

Final Flow Updated:
Client → POST /payments
Client → POST /payments/{id}/authorize
    API emits PAYMENT_AUTHORIZED

Client → POST /payments/{id}/capture
    API emits PAYMENT_CAPTURED

Settlement Worker consumes PAYMENT_CAPTURED
    updates payment → SETTLED
    emits PAYMENT_SETTLED

Ledger Worker consumes PAYMENT_SETTLED
    writes ledger entry
