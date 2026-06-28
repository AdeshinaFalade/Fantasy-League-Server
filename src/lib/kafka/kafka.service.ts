import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Kafka, Producer } from 'kafkajs';

@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(KafkaService.name);
    private producer?: Producer;
    private readonly isEnabled = process.env.KAFKA_ENABLED === 'true';

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
}
