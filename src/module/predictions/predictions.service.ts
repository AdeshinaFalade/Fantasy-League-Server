import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../lib/database/prisma.service';
import { CreatePredictionDto } from './dto/create-prediction.dto';

@Injectable()
export class PredictionsService {
    constructor(private readonly prisma: PrismaService) { }

    async create(userId: string, dto: CreatePredictionDto) {
        const prisma = this.prisma as never as {
            prediction: { create(args: unknown): Promise<unknown>; findMany(args: unknown): Promise<unknown[]> };
            groupMember: { findUnique(args: unknown): Promise<unknown | null> };
            event: { findUnique(args: unknown): Promise<{ status: string } | null> };
        };

        const event = await prisma.event.findUnique({ where: { id: dto.eventId } });
        if (!event || event.status !== 'OPEN') {
            throw new Error('Event is not open');
        }

        const membership = await prisma.groupMember.findUnique({ where: { groupId_userId: { groupId: dto.groupId, userId } } });
        if (!membership) {
            throw new Error('User does not belong to the group');
        }

        return prisma.prediction.create({
            data: {
                eventId: dto.eventId,
                groupId: dto.groupId,
                userId,
                selections: dto.selections,
            },
        });
    }

    async listByEvent(eventId: string) {
        const prisma = this.prisma as never as { prediction: { findMany(args: unknown): Promise<unknown[]> } };
        return prisma.prediction.findMany({ where: { eventId } });
    }

    async listMine(userId: string) {
        const prisma = this.prisma as never as { prediction: { findMany(args: unknown): Promise<unknown[]> } };
        return prisma.prediction.findMany({ where: { userId } });
    }
}
