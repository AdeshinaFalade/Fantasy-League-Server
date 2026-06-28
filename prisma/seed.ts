import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { config } from 'dotenv';

config({ path: '.env' });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is missing.');
}

const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString })
});

async function main(): Promise<void> {
    const admin = await prisma.user.upsert({
        where: { email: 'admin@fantasy.local' },
        update: {},
        create: {
            email: 'admin@fantasy.local',
            name: 'League Admin',
            role: 'ADMIN',
        },
    });

    const group = await prisma.group.upsert({
        where: { inviteCode: 'WELCOME1' },
        update: {},
        create: {
            name: 'Founders League',
            inviteCode: 'WELCOME1',
            createdById: admin.id,
        },
    });

    await prisma.groupMember.upsert({
        where: {
            groupId_userId: {
                groupId: group.id,
                userId: admin.id,
            },
        },
        update: {},
        create: {
            groupId: group.id,
            userId: admin.id,
            role: 'ADMIN',
        },
    });
}

main()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
