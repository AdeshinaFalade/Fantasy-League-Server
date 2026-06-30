import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../lib/database/prisma.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { JoinGroupDto } from './dto/join-group.dto';

@Injectable()
export class GroupsService {
    constructor(private readonly prisma: PrismaService) { }

    async create(userId: string, dto: CreateGroupDto) {
        const prisma = this.prisma as never as {
            group: {
                create(args: unknown): Promise<unknown>;
                findMany(args?: unknown): Promise<unknown[]>;
                findUnique(args: unknown): Promise<unknown | null>;
                delete(args: unknown): Promise<unknown>;
            };
            groupMember: {
                create(args: unknown): Promise<unknown>;
            };
        };

        const group = await prisma.group.create({
            data: {
                name: dto.name,
                inviteCode: crypto.randomUUID().replaceAll('-', '').slice(0, 10).toUpperCase(),
                createdById: userId,
            },
        });

        await prisma.groupMember.create({
            data: {
                groupId: (group as { id: string }).id,
                userId,
                role: 'ADMIN',
            },
        });

        return group;
    }

    async join(userId: string, dto: JoinGroupDto) {
        const prisma = this.prisma as never as {
            group: { findUnique(args: unknown): Promise<{ id: string } | null> };
            groupMember: { create(args: unknown): Promise<unknown> };
        };

        const group = await prisma.group.findUnique({ where: { inviteCode: dto.inviteCode } });
        if (!group) {
            throw new NotFoundException('Group not found');
        }

        return prisma.groupMember.create({
            data: {
                groupId: group.id,
                userId,
                role: 'PARTICIPANT',
            },
        });
    }

    async list(userId: string) {
        const prisma = this.prisma as never as {
            group: {
                findMany(args?: unknown): Promise<any[]>;
            };
        };
        const groups = await prisma.group.findMany({
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

        return groups.map((g) => {
            const { members, ...groupData } = g;
            return {
                ...groupData,
                role: members?.[0]?.role ?? null,
            };
        });
    }

    async findOne(id: string) {
        const prisma = this.prisma as never as { group: { findUnique(args: unknown): Promise<unknown | null> } };
        const group = await prisma.group.findUnique({ where: { id } });
        if (!group) {
            throw new NotFoundException('Group not found');
        }
        return group;
    }

    async remove(id: string) {
        const prisma = this.prisma as never as { group: { delete(args: unknown): Promise<unknown> } };
        return prisma.group.delete({ where: { id } });
    }
}
