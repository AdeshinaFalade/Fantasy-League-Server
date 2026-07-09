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

    private readonly kafka: Kafka;

    constructor() {
        const brokersStr = process.env.KAFKA_BROKERS ?? process.env.KAFKA_URL ?? 'localhost:9092';
        const brokers = brokersStr.split(',').map((b) => b.replace('kafka+ssl://', ''));
        const clientId = process.env.KAFKA_CLIENT_ID ?? 'fantasy-league';

        const config: any = {
            clientId,
            brokers,
        };

        const hasSsl =
            process.env.KAFKA_TRUSTED_CERT &&
            process.env.KAFKA_CLIENT_CERT &&
            process.env.KAFKA_CLIENT_CERT_KEY;

        if (hasSsl) {
            config.ssl = {
                rejectUnauthorized: false,
                ca: [process.env.KAFKA_TRUSTED_CERT],
                key: process.env.KAFKA_CLIENT_CERT_KEY,
                cert: process.env.KAFKA_CLIENT_CERT,
            };
        }

        this.kafka = new Kafka(config);
    }

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

        const prefix = process.env.KAFKA_PREFIX ?? '';
        const groupId = `${prefix}fantasy-league-group`;
        this.consumer = this.kafka.consumer({ groupId });
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
        const prefixedTopic = this.prefixTopic(topic);
        await this.producer.send({
            topic: prefixedTopic,
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
        const prefixedTopic = this.prefixTopic(topic);
        if (!this.pendingSubscriptions.has(prefixedTopic)) {
            this.pendingSubscriptions.set(prefixedTopic, []);
        }
        this.pendingSubscriptions.get(prefixedTopic)!.push(callback);
        this.logger.log(`Registered handler for topic: ${prefixedTopic}`);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private prefixTopic(topic: string): string {
        const prefix = process.env.KAFKA_PREFIX ?? '';
        return `${prefix}${topic}`;
    }

    private async ensureTopicsExist(topics: string[]): Promise<void> {
        if (!this.admin) {
            this.admin = this.kafka.admin();
            await this.admin.connect();
        }
        try {
            const existing = await this.admin.listTopics();
            const missing = topics.filter((t) => !existing.includes(t));
            if (missing.length > 0) {
                const defaultReplication = process.env.KAFKA_TRUSTED_CERT ? 3 : 1;
                const replicationFactor = process.env.KAFKA_REPLICATION_FACTOR
                    ? parseInt(process.env.KAFKA_REPLICATION_FACTOR)
                    : defaultReplication;

                try {
                    await this.admin.createTopics({
                        topics: missing.map((topic) => ({
                            topic,
                            numPartitions: 1,
                            replicationFactor,
                        })),
                        waitForLeaders: true,
                    });
                    this.logger.log(`Created Kafka topics: ${missing.join(', ')}`);
                } catch (createErr) {
                    this.logger.warn(`Failed to create missing topics [${missing.join(', ')}] via Admin API: ${createErr}. Ensure they are pre-created.`);
                }
            }
        } catch (err) {
            this.logger.warn(`Failed to list or create topics via Admin API: ${err}. Continuing connection anyway.`);
        }
    }
}
