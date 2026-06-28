import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../lib/database/prisma.service';

@Injectable()
export class UsersService {
    constructor(private readonly prisma: PrismaService) {}

    async getJoinedGroups(userId: string) {
        const memberships = await (this.prisma as any).groupMember.findMany({
            where: { userId },
            include: {
                group: true,
            },
        });
        return memberships.map((m: any) => ({
            ...m.group,
            role: m.role,
            joinedAt: m.joinedAt,
        }));
    }

    async findById(id: string) {
        const user = await (this.prisma as any).user.findUnique({
            where: { id },
            select: {
                id: true,
                email: true,
                name: true,
                image: true,
                role: true,
                createdAt: true,
            },
        });
        if (!user) {
            throw new NotFoundException('User not found');
        }
        return user;
    }

    async search(query: string) {
        return (this.prisma as any).user.findMany({
            where: {
                OR: [
                    { name: { contains: query, mode: 'insensitive' } },
                    { email: { contains: query, mode: 'insensitive' } },
                ],
            },
            select: {
                id: true,
                email: true,
                name: true,
                image: true,
                role: true,
            },
            take: 20,
        });
    }
}
