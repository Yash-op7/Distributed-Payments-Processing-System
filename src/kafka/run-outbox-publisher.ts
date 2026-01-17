import { runOutboxPublisher } from './outbox-publisher';
import { initKafkaProducer } from './producer';

async function main() {
    await initKafkaProducer(); // make sure Kafka producer is connected
    await runOutboxPublisher();
}

if (require.main === module) {
    main().catch((err) => {
        console.error('Outbox publisher crashed:', err);
        process.exit(1);
    });
}
