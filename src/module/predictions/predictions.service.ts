import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../lib/database/prisma.service';
import { KafkaService } from '../../lib/kafka/kafka.service';
import { KAFKA_TOPICS } from '../../lib/kafka/kafka.constants';
import { CreatePredictionDto } from './dto/create-prediction.dto';

@Injectable()
export class PredictionsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly kafka: KafkaService,
    ) { }

    async create(userId: string, dto: CreatePredictionDto) {
        const prisma = this.prisma as never as {
            prediction: { create(args: unknown): Promise<any>; findMany(args: unknown): Promise<unknown[]> };
            groupMember: { findUnique(args: unknown): Promise<unknown | null> };
            event: { findUnique(args: unknown): Promise<{ status: string; startsAt?: Date | string | null } | null> };
        };

        const event = await prisma.event.findUnique({ where: { id: dto.eventId } });
        if (!event || event.status !== 'OPEN') {
            throw new BadRequestException('Event is not open');
        }

        if (event.startsAt && new Date() > new Date(event.startsAt)) {
            throw new BadRequestException('Event has already started');
        }

        const membership = await prisma.groupMember.findUnique({ where: { groupId_userId: { groupId: dto.groupId, userId } } });
        if (!membership) {
            throw new ForbiddenException('User does not belong to the group');
        }

        // Validate that all ruleIds belong to this event
        const rules = await (this.prisma as any).rule.findMany({
            where: { eventId: dto.eventId },
            select: { id: true },
        });
        const validRuleIds = new Set<string>(rules.map((r: { id: string }) => r.id));
        const invalidIds = dto.selections
            .map((s) => s.ruleId)
            .filter((id) => !validRuleIds.has(id));
        if (invalidIds.length > 0) {
            throw new BadRequestException(
                `Invalid ruleId(s) for this event: ${invalidIds.join(', ')}`,
            );
        }

        const prediction = await prisma.prediction.create({
            data: {
                eventId: dto.eventId,
                groupId: dto.groupId,
                userId,
                selections: dto.selections,
            },
        });

        // Publish event to Kafka
        await this.kafka.publish(
            KAFKA_TOPICS.predictionSubmitted,
            prediction.id,
            {
                id: prediction.id,
                eventId: prediction.eventId,
                groupId: prediction.groupId,
                userId: prediction.userId,
                selections: prediction.selections,
                submittedAt: prediction.submittedAt || new Date(),
            }
        );

        return prediction;
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
