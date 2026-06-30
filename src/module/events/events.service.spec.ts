import { Test, TestingModule } from '@nestjs/testing';
import { EventsService } from './events.service';
import { PrismaService } from '../../lib/database/prisma.service';
import { ResultsService } from '../results/results.service';
import { CreateEventDto } from './dto/create-event.dto';

describe('EventsService', () => {
    let service: EventsService;
    let prismaMock: any;
    let resultsServiceMock: any;

    beforeEach(async () => {
        prismaMock = {
            event: {
                create: jest.fn(),
                findUnique: jest.fn(),
                update: jest.fn(),
                findMany: jest.fn(),
            },
        };
        resultsServiceMock = {
            recordResult: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                EventsService,
                {
                    provide: PrismaService,
                    useValue: prismaMock,
                },
                {
                    provide: ResultsService,
                    useValue: resultsServiceMock,
                },
            ],
        }).compile();

        service = module.get<EventsService>(EventsService);
    });

    describe('create', () => {
        it('should call prisma.event.create with startsAt parsed as a Date object', async () => {
            const userId = 'user-123';
            const dto: CreateEventDto = {
                groupId: 'group-123',
                name: 'Test Event',
                description: 'Test Event Description',
                startsAt: '2026-07-01T12:00:00.000Z',
            };

            const expectedEvent = { id: 'event-123', ...dto, startsAt: new Date(dto.startsAt) };
            prismaMock.event.create.mockResolvedValue(expectedEvent);

            const result = await service.create(userId, dto);

            expect(prismaMock.event.create).toHaveBeenCalledWith({
                data: {
                    groupId: dto.groupId,
                    createdById: userId,
                    name: dto.name,
                    description: dto.description,
                    startsAt: new Date(dto.startsAt),
                },
            });
            expect(result).toEqual(expectedEvent);
        });
    });

    describe('findByGroup', () => {
        it('should call prisma.event.findMany filtering by groupId', async () => {
            const groupId = 'group-123';
            const expectedEvents = [{ id: 'event-1', groupId, name: 'Event 1' }];
            prismaMock.event.findMany.mockResolvedValue(expectedEvents);

            const result = await service.findByGroup(groupId);

            expect(prismaMock.event.findMany).toHaveBeenCalledWith({
                where: { groupId },
            });
            expect(result).toEqual(expectedEvents);
        });
    });
});
