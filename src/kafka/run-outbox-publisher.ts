import { runOutboxPublisher } from './outbox-publisher';
import { initKafkaProducer } from './producer';

async function main() {
    await initKafkaProducer(); 
    await runOutboxPublisher();
}

if (require.main === module) {
    main().catch((err) => {
        console.error('Outbox publisher crashed:', err);
        process.exit(1);
    });
}
