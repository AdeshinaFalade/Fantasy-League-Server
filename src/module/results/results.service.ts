import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../lib/database/prisma.service';
import { KafkaService } from '../../lib/kafka/kafka.service';
import { KAFKA_TOPICS } from '../../lib/kafka/kafka.constants';
import { ResultEventDto } from '../events/dto/result-event.dto';

@Injectable()
export class ResultsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly kafka: KafkaService,
    ) {}

    async recordResult(userId: string, dto: ResultEventDto) {
        // Check if a result already exists for this event
        const existingResult = await (this.prisma as any).result.findUnique({
            where: { eventId: dto.eventId },
        });
        if (existingResult) {
            throw new ConflictException('Result already recorded for this event');
        }

        // Create the result and update event status to SCORING inside a transaction
        const result = await (this.prisma as any).$transaction(async (tx: any) => {
            const newResult = await tx.result.create({
                data: {
                    eventId: dto.eventId,
                    recordedById: userId,
                    payload: dto.payload,
                },
            });

            await tx.event.update({
                where: { id: dto.eventId },
                data: { status: 'SCORING' },
            });

            return newResult;
        });

        // Publish ResultRecorded event
        await this.kafka.publish(
            KAFKA_TOPICS.resultRecorded,
            result.id,
            {
                id: result.id,
                eventId: result.eventId,
                payload: result.payload,
                recordedById: result.recordedById,
                recordedAt: result.recordedAt || new Date(),
            }
        );

        return result;
    }
}
