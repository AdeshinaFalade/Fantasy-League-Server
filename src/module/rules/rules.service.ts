import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../lib/database/prisma.service';
import { CreateRuleDto } from './dto/create-rule.dto';

@Injectable()
export class RulesService {
    constructor(private readonly prisma: PrismaService) { }

    async create(userId: string, dto: CreateRuleDto) {
        const prisma = this.prisma as never as {
            rule: { create(args: unknown): Promise<unknown>; findMany(args: unknown): Promise<unknown[]>; delete(args: unknown): Promise<unknown> };
        };

        return prisma.rule.create({
            data: {
                eventId: dto.eventId,
                createdById: userId,
                player: dto.player,
                metric: dto.metric,
                condition: dto.condition,
                threshold: dto.threshold,
                score: dto.score,
            },
        });
    }

    async listByEvent(eventId: string) {
        const prisma = this.prisma as never as { rule: { findMany(args: unknown): Promise<unknown[]> } };
        return prisma.rule.findMany({ where: { eventId } });
    }

    async remove(id: string) {
        const prisma = this.prisma as never as { rule: { delete(args: unknown): Promise<unknown> } };
        return prisma.rule.delete({ where: { id } });
    }
}
