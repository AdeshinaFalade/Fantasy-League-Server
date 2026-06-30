import { Test, TestingModule } from '@nestjs/testing';
import { GroupsController } from './groups.controller';
import { GroupsService } from './groups.service';

jest.mock('@thallesp/nestjs-better-auth', () => ({
    AllowAnonymous: () => () => {},
    Session: () => () => {},
}));

describe('GroupsController', () => {
    let controller: GroupsController;
    let serviceMock: any;

    beforeEach(async () => {
        serviceMock = {
            create: jest.fn(),
            join: jest.fn(),
            list: jest.fn(),
            findOne: jest.fn(),
            remove: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [GroupsController],
            providers: [
                {
                    provide: GroupsService,
                    useValue: serviceMock,
                },
            ],
        }).compile();

        controller = module.get<GroupsController>(GroupsController);
    });

    describe('list', () => {
        it('should pass user ID from session to service', async () => {
            const userId = 'user-123';
            const mockSession = { user: { id: userId } };
            const expectedGroups = [{ id: 'group-1', name: 'Group 1' }];
            serviceMock.list.mockResolvedValue(expectedGroups);

            const result = await controller.list(mockSession);

            expect(serviceMock.list).toHaveBeenCalledWith(userId);
            expect(result).toEqual(expectedGroups);
        });

        it('should pass empty string if session user ID is missing', async () => {
            const mockSession = {};
            const expectedGroups: any[] = [];
            serviceMock.list.mockResolvedValue(expectedGroups);

            const result = await controller.list(mockSession);

            expect(serviceMock.list).toHaveBeenCalledWith('');
            expect(result).toEqual(expectedGroups);
        });
    });
});
