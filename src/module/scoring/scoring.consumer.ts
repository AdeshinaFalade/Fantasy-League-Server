import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../lib/database/prisma.service';
import { KafkaService } from '../../lib/kafka/kafka.service';
import { KAFKA_TOPICS, ResultRecordedEvent } from '../../lib/kafka/kafka.constants';
import { ScoringEngineService, ScoringRule } from './scoring-engine.service';

@Injectable()
export class ScoringConsumer implements OnModuleInit {
    private readonly logger = new Logger(ScoringConsumer.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly kafka: KafkaService,
        private readonly scoringEngine: ScoringEngineService,
    ) {}

    onModuleInit() {
        this.kafka.subscribe(
            KAFKA_TOPICS.resultRecorded,
            async (event: ResultRecordedEvent) => {
                try {
                    this.logger.log(`Processing result.recorded event for event ID: ${event.eventId}`);
                    await this.processResult(event);
                } catch (error) {
                    this.logger.error(`Error processing result.recorded event: ${error}`);
                }
            }
        );
    }

    private async processResult(event: ResultRecordedEvent) {
        // 1. Fetch rules for this event
        const rules = await (this.prisma as any).rule.findMany({
            where: { eventId: event.eventId },
        });

        if (rules.length === 0) {
            this.logger.warn(`No rules found for event ID: ${event.eventId}. Skipping score computation.`);
            return;
        }

        // 2. Format result payload into stats array
        let stats: { player: string; metric: string; value: number }[] = [];
        if (Array.isArray(event.payload)) {
            stats = event.payload;
        } else if (typeof event.payload === 'object' && event.payload !== null) {
            for (const [player, metrics] of Object.entries(event.payload)) {
                if (metrics && typeof metrics === 'object') {
                    for (const [metric, value] of Object.entries(metrics)) {
                        stats.push({ player, metric, value: Number(value) });
                    }
                }
            }
        }

        // 3. Evaluate the actual rules matched
        const mappedRules: ScoringRule[] = rules.map((r: any) => ({
            id: r.id,
            player: r.player,
            metric: r.metric,
            condition: r.condition,
            threshold: Number(r.threshold),
            score: r.score,
        }));

        const evaluation = this.scoringEngine.evaluate(mappedRules, stats);
        const ruleBreakdown = evaluation.breakdown as { rule: ScoringRule & { id: string }; matched: boolean }[];

        // 4. Load all predictions submitted for this event
        const predictions = await (this.prisma as any).prediction.findMany({
            where: { eventId: event.eventId },
        });

        // 5. Compute and save score for each prediction
        for (const prediction of predictions) {
            let totalUserScore = 0;
            const selections = Array.isArray(prediction.selections) ? prediction.selections : [];

            for (const selection of selections as any[]) {
                // Find matching rule evaluation
                const ruleId = selection.ruleId;
                const match = ruleBreakdown.find((item) => item.rule.id === ruleId);

                // If user prediction matches the actual condition status, add points
                if (match && selection.value === match.matched) {
                    totalUserScore += match.rule.score;
                }
            }

            // Save user score in the database
            const scoreRecord = await (this.prisma as any).score.upsert({
                where: {
                    eventId_groupId_userId: {
                        eventId: event.eventId,
                        groupId: prediction.groupId,
                        userId: prediction.userId,
                    },
                },
                update: {
                    value: totalUserScore,
                    predictionId: prediction.id,
                    computedAt: new Date(),
                },
                create: {
                    eventId: event.eventId,
                    groupId: prediction.groupId,
                    userId: prediction.userId,
                    predictionId: prediction.id,
                    value: totalUserScore,
                },
            });

            // Publish score.computed event
            await this.kafka.publish(
                KAFKA_TOPICS.scoreComputed,
                scoreRecord.id,
                {
                    eventId: scoreRecord.eventId,
                    groupId: scoreRecord.groupId,
                    userId: scoreRecord.userId,
                    predictionId: scoreRecord.predictionId,
                    score: scoreRecord.value,
                    computedAt: scoreRecord.computedAt || new Date(),
                }
            );
            this.logger.log(`Published score.computed event for user ID ${prediction.userId}: ${totalUserScore} points`);
        }

        // 6. Set event status to COMPLETED
        await (this.prisma as any).event.update({
            where: { id: event.eventId },
            data: { status: 'COMPLETED' },
        });
    }
}
