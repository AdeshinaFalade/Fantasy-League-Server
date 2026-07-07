import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../lib/database/prisma.service';
import { KafkaService } from '../../lib/kafka/kafka.service';
import { KAFKA_TOPICS } from '../../lib/kafka/kafka.constants';
import { ScoringModule } from './scoring.module';
import { LeaderboardModule } from '../leaderboard/leaderboard.module';
import { ResultsModule } from '../results/results.module';
import { ResultsService } from '../results/results.service';
import { PrismaModule } from '../../lib/database/prisma.module';
import { KafkaModule } from '../../lib/kafka/kafka.module';
import { GroupRole } from '@prisma/client';
import { config } from 'dotenv';
import { AuthService } from '@thallesp/nestjs-better-auth';
import { Global, Module } from '@nestjs/common';

config({ path: '.env' });

jest.mock('@thallesp/nestjs-better-auth', () => ({
    AuthService: class {
        api = {
            getSession: jest.fn(),
        };
    },
}));

@Global()
@Module({
    providers: [
        {
            provide: AuthService,
            useValue: {
                api: {
                    getSession: jest.fn(),
                },
            },
        },
    ],
    exports: [AuthService],
})
class MockAuthModule {}

describe('Event-Driven Execution Flow Integration Test', () => {
    let prisma: PrismaService;
    let kafka: KafkaService;
    let resultsService: ResultsService;
    let moduleRef: TestingModule;

    // In-memory event bus to simulate Kafka asynchronously
    const eventSubscriptions = new Map<string, ((payload: any) => Promise<void>)[]>();

    beforeAll(async () => {
        moduleRef = await Test.createTestingModule({
            imports: [
                MockAuthModule,
                PrismaModule,
                KafkaModule,
                ResultsModule,
                ScoringModule,
                LeaderboardModule,
            ],
        })
        .overrideProvider(KafkaService)
        .useValue({
            isEnabled: true,
            logger: { log: () => {}, warn: () => {}, error: () => {} },
            publish: async (topic: string, key: string, value: any) => {
                const handlers = eventSubscriptions.get(topic) || [];
                for (const handler of handlers) {
                    await handler(value);
                }
            },
            subscribe: async (topic: string, callback: (payload: any) => Promise<void>) => {
                if (!eventSubscriptions.has(topic)) {
                    eventSubscriptions.set(topic, []);
                }
                eventSubscriptions.get(topic)!.push(callback);
            },
        })
        .compile();

        prisma = moduleRef.get<PrismaService>(PrismaService);
        kafka = moduleRef.get<KafkaService>(KafkaService);
        resultsService = moduleRef.get<ResultsService>(ResultsService);

        // Initialize consumers manually to trigger onModuleInit hooks
        await moduleRef.init();
    });

    afterAll(async () => {
        await moduleRef.close();
    });

    it('processes Prediction -> Result -> Scoring -> Leaderboard flow end-to-end', async () => {
        const uniqueId = Date.now().toString();
        const email = `test-user-${uniqueId}@fantasy.local`;
        const inviteCode = `CODE-${uniqueId}`;

        // 1. Seed User
        const user = await (prisma as any).user.create({
            data: {
                email,
                name: 'Test Competitor',
            },
        });

        // 2. Seed Group and Group Member
        const group = await (prisma as any).group.create({
            data: {
                name: 'Test Integration Group',
                inviteCode,
                createdById: user.id,
            },
        });

        const member = await (prisma as any).groupMember.create({
            data: {
                groupId: group.id,
                userId: user.id,
                role: GroupRole.ADMIN,
            },
        });

        // 3. Seed Event & Scoring Rule
        // Rule: Player X points must be GT 10 (Award 50 points)
        const event = await (prisma as any).event.create({
            data: {
                groupId: group.id,
                createdById: user.id,
                name: 'Integration Test Event',
            },
        });

        const rule = await (prisma as any).rule.create({
            data: {
                eventId: event.id,
                createdById: user.id,
                player: 'Player X',
                metric: 'points',
                condition: 'GT',
                threshold: 10,
                score: 50,
            },
        });

        // 4. Save User Prediction Selection
        // Selection: User predicts the rule criteria will be met (value: true)
        const prediction = await (prisma as any).prediction.create({
            data: {
                eventId: event.id,
                groupId: group.id,
                userId: user.id,
                selections: [
                    { ruleId: rule.id, value: true },
                ],
            },
        });

        // 5. Admin enters actual results
        // Actual result: Player X scored 15 points (which is GT 10)
        // This will write the result, transition event to SCORING, and trigger the event loop
        const resultPayload = {
            'Player X': { points: 15 },
        };

        await resultsService.recordResult(user.id, {
            eventId: event.id,
            payload: resultPayload,
        });

        // 7. Verify Scores are generated and saved
        const score = await (prisma as any).score.findUnique({
            where: {
                eventId_groupId_userId: {
                    eventId: event.id,
                    groupId: group.id,
                    userId: user.id,
                },
            },
        });

        expect(score).toBeDefined();
        expect(score.value).toBe(50); // Correct prediction should yield 50 points
        expect(score.predictionId).toBe(prediction.id);

        // 8. Verify Leaderboard has been recalculated
        const leaderboard = await (prisma as any).leaderboard.findUnique({
            where: { groupId: group.id },
        });

        expect(leaderboard).toBeDefined();
        const rankings = leaderboard.rankings as any[];
        expect(rankings.length).toBe(1);
        expect(rankings[0].userId).toBe(user.id);
        expect(rankings[0].score).toBe(50);
        expect(rankings[0].rank).toBe(1);

        // 9. Verify Event status has transitioned to COMPLETED
        const updatedEvent = await (prisma as any).event.findUnique({
            where: { id: event.id },
        });
        expect(updatedEvent.status).toBe('COMPLETED');

        // Cleanup
        await (prisma as any).score.deleteMany({ where: { groupId: group.id } });
        await (prisma as any).leaderboard.delete({ where: { groupId: group.id } });
        await (prisma as any).prediction.delete({ where: { id: prediction.id } });
        await (prisma as any).rule.delete({ where: { id: rule.id } });
        await (prisma as any).result.delete({ where: { eventId: event.id } });
        await (prisma as any).event.delete({ where: { id: event.id } });
        await (prisma as any).groupMember.delete({ where: { id: member.id } });
        await (prisma as any).group.delete({ where: { id: group.id } });
        await (prisma as any).user.delete({ where: { id: user.id } });
    }, 30000);
});
