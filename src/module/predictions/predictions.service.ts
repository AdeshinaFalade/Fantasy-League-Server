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

        const rules = await (this.prisma as any).rule.findMany({
            where: { eventId: dto.eventId },
            select: { id: true, player: true, metric: true },
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

        // Prevent contradictory picks: a user must not select Yes on two or more
        // rules that share the same player+metric (e.g. Messi Goals GT 0.5 AND
        // Messi Goals LT 0.5). That is hedging — one of them is guaranteed to win.
        const ruleMap = new Map<string, { player: string; metric: string }>(
            rules.map((r: { id: string; player: string; metric: string }) => [r.id, r]),
        );
        const yesSelections = dto.selections.filter((s) => s.value === true);
        const seenPlayerMetric = new Set<string>();
        for (const sel of yesSelections) {
            const rule = ruleMap.get(sel.ruleId);
            if (!rule) continue;
            const key = `${rule.player}::${rule.metric}`;
            if (seenPlayerMetric.has(key)) {
                throw new BadRequestException(
                    `Contradictory prediction: you cannot select Yes on multiple rules for the same player+metric (${rule.player} — ${rule.metric}). Pick at most one.`,
                );
            }
            seenPlayerMetric.add(key);
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
