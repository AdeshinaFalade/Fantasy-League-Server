import { Test, TestingModule } from '@nestjs/testing';
import { PredictionsService } from './predictions.service';
import { PrismaService } from '../../lib/database/prisma.service';
import { KafkaService } from '../../lib/kafka/kafka.service';
import { CreatePredictionDto } from './dto/create-prediction.dto';

describe('PredictionsService', () => {
    let service: PredictionsService;
    let prismaMock: any;
    let kafkaMock: any;

    beforeEach(async () => {
        prismaMock = {
            prediction: {
                create: jest.fn(),
                findMany: jest.fn(),
            },
            groupMember: {
                findUnique: jest.fn(),
            },
            event: {
                findUnique: jest.fn(),
            },
            rule: {
                findMany: jest.fn(),
            },
        };
        kafkaMock = {
            publish: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PredictionsService,
                {
                    provide: PrismaService,
                    useValue: prismaMock,
                },
                {
                    provide: KafkaService,
                    useValue: kafkaMock,
                },
            ],
        }).compile();

        service = module.get<PredictionsService>(PredictionsService);
    });

    describe('create', () => {
        const userId = 'user-123';
        const dto: CreatePredictionDto = {
            eventId: 'event-123',
            groupId: 'group-123',
            selections: [{ ruleId: 'rule-1', value: true }],
        };

        it('should create prediction successfully when event is open and start time is in the future', async () => {
            const futureDate = new Date();
            futureDate.setMinutes(futureDate.getMinutes() + 10); // 10 minutes in the future

            prismaMock.event.findUnique.mockResolvedValue({ status: 'OPEN', startsAt: futureDate });
            prismaMock.groupMember.findUnique.mockResolvedValue({ id: 'member-123' });
            prismaMock.rule.findMany.mockResolvedValue([{ id: 'rule-1', player: 'Player A', metric: 'goals' }]);
            
            const expectedPrediction = {
                id: 'pred-123',
                eventId: dto.eventId,
                groupId: dto.groupId,
                userId,
                selections: dto.selections,
                submittedAt: new Date(),
            };
            prismaMock.prediction.create.mockResolvedValue(expectedPrediction);

            const result = await service.create(userId, dto);

            expect(result).toEqual(expectedPrediction);
            expect(prismaMock.prediction.create).toHaveBeenCalled();
            expect(kafkaMock.publish).toHaveBeenCalled();
        });

        it('should throw error when event has already started', async () => {
            const pastDate = new Date();
            pastDate.setMinutes(pastDate.getMinutes() - 10); // 10 minutes in the past

            prismaMock.event.findUnique.mockResolvedValue({ status: 'OPEN', startsAt: pastDate });

            await expect(service.create(userId, dto)).rejects.toThrow('Event has already started');
            expect(prismaMock.prediction.create).not.toHaveBeenCalled();
            expect(kafkaMock.publish).not.toHaveBeenCalled();
        });

        it('should create prediction successfully if startsAt is not defined (null)', async () => {
            prismaMock.event.findUnique.mockResolvedValue({ status: 'OPEN', startsAt: null });
            prismaMock.groupMember.findUnique.mockResolvedValue({ id: 'member-123' });
            prismaMock.rule.findMany.mockResolvedValue([{ id: 'rule-1', player: 'Player A', metric: 'goals' }]);
            
            const expectedPrediction = {
                id: 'pred-123',
                eventId: dto.eventId,
                groupId: dto.groupId,
                userId,
                selections: dto.selections,
                submittedAt: new Date(),
            };
            prismaMock.prediction.create.mockResolvedValue(expectedPrediction);

            const result = await service.create(userId, dto);

            expect(result).toEqual(expectedPrediction);
            expect(prismaMock.prediction.create).toHaveBeenCalled();
        });
    });

    describe('contradictory prediction guard', () => {
        const userId = 'user-123';

        beforeEach(() => {
            prismaMock.event.findUnique.mockResolvedValue({ status: 'OPEN', startsAt: null });
            prismaMock.groupMember.findUnique.mockResolvedValue({ id: 'member-123' });
        });

        it('should reject when two Yes selections share the same player+metric', async () => {
            // Both rules are for Messi's goals — GT 0.5 and LT 0.5 — classic hedge
            prismaMock.rule.findMany.mockResolvedValue([
                { id: 'rule-gt', player: 'Messi', metric: 'goals' },
                { id: 'rule-lt', player: 'Messi', metric: 'goals' },
            ]);

            const dto: CreatePredictionDto = {
                eventId: 'event-123',
                groupId: 'group-123',
                selections: [
                    { ruleId: 'rule-gt', value: true },
                    { ruleId: 'rule-lt', value: true },
                ],
            };

            await expect(service.create(userId, dto)).rejects.toThrow(
                'Contradictory prediction',
            );
            expect(prismaMock.prediction.create).not.toHaveBeenCalled();
        });

        it('should allow Yes picks on different metrics for the same player', async () => {
            prismaMock.rule.findMany.mockResolvedValue([
                { id: 'rule-goals', player: 'Messi', metric: 'goals' },
                { id: 'rule-assists', player: 'Messi', metric: 'assists' },
            ]);

            const expectedPrediction = { id: 'pred-456', selections: [] };
            prismaMock.prediction.create.mockResolvedValue(expectedPrediction);

            const dto: CreatePredictionDto = {
                eventId: 'event-123',
                groupId: 'group-123',
                selections: [
                    { ruleId: 'rule-goals', value: true },
                    { ruleId: 'rule-assists', value: true },
                ],
            };

            await expect(service.create(userId, dto)).resolves.toEqual(expectedPrediction);
        });

        it('should allow Yes picks on the same metric for different players', async () => {
            prismaMock.rule.findMany.mockResolvedValue([
                { id: 'rule-messi', player: 'Messi', metric: 'goals' },
                { id: 'rule-ronaldo', player: 'Ronaldo', metric: 'goals' },
            ]);

            const expectedPrediction = { id: 'pred-789', selections: [] };
            prismaMock.prediction.create.mockResolvedValue(expectedPrediction);

            const dto: CreatePredictionDto = {
                eventId: 'event-123',
                groupId: 'group-123',
                selections: [
                    { ruleId: 'rule-messi', value: true },
                    { ruleId: 'rule-ronaldo', value: true },
                ],
            };

            await expect(service.create(userId, dto)).resolves.toEqual(expectedPrediction);
        });
    });
});
