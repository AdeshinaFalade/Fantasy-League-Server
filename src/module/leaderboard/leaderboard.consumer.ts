import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../lib/database/prisma.service';
import { KafkaService } from '../../lib/kafka/kafka.service';
import { KAFKA_TOPICS, ScoreComputedEvent } from '../../lib/kafka/kafka.constants';
import { LeaderboardGateway } from './leaderboard.gateway';

@Injectable()
export class LeaderboardConsumer implements OnModuleInit {
    private readonly logger = new Logger(LeaderboardConsumer.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly kafka: KafkaService,
        private readonly leaderboardGateway: LeaderboardGateway,
    ) {}

    onModuleInit() {
        this.kafka.subscribe(
            KAFKA_TOPICS.scoreComputed,
            async (event: ScoreComputedEvent) => {
                try {
                    this.logger.log(`Processing score.computed event for group ID: ${event.groupId}`);
                    await this.updateLeaderboard(event.groupId);
                } catch (error) {
                    this.logger.error(`Error updating leaderboard: ${error}`);
                }
            }
        );
    }

    private async updateLeaderboard(groupId: string) {
        // 1. Fetch all scores for this group
        const scores = await (this.prisma as any).score.findMany({
            where: { groupId },
            include: {
                user: {
                    select: {
                        name: true,
                    },
                },
            },
        });

        // 2. Sum scores per user
        const userMap = new Map<string, { userId: string; name: string; score: number }>();
        for (const s of scores) {
            const existing = userMap.get(s.userId);
            if (existing) {
                existing.score += s.value;
            } else {
                userMap.set(s.userId, {
                    userId: s.userId,
                    name: s.user?.name || 'Unknown',
                    score: s.value,
                });
            }
        }

        // 3. Sort descending by total score and map rank
        const sorted = Array.from(userMap.values()).sort((a, b) => b.score - a.score);
        const rankings = sorted.map((item, index) => ({
            rank: index + 1,
            ...item,
        }));

        // 4. Upsert the leaderboard in the database
        const leaderboard = await (this.prisma as any).leaderboard.upsert({
            where: { groupId },
            update: {
                rankings,
                computedAt: new Date(),
            },
            create: {
                groupId,
                rankings,
            },
        });

        // 5. Publish leaderboard.updated event
        await this.kafka.publish(
            KAFKA_TOPICS.leaderboardUpdated,
            groupId,
            {
                groupId,
                rankings,
                computedAt: leaderboard.computedAt || new Date(),
            }
        );

        // 6. Broadcast update via WebSockets
        this.leaderboardGateway.emitLeaderboardUpdate(groupId, leaderboard);

        this.logger.log(`Leaderboard updated for group ID: ${groupId} with ${rankings.length} rankings`);
    }
}
