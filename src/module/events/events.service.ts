import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../lib/database/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { ResultEventDto } from './dto/result-event.dto';
import { EventStatusDto } from './dto/update-event-status.dto';
import { ResultsService } from '../results/results.service';

@Injectable()
export class EventsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly resultsService: ResultsService,
    ) { }

    async create(userId: string, dto: CreateEventDto) {
        const prisma = this.prisma as never as {
            event: { create(args: unknown): Promise<unknown>; findUnique(args: unknown): Promise<unknown | null>; update(args: unknown): Promise<unknown>; };
        };

        return prisma.event.create({
            data: {
                groupId: dto.groupId,
                createdById: userId,
                name: dto.name,
                description: dto.description,
            },
        });
    }

    async findOne(id: string) {
        const prisma = this.prisma as never as { event: { findUnique(args: unknown): Promise<unknown | null> } };
        const event = await prisma.event.findUnique({ where: { id } });
        if (!event) {
            throw new NotFoundException('Event not found');
        }
        return event;
    }

    async setStatus(id: string, status: EventStatusDto) {
        const prisma = this.prisma as never as { event: { update(args: unknown): Promise<unknown> } };
        return prisma.event.update({ where: { id }, data: { status } });
    }

    async recordResult(userId: string, dto: ResultEventDto) {
        return this.resultsService.recordResult(userId, dto);
    }
}
