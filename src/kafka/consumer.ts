import { Kafka } from 'kafkajs';

export const kafka = new Kafka({
  clientId: 'payments-workers',
  brokers: ['localhost:9092'],
});

export function createConsumer(groupId: string) {
  return kafka.consumer({ groupId });
}
