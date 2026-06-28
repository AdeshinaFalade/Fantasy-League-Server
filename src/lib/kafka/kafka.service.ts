import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Kafka, Producer, Consumer } from 'kafkajs';

@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(KafkaService.name);
    private producer?: Producer;
    private consumer?: Consumer;
    private readonly isEnabled = process.env.KAFKA_ENABLED === 'true';
    private readonly subscriptions = new Map<string, ((payload: any) => Promise<void>)[]>();

    private readonly kafka = new Kafka({
        clientId: process.env.KAFKA_CLIENT_ID ?? 'fantasy-league',
        brokers: (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(','),
    });

    async onModuleInit(): Promise<void> {
        if (!this.isEnabled) {
            this.logger.warn('Kafka is disabled. Producer connection skipped.');
            return;
        }
        this.producer = this.kafka.producer();
        await this.producer.connect();
        this.logger.log('Kafka producer connected');
    }

    async onModuleDestroy(): Promise<void> {
        if (this.producer) {
            await this.producer.disconnect();
        }
        if (this.consumer) {
            await this.consumer.disconnect();
        }
    }

    async publish(topic: string, key: string, value: unknown): Promise<void> {
        if (!this.isEnabled || !this.producer) {
            this.logger.warn(`Kafka is disabled. Cannot publish to topic: ${topic}`);
            return;
        }
        await this.producer.send({
            topic,
            messages: [{ key, value: JSON.stringify(value) }],
        });
    }

    async subscribe(topic: string, callback: (payload: any) => Promise<void>): Promise<void> {
        if (!this.isEnabled) {
            this.logger.warn(`Kafka is disabled. Skipping subscription to topic: ${topic}`);
            return;
        }

        if (!this.subscriptions.has(topic)) {
            this.subscriptions.set(topic, []);
        }
        this.subscriptions.get(topic)!.push(callback);

        if (!this.consumer) {
            this.consumer = this.kafka.consumer({ groupId: 'fantasy-league-group' });
            await this.consumer.connect();
            await this.consumer.subscribe({ topics: [topic], fromBeginning: true });
            
            await this.consumer.run({
                eachMessage: async ({ topic: msgTopic, message }) => {
                    const valueStr = message.value?.toString();
                    if (!valueStr) return;
                    try {
                        const parsed = JSON.parse(valueStr);
                        const handlers = this.subscriptions.get(msgTopic) || [];
                        for (const handler of handlers) {
                            await handler(parsed);
                        }
                    } catch (err) {
                        this.logger.error(`Error processing Kafka message on topic ${msgTopic}: ${err}`);
                    }
                }
            });
            this.logger.log(`Kafka consumer started and subscribed to topic: ${topic}`);
        } else {
            await this.consumer.subscribe({ topics: [topic], fromBeginning: true });
            this.logger.log(`Kafka consumer subscribed to additional topic: ${topic}`);
        }
    }
}
