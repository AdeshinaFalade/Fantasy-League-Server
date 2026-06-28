import { Injectable, NotFoundException } from '@nestjs/common';
import { GroupRole } from '@prisma/client';
import { PrismaService } from '../../lib/database/prisma.service';

@Injectable()
export class GroupMembersService {
    constructor(private readonly prisma: PrismaService) {}

    async updateRole(groupId: string, userId: string, role: GroupRole) {
        const membership = await (this.prisma as any).groupMember.findUnique({
            where: {
                groupId_userId: {
                    groupId,
                    userId,
                },
            },
        });

        if (!membership) {
            throw new NotFoundException('Membership not found');
        }

        return (this.prisma as any).groupMember.update({
            where: {
                groupId_userId: {
                    groupId,
                    userId,
                },
            },
            data: {
                role,
            },
        });
    }

    async listMembers(groupId: string) {
        return (this.prisma as any).groupMember.findMany({
            where: { groupId },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        image: true,
                    },
                },
            },
            orderBy: {
                joinedAt: 'asc',
            },
        });
    }

    async removeMember(groupId: string, userId: string) {
        const membership = await (this.prisma as any).groupMember.findUnique({
            where: {
                groupId_userId: {
                    groupId,
                    userId,
                },
            },
        });

        if (!membership) {
            throw new NotFoundException('Membership not found');
        }

        return (this.prisma as any).groupMember.delete({
            where: {
                groupId_userId: {
                    groupId,
                    userId,
                },
            },
        });
    }
}
