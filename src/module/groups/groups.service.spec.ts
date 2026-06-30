import { Test, TestingModule } from '@nestjs/testing';
import { GroupsService } from './groups.service';
import { PrismaService } from '../../lib/database/prisma.service';

describe('GroupsService', () => {
    let service: GroupsService;
    let prismaMock: any;

    beforeEach(async () => {
        prismaMock = {
            group: {
                findMany: jest.fn(),
            },
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                GroupsService,
                {
                    provide: PrismaService,
                    useValue: prismaMock,
                },
            ],
        }).compile();

        service = module.get<GroupsService>(GroupsService);
    });

    describe('list', () => {
        it('should call prisma.group.findMany with filter for members containing the userId and map user role', async () => {
            const userId = 'user-123';
            const mockDbGroups = [
                {
                    id: 'group-1',
                    name: 'Group 1',
                    members: [{ role: 'ADMIN' }],
                },
            ];
            prismaMock.group.findMany.mockResolvedValue(mockDbGroups);

            const result = await service.list(userId);

            expect(prismaMock.group.findMany).toHaveBeenCalledWith({
                where: {
                    members: {
                        some: {
                            userId,
                        },
                    },
                },
                include: {
                    members: {
                        where: {
                            userId,
                        },
                        select: {
                            role: true,
                        },
                    },
                },
            });
            expect(result).toEqual([
                {
                    id: 'group-1',
                    name: 'Group 1',
                    role: 'ADMIN',
                },
            ]);
        });
    });
});
