import { Kafka, Partitioners } from 'kafkajs';

const kafka = new Kafka({
    clientId: 'payments-api',
    brokers: ['localhost:9092'],
});

export const producer = kafka.producer({
  createPartitioner: Partitioners.LegacyPartitioner
});

export async function initKafkaProducer() {
    await producer.connect();
}

export async function publishEvent(topic: string, event: any) {
    await producer.send({
        topic,
        messages: [{ value: JSON.stringify(event) }],
    });
}