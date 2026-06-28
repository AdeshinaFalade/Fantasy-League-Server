import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import * as PrismaClientPackage from '@prisma/client';

const PrismaClientBase =
    ((PrismaClientPackage as never) as { PrismaClient?: new (...args: never[]) => { $connect(): Promise<void>; $disconnect(): Promise<void> } }).PrismaClient ??
    class {
        async $connect(): Promise<void> { }

        async $disconnect(): Promise<void> { }
    };

@Injectable()
export class PrismaService extends PrismaClientBase implements OnModuleInit, OnModuleDestroy {
    constructor() {
        const connectionString = process.env.DATABASE_URL;

        if (connectionString) {
            super({ adapter: new PrismaPg({ connectionString }) } as never);
            return;
        }

        super();
    }

    async onModuleInit(): Promise<void> {
        await this.$connect();
    }

    async onModuleDestroy(): Promise<void> {
        await this.$disconnect();
    }
}
