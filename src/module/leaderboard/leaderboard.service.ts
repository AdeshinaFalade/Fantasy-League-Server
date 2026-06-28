import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../lib/database/prisma.service';

@Injectable()
export class LeaderboardService {
    constructor(private readonly prisma: PrismaService) { }

    async getByGroup(groupId: string) {
        const prisma = this.prisma as never as {
            leaderboard: { findUnique(args: unknown): Promise<unknown | null> };
        };

        return prisma.leaderboard.findUnique({ where: { groupId } });
    }
}
