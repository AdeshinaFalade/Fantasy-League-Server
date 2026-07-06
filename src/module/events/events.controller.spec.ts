import { Test, TestingModule } from '@nestjs/testing';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';

jest.mock('@thallesp/nestjs-better-auth', () => ({
    AllowAnonymous: () => () => {},
    Session: () => () => {},
}));

describe('EventsController', () => {
    let controller: EventsController;
    let serviceMock: any;

    beforeEach(async () => {
        serviceMock = {
            create: jest.fn(),
            findByGroup: jest.fn(),
            findOne: jest.fn(),
            setStatus: jest.fn(),
            recordResult: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [EventsController],
            providers: [
                {
                    provide: EventsService,
                    useValue: serviceMock,
                },
            ],
        }).compile();

        controller = module.get<EventsController>(EventsController);
    });

    describe('findByGroup', () => {
        it('should return events for a specific group', async () => {
            const groupId = 'group-123';
            const expectedEvents = [{ id: 'event-1', groupId, name: 'Event 1' }];
            serviceMock.findByGroup.mockResolvedValue(expectedEvents);

            const result = await controller.findByGroup({ user: { id: 'user-1' } }, groupId);

            expect(serviceMock.findByGroup).toHaveBeenCalledWith('user-1', groupId);
            expect(result).toEqual(expectedEvents);
        });
    });
});
