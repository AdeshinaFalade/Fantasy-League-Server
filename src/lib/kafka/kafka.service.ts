import {
    Injectable,
    Logger,
    OnApplicationBootstrap,
    OnModuleDestroy,
    OnModuleInit,
} from '@nestjs/common';
import { Admin, Kafka, Producer, Consumer } from 'kafkajs';

@Injectable()
export class KafkaService implements OnModuleInit, OnApplicationBootstrap, OnModuleDestroy {
    private readonly logger = new Logger(KafkaService.name);
    private producer?: Producer;
    private consumer?: Consumer;
    private admin?: Admin;
    private readonly isEnabled = process.env.KAFKA_ENABLED === 'true';

    // Phase 1: callbacks registered by each consumer during module init
    private readonly pendingSubscriptions = new Map<string, ((payload: any) => Promise<void>)[]>();

    private readonly kafka = new Kafka({
        clientId: process.env.KAFKA_CLIENT_ID ?? 'fantasy-league',
        brokers: (process.env.KAFKA_BROKERS ?? 'localhost:9092').split(','),
    });

    // ── Lifecycle ────────────────────────────────────────────────────────────

    async onModuleInit(): Promise<void> {
        if (!this.isEnabled) {
            this.logger.warn('Kafka is disabled. Producer connection skipped.');
            return;
        }
        this.producer = this.kafka.producer();
        await this.producer.connect();
        this.logger.log('Kafka producer connected');
    }

    /** Called after ALL modules have initialised — safe to start the consumer here. */
    async onApplicationBootstrap(): Promise<void> {
        if (!this.isEnabled || this.pendingSubscriptions.size === 0) return;

        const topics = Array.from(this.pendingSubscriptions.keys());

        // Ensure every topic exists before subscribing
        await this.ensureTopicsExist(topics);

        this.consumer = this.kafka.consumer({ groupId: 'fantasy-league-group' });
        await this.consumer.connect();

        // Subscribe to ALL topics in one call — consumer is not yet running
        await this.consumer.subscribe({ topics, fromBeginning: true });

        await this.consumer.run({
            eachMessage: async ({ topic, message }) => {
                const valueStr = message.value?.toString();
                if (!valueStr) return;
                try {
                    const parsed = JSON.parse(valueStr);
                    const handlers = this.pendingSubscriptions.get(topic) ?? [];
                    for (const handler of handlers) {
                        await handler(parsed);
                    }
                } catch (err) {
                    this.logger.error(`Error processing Kafka message on topic ${topic}: ${err}`);
                }
            },
        });

        this.logger.log(`Kafka consumer started. Subscribed to topics: ${topics.join(', ')}`);
    }

    async onModuleDestroy(): Promise<void> {
        if (this.consumer) await this.consumer.disconnect();
        if (this.producer) await this.producer.disconnect();
        if (this.admin) await this.admin.disconnect();
    }

    // ── Public API ───────────────────────────────────────────────────────────

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

    /**
     * Register a callback for a topic.
     * The actual consumer subscription happens in onApplicationBootstrap().
     */
    subscribe(topic: string, callback: (payload: any) => Promise<void>): void {
        if (!this.isEnabled) {
            this.logger.warn(`Kafka is disabled. Skipping subscription to topic: ${topic}`);
            return;
        }
        if (!this.pendingSubscriptions.has(topic)) {
            this.pendingSubscriptions.set(topic, []);
        }
        this.pendingSubscriptions.get(topic)!.push(callback);
        this.logger.log(`Registered handler for topic: ${topic}`);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private async ensureTopicsExist(topics: string[]): Promise<void> {
        if (!this.admin) {
            this.admin = this.kafka.admin();
            await this.admin.connect();
        }
        const existing = await this.admin.listTopics();
        const missing = topics.filter((t) => !existing.includes(t));
        if (missing.length > 0) {
            await this.admin.createTopics({
                topics: missing.map((topic) => ({
                    topic,
                    numPartitions: 1,
                    replicationFactor: 1,
                })),
                waitForLeaders: true,
            });
            this.logger.log(`Created Kafka topics: ${missing.join(', ')}`);
        }
    }
}
